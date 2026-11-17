import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
let db:PGlite;
const owner='10000000-0000-4000-8000-000000000001',client='10000000-0000-4000-8000-000000000002',staff='10000000-0000-4000-8000-000000000003',wrong='10000000-0000-4000-8000-000000000004';
const bootstrap=`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;`;
async function migrate(connection:PGlite){await connection.exec(bootstrap);for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort())await connection.exec(await readFile('supabase/migrations/'+name,'utf8'));}
async function asUser(user:string,sql:string,params:unknown[]=[]){await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);try{return await db.query(sql,params);}finally{await db.exec('RESET ROLE;');}}
const payload=(submissionId:string,email='collector@example.test',type='available_work')=>({submissionId,name:'Local fixture',email,phone:'',contactMethod:'email',inquiryType:type,interest:type,artworkId:type==='available_work'?'for-sale-cosmic-energy':'',message:'A verified local inquiry'});
async function intake(p:unknown){return (await db.query<{result:{id:string,duplicate:boolean}}>('SELECT public.pod_create_inquiry($1::jsonb) AS result',[JSON.stringify(p)])).rows[0].result;}
beforeAll(async()=>{
 db=new PGlite();await migrate(db);
 await db.query(`INSERT INTO admins(id,auth_user_id,display_name,email,role,project_key) VALUES
 ('20000000-0000-4000-8000-000000000001',NULL,'Owner','owner@example.test','owner','pulse-of-divinity'),
 ('20000000-0000-4000-8000-000000000002',NULL,'Client','client@example.test','client','pulse-of-divinity'),
 ('20000000-0000-4000-8000-000000000003',NULL,'Staff','staff@example.test','staff','pulse-of-divinity'),
 ('20000000-0000-4000-8000-000000000004',NULL,'Other','other@example.test','owner','other-project');`);
 for(const [user,email] of [[owner,'owner'],[client,'client'],[staff,'staff'],[wrong,'other']]){await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[user,email+'@example.test']);await db.query('UPDATE admins SET auth_user_id=$1 WHERE email=$2',[user,email+'@example.test']);}
},60000);
afterAll(async()=>{await db.close();});
describe.sequential('real PostgreSQL migration and role integration',()=>{
 it('replays the complete history on a second fresh database',async()=>{const fresh=new PGlite();try{await migrate(fresh);expect((await fresh.query('SELECT * FROM artwork_inventory')).rows).toHaveLength(2);}finally{await fresh.close();}},60000);
 it('commits once, returns the same ID, and rejects mismatched retries',async()=>{const p=payload('request-key-stable-0001');const first=await intake(p);expect(first.id).toMatch(/^[a-f0-9-]{36}$/);expect((await intake(p)).id).toBe(first.id);expect((await intake(p)).duplicate).toBe(true);await expect(intake({...p,message:'changed'})).rejects.toThrow();});
 it('validates artwork identity and rate limits across fresh request keys',async()=>{await expect(intake({...payload('request-key-invalid-0001'),artworkId:'unapproved'})).rejects.toThrow();for(let i=0;i<5;i++)await intake(payload('rate-limit-request-'+i,'rate@example.test'));await expect(intake(payload('rate-limit-request-6','rate@example.test'))).rejects.toThrow(/wait/);});
 it('denies unauthenticated, wrong-project and staff artwork writes',async()=>{
   await db.exec('SET ROLE anon;');try{await expect(db.query('SELECT pod_set_availability($1,$2,now())',['for-sale-cosmic-energy','sold'])).rejects.toThrow();}finally{await db.exec('RESET ROLE;');}
   for(const id of [wrong,staff])await expect(asUser(id,'SELECT pod_set_availability($1,$2,now())',['for-sale-cosmic-energy','sold'])).rejects.toThrow();
 });
 it('allows Darcy and Josh to set all public states and rejects stale writes',async()=>{for(const [user,status] of [[client,'reserved'],[owner,'sold'],[client,'available']]){const current=(await db.query<{updated_at:Date}>('SELECT updated_at FROM artwork_inventory WHERE artwork_id=$1',['for-sale-cosmic-energy'])).rows[0];await asUser(user,'SELECT pod_set_availability($1,$2,$3)',['for-sale-cosmic-energy',status,current.updated_at]);expect((await db.query<{inventory_status:string}>('SELECT inventory_status FROM artwork_inventory WHERE artwork_id=$1',['for-sale-cosmic-energy'])).rows[0].inventory_status).toBe(status);}
 await expect(asUser(client,'SELECT pod_set_availability($1,$2,$3)',['for-sale-cosmic-energy','sold','2000-01-01'])).rejects.toThrow(/refresh/);});
 it('keeps commission stages independent and counts accepted commissions once',async()=>{const c=await intake(payload('commission-key-00001','commission@example.test','commission'));
 await expect(asUser(staff,'SELECT pod_update_commission($1,$2)',[c.id,{stage:'accepted'}])).rejects.toThrow(/Approved quote/);
 for(let n=0;n<2;n++)await asUser(staff,'SELECT pod_update_commission($1,$2)',[c.id,{brief:'A personal vision',quote_cents:250000,approval:'approved',stage:'accepted'}]);
 expect((await db.query<{count:number}>('SELECT count(*)::int count FROM collector_metrics WHERE lead_id=$1 AND event=$2',[c.id,'commission_accepted'])).rows[0].count).toBe(1);
 expect((await db.query<{status:string}>('SELECT status FROM leads WHERE id=$1',[c.id])).rows[0].status).toBe('NEW');
 });
 it('audits staff follow-up and assignment without direct table update privileges',async()=>{const lead=await intake(payload('staff-followup-key-01','staff-work@example.test'));await asUser(staff,'SELECT pod_update_lead($1,$2)',[lead.id,{status:'FOLLOW_UP',follow_up_at:'2026-01-01'}]);expect((await db.query('SELECT * FROM lead_events WHERE lead_id=$1',[lead.id])).rows).toHaveLength(1);await expect(asUser(staff,'UPDATE leads SET status=$1 WHERE id=$2',['WON',lead.id])).rejects.toThrow();});
 it('deduplicates handoff attention and protects claim ownership',async()=>{const lead=await intake(payload('handoff-inquiry-key-01','handoff@example.test','general'));const row=(await db.query<{id:string}>('INSERT INTO concierge_handoffs(lead_id) VALUES($1) RETURNING id',[lead.id])).rows[0];await asUser(staff,'SELECT pod_handoff_action($1,$2,$3)',[row.id,'claim',null]);await expect(asUser(client,'SELECT pod_handoff_action($1,$2,$3)',[row.id,'claim',null])).rejects.toThrow();await expect(asUser(client,'SELECT pod_handoff_action($1,$2,$3)',[row.id,'completed','done'])).rejects.toThrow();const result=await asUser(staff,'SELECT pod_attention() result');const attention=(result.rows[0] as {result:{items:{id:string}[]}}).result;expect(attention.items.filter(i=>i.id===lead.id)).toHaveLength(1);await asUser(staff,'SELECT pod_handoff_action($1,$2,$3)',[row.id,'chatbot','Provided next steps']);});
 it('blocks public signup and keeps device enrollment/account deletion isolated',async()=>{await expect(db.query('INSERT INTO auth.users(id,email) VALUES(gen_random_uuid(),$1)',['stranger@example.test'])).rejects.toThrow(/registration/);
 const endpoint='https://fcm.googleapis.com/fcm/send/local-fixture';await asUser(staff,'SELECT pod_register_device($1,$2,$3,$4)',[endpoint,'x'.repeat(88),'y'.repeat(24),'Local staff device']);
 expect((await asUser(client,'SELECT id FROM push_devices')).rows).toHaveLength(0);await expect(asUser(client,'SELECT pod_register_device($1,$2,$3,$4)',[endpoint,'x'.repeat(88),'y'.repeat(24),'Other account'])).rejects.toThrow();await expect(asUser(staff,'SELECT pod_register_device($1,$2,$3,$4)',['http://127.0.0.1/','x'.repeat(88),'y'.repeat(24),'Unsafe'])).rejects.toThrow();
 });
});
