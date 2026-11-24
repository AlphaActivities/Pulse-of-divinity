import {beforeEach,expect,it,vi} from 'vitest';
import {clearSession,getStoredSession,logout,persistSession,refreshSession} from '../src/admin/auth';
const fixture={access_token:'synthetic',refresh_token:'rotate',expires_at:1,user_id:'fixture',email:'a@example.invalid'};
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)};}
beforeEach(()=>{vi.stubGlobal('localStorage',storage());vi.stubGlobal('sessionStorage',storage());vi.stubGlobal('navigator',{});});
it('migrates a tab session and restores it after a fresh tab launch',()=>{
 sessionStorage.setItem('pod_admin_session',JSON.stringify(fixture));expect(getStoredSession()).toEqual(fixture);
 vi.stubGlobal('sessionStorage',storage());expect(getStoredSession()).toEqual(fixture);
});
it('keeps tokens through a network interruption and rotates them on retry',async()=>{
 persistSession(fixture);vi.stubGlobal('fetch',vi.fn().mockRejectedValueOnce(Error()).mockResolvedValueOnce(Response.json({...fixture,refresh_token:'new',user:{id:'fixture',email:fixture.email}})));
 expect((await refreshSession('rotate')).error).toBe('Connection unavailable');expect(getStoredSession()).toEqual(fixture);
 await refreshSession('rotate');expect(getStoredSession()?.refresh_token).toBe('new');
});
it('distinguishes rejected credentials and clears local state on logout even offline',async()=>{
 persistSession(fixture);vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({}, {status:400})).mockRejectedValueOnce(Error()));
 expect((await refreshSession('rotate')).error).toBe('Session expired');await logout('synthetic');expect(getStoredSession()).toBeNull();
});
it('discards a late refresh response after signout',async()=>{
 persistSession(fixture);vi.stubGlobal('fetch',async()=>{clearSession();return Response.json({...fixture,user:{id:'fixture',email:fixture.email}})});
 expect((await refreshSession('rotate')).session).toBeNull();expect(getStoredSession()).toBeNull();
});
