'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,CheckCircle2,ChevronDown,ExternalLink,Info,KeyRound,LockKeyhole,RefreshCw,ShieldCheck,Sparkles,Unplug,Instagram,Youtube,Facebook} from 'lucide-react';

type Account={platform:string;name:string;handle:string;reauthRequired?:boolean;avatar?:string};
type Profile={username:string;accounts:Account[];facebookPages?:{id:string;name:string}[];facebookWarning?:string};
type Data={configured:boolean;profiles:Profile[];plan:string|null;limit:number|null};
type SocialID='facebook'|'instagram'|'youtube'|'x'|'tiktok';
const NETWORKS:{id:SocialID;name:string;symbol:string;detail:string;accent:string}[]=[
 {id:'facebook',name:'Facebook',symbol:'f',detail:'Connect your Facebook login',accent:'facebook'},
 {id:'instagram',name:'Instagram',symbol:'◎',detail:'Sign in with Instagram',accent:'instagram'},
 {id:'youtube',name:'YouTube',symbol:'▶',detail:'Continue with Google',accent:'youtube'},
 {id:'x',name:'X / Twitter',symbol:'𝕏',detail:'Sign in to X',accent:'x'},
 {id:'tiktok',name:'TikTok',symbol:'♪',detail:'Requires a paid provider plan',accent:'tiktok'},
];
const EMPTY:Data={configured:false,profiles:[],plan:null,limit:null};
export default function ManagedAccountSync({token,onUpdate}:{token:string|null;onUpdate?:(data:Data)=>void}){
 const [data,setData]=useState<Data>(EMPTY),[profile,setProfile]=useState(''),[key,setKey]=useState(''),[showAdvanced,setShowAdvanced]=useState(false);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[starting,setStarting]=useState<string|null>(null);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 async function request(method:string,body?:any,path='/api/managed-social'){
  if(!token)throw Error('Sign in to OmniPost first.');
  const response=await fetch(path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const info=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(info.error||'Connection failed. Please try again.');
  return info;
 }
 function apply(value:Data){
  setData(value);onUpdate?.(value);
  setProfile(current=>value.profiles?.some(p=>p.username===current)?current:(value.profiles?.[0]?.username||''));
 }
 async function refresh(){
  if(!token||loading)return;
  setLoading(true);setError('');try{apply(await request('GET'));}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
 }
 useEffect(()=>{apply(EMPTY);if(token)void refresh()},[token]);
 useEffect(()=>{
  if(!token||typeof window==='undefined')return;
  const params=new URLSearchParams(window.location.search);
  if(!params.has('social_return')&&!params.has('connect_status'))return;
  const status=params.get('connect_status');
  if(status==='error'||status==='cancelled')setMessage('Login was not completed. Your other accounts remain unchanged.');
  else setMessage('Back from social login. Refreshing connected account status.');
  params.delete('social_return');params.delete('connect_status');params.delete('platform');params.delete('error_code');
  window.history.replaceState({},'',window.location.pathname+(params.toString()?'?'+params.toString():''));
  void refresh();
 },[token]);
 async function save(e:any){
  e.preventDefault();if(!key.trim()||busy)return;
  setBusy(true);setError('');try{const result=await request('POST',{apiKey:key.trim()});apply(result);setKey('');setMessage('Your Upload-Post workspace is ready. Connect socials below using official login screens.');}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function disconnect(){
  if(!confirm('Disconnect the Upload-Post provider from OmniPost? This does not revoke accounts linked at Upload-Post.'))return;
  setBusy(true);try{const result=await request('DELETE');apply(result);setMessage('Provider connection removed.');}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function login(platform:SocialID){
  if(starting||!data.configured)return;
  if(platform==='tiktok'&&String(data.plan||'').toLowerCase().includes('free')){setError('TikTok is not included with the Upload-Post free plan. Other networks can connect without an upgrade.');return;}
  setStarting(platform);setError('');setMessage('');
  try{
   const result=await request('POST',{profile:active?.username||profile,platform},'/api/managed-social/connect');
   if(!result.url)throw Error('Provider did not return a sign-in destination.');
   let trusted=false;
   try{const target=new URL(result.url);const hosts=['app.upload-post.com','facebook.com','instagram.com','google.com','youtube.com','x.com','twitter.com','tiktok.com','tiktokapis.com'];trusted=target.protocol==='https:'&&hosts.some(host=>target.hostname===host||target.hostname.endsWith('.'+host));}catch{}
   if(!trusted)throw Error('Provider did not return a trusted social login URL.');
   if(result.method==='dashboard')setMessage(result.notice||'Opening the Upload-Post dashboard to connect your network.');
   window.location.assign(result.url);
  }catch(e){setError(e instanceof Error?e.message:String(e));setStarting(null)}
 }
 const active=data.profiles.find(p=>p.username===profile)||data.profiles[0];
 const connected=active?.accounts||[];
 const count=connected.filter(a=>!a.reauthRequired).length;
 const isFree=['default','free'].includes(String(data.plan||'').toLowerCase());
 return <section className="omni-login-hub" id="omni-login-hub">
   <div className="omni-login-hero">
    <div className="omni-login-hero-title">
      <span className="omni-login-eyebrow"><ShieldCheck size={15}/> SECURE CONNECTIONS</span>
      <h2>Your channels.<br/><span>One workspace.</span></h2>
      <p>Choose a network. Sign in securely. Done.</p>
      <div className="omni-trust-chips"><span><LockKeyhole size={14}/> OAuth login</span><span><CheckCircle2 size={14}/> Private connection</span><span><Sparkles size={14}/> Connected tools</span></div>
    </div>
    <div className="omni-login-hero-art" aria-hidden="true">
      <div className="omni-login-orb orb-one">◎</div><div className="omni-login-orb orb-two">▶</div><div className="omni-login-orb orb-three">𝕏</div>
      <div className="omni-login-center"><img src="/omnipost-mark.svg" width="90" height="90" alt=""/></div>
    </div>
   </div>
   <div className="omni-login-toolbar">
     <div><strong>Social connections</strong><span>{data.configured?count+' network'+(count===1?'':'s')+' linked':'Connect provider to begin'}</span></div>
     {data.configured&&data.profiles.length>1&&<select aria-label="Social profile" value={active?.username||''} onChange={e=>setProfile(e.target.value)}>{data.profiles.map(p=><option key={p.username} value={p.username}>{p.username}</option>)}</select>}
     <button type="button" className="omni-social-refresh" onClick={()=>void refresh()} disabled={loading||!token}><RefreshCw size={16} className={loading?'spin':''}/> {loading?'Checking':'Refresh accounts'}</button>
   </div>
   {!data.configured&&<div className="omni-provider-setup">
    <KeyRound size={24}/><div><strong>One-time provider connection</strong><p>OmniPost has not detected your managed-social API key for this signed-in account. Enter it once to securely link your Upload-Post account; after that, social connection is sign-in only.</p></div>
    <form onSubmit={save}><input type="password" aria-label="Upload-Post API key" autoComplete="off" placeholder="Upload-Post API key" value={key} onChange={e=>setKey(e.target.value)} required/><button className="primary-btn" type="submit" disabled={busy||key.trim().length<8}>{busy?'Checking…':'Link once'} <ArrowUpRight size={15}/></button></form>
    <a href="https://app.upload-post.com/" rel="noopener noreferrer" target="_blank">Open Upload-Post account <ExternalLink size={13}/></a>
   </div>}
   <div className="omni-login-networks">
     {NETWORKS.map(n=>{
       const acc=connected.find(a=>a.platform===n.id);
       const linked=!!acc&&!acc.reauthRequired;
       const cannotUse=n.id==='tiktok'&&isFree;
       return <div className={'omni-login-network '+n.accent+(linked?' linked':'')} key={n.id}>
        <div className="omni-login-network-symbol">{n.symbol}</div>
        <div className="omni-login-network-copy"><strong>{n.name}</strong>
          <span>{linked?(acc?.name||acc?.handle||'Connected account'):acc?.reauthRequired?'Connection expired — sign in again':n.detail}</span>
          {linked&&acc?.handle&&<small>{acc.handle}</small>}
        </div>
        <div className="omni-login-network-action">
          {linked&&<span className="omni-login-connected"><CheckCircle2 size={12}/> Signed in</span>}
          <button type="button" disabled={!data.configured||!!starting||cannotUse} onClick={()=>login(n.id)} aria-label={(linked?'Manage ':'Connect ')+n.name}>
          {starting===n.id?<RefreshCw size={14} className="spin"/>:null}{cannotUse?'Plan required':linked?'Manage':'Connect'} <ArrowUpRight size={15}/></button>
        </div>
       </div>
     })}
   </div>
   {active?.facebookWarning&&<div className="omni-login-explain"><Info size={16}/><span>Facebook is signed in. Publishing to Facebook still requires selecting a Page you manage; personal timeline posting isn't available through this API. <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer">Create a Page</a>.</span></div>}
   {error&&<div className="omni-login-error" role="alert">{error}</div>}
   {message&&<div className="omni-login-message" role="status">{message}</div>}
   <div className="omni-login-bottom"><span><ShieldCheck size={16}/> Official login through Upload-Post. Your passwords stay with the platforms.</span><span>Free plan: up to 2 profiles, 10 uploads/month; TikTok and custom-brand login may require upgrading. <a href="https://www.upload-post.com/pricing/" target="_blank" rel="noopener noreferrer">Plan details <ExternalLink size={12}/></a></span></div>
   {data.configured&&<button className="omni-provider-settings" onClick={()=>setShowAdvanced(v=>!v)} aria-expanded={showAdvanced}><ChevronDown size={14}/> Provider connection settings</button>}
   {showAdvanced&&data.configured&&<div className="omni-provider-settings-panel"><p>These controls unlink only OmniPost's provider integration, not the social accounts themselves. You can manage individual permissions on each social network.</p><button className="outline-btn sm" disabled={busy} onClick={disconnect}><Unplug size={15}/> Disconnect provider</button></div>}
  </section>
}
