import {test,expect,type Page} from '@playwright/test';
const leadId='10000000-0000-4000-8000-000000000001';
async function mock(page:Page,role='client'){
 let state='available';const now='2026-11-17T00:00:00Z';
 const lead={id:leadId,name:'Local Collector',email:'collector@example.test',phone:null,contact_method:'email',inquiry_type:'commission',interest:'commission',message:'A personal vision',artwork_id:null,artwork_title:null,status:'NEW',assigned_admin_id:null,assigned_admin_name:null,follow_up_at:null,outcome:null,archived:false,created_at:now,updated_at:now};
 await page.addInitScript(()=>{sessionStorage.setItem('pod_admin_session',JSON.stringify({access_token:'local-test-fixture',refresh_token:'local-refresh-fixture',expires_at:Math.floor(Date.now()/1000)+3600,user_id:'local',email:'local@example.test'}));sessionStorage.setItem('pod-entrance-played','1');});
 await page.route('**/functions/v1/**',async route=>{
 const path=new URL(route.request().url()).pathname.split('/').pop();let response:unknown={};
 if(path==='get-me')response={id:'20000000-0000-4000-8000-000000000001',auth_user_id:'local',display_name:'Local Staff',email:'local@example.test',role};
 if(path==='dashboard-summary')response={summary:{new:1,active:0,due_today:0,overdue:0,won:0,unassigned:1},attention:[],recent:[lead]};
 if(path==='list-leads')response={leads:[lead],total:1,page:1,page_size:25,total_pages:1};
 if(path==='get-lead')response=lead;
 if(path==='list-notes'||path==='list-admins')response=path==='list-notes'?{notes:[]}:[];
 if(path==='get-commerce-availability')response=[{artwork_id:'for-sale-cosmic-energy',price_cents:320000,currency:'usd',status:state}];
 await route.fulfill({json:response});
 });
 await page.route('**/rest/v1/**',async route=>{
 const path=new URL(route.request().url()).pathname;let response:unknown=[];
 if(path.endsWith('pod_attention'))response={count:1,items:[{id:leadId,kind:'lead',name:'Local Collector',follow_up_at:null}]};
 if(path.endsWith('artwork_inventory'))response=[{artwork_id:'for-sale-cosmic-energy',inventory_status:state,updated_at:now}];
 if(path.endsWith('pod_set_availability')){state=route.request().postDataJSON().p_status;response={};}
 if(path.endsWith('commissions'))response=[{lead_id:leadId,brief:lead.message,quote_cents:null,approval:'pending',deposit_status:'not_applicable',delivery_date:null,stage:'brief'}];
 if(path.endsWith('pod_update_commission'))response={lead_id:leadId,...route.request().postDataJSON().p_changes};
 await route.fulfill({json:response});
 });
}
test('public gallery, archive, availability failure, and install manifest',async({page,request})=>{
 await mock(page);await page.goto('/');await expect(page.getByRole('heading',{name:'Available Works',exact:true})).toBeVisible();await expect(page.locator('#works').getByText('Available',{exact:true})).toBeVisible();
 await page.route('**/functions/v1/get-commerce-availability',route=>route.fulfill({status:503,json:{}}));await page.reload();await expect(page.locator('#works').getByText('Availability unverified — inquire with Darcy').first()).toBeVisible();
 await page.goto('/collected-works');await expect(page.getByRole('heading',{name:'Works Already Cherished',exact:true})).toBeVisible();
 await page.goto('/admin');await expect(page.getByRole('heading',{name:/Welcome|Collector/}).first()).toBeVisible();
 await page.waitForTimeout(1200);
 await page.screenshot({path:'/tmp/c4-'+test.info().project.name+'.png',fullPage:true});
 const manifest=await (await request.get('/app/manifest.webmanifest')).json();expect(manifest.start_url).toBe('/admin');expect(manifest.display).toBe('standalone');expect(manifest.icons.some((i:{purpose:string})=>i.purpose==='maskable')).toBeTruthy();
 await expect.poll(()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/admin');return r?.scope;})).toContain('/admin');
});
test('Darcy changes all availability states, reflected in the public gallery after reload',async({page})=>{
 await mock(page);await page.goto('/admin/artwork');const select=page.getByLabel('Cosmic Energy availability');
 for(const [status,label] of [['reserved','Reserved — ask Darcy about this work'],['sold','Sold — ask Darcy about a commission'],['available','Available']]){
 await select.selectOption(status);await expect(select).toHaveValue(status);await page.goto('/');await expect(page.locator('#works').getByText(label,{exact:true})).toBeVisible();await page.reload();await expect(page.locator('#works').getByText(label,{exact:true})).toBeVisible();await page.goto('/admin/artwork');
 }
});
test('staff cannot access owner business route or edit artwork; settings remain available',async({page})=>{
 await mock(page,'staff');await page.goto('/admin/artwork');await expect(page.getByText('Darcy and Josh manage availability.').first()).toBeVisible();await expect(page.getByLabel('Cosmic Energy availability')).toHaveCount(0);await expect(page.getByRole('button',{name:'Admin',exact:true})).toHaveCount(0);
 await page.goto('/admin/business');await expect(page).toHaveURL(/\/admin\/?$/);await page.goto('/admin/settings');await expect(page.getByRole('heading',{name:'My Settings',exact:true})).toBeVisible();
});
test('owner gets protected Admin business access',async({page})=>{await mock(page,'owner');await page.goto('/admin/business');await expect(page.getByRole('heading',{name:'Business Settings'})).toBeVisible();await expect(page.getByRole('button',{name:'Admin',exact:true})).toBeVisible();});
test('commission deep link opens editable pipeline and saves separately from collector status',async({page})=>{
 await mock(page);await page.goto('/admin/leads?lead='+leadId);await expect(page.getByRole('heading',{name:'Commission Pipeline'})).toBeVisible();await page.getByLabel('Quote (USD)').fill('2500');await page.getByRole('combobox',{name:'Approval',exact:true}).selectOption('approved');await page.getByRole('combobox', {name:'Commission stage',exact:true}).selectOption('accepted');await page.getByRole('button',{name:'Save commission'}).click();await expect(page.getByText('Commission saved.')).toBeVisible();
});
test('commission button preselects inquiry, failed save retains input, double tap and retry share one key',async({page})=>{
 await mock(page);const payloads:Record<string,unknown>[]=[];let fail=true;
 await page.route('**/functions/v1/create-lead',async route=>{payloads.push(route.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({status:fail?500:201,json:fail?{}:{success:true,id:leadId}});});
 await page.goto('/');await page.getByRole('button',{name:'Begin a Commission Conversation',exact:true}).click();await expect(page.locator('#contact').getByRole('button',{name:'Private Commission Inquiry',exact:true})).toBeVisible();await page.getByLabel('Your Name',{exact:true}).fill('Local Collector');await page.getByLabel('Email Address',{exact:true}).fill('collector@example.test');await page.locator('#contact').getByRole('button',{name:'Email',exact:true}).click();await page.locator('#f-message').fill('A personal vision');
 const submit=page.getByRole('button',{name:'Send Inquiry',exact:true});await submit.evaluate((el:HTMLButtonElement)=>{el.click();el.click();});await expect(page.getByRole('alert').filter({hasText:'not been confirmed'})).toBeVisible();expect(payloads).toHaveLength(1);await expect(page.getByLabel('Your Name',{exact:true})).toHaveValue('Local Collector');await expect(page.getByText('Your message has arrived.')).toHaveCount(0);
 fail=false;await submit.click();await expect(page.getByText('Your message has arrived.')).toBeVisible();expect(payloads).toHaveLength(2);expect(payloads[0].submissionId).toBe(payloads[1].submissionId);expect(payloads[1].inquiryType).toBe('commission');
});
test('unauthenticated direct links remain protected',async({page})=>{
 await page.goto('/admin/leads?lead='+leadId);await expect(page).toHaveURL(/\/admin\/login$/);await expect(page.locator('input[type=password]')).toBeVisible();await expect(page.getByRole('heading',{name:'Commission Pipeline'})).toHaveCount(0);
});
test('notification denial keeps settings functional without registering a device',async({page})=>{
 await mock(page);await page.addInitScript(()=>{Object.defineProperty(window,'Notification',{value:{requestPermission:async()=> 'denied'},configurable:true});});await page.goto('/admin/settings');await page.getByRole('button',{name:'Enable Notifications'}).click();await expect(page.getByRole('status')).toContainText(/not enabled|not supported/);await expect(page.getByRole('button',{name:'Refresh My Devices'})).toBeEnabled();
});
