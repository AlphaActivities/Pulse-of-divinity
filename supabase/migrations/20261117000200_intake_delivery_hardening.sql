CREATE TABLE public.intake_rate_windows (
 key text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0,
 PRIMARY KEY(key,window_start)
);
ALTER TABLE public.intake_rate_windows ENABLE ROW LEVEL SECURITY;
ALTER FUNCTION public.pod_create_inquiry(jsonb) RENAME TO pod_create_inquiry_record;
CREATE OR REPLACE FUNCTION public.pod_create_inquiry(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; used integer; rate_key text; new_request boolean;
BEGIN
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR NOT (
 coalesce(length(p_payload->>'submissionId') BETWEEN 16 AND 100,false)
 AND coalesce(length(trim(p_payload->>'name')) BETWEEN 1 AND 200,false)
 AND coalesce(length(p_payload->>'email') BETWEEN 3 AND 254,false)
 AND coalesce(length(trim(p_payload->>'message')) BETWEEN 1 AND 10000,false)
 AND coalesce(p_payload->>'inquiryType' IN ('available_work','commission','general'),false)
 AND coalesce(p_payload->>'contactMethod' IN ('email','call','text'),false)
 ) THEN RAISE EXCEPTION 'Invalid inquiry'; END IF;
 IF p_payload->>'contactMethod' IN ('call','text') AND length(regexp_replace(coalesce(p_payload->>'phone',''),'[^0-9]','','g'))<7 THEN RAISE EXCEPTION 'A phone number is required'; END IF;
 new_request:=NOT EXISTS(SELECT 1 FROM public.leads WHERE submission_id=p_payload->>'submissionId');
 IF new_request THEN
 -- The edge computes this pseudonymous key from the gateway address; never
 -- accept a client-supplied rate key. A global bucket bounds missing headers.
 rate_key:=coalesce(nullif(p_payload->>'_rateKey',''),'unknown');
 IF length(rate_key)>100 THEN RAISE EXCEPTION 'Invalid rate key'; END IF;
 INSERT INTO public.intake_rate_windows(key,window_start,attempts) VALUES(rate_key,date_trunc('hour',now()),1)
 ON CONFLICT(key,window_start) DO UPDATE SET attempts=intake_rate_windows.attempts+1 RETURNING attempts INTO used;
 IF used>30 THEN RAISE EXCEPTION 'Please wait before sending another inquiry' USING ERRCODE='P0003'; END IF;
 DELETE FROM public.intake_rate_windows WHERE window_start<now()-interval '2 days';
 END IF;
 result:=public.pod_create_inquiry_record(p_payload - '_rateKey' - 'handoff');
 IF p_payload->>'handoff'='true' THEN
 INSERT INTO public.concierge_handoffs(lead_id) VALUES((result->>'id')::uuid) ON CONFLICT(lead_id) DO NOTHING;
 DELETE FROM public.push_outbox WHERE lead_id=(result->>'id')::uuid AND kind='website_inquiries';
 INSERT INTO public.push_outbox(kind,lead_id) VALUES('chatbot_handoffs',(result->>'id')::uuid) ON CONFLICT DO NOTHING;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pod_create_inquiry(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_create_inquiry(jsonb) TO service_role;
-- Only the wrapper should create new inquiries.
REVOKE ALL ON FUNCTION public.pod_create_inquiry_record(jsonb) FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.push_deliveries ADD COLUMN attempts integer NOT NULL DEFAULT 1;
ALTER TABLE public.push_devices ADD COLUMN last_test_accepted_at timestamptz;
CREATE OR REPLACE FUNCTION public.pod_claim_delivery(p_event uuid,p_device uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid;
BEGIN
 INSERT INTO public.push_deliveries(event_id,device_id,status) VALUES(p_event,p_device,'sending')
 ON CONFLICT(event_id,device_id) DO UPDATE SET status='sending',attempt_at=now(),attempts=push_deliveries.attempts+1
 WHERE push_deliveries.attempts<5 AND push_deliveries.status IN ('failed','sending') AND push_deliveries.attempt_at<now()-interval '2 minutes'
 RETURNING event_id INTO result;
 RETURN result IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.pod_claim_delivery(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_claim_delivery(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.pod_confirm_receipt(p_device_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.push_devices SET receipt_confirmed_at=now()
 WHERE id=p_device_id AND admin_id=(public.pod_profile()).id AND last_test_accepted_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Send a test before confirming receipt'; END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.pod_pending_count() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT count(*)::integer FROM public.leads l WHERE NOT l.archived AND l.status NOT IN ('WON','CLOSED') AND
 (l.status='NEW' OR l.follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date OR EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id AND h.state IN ('pending','claimed')))
$$;
REVOKE ALL ON FUNCTION public.pod_pending_count() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_pending_count() TO service_role;
ALTER TABLE public.push_outbox ADD COLUMN dedupe_key text NOT NULL DEFAULT '';
ALTER TABLE public.push_outbox DROP CONSTRAINT push_outbox_kind_lead_id_key;
ALTER TABLE public.push_outbox ADD UNIQUE(kind,lead_id,dedupe_key);
CREATE OR REPLACE FUNCTION public.pod_queue_followups() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 INSERT INTO public.push_outbox(kind,lead_id,dedupe_key)
 SELECT 'follow_ups',id,to_char((now() AT TIME ZONE 'America/Los_Angeles')::date,'YYYY-MM-DD')
 FROM public.leads WHERE NOT archived AND status NOT IN ('WON','CLOSED') AND follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date
 ON CONFLICT DO NOTHING
$$;
CREATE OR REPLACE FUNCTION public.pod_device_events(p_device_id uuid) RETURNS SETOF public.push_outbox
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT e.* FROM public.push_outbox e JOIN public.leads l ON l.id=e.lead_id
 JOIN public.push_devices device ON device.id=p_device_id
 JOIN public.admins a ON a.id=device.admin_id AND a.active AND a.project_key='pulse-of-divinity' AND a.role IN ('owner','client','staff')
 LEFT JOIN public.notification_preferences p ON p.admin_id=device.admin_id
 LEFT JOIN public.push_deliveries d ON d.event_id=e.id AND d.device_id=device.id
 WHERE NOT l.archived AND l.status NOT IN ('WON','CLOSED')
 AND (d.event_id IS NULL OR (d.status IN ('failed','sending') AND d.attempts<5 AND d.attempt_at<now()-interval '2 minutes'))
 AND CASE e.kind WHEN 'website_inquiries' THEN coalesce(p.website_inquiries,true) AND l.status='NEW' AND NOT EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id)
 WHEN 'chatbot_handoffs' THEN coalesce(p.chatbot_handoffs,true) AND EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id AND h.state IN ('pending','claimed'))
 WHEN 'follow_ups' THEN coalesce(p.follow_ups,true) AND l.follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date AND e.dedupe_key=to_char((now() AT TIME ZONE 'America/Los_Angeles')::date,'YYYY-MM-DD') ELSE false END
 ORDER BY e.created_at LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.pod_queue_followups(),public.pod_device_events(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_queue_followups(),public.pod_device_events(uuid) TO service_role;
-- A resolved chatbot handoff does not create a second NEW-lead attention item.
CREATE OR REPLACE FUNCTION public.pod_attention() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 PERFORM public.pod_profile();
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'follow_up_at'),'[]') INTO result FROM (
 SELECT jsonb_build_object('id',l.id,'kind',CASE WHEN h.id IS NOT NULL THEN 'handoff' ELSE 'lead' END,'name',l.name,'follow_up_at',l.follow_up_at) AS x
 FROM public.leads l LEFT JOIN public.concierge_handoffs h ON h.lead_id=l.id AND h.state IN ('pending','claimed')
 WHERE NOT l.archived AND l.status NOT IN ('WON','CLOSED')
 AND (h.id IS NOT NULL OR (l.status='NEW' AND NOT EXISTS(SELECT 1 FROM public.concierge_handoffs all_h WHERE all_h.lead_id=l.id)) OR l.follow_up_at<= (now() AT TIME ZONE 'America/Los_Angeles')::date)
 ) q;
 RETURN jsonb_build_object('count',jsonb_array_length(result),'items',result);
END $$;
CREATE OR REPLACE FUNCTION public.pod_pending_count() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT count(*)::integer FROM public.leads l WHERE NOT l.archived AND l.status NOT IN ('WON','CLOSED') AND
 ((l.status='NEW' AND NOT EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id)) OR l.follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date OR EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id AND h.state IN ('pending','claimed')))
$$;

-- Staff availability reads do not expose checkout reservation identifiers.
REVOKE SELECT ON public.artwork_inventory FROM authenticated;
GRANT SELECT(artwork_id,price_cents,currency,inventory_status,updated_at,artwork_title,artwork_collection) ON public.artwork_inventory TO authenticated;
