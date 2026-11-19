import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const people = {
  client: { user: '10000000-0000-4000-8000-000000000001', admin: '20000000-0000-4000-8000-000000000001', name: 'Fixture Darcy' },
  staff: { user: '10000000-0000-4000-8000-000000000002', admin: '20000000-0000-4000-8000-000000000002', name: 'Fixture Heber' },
  owner: { user: '10000000-0000-4000-8000-000000000003', admin: '20000000-0000-4000-8000-000000000003', name: 'Fixture Josh' },
};
export type Role = keyof typeof people;
export async function collectorDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;`);
  for (const name of (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile('supabase/migrations/' + name, 'utf8'));
  }
  for (const [role, person] of Object.entries(people)) {
    const email = `${role}@example.test`;
    await db.query('INSERT INTO admins(id,display_name,email,role) VALUES($1,$2,$3,$4)', [person.admin,person.name,email,role]);
    await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)', [person.user,email]);
    await db.query('UPDATE admins SET auth_user_id=$1 WHERE id=$2', [person.user,person.admin]);
  }
  async function asRole<T>(role: Role, sql: string, values: unknown[] = []) {
    return db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE authenticated;');
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [people[role].user]);
      return tx.query<T>(sql,values);
    });
  }
  async function createInquiry(kind: 'available_work' | 'commission' = 'available_work') {
    const key = randomUUID();
    const payload = { submissionId:key, name:'Fixture Collector', email:`collector-${key}@example.test`, phone:'',
      contactMethod:'email', inquiryType:kind, interest:kind,
      artworkId:kind==='available_work'?'for-sale-cosmic-energy':'', message:'Disposable fixture inquiry' };
    const result = await db.query<{saved:{id:string}}>('SELECT pod_create_inquiry($1::jsonb) saved', [JSON.stringify(payload)]);
    return result.rows[0].saved.id;
  }
  return {db,asRole,createInquiry};
}
export type CollectorFixture = Awaited<ReturnType<typeof collectorDatabase>>;
