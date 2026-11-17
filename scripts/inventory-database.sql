-- Read-only inventory. Save results privately OUTSIDE this repository.
BEGIN READ ONLY;
SELECT current_database(),current_user;
SELECT schemaname,tablename,rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public';
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' ORDER BY table_name,grantee;
SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace='public'::regnamespace;
SELECT tgrelid::regclass AS relation,tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN(SELECT oid FROM pg_class WHERE relnamespace IN('public'::regnamespace,'auth'::regnamespace));
SELECT p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace;
SELECT 'admins' AS relation,count(*) FROM public.admins UNION ALL SELECT 'leads',count(*) FROM public.leads UNION ALL SELECT 'lead_notes',count(*) FROM public.lead_notes UNION ALL SELECT 'artwork_inventory',count(*) FROM public.artwork_inventory UNION ALL SELECT 'orders',count(*) FROM public.orders UNION ALL SELECT 'stripe_webhook_events',count(*) FROM public.stripe_webhook_events UNION ALL SELECT 'commerce_settings',count(*) FROM public.commerce_settings;
SELECT n.id FROM public.lead_notes n LEFT JOIN public.leads l ON l.id=n.lead_id LEFT JOIN public.admins a ON a.id=n.author_admin_id WHERE l.id IS NULL OR a.id IS NULL;
ROLLBACK;
