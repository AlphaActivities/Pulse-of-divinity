CREATE TABLE public.contact_email_deliveries (
  event_id uuid NOT NULL REFERENCES public.push_outbox(id),
  admin_id uuid NOT NULL REFERENCES public.admins(id),
  status text NOT NULL CHECK (status IN ('sending','accepted','failed')),
  attempts integer NOT NULL DEFAULT 1,
  attempt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, admin_id)
);
ALTER TABLE public.contact_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_email_deliveries FROM PUBLIC, anon, authenticated;
GRANT UPDATE(status), SELECT(event_id, admin_id, status, attempts) ON public.contact_email_deliveries TO service_role;

CREATE FUNCTION public.pod_claim_contact_emails(p_cutoff timestamptz, p_recipients text[])
RETURNS TABLE (event_id uuid, admin_id uuid, email text)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH candidates AS (
    SELECT e.id AS event_id, a.id AS admin_id, lower(a.email) AS email
    FROM public.push_outbox e
    JOIN public.leads l ON l.id=e.lead_id
    JOIN public.admins a ON a.active AND a.project_key='pulse-of-divinity'
      AND a.role IN ('owner','client','staff') AND lower(a.email)=ANY(p_recipients)
    LEFT JOIN public.notification_preferences p ON p.admin_id=a.id
    LEFT JOIN public.contact_email_deliveries d ON d.event_id=e.id AND d.admin_id=a.id
    WHERE e.kind='website_inquiries' AND NOT l.archived
      AND coalesce(p.website_inquiries,true)
      AND e.created_at >= greatest(p_cutoff,now()-interval '12 hours')
      AND l.created_at >= p_cutoff
      AND (d.event_id IS NULL OR (d.status IN ('failed','sending') AND d.attempts<5 AND d.attempt_at<now()-interval '2 minutes'))
    ORDER BY e.created_at, e.id, a.id LIMIT 20
  ), claimed AS (
    INSERT INTO public.contact_email_deliveries AS d(event_id,admin_id,status)
    SELECT c.event_id,c.admin_id,'sending' FROM candidates c
    ON CONFLICT ON CONSTRAINT contact_email_deliveries_pkey DO UPDATE
      SET status='sending', attempt_at=now(), attempts=d.attempts+1
      WHERE d.status IN ('failed','sending') AND d.attempts<5 AND d.attempt_at<now()-interval '2 minutes'
    RETURNING d.event_id,d.admin_id
  )
  SELECT c.event_id,c.admin_id,c.email FROM claimed k JOIN candidates c
    ON c.event_id=k.event_id AND c.admin_id=k.admin_id;
$$;
REVOKE ALL ON FUNCTION public.pod_claim_contact_emails(timestamptz,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pod_claim_contact_emails(timestamptz,text[]) TO service_role;
