-- Additive rebuild candidate. Do not apply to either live project without the
-- inventory/reconciliation gates in docs/C4-RELEASE.md.
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS project_key text NOT NULL DEFAULT 'pulse-of-divinity';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS request_fingerprint text;
CREATE TABLE public.commissions (
 lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE RESTRICT,
 brief text NOT NULL DEFAULT '', quote_cents integer CHECK(quote_cents >= 0),
 approval text NOT NULL DEFAULT 'pending' CHECK(approval IN ('pending','approved','declined')),
 deposit_status text NOT NULL DEFAULT 'not_applicable' CHECK(deposit_status IN ('not_applicable','pending','received')),
 delivery_date date, stage text NOT NULL DEFAULT 'brief' CHECK(stage IN ('brief','quoted','accepted','creating','delivered','closed')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lead_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id),
 actor_admin_id uuid REFERENCES public.admins(id), kind text NOT NULL,
 changes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.collector_metrics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id),
 event text NOT NULL CHECK(event IN ('artwork_inquiry','commission_inquiry','commission_accepted','sale_completed')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(lead_id,event)
);
CREATE TABLE public.artwork_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artwork_id text NOT NULL REFERENCES public.artwork_inventory(artwork_id),
 actor_admin_id uuid NOT NULL REFERENCES public.admins(id), previous_status text NOT NULL, status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.pod_profile() RETURNS public.admins
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.admins;
BEGIN
 SELECT * INTO p FROM public.admins WHERE auth_user_id=auth.uid() AND active
 AND project_key='pulse-of-divinity' AND role IN ('owner','client','staff');
 IF p.id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.pod_profile() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pod_profile() TO authenticated,service_role;

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY pod_read_commissions ON public.commissions FOR SELECT TO authenticated USING ((public.pod_profile()).id IS NOT NULL);
CREATE POLICY pod_read_events ON public.lead_events FOR SELECT TO authenticated USING ((public.pod_profile()).id IS NOT NULL);
CREATE POLICY pod_read_metrics ON public.collector_metrics FOR SELECT TO authenticated USING ((public.pod_profile()).id IS NOT NULL);
CREATE POLICY pod_read_artwork ON public.artwork_inventory FOR SELECT TO authenticated USING ((public.pod_profile()).id IS NOT NULL);
CREATE POLICY pod_read_artwork_events ON public.artwork_events FOR SELECT TO authenticated USING ((public.pod_profile()).id IS NOT NULL);
-- No direct client mutations; audited RPCs provide the only authenticated path.
GRANT SELECT ON public.commissions,public.lead_events,public.collector_metrics,public.artwork_inventory,public.artwork_events TO authenticated;

