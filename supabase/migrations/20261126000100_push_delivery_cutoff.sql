CREATE OR REPLACE FUNCTION public.pod_queue_followups_after(p_cutoff timestamptz) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 INSERT INTO public.push_outbox(kind,lead_id,dedupe_key)
 SELECT 'follow_ups',id,to_char((now() AT TIME ZONE 'America/Los_Angeles')::date,'YYYY-MM-DD')
 FROM public.leads WHERE created_at >= p_cutoff AND NOT archived AND status NOT IN ('WON','CLOSED') AND follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date
 ON CONFLICT DO NOTHING
$$;
CREATE OR REPLACE FUNCTION public.pod_device_events_after(p_device_id uuid, p_cutoff timestamptz) RETURNS SETOF public.push_outbox
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT e.* FROM public.push_outbox e JOIN public.leads l ON l.id=e.lead_id
 JOIN public.push_devices device ON device.id=p_device_id
 JOIN public.admins a ON a.id=device.admin_id AND a.active AND a.project_key='pulse-of-divinity' AND a.role IN ('owner','client','staff')
 LEFT JOIN public.notification_preferences p ON p.admin_id=device.admin_id
 LEFT JOIN public.push_deliveries d ON d.event_id=e.id AND d.device_id=device.id
 WHERE e.created_at >= p_cutoff AND l.created_at >= p_cutoff
 AND device.receipt_confirmed_at IS NOT NULL AND NOT l.archived AND l.status NOT IN ('WON','CLOSED')
 AND (d.event_id IS NULL OR (d.status IN ('failed','sending') AND d.attempts<5 AND d.attempt_at<now()-interval '2 minutes'))
 AND CASE e.kind WHEN 'website_inquiries' THEN coalesce(p.website_inquiries,true) AND l.status='NEW' AND NOT EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id)
 WHEN 'chatbot_handoffs' THEN coalesce(p.chatbot_handoffs,true) AND EXISTS(SELECT 1 FROM public.concierge_handoffs h WHERE h.lead_id=l.id AND h.state IN ('pending','claimed'))
 WHEN 'follow_ups' THEN coalesce(p.follow_ups,true) AND l.follow_up_at<=(now() AT TIME ZONE 'America/Los_Angeles')::date AND e.dedupe_key=to_char((now() AT TIME ZONE 'America/Los_Angeles')::date,'YYYY-MM-DD') ELSE false END
 ORDER BY e.created_at LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.pod_queue_followups_after(timestamptz),public.pod_device_events_after(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_queue_followups_after(timestamptz),public.pod_device_events_after(uuid,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.pod_register_device(p_endpoint text,p_p256dh text,p_auth text,p_label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.admins; result uuid;
BEGIN
 actor:=public.pod_profile();
 IF p_endpoint !~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]*push\.services\.mozilla\.com|[a-z0-9.-]*web\.push\.apple\.com)/' OR length(p_endpoint)>4096
 OR length(p_p256dh) NOT BETWEEN 40 AND 200 OR length(p_auth) NOT BETWEEN 10 AND 100 OR length(trim(p_label)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invalid device'; END IF;
 IF EXISTS(SELECT 1 FROM public.push_devices WHERE endpoint=p_endpoint AND admin_id<>actor.id) THEN RAISE EXCEPTION 'Device belongs to another account; remove it before switching'; END IF;
 INSERT INTO public.push_devices(admin_id,endpoint,p256dh,auth,label) VALUES(actor.id,p_endpoint,p_p256dh,p_auth,p_label)
 ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,label=EXCLUDED.label,last_seen_at=now()
 WHERE push_devices.admin_id=actor.id
 RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Device belongs to another account; remove it before switching'; END IF;
 RETURN result;
END $$;
