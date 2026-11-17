import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync('public/pod-sw.js','utf8');
function worker(paths:string[]){
 const events:Record<string,(event:unknown)=>void>={};const tabs=paths.map(path=>({url:'https://local.test'+path,navigate:vi.fn().mockResolvedValue(undefined),focus:vi.fn(),postMessage:vi.fn()}));
 const self={location:{origin:'https://local.test'},clients:{matchAll:vi.fn().mockResolvedValue(tabs),openWindow:vi.fn()},registration:{showNotification:vi.fn()},navigator:{setAppBadge:vi.fn(),clearAppBadge:vi.fn()},addEventListener:(name:string,fn:(event:unknown)=>void)=>events[name]=fn};
 runInNewContext(source,{self,URL,Promise,Number,caches:{},fetch:vi.fn()});
 return {self,tabs,async event(name:string,payload:object){let result=Promise.resolve();events[name]({...payload,waitUntil:(p:Promise<void>)=>result=p});await result;}};
}
describe('dashboard worker routing and privacy',()=>{
 it.each(['/admin','/admin/'])('recognizes %s as an existing dashboard for push and click',async path=>{const w=worker([path]);await w.event('push',{data:{json:()=>({id:'10000000-0000-4000-8000-000000000001',name:'Private name',body:'Sensitive message',attention_count:0})}});expect(w.tabs[0].postMessage).toHaveBeenCalled();expect(w.self.navigator.clearAppBadge).toHaveBeenCalled();expect(JSON.stringify(w.self.registration.showNotification.mock.calls)).not.toContain('Private name');await w.event('notificationclick',{notification:{close:vi.fn(),data:{url:'/admin/leads?lead=10000000-0000-4000-8000-000000000001'}}});expect(w.tabs[0].navigate).toHaveBeenCalledWith('/admin/leads?lead=10000000-0000-4000-8000-000000000001');});
 it('rejects an external notification destination and falls back to the inbox',async()=>{const w=worker([]);await w.event('notificationclick',{notification:{close:vi.fn(),data:{url:'https://other.test/admin/leads'}}});expect(w.self.clients.openWindow).toHaveBeenCalledWith('/admin/leads');});
 it('does not mistake another admin-like path for the dashboard',async()=>{const w=worker(['/administrator']);await w.event('push',{data:{json:()=>({attention_count:3})}});expect(w.tabs[0].postMessage).not.toHaveBeenCalled();expect(w.self.navigator.setAppBadge).toHaveBeenCalledWith(3);});
});
