-- Destination only, after managed secrets and function smoke tests pass.
-- Requires pg_cron, pg_net, and Vault in the approved Supabase project.
-- Create Vault secrets pod_dispatch_key and pod_anon_key securely via account
-- settings, and match pod_dispatch_key to the managed PUSH_DISPATCH_KEY.
-- Do not paste secret values into this file, migrations, SQL history, or reports.
DO $$ BEGIN
 IF current_setting('app.settings.project_ref',true) IS DISTINCT FROM 'fxxrkwitncaraotvkyte' THEN
 RAISE EXCEPTION 'Verify destination and set the session project_ref before scheduling'; END IF;
 IF (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('pod_dispatch_key','pod_anon_key'))<>2 THEN
 RAISE EXCEPTION 'Required managed Vault bindings are missing'; END IF;
END $$;
SELECT cron.schedule('pod-push-delivery','* * * * *', $schedule$
 SELECT net.http_post(
 url:='https://fxxrkwitncaraotvkyte.supabase.co/functions/v1/push-delivery',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='pod_anon_key'),'x-pod-dispatch-key',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='pod_dispatch_key')),
 body:='{}'::jsonb
 );
$schedule$);
-- To disable: SELECT cron.unschedule('pod-push-delivery');
