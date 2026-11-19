import { test as base, expect, type BrowserContext } from '@playwright/test';
import { collectorDatabase, people, type Role, type CollectorFixture } from './collectorDatabase';

type Fixture = CollectorFixture & {
  requests: {summary:number; intake:number; publicReads:number};
  intakeKeys: string[];
  failNextIntake: boolean;
  loseNextIntakeReply: boolean;
  failPublicReads: boolean;
  malformedWriteReply: boolean;
  holdNextIntake: () => () => void;
  setup: (context: BrowserContext, role?: Role) => Promise<void>;
};
export const test = base.extend<{ collector: Fixture }>({
  collector: async ({ browserName }, provideFixture) => {
    void browserName;
    const database = await collectorDatabase();
    let intakeBarrier: Promise<void> | null = null;
    const fixture: Fixture = {...database,
      requests:{summary:0,intake:0,publicReads:0},intakeKeys:[],failNextIntake:false,loseNextIntakeReply:false,
      failPublicReads:false,malformedWriteReply:false,
      holdNextIntake() {
        let release!: () => void;
        intakeBarrier = new Promise<void>(resolve => { release = resolve; });
        return release;
      },
      async setup(context, role='client') {
        await context.addInitScript(({role,person}) => {
          localStorage.setItem('pod_admin_session',JSON.stringify({access_token:`fixture-${role}`,refresh_token:'fixture-refresh',
            expires_at:Math.floor(Date.now()/1000)+3600,user_id:person.user,email:`${role}@example.test`}));
          sessionStorage.setItem('pod-entrance-played','1');
        },{role,person:people[role]});
        // All non-local traffic is denied. Every API response below is fixture-only.
        await context.route('**/*',async route => {
          const url=new URL(route.request().url());
          const reply=(value:unknown,status=200) => route.fulfill({status,json:value,headers:{
            'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*',
            'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store',
          }});
          if (route.request().method()==='OPTIONS') return reply(null);
          if (!url.pathname.startsWith('/functions/v1/') && !url.pathname.startsWith('/rest/v1/')) {
            return url.hostname==='127.0.0.1' || url.hostname==='localhost' ? route.continue() : route.abort('blockedbyclient');
          }
          const token=route.request().headers().authorization?.replace('Bearer fixture-','');
          const actor: Role | undefined=token && Object.hasOwn(people,token) ? token as Role : undefined;
          const path=url.pathname.split('/').pop();
          try {
            if(path==='get-commerce-availability') {
              ++fixture.requests.publicReads;
              if(fixture.failPublicReads)return reply({error:'fixture unavailable'},503);
              return reply((await fixture.db.query('SELECT artwork_id,price_cents,currency,inventory_status AS status FROM artwork_inventory ORDER BY artwork_id')).rows);
            }
            if(path==='create-lead') {
              ++fixture.requests.intake;
              fixture.intakeKeys.push(route.request().postDataJSON().submissionId);
              const barrier = intakeBarrier; intakeBarrier = null;
              if (barrier) await barrier;
              if(fixture.failNextIntake){fixture.failNextIntake=false;return reply({error:'fixture failure'},500);}
              const result=await fixture.db.query<{saved:{id:string;duplicate:boolean}}>('SELECT pod_create_inquiry($1::jsonb) saved',[JSON.stringify(route.request().postDataJSON())]);
              if(fixture.loseNextIntakeReply){fixture.loseNextIntakeReply=false;return route.abort('failed');}
              return reply(result.rows[0].saved,result.rows[0].saved.duplicate?200:201);
            }
            if(!actor)return reply({error:'fixture authentication required'},401);
            if(path==='get-me')return reply({id:people[actor].admin,auth_user_id:people[actor].user,display_name:people[actor].name,email:`${actor}@example.test`,role:actor});
            if(path==='artwork_inventory')return reply((await fixture.asRole(actor,'SELECT artwork_id,inventory_status,updated_at::text FROM artwork_inventory ORDER BY artwork_id')).rows);
            if(path==='pod_set_availability') {
              const body=route.request().postDataJSON();
              const result=await fixture.asRole<{saved:unknown}>(actor,'SELECT pod_set_availability($1,$2,$3) saved',[body.p_artwork_id,body.p_status,body.p_updated_at]);
              return reply(fixture.malformedWriteReply?{}:result.rows[0].saved);
            }
            if(path==='dashboard-summary') {
              ++fixture.requests.summary;
              const counts=(await fixture.db.query<{new:number;active:number;won:number;unassigned:number}>(`SELECT
                count(*) FILTER(WHERE status='NEW' AND NOT archived)::int AS new,
                count(*) FILTER(WHERE status IN ('CONTACTED','ACTIVE_CONVERSATION','FOLLOW_UP','QUALIFIED') AND NOT archived)::int AS active,
                count(*) FILTER(WHERE status='WON' AND NOT archived)::int AS won,
                count(*) FILTER(WHERE assigned_admin_id IS NULL AND NOT archived)::int AS unassigned FROM leads`)).rows[0];
              const recent=(await fixture.db.query('SELECT * FROM leads WHERE NOT archived ORDER BY created_at DESC LIMIT 5')).rows;
              return reply({summary:{...counts,due_today:0,overdue:0},recent,attention:[],pending_quotes:0,upcoming:[]});
            }
            if(path==='pod_attention')return reply((await fixture.asRole<{saved:unknown}>(actor,'SELECT pod_attention() saved')).rows[0].saved);
            if(path==='get-lead') {
              const rows=(await fixture.db.query('SELECT * FROM leads WHERE id=$1',[url.searchParams.get('id')])).rows;
              return reply(rows[0]??{error:'not found'},rows.length?200:404);
            }
            if(path==='update-lead') {
              const {id,...changes}=route.request().postDataJSON();
              return reply((await fixture.asRole<{saved:unknown}>(actor,'SELECT pod_update_lead($1,$2::jsonb) saved',[id,JSON.stringify(changes)])).rows[0].saved);
            }
            if(path==='list-leads')return reply({leads:(await fixture.db.query('SELECT * FROM leads WHERE NOT archived ORDER BY created_at DESC')).rows,total:1,page:1,page_size:25,total_pages:1});
            if(path==='list-admins')return reply(Object.entries(people).map(([role,p])=>({id:p.admin,display_name:p.name,email:`${role}@example.test`})));
            if(path==='list-notes')return reply({notes:(await fixture.db.query('SELECT * FROM lead_notes WHERE lead_id=$1',[url.searchParams.get('lead_id')])).rows});
            if(path==='add-note') {
              const body=route.request().postDataJSON();
              return reply((await fixture.db.query('INSERT INTO lead_notes(lead_id,author_admin_id,body) VALUES($1,$2,$3) RETURNING *',[body.lead_id,people[actor].admin,body.body])).rows[0]);
            }
            const leadId=url.searchParams.get('lead_id')?.replace(/^eq\./,'');
            if(path==='commissions')return reply((await fixture.asRole(actor,'SELECT * FROM commissions WHERE lead_id=$1',[leadId])).rows);
            if(path==='lead_events')return reply((await fixture.asRole(actor,'SELECT * FROM lead_events WHERE lead_id=$1 ORDER BY created_at DESC',[leadId])).rows);
            if(path==='concierge_handoffs')return reply((await fixture.asRole(actor,'SELECT * FROM concierge_handoffs WHERE lead_id=$1',[leadId])).rows);
            return reply({error:'Unimplemented fixture route'},404);
          } catch(error) {
            const code=(error as {code?:string}).code;
            return reply({code,error:'Disposable fixture rejected request'},code==='42501'?403:code==='40001'?409:400);
          }
        });
      },
    };
    try { await provideFixture(fixture); } finally { await fixture.db.close(); }
  },
});
export {expect};
