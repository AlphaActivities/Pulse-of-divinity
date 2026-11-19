// Direct HTTP handler integration with deterministic Auth/PostgREST responses.
// No network access, staff accounts, or production credentials are used.
const handlers: Array<(request: Request) => Response | Promise<Response>> = [];
const originalServe = Deno.serve;
Deno.serve = ((handler: (request: Request) => Response | Promise<Response>) => {
  handlers.push(handler); return {};
}) as unknown as typeof Deno.serve;
Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'local-service-fixture');
Deno.env.set('SUPABASE_ANON_KEY', 'local-anon-fixture');
await import('../supabase/functions/create-lead/index.ts');
await import('../supabase/functions/get-me/index.ts');
await import('../supabase/functions/update-lead/index.ts');
await import('../supabase/functions/get-commerce-availability/index.ts');
Deno.serve = originalServe;
const [intake, profile, update, catalog] = handlers;
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
const id = '10000000-0000-4000-8000-000000000001';
const valid = {submissionId:'stable-local-request-key',name:'Local fixture',email:'fixture@example.test',phone:'',contactMethod:'email',inquiryType:'commission',interest:'commission',artworkId:'',artworkTitle:'',artworkCollection:'',artworkPrice:'',message:'A personal vision'};
function request(body: unknown) { return new Request('http://local.test/functions/v1/create-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }
const originalFetch = globalThis.fetch;
function mock(role='staff',project='pulse-of-divinity',status=200,result:unknown={success:true,id,duplicate:false}) {
  globalThis.fetch = ((input: string | URL | Request) => {
    const url=String(input instanceof Request?input.url:input);
    if(url.includes('/auth/v1/user'))return Promise.resolve(Response.json({id,email:'local@example.test'}));
    if(url.includes('/admins'))return Promise.resolve(Response.json({id,auth_user_id:id,display_name:'Local',email:'local@example.test',active:true,role,project_key:project}));
    return Promise.resolve(Response.json(result,{status}));
  }) as typeof fetch;
}
Deno.test('intake HTTP: validation, committed ID, duplicate response and backend error',async()=>{
 try{
  mock();assert((await intake(request({...valid,name:{unexpected:true}}))).status===400,'Reject non-string field');
  mock();const saved=await intake(request(valid));assert(saved.status===201&&(await saved.json()).id===id,'Require committed ID');
  mock('staff','pulse-of-divinity',200,{success:true,id,duplicate:true});assert((await intake(request(valid))).status===200,'Duplicate is confirmed');
  mock('staff','pulse-of-divinity',500,{code:'XX000',message:'forced local failure'});assert((await intake(request(valid))).status===500,'Backend failure cannot become success');
  mock('staff','pulse-of-divinity',200,{success:true});assert((await intake(request(valid))).status===500,'Missing committed ID cannot become success');
 }finally{globalThis.fetch=originalFetch;}
});
Deno.test('private HTTP: unauthenticated and wrong-project access is denied',async()=>{
 try{
  assert((await profile(new Request('http://local.test/get-me'))).status===401,'No bearer');
  const req=()=>new Request('http://local.test/get-me',{headers:{Authorization:'Bearer local-user-fixture'}});
  mock('owner','another-project');assert((await profile(req())).status===403,'Other project owner');
  mock('unknown');assert((await profile(req())).status===403,'Wrong role');
  mock('staff');assert((await profile(req())).status===200,'Active staff');
  mock('staff','another-project');const response=await update(new Request('http://local.test/update-lead',{method:'POST',headers:{Authorization:'Bearer local-user-fixture','Content-Type':'application/json'},body:JSON.stringify({id,status:'WON'})}));assert(response.status===403,'Update wrong-project denial');
 }finally{globalThis.fetch=originalFetch;}
});
Deno.test('catalog HTTP: exact public states and no private inventory fields',async()=>{
 try{
  for(const state of ['available','reserved','sold']){
   mock('staff','pulse-of-divinity',200,[{artwork_id:'for-sale-cosmic-energy',price_cents:320000,currency:'usd',purchasable:false,inventory_status:state,reservation_token:'must-never-be-published'}]);
   const response=await catalog(new Request('http://local.test/get-commerce-availability'));const body=await response.json();assert(response.status===200&&body[0].status===state,'Actual inventory state');assert(response.headers.get('Cache-Control')==='no-store','Fresh availability response');assert(!JSON.stringify(body).includes('must-never'),'Private field excluded');
  }
 }finally{globalThis.fetch=originalFetch;}
});
