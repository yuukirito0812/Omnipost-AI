'use client';
import {useEffect,useState} from 'react';
import {RefreshCw,CheckCircle2,ArrowUpRight} from 'lucide-react';
type Profile={username:string;accounts:{platform:string;name:string;handle:string}[]};
type Data={configured:boolean;profiles:Profile[];plan:string|null;limit:number|null};
export default function ManagedAccountSync({token,onUpdate}:{token:string|null;onUpdate?:(data:Data)=>void}){
 const [data,setData]=useState<Data|null>(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function request(method:string,body?:any){
  if(!token)throw Error('Sign in first');
  const response=await fetch('/api/managed-social',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const info=await response.json();
  if(!response.ok)throw Error(info.error||'Account sync failed');
  return info as Data;
 }
 async function refresh(){if(!token)return;setBusy(true);setError('');try{const next=await request('GET');setData(next);onUpdate?.(next)}catch(e){setError(String(e))}finally{setBusy(false)}}
 useEffect(()=>{setData(null);if(token)void refresh()},[token]);
 async function save(e:any){e.preventDefault();if(!key||busy)return;setBusy(true);setError('');try{const next=await request('POST',{apiKey:key});setData(next);onUpdate?.(next);setKey('')}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function unlink(){if(!confirm('Unlink the Upload-Post API from this workspace?'))return;setBusy(true);try{const next=await request('DELETE');setData(next);onUpdate?.(next);setError('')}catch(e){setError(String(e))}finally{setBusy(false)}}
 const accounts=data?.profiles?.flatMap(p=>p.accounts.map(a=>({name:a.name,handle:a.handle,platform:a.platform,profile:p.username})))||[];
 return <div className="omni-managed-sync">
  {data?.configured?<><div className="omni-managed-row"><strong><CheckCircle2 size={17}/> Upload-Post API linked</strong><small>Plan: {data.plan||'Unknown'} · {accounts.length} connected network(s)</small><button className="outline-btn sm" onClick={refresh} disabled={busy}><RefreshCw size={14}/> Refresh</button><button className="outline-btn sm" onClick={unlink} disabled={busy}>Unlink</button></div>
    {accounts.length?<div className="omni-managed-chip-list">{accounts.map((a,i)=><div key={a.profile+a.platform+i} className="omni-managed-chip"><strong>{a.name}</strong><span>{a.platform} {a.handle?'· @'+a.handle:''}</span></div>)}</div>:<p>Authorize a network in Upload-Post, then press Refresh to see it here.</p>}
  </>:<form onSubmit={save} className="omni-managed-form"><label htmlFor="omni-upload-key">Upload-Post API key — for account sync</label><div><input id="omni-upload-key" value={key} onChange={e=>setKey(e.target.value)} type="password" autoComplete="off" placeholder="Paste the API key from Upload-Post" required/><button type="submit" disabled={busy||key.length<8} className="primary-btn">Sync accounts <ArrowUpRight size={14}/></button></div><small>The key is checked with Upload-Post and encrypted on the server. Your original network passwords are not used here.</small></form>}
  {error&&<p role="alert" className="omni-managed-sync-error">{error}</p>}
  <p className="omni-managed-sync-foot">Linked accounts shown here are managed through Upload-Post. Once accounts are connected, select them in the OmniPost composer and choose Publish now or Schedule. Only confirmed provider destinations can be used.</p>
 </div>
}