CREATE OR REPLACE FUNCTION public.pod_set_availability(p_artwork_id text,p_status text,p_updated_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.admins; item public.artwork_inventory; old_status text;
BEGIN
 actor:=public.pod_profile();
 IF actor.role NOT IN ('owner','client') THEN RAISE EXCEPTION 'Artwork editing denied' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('available','reserved','sold') THEN RAISE EXCEPTION 'Invalid artwork status'; END IF;
 SELECT * INTO item FROM public.artwork_inventory WHERE artwork_id=p_artwork_id FOR UPDATE;
 IF item.artwork_id IS NULL THEN RAISE EXCEPTION 'Artwork not found'; END IF;
 IF item.updated_at IS DISTINCT FROM p_updated_at THEN RAISE EXCEPTION 'Artwork changed; refresh before saving' USING ERRCODE='40001'; END IF;
 -- Do not interfere with a separately scoped Stripe checkout reservation.
 IF item.reservation_token IS NOT NULL THEN RAISE EXCEPTION 'Active commerce reservation requires review'; END IF;
 old_status:=item.inventory_status;
 UPDATE public.artwork_inventory SET inventory_status=p_status,
 sold_at=CASE WHEN p_status='sold' THEN coalesce(sold_at,now()) ELSE NULL END
 WHERE artwork_id=p_artwork_id RETURNING * INTO item;
 IF old_status<>p_status THEN
 INSERT INTO public.artwork_events(artwork_id,actor_admin_id,previous_status,status) VALUES(p_artwork_id,actor.id,old_status,p_status);
 END IF;
 RETURN to_jsonb(item);
END $$;
REVOKE ALL ON FUNCTION public.pod_set_availability(text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pod_set_availability(text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.pod_update_commission(p_lead_id uuid,p_changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.admins; result public.commissions; before_row public.commissions;
BEGIN
 actor:=public.pod_profile();
 PERFORM 1 FROM public.leads WHERE id=p_lead_id AND inquiry_type='commission' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commission inquiry not found'; END IF;
 IF jsonb_typeof(p_changes)<>'object' OR p_changes - ARRAY['brief','quote_cents','approval','deposit_status','delivery_date','stage'] <> '{}'::jsonb THEN RAISE EXCEPTION 'Invalid commission fields'; END IF;
 INSERT INTO public.commissions(lead_id,brief) SELECT id,message FROM public.leads WHERE id=p_lead_id ON CONFLICT DO NOTHING;
 SELECT * INTO before_row FROM public.commissions WHERE lead_id=p_lead_id;
 result:=jsonb_populate_record(before_row,p_changes);
 IF length(result.brief)>10000 THEN RAISE EXCEPTION 'Brief too long'; END IF;
 IF result.stage IN ('accepted','creating','delivered') AND (result.approval<>'approved' OR result.quote_cents IS NULL) THEN RAISE EXCEPTION 'Approved quote required'; END IF;
 UPDATE public.commissions SET brief=result.brief,quote_cents=result.quote_cents,approval=result.approval,
 deposit_status=result.deposit_status,delivery_date=result.delivery_date,stage=result.stage,updated_at=now()
 WHERE lead_id=p_lead_id RETURNING * INTO result;
 INSERT INTO public.lead_events(lead_id,actor_admin_id,kind,changes) VALUES(p_lead_id,actor.id,'commission',p_changes);
 IF result.stage IN ('accepted','creating','delivered') THEN
 INSERT INTO public.collector_metrics(lead_id,event) VALUES(p_lead_id,'commission_accepted') ON CONFLICT DO NOTHING;
 END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.pod_update_commission(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pod_update_commission(uuid,jsonb) TO authenticated;

-- Atomic, rate-limited intake, accessible only by the existing public edge function.
CREATE OR REPLACE FUNCTION public.pod_create_inquiry(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.leads; item public.artwork_inventory; result uuid; fingerprint text;
 email_key text:=lower(trim(p_payload->>'email')); request_key text:=p_payload->>'submissionId';
BEGIN
 IF length(request_key) NOT BETWEEN 16 AND 100 OR length(trim(p_payload->>'name')) NOT BETWEEN 1 AND 200
 OR email_key !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 OR length(email_key)>254 OR length(trim(p_payload->>'message')) NOT BETWEEN 1 AND 10000
 OR p_payload->>'inquiryType' NOT IN ('available_work','commission','general')
 OR p_payload->>'contactMethod' NOT IN ('email','call','text') THEN RAISE EXCEPTION 'Invalid inquiry'; END IF;
 fingerprint:=md5(p_payload::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(email_key,0));
 SELECT * INTO existing FROM public.leads WHERE submission_id=request_key;
 IF existing.id IS NOT NULL THEN
 IF existing.request_fingerprint IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'Request key already used' USING ERRCODE='23505'; END IF;
 RETURN jsonb_build_object('success',true,'id',existing.id,'duplicate',true);
 END IF;
 IF (SELECT count(*) FROM public.leads WHERE lower(email)=email_key AND created_at>now()-interval '1 hour')>=5 THEN
 RAISE EXCEPTION 'Please wait before sending another inquiry' USING ERRCODE='P0003'; END IF;
 IF p_payload->>'inquiryType'='available_work' THEN
 SELECT * INTO item FROM public.artwork_inventory WHERE artwork_id=p_payload->>'artworkId';
 IF item.artwork_id IS NULL THEN RAISE EXCEPTION 'Unknown artwork'; END IF;
 END IF;
 INSERT INTO public.leads(submission_id,name,email,phone,contact_method,inquiry_type,interest,artwork_id,artwork_title,
 artwork_collection,artwork_price_display,artwork_price_numeric,message,request_fingerprint)
 VALUES(request_key,trim(p_payload->>'name'),email_key,nullif(p_payload->>'phone',''),p_payload->>'contactMethod',p_payload->>'inquiryType',
 CASE WHEN item.artwork_id IS NOT NULL THEN item.artwork_title ELSE p_payload->>'inquiryType' END,
 item.artwork_id,item.artwork_title,item.artwork_collection,NULL,item.price_cents/100.0,trim(p_payload->>'message'),fingerprint) RETURNING id INTO result;
 IF p_payload->>'inquiryType'='commission' THEN
 INSERT INTO public.commissions(lead_id,brief) VALUES(result,trim(p_payload->>'message'));
 END IF;
 IF p_payload->>'inquiryType' IN ('available_work','commission') THEN
 INSERT INTO public.collector_metrics(lead_id,event) VALUES(result,CASE WHEN p_payload->>'inquiryType'='commission' THEN 'commission_inquiry' ELSE 'artwork_inquiry' END);
 END IF;
 RETURN jsonb_build_object('success',true,'id',result,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.pod_create_inquiry(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_create_inquiry(jsonb) TO service_role;

-- Audit existing CRM updates too, including assignment and follow-up movements.
CREATE OR REPLACE FUNCTION public.pod_audit_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.lead_events(lead_id,actor_admin_id,kind,changes)
 VALUES(NEW.id,(SELECT id FROM public.admins WHERE auth_user_id=auth.uid()),'collector',
 jsonb_build_object('before',jsonb_build_object('status',OLD.status,'assigned_admin_id',OLD.assigned_admin_id,'follow_up_at',OLD.follow_up_at,'outcome',OLD.outcome,'archived',OLD.archived),
 'after',jsonb_build_object('status',NEW.status,'assigned_admin_id',NEW.assigned_admin_id,'follow_up_at',NEW.follow_up_at,'outcome',NEW.outcome,'archived',NEW.archived)));
 IF NEW.status='WON' AND NEW.outcome='Artwork Sale' THEN
 INSERT INTO public.collector_metrics(lead_id,event) VALUES(NEW.id,'sale_completed') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pod_audit_lead AFTER UPDATE ON public.leads FOR EACH ROW
 WHEN (ROW(OLD.status,OLD.assigned_admin_id,OLD.follow_up_at,OLD.outcome,OLD.archived) IS DISTINCT FROM ROW(NEW.status,NEW.assigned_admin_id,NEW.follow_up_at,NEW.outcome,NEW.archived)) EXECUTE FUNCTION public.pod_audit_lead();

CREATE OR REPLACE FUNCTION public.pod_update_lead(p_id uuid,p_changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.leads;
BEGIN
 PERFORM public.pod_profile();
 IF jsonb_typeof(p_changes)<>'object' OR p_changes - ARRAY['status','assigned_admin_id','follow_up_at','outcome','archived','archived_at','updated_at'] <> '{}'::jsonb THEN RAISE EXCEPTION 'Invalid fields'; END IF;
 SELECT * INTO result FROM public.leads WHERE id=p_id FOR UPDATE;
 IF result.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
 result:=jsonb_populate_record(result,p_changes);
 IF result.status IS NULL OR result.status NOT IN ('NEW','CONTACTED','ACTIVE_CONVERSATION','FOLLOW_UP','QUALIFIED','WON','CLOSED') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF result.assigned_admin_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.admins WHERE id=result.assigned_admin_id AND active AND project_key='pulse-of-divinity' AND role IN ('owner','client','staff')) THEN RAISE EXCEPTION 'Invalid assignment'; END IF;
 IF result.outcome IS NOT NULL AND result.outcome NOT IN ('Artwork Sale','Commission Secured','Not Ready','No Response','Not a Fit','Other') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 UPDATE public.leads SET status=result.status,assigned_admin_id=result.assigned_admin_id,follow_up_at=result.follow_up_at,outcome=result.outcome,archived=result.archived,
 archived_at=CASE WHEN result.archived THEN coalesce(result.archived_at,now()) ELSE NULL END WHERE id=p_id RETURNING * INTO result;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.pod_update_lead(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pod_update_lead(uuid,jsonb) TO authenticated;
