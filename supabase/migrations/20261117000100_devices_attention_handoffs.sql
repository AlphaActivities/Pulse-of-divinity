CREATE TABLE public.notification_preferences (
 admin_id uuid PRIMARY KEY REFERENCES public.admins(id), website_inquiries boolean NOT NULL DEFAULT true,
 chatbot_handoffs boolean NOT NULL DEFAULT true, follow_ups boolean NOT NULL DEFAULT true
);
CREATE TABLE public.push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL REFERENCES public.admins(id),
 endpoint text NOT NULL UNIQUE, p256dh text NOT NULL, auth text NOT NULL, label text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), receipt_confirmed_at timestamptz
);
CREATE TABLE public.concierge_handoffs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','claimed','completed','chatbot')),
 claimed_by uuid REFERENCES public.admins(id), outcome text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.push_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('website_inquiries','chatbot_handoffs','follow_ups')),
 lead_id uuid NOT NULL REFERENCES public.leads(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,lead_id)
);
CREATE TABLE public.push_deliveries (
 event_id uuid NOT NULL REFERENCES public.push_outbox(id), device_id uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('sending','accepted','failed')), attempt_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(event_id,device_id)
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['notification_preferences','push_devices','concierge_handoffs','push_outbox','push_deliveries'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 END LOOP; END $$;
CREATE POLICY pod_preferences ON public.notification_preferences FOR ALL TO authenticated USING(admin_id=(public.pod_profile()).id) WITH CHECK(admin_id=(public.pod_profile()).id);
CREATE POLICY pod_devices_read ON public.push_devices FOR SELECT TO authenticated USING(admin_id=(public.pod_profile()).id);
CREATE POLICY pod_devices_delete ON public.push_devices FOR DELETE TO authenticated USING(admin_id=(public.pod_profile()).id);
CREATE POLICY pod_handoffs_read ON public.concierge_handoffs FOR SELECT TO authenticated USING((public.pod_profile()).id IS NOT NULL);
GRANT SELECT,INSERT,UPDATE ON public.notification_preferences TO authenticated;
-- Device encryption keys/endpoints are not exposed by the list API.
GRANT SELECT(id,admin_id,label,created_at,last_seen_at,receipt_confirmed_at),DELETE ON public.push_devices TO authenticated;
GRANT SELECT ON public.concierge_handoffs TO authenticated;

CREATE OR REPLACE FUNCTION public.pod_register_device(p_endpoint text,p_p256dh text,p_auth text,p_label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.admins; result uuid;
BEGIN
 actor:=public.pod_profile();
 IF p_endpoint !~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]*push\.services\.mozilla\.com|[a-z0-9.-]*web\.push\.apple\.com)/' OR length(p_endpoint)>4096
 OR length(p_p256dh) NOT BETWEEN 40 AND 200 OR length(p_auth) NOT BETWEEN 10 AND 100 OR length(trim(p_label)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invalid device'; END IF;
 IF EXISTS(SELECT 1 FROM public.push_devices WHERE endpoint=p_endpoint AND admin_id<>actor.id) THEN RAISE EXCEPTION 'Device belongs to another account; remove it before switching'; END IF;
 INSERT INTO public.push_devices(admin_id,endpoint,p256dh,auth,label) VALUES(actor.id,p_endpoint,p_p256dh,p_auth,p_label)
 ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,label=EXCLUDED.label,last_seen_at=now() RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.pod_confirm_receipt(p_device_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.push_devices SET receipt_confirmed_at=now() WHERE id=p_device_id AND admin_id=(public.pod_profile()).id;
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.pod_attention() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 PERFORM public.pod_profile();
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'follow_up_at'),'[]') INTO result FROM (
 SELECT jsonb_build_object('id',l.id,'kind',CASE WHEN h.id IS NOT NULL THEN 'handoff' ELSE 'lead' END,'name',l.name,'follow_up_at',l.follow_up_at) AS x
 FROM public.leads l LEFT JOIN public.concierge_handoffs h ON h.lead_id=l.id AND h.state IN ('pending','claimed')
 WHERE NOT l.archived AND l.status NOT IN ('WON','CLOSED')
 AND (h.id IS NOT NULL OR l.status='NEW' OR l.follow_up_at<= (now() AT TIME ZONE 'America/Los_Angeles')::date)
 ) q;
 RETURN jsonb_build_object('count',jsonb_array_length(result),'items',result);
END $$;
CREATE OR REPLACE FUNCTION public.pod_handoff_action(p_id uuid,p_action text,p_outcome text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.admins; result public.concierge_handoffs;
BEGIN
 actor:=public.pod_profile();
 SELECT * INTO result FROM public.concierge_handoffs WHERE id=p_id FOR UPDATE;
 IF result.id IS NULL THEN RAISE EXCEPTION 'Handoff not found'; END IF;
 IF p_action='claim' THEN
 IF result.state<>'pending' THEN RAISE EXCEPTION 'Already claimed or resolved'; END IF;
 result.state:='claimed'; result.claimed_by:=actor.id;
 ELSIF p_action IN ('completed','chatbot') THEN
 IF (result.claimed_by IS DISTINCT FROM actor.id AND actor.role<>'owner') OR result.state<>'claimed' THEN RAISE EXCEPTION 'Claim required' USING ERRCODE='42501'; END IF;
 IF length(trim(coalesce(p_outcome,''))) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Record an outcome'; END IF;
 result.state:=p_action; result.outcome:=p_outcome;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 UPDATE public.concierge_handoffs SET state=result.state,claimed_by=result.claimed_by,outcome=result.outcome,updated_at=now() WHERE id=p_id RETURNING * INTO result;
 INSERT INTO public.lead_events(lead_id,actor_admin_id,kind,changes) VALUES(result.lead_id,actor.id,'handoff',jsonb_build_object('state',result.state,'outcome',result.outcome));
 RETURN to_jsonb(result);
END $$;
DO $$ DECLARE signature text; BEGIN FOREACH signature IN ARRAY ARRAY['pod_register_device(text,text,text,text)','pod_confirm_receipt(uuid)','pod_attention()','pod_handoff_action(uuid,text,text)'] LOOP
 EXECUTE 'REVOKE ALL ON FUNCTION public.'||signature||' FROM PUBLIC,anon';
 EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||signature||' TO authenticated';
 END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.pod_inquiry_attention() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.push_outbox(kind,lead_id) VALUES('website_inquiries',NEW.id) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER pod_inquiry_attention AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.pod_inquiry_attention();
-- Staff may request a durable handoff through the public intake edge function,
-- using the same request key and lead ID. Server service role alone can insert.
