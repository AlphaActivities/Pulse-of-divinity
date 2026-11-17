import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Operates only on explicit, verified exports; never reads live credentials.
export function reconcile(source,approval){
 const fail=()=>{throw new Error('Reconciliation blocked: incomplete classification or invalid relationship. Review the private export and approval manifest.');};
 const tests=new Set(approval.testLeadIds),real=new Set(approval.realLeadIds),notes=new Set(approval.realNoteIds);
 if(tests.size!==2||[...tests].some(id=>real.has(id)))fail();
 const sourceLeads=new Map(source.leads.map(row=>[row.id,row]));
 if([...tests,...real].some(id=>!sourceLeads.has(id))||[...sourceLeads.keys()].some(id=>!tests.has(id)&&!real.has(id)))fail();
 const mapping=approval.adminMappings??{};
 const targetAdmins=new Set(Object.values(mapping));
 if(Object.values(mapping).some(id=>typeof id!=='string'||!id)||targetAdmins.size!==Object.keys(mapping).length)fail();
 const leads=source.leads.filter(row=>real.has(row.id)).map(row=>{
  if(row.assigned_admin_id&&!mapping[row.assigned_admin_id])fail();
  return {...row,assigned_admin_id:row.assigned_admin_id?mapping[row.assigned_admin_id]:null};
 });
 const selectedNotes=[];
 for(const note of source.lead_notes){
  if(tests.has(note.lead_id)){if(notes.has(note.id))fail();continue;}
  if(!notes.has(note.id)||!real.has(note.lead_id)||!mapping[note.author_admin_id])fail();
  selectedNotes.push({...note,author_admin_id:mapping[note.author_admin_id]});
 }
 if([...notes].some(id=>!selectedNotes.some(row=>row.id===id)))fail();
 // Catalog state is separately approved; an empty list is never interpreted as approval.
 const approvedArtwork=new Set(approval.artworkIds);
 const inventory=(source.artwork_inventory??[]).filter(row=>approvedArtwork.has(row.artwork_id));
 if(inventory.some(row=>row.reservation_token||row.stripe_checkout_session_id))fail();
 if(inventory.length!==approvedArtwork.size||inventory.some(row=>!['available','reserved','sold'].includes(row.inventory_status)))fail();
 return {leads,lead_notes:selectedNotes,artwork_inventory:inventory};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [sourcePath,approvalPath,outputPath]=process.argv.slice(2);
  if(!sourcePath||!approvalPath||!outputPath)throw new Error('Usage: node scripts/reconcile-records.mjs SOURCE_JSON APPROVAL_JSON OUTPUT_JSON');
  if(resolve(outputPath).startsWith(resolve('.')+'/'))throw new Error('Write private reconciliation output outside the repository.');
  const result=reconcile(JSON.parse(await readFile(sourcePath,'utf8')),JSON.parse(await readFile(approvalPath,'utf8')));
  await writeFile(outputPath,JSON.stringify(result),{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({approvedLeads:result.leads.length,approvedNotes:result.lead_notes.length,approvedArtwork:result.artwork_inventory.length}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
