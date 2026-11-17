import {describe,it,expect} from 'vitest';
// @ts-expect-error Pure Node operational script intentionally has no browser types.
import {reconcile} from '../scripts/reconcile-records.mjs';
const source={leads:[{id:'test1'},{id:'test2'},{id:'real',assigned_admin_id:'old'}],lead_notes:[{id:'n1',lead_id:'test1',author_admin_id:'old'},{id:'n2',lead_id:'real',author_admin_id:'old'}],artwork_inventory:[{artwork_id:'art',inventory_status:'sold'}]};
const approval={testLeadIds:['test1','test2'],realLeadIds:['real'],realNoteIds:['n2'],adminMappings:{old:'fresh'},artworkIds:['art']};
describe('private source reconciliation',()=>{
 it('excludes both test leads and test notes while remapping valid relationships',()=>{const result=reconcile(source,approval);expect(result.leads).toEqual([{id:'real',assigned_admin_id:'fresh'}]);expect(result.lead_notes).toEqual([{id:'n2',lead_id:'real',author_admin_id:'fresh'}]);expect(result.artwork_inventory).toHaveLength(1);});
 it('fails closed for unclassified records, unknown authors, and missing test IDs',()=>{for(const change of [{realLeadIds:[]},{realNoteIds:[]},{adminMappings:{}},{testLeadIds:['test1','unknown']},{realNoteIds:['n1','n2']}])expect(()=>reconcile(source,{...approval,...change})).toThrow(/blocked/);});
});
