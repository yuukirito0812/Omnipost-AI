'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,CheckCircle2,ChevronDown,ExternalLink,Info,KeyRound,LockKeyhole,RefreshCw,ShieldCheck,Sparkles,Unplug,Instagram,Youtube,Facebook,BriefcaseBusiness} from 'lucide-react';
import PlatformIcon from './PlatformIcon';

type Account={platform:string;name:string;handle:string;reauthRequired?:boolean;avatar?:string};
type Profile={username:string;accounts:Account[];facebookPages?:{id:string;name:string}[];facebookWarning?:string};
type Data={configured:boolean;profiles:Profile[];plan:string|null;limit:number|null};
type SocialID='facebook'|'instagram'|'youtube'|'x'|'tiktok'|'linkedin'|'threads'|'pinterest'|'google_business';
const NETWORKS:{id:SocialID;name:string;detail:string;accent:string;accountHint:string}[]=[
 {id:'facebook',name:'Facebook',detail:'Continue with Facebook',accent:'facebook',accountHint:'Sign in with your personal Facebook login, then choose a Page you manage. Publishing is as the Page, not your personal timeline.'},
 {id:'instagram',name:'Instagram',detail:'Continue with Instagram',accent:'instagram',accountHint:'Requires an Instagram Business or Creator account. Personal consumer accounts cannot publish through this API.'},
 {id:'youtube',name:'YouTube',detail:'Continue with Google',accent:'youtube',accountHint:'Sign in with Google and authorize the YouTube channel you want to manage.'},
 {id:'tiktok',name:'TikTok',detail:'Continue with TikTok',accent:'tiktok',accountHint:'Connect a TikTok account. Direct public posting is subject to TikTok app approval and audit.'},
 {id:'x',name:'X',detail:'Continue with X',accent:'x',accountHint:'Connect the X profile you want to publish from. Provider and X API plan limits apply.'},
 {id:'linkedin',name:'LinkedIn',detail:'Continue with LinkedIn',accent:'linkedin',accountHint:'Connect your LinkedIn profile. Organization page access depends on your LinkedIn admin permissions.'},
 {id:'threads',name:'Threads',detail:'Continue with Threads',accent:'threads',accountHint:'Connect the Threads profile you want to publish from.'},
 {id:'pinterest',name:'Pinterest',detail:'Continue with Pinterest',accent:'pinterest',accountHint:'Connect your Pinterest account and choose a board when prompted by the provider.'},
 {id:'google_business',name:'Google Business',detail:'Continue with Google',accent:'google-business',accountHint:'Connect the Google account that manages the Business Profile location.'}
];
const EMPTY:Data={configured:false,profiles:[],plan:null,limit:null};
export default function ManagedAccountSync({token,onUpdate,selectedProfile,onProfileChange,selectedFacebookPageId,onFacebookPageChange}:{token:string|null;onUpdate?:(data:Data)=>void;selectedProfile?:string;onProfileChange?:(profile:string)=>void;selectedFacebookPageId?:string;onFacebookPageChange?:(pageId:string)=>void}){
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
  const next=value.profiles?.some(p=>p.username===selectedProfile)?String(selectedProfile):(value.profiles?.some(p=>p.username===profile)?profile:(value.profiles?.[0]?.username||''));
  setProfile(next);if(next)onProfileChange?.(next);
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
   try{const target=new URL(result.url);const hosts=['app.upload-post.com','facebook.com','instagram.com','google.com','youtube.com','x.com','twitter.com','tiktok.com','tiktokapis.com','linkedin.com','threads.net','threads.com','pinterest.com'];trusted=target.protocol==='https:'&&hosts.some(host=>target.hostname===host||target.hostname.endsWith('.'+host));}catch{}
   if(!trusted)throw Error('Provider did not return a trusted social login URL.');
   if(result.method==='dashboard')setMessage(result.notice||'Opening the Upload-Post dashboard to connect your network.');
   window.location.assign(result.url);
  }catch(e){setError(e instanceof Error?e.message:String(e));setStarting(null)}
 }
 const active=data.profiles.find(p=>p.username===(selectedProfile||profile))||data.profiles[0];
 const connected=active?.accounts||[];
 const count=connected.filter(a=>!a.reauthRequired).length;
 const isFree=['default','free'].includes(String(data.plan||'').toLowerCase());
 const chosenPage=active?.facebookPages?.find(p=>p.id===selectedFacebookPageId)||active?.facebookPages?.[0];
 return <section className="omni-login-hub" id="omni-login-hub">
   <div className="omni-login-hero">
    <div className="omni-login-hero-title">
      <span className="omni-login-eyebrow"><ShieldCheck size={15}/> SOCIAL ACCOUNT HUB</span>
      <h2>Connect once.<br/><span>Post everywhere.</span></h2>
      <p>Link your client accounts and manage every channel from one place.</p>
      <div className="omni-trust-chips"><span><LockKeyhole size={14}/> Official sign-in</span><span><CheckCircle2 size={14}/> No social passwords stored</span><span><BriefcaseBusiness size={14}/> Client-ready</span></div>
    </div>
    <div className="omni-login-hero-art" aria-hidden="true">
      <div className="omni-login-orb orb-one">◎</div><div className="omni-login-orb orb-two">▶</div><div className="omni-login-orb orb-three">𝕏</div>
      <div className="omni-login-center"><img src="/omnipost-mark.svg" width="90" height="90" alt=""/></div>
    </div>
   </div>
   <div className="omni-login-toolbar">
     <div><strong>Client workspaces</strong><span>{data.configured?count+' connected channels':'Connect provider to begin'}</span></div>
     {data.configured&&data.profiles.length>0&&<label className="omni-profile-select"><span>Client / brand</span><select aria-label="Client workspace" value={active?.username||''} onChange={e=>{setProfile(e.target.value);onProfileChange?.(e.target.value);onFacebookPageChange?.('')}}>{data.profiles.map(p=><option key={p.username} value={p.username}>{p.username}</option>)}</select></label>}
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
        <div className="omni-login-network-symbol"><PlatformIcon platform={n.id} size={31}/></div>
        <div className="omni-login-network-copy"><strong>{n.name}</strong>
          <span>{linked?(acc?.name||acc?.handle||'Connected account'):acc?.reauthRequired?'Connection expired — sign in again':n.detail}</span>
          {linked&&acc?.handle&&<small>{acc.handle}</small>}<small className="omni-network-hint">{n.accountHint}</small>
        </div>
        <div className="omni-login-network-action">
          {linked&&<span className="omni-login-connected"><CheckCircle2 size={12}/> Signed in</span>}
          <button type="button" disabled={!data.configured||!!starting||cannotUse} onClick={()=>login(n.id)} aria-label={(linked?'Manage ':'Connect ')+n.name}>
          {starting===n.id?<RefreshCw size={14} className="spin"/>:null}{cannotUse?'Plan required':acc?.reauthRequired?'Reconnect':linked?'Manage':'Connect'} <ArrowUpRight size={15}/></button>
        </div>
       </div>
     })}
   </div>
   {active?.facebookPages?.length&&<div className="omni-facebook-page-picker"><div><strong><Facebook size={16}/> Publishing Page</strong><small>Choose the Facebook Page your posts should appear from.</small></div><select aria-label="Default Facebook Page" value={chosenPage?.id||''} onChange={e=>onFacebookPageChange?.(e.target.value)}>{active.facebookPages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><p>Sign in with your personal Facebook login to grant access. OmniPost publishes as this Page, not to your personal timeline.</p></div>}
   {active?.facebookWarning&&<div className="omni-login-explain"><Info size={16}/><span>Facebook is signed in. Publishing to Facebook still requires selecting a Page you manage; personal timeline posting isn't available through this API. <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer">Create a Page</a>.</span></div>}
   {error&&<div className="omni-login-error" role="alert">{error}</div>}
   {message&&<div className="omni-login-message" role="status">{message}</div>}
   <div className="omni-login-bottom"><span><ShieldCheck size={16}/> Official platform sign-in. OmniPost never asks for your social password.</span><span>{isFree?'Upload-Post Free: 2 client profiles and 10 uploads/month. TikTok is not included.':'Provider plan: '+(data.plan||'connected')} · <a href="https://app.upload-post.com/" target="_blank" rel="noreferrer">Manage profiles <ExternalLink size={12}/></a> · <a href="https://www.upload-post.com/pricing/" target="_blank" rel="noreferrer">Plan details <ExternalLink size={12}/></a></span></div>
   {data.configured&&<button className="omni-provider-settings" onClick={()=>setShowAdvanced(v=>!v)} aria-expanded={showAdvanced}><ChevronDown size={14}/> Provider connection settings</button>}
   {showAdvanced&&data.configured&&<div className="omni-provider-settings-panel"><p>These controls unlink only OmniPost's provider integration, not the social accounts themselves. You can manage individual permissions on each social network.</p><button className="outline-btn sm" disabled={busy} onClick={disconnect}><Unplug size={15}/> Disconnect provider</button></div>}
  </section>
}
