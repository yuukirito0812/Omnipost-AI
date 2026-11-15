'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,Check,Clipboard,Copy,Lightbulb,Loader2,MessageCircle,PenLine,RefreshCw,Search,Send,Sparkles,Target,CalendarDays,Hash,Repeat2,ShieldCheck,TrendingUp,WandSparkles} from 'lucide-react';
import type {ContentPost,Platform} from '../lib/types';
import PlatformIcon from './PlatformIcon';
type Mode='post'|'hooks'|'hashtags'|'calendar'|'repurpose'|'audit'|'ideas'|'replies';
type Proposal=Partial<ContentPost>;
type Result={mode:Mode;title?:string;caption?:string;tags?:string;cta?:string;firstComment?:string;altText?:string;overrides?:Partial<Record<Platform,string>>;platforms?:Platform[];calendarPlan?:Proposal[];score?:number;strengths?:string[];improvements?:string[];rewrite?:string;reason?:string;items?:string[];ideas?:{title:string;angle:string;format:string;goal:string;hook:string}[];note?:string};
const TOOLS:{id:Mode;label:string;desc:string;icon:any}[]=[
 {id:'post',label:'Create post',desc:'Write channel-ready copy',icon:PenLine},
 {id:'repurpose',label:'Repurpose',desc:'One idea, every channel',icon:Repeat2},
 {id:'calendar',label:'7-day plan',desc:'Build a weekly schedule',icon:CalendarDays},
 {id:'audit',label:'Caption audit',desc:'Improve existing copy',icon:Search},
 {id:'hooks',label:'Hook ideas',desc:'Stronger opening lines',icon:TrendingUp},
 {id:'hashtags',label:'Hashtags',desc:'Relevant tag suggestions',icon:Hash},
 {id:'ideas',label:'Content ideas',desc:'Fill your content queue',icon:Lightbulb},
 {id:'replies',label:'Comment replies',desc:'Reply to your community',icon:MessageCircle}
];
const ALL:Platform[]=['instagram','facebook','tiktok','youtube','x','linkedin','threads','pinterest','google_business'];
const defaultBrief='Share a useful, engaging update for my audience. Use only facts I provide.';
export default function AIStudioPanel({sessionToken,hasAI,brand,initialPlatforms,onApplyDraft,onSavePlan,onOpenSettings,onOpenComposer}:{sessionToken:string|null;hasAI:boolean;brand:string;initialPlatforms:Platform[];onApplyDraft:(p:Proposal)=>void;onSavePlan:(p:Proposal[])=>Promise<void>;onOpenSettings:()=>void;onOpenComposer:()=>void}){
 const [mode,setMode]=useState<Mode>('post'),[brief,setBrief]=useState(''),[source,setSource]=useState(''),[tone,setTone]=useState('Natural and conversational'),[goal,setGoal]=useState('Engagement'),[audience,setAudience]=useState('My target audience'),[platforms,setPlatforms]=useState<Platform[]>(initialPlatforms.length?initialPlatforms:['instagram','facebook','linkedin']),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[copied,setCopied]=useState(false);
 const selected=useMemo(()=>TOOLS.find(t=>t.id===mode)!,[mode]);
 function toggle(p:Platform){setPlatforms(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p])}
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1400)}catch{setError('Clipboard access is unavailable in this browser.')}}
 async function run(next=mode){
  if(!sessionToken){setError('Sign in to your workspace first.');return}
  if(!hasAI){setError('Connect the free Gemini API key to activate AI tools.');return}
  if(!brief.trim()&&!(next==='audit'||next==='replies')&&!source.trim()){setError('Add a short brief first.');return}
  if((next==='audit'||next==='replies')&&!source.trim()&&!brief.trim()){setError(next==='audit'?'Paste a caption to audit.':'Paste the comment or message to reply to.');return}
  if(!platforms.length){setError('Select at least one platform.');return}
  setBusy(true);setError('');setSaved(false);setResult(null);
  try{
   const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionToken},body:JSON.stringify({mode:next,topic:brief,caption:source,tone,goal,audience,platforms,brand})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'AI request failed');
   setResult(data as Result);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 function applyGenerated(){
  if(!result)return;
  if(mode==='post'||mode==='repurpose'){
   onApplyDraft({title:result.title||'',caption:result.caption||'',tags:result.tags||'',cta:result.cta||'',firstComment:result.firstComment||'',altText:result.altText||'',overrides:result.overrides||{},platforms:result.platforms||platforms,aiGenerated:true});
   onOpenComposer();
  }else if(mode==='audit'&&result.rewrite){onApplyDraft({caption:result.rewrite,platforms,aiGenerated:true});onOpenComposer()}
  setSaved(true);
 }
 const copyResult=()=>copy(result?.caption||result?.rewrite||result?.items?.join('\n')||result?.ideas?.map(i=>i.title+' — '+i.angle).join('\n')||'');
 return <div className="ai-studio">
  <div className="ai-studio-hero"><div className="ai-studio-hero-mark"><Sparkles size={26}/></div><div><span className="ai-studio-kicker">OMNI AI · CREATIVE DESK</span><h2>Make better content, faster.</h2><p>Plan, write, repurpose and refine without leaving your workspace.</p></div><span className={'ai-studio-status '+(hasAI?'ready':'offline')}><span/>{hasAI?'Gemini connected':'AI not connected'}</span></div>
  {!hasAI&&<div className="ai-studio-connect"><div><strong>Activate the free AI model</strong><p>Connect a Google AI Studio key. Free-tier access has usage limits; no Vercel AI credits are needed.</p></div><button className="primary-btn" onClick={onOpenSettings}>Connect AI <ArrowUpRight size={15}/></button></div>}
  <div className="ai-studio-layout">
   <aside className="ai-studio-tools"><div className="ai-studio-section-label">TOOLS</div>{TOOLS.map(t=><button key={t.id} type="button" className={'ai-studio-tool '+(mode===t.id?'active':'')} onClick={()=>{setMode(t.id);setResult(null);setError('')}}><span className="ai-studio-tool-icon"><t.icon size={18}/></span><span><strong>{t.label}</strong><small>{t.desc}</small></span><ArrowRight size={15}/></button>)}</aside>
   <section className="ai-studio-workspace">
    <div className="ai-studio-work-head"><div><span className="ai-studio-kicker">WORKSPACE / AI TOOLS</span><h3>{selected.label}</h3><p>{selected.desc}. Keep the final edit under your control.</p></div><span className="ai-studio-private"><ShieldCheck size={14}/> Review before posting</span></div>
    <div className="ai-studio-form">
     <div className="field"><label>{mode==='audit'?'Caption to review':mode==='replies'?'Comment or DM to answer':'Campaign brief / topic'}</label><textarea rows={mode==='audit'||mode==='replies'?5:4} value={mode==='audit'||mode==='replies'?source:brief} onChange={e=>(mode==='audit'||mode==='replies'?setSource:setBrief)(e.target.value)} placeholder={mode==='audit'?'Paste your current caption here…':mode==='replies'?'Paste the customer comment or message…':'What are you promoting, teaching or sharing? Add the facts the AI must use…'}/></div>
     {mode==='repurpose'&&<div className="field"><label>Original post (source)</label><textarea rows={4} value={source} onChange={e=>setSource(e.target.value)} placeholder="Paste the post you want adapted for each channel…"/></div>}
     {mode!=='audit'&&mode!=='replies'&&<div className="ai-studio-fields"><div className="field"><label>Tone</label><select value={tone} onChange={e=>setTone(e.target.value)}>{['Natural and conversational','Professional but friendly','Luxury and refined','Educational and helpful','Confident and direct','Warm and community-led','Playful and witty'].map(v=><option key={v}>{v}</option>)}</select></div><div className="field"><label>Goal</label><select value={goal} onChange={e=>setGoal(e.target.value)}>{['Engagement','Awareness','Leads','Traffic','Education','Community','Conversions'].map(v=><option key={v}>{v}</option>)}</select></div><div className="field"><label>Audience</label><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Who should this reach?"/></div></div>}
     <div className="ai-studio-platforms"><div><strong>Channels</strong><small>{platforms.length} selected</small></div><div className="ai-studio-platform-grid">{ALL.map(p=><button type="button" key={p} aria-pressed={platforms.includes(p)} className={platforms.includes(p)?'selected':''} onClick={()=>toggle(p)}><PlatformIcon platform={p} size={22}/><span>{p==='google_business'?'Google Business':p==='x'?'X':p[0].toUpperCase()+p.slice(1)}</span>{platforms.includes(p)&&<Check size={13}/>}</button>)}</div></div>
     <div className="ai-studio-run-row"><span><ShieldCheck size={15}/> Facts are not invented. Check details before publishing.</span><button type="button" className="primary-btn" disabled={busy||!hasAI} onClick={()=>void run()}>{busy?<Loader2 size={16} className="spin"/>:<WandSparkles size={16}/>} {busy?'Working…':mode==='calendar'?'Build 7-day plan':'Generate'} <ArrowUpRight size={15}/></button></div>
    </div>
    {error&&<div className="ai-studio-error" role="alert">{error}</div>}
    {result&&<div className="ai-studio-result">
     <div className="ai-studio-result-head"><div><span className="ai-studio-kicker">RESULT</span><h3>{mode==='calendar'?'Your weekly plan':mode==='audit'?'Caption review':mode==='ideas'?'Content ideas':mode==='replies'?'Reply options':selected.label+' results'}</h3></div><button type="button" className="outline-btn sm" onClick={copyResult}><Copy size={14}/>{copied?'Copied':'Copy result'}</button></div>
     {(mode==='post'||mode==='repurpose')&&<><div className="ai-studio-copy-card"><div className="ai-studio-copy-meta"><strong>{result.title||'Ready-to-edit post'}</strong><span>{result.caption?.length||0} characters</span></div><p>{result.caption}</p>{result.tags&&<small>{result.tags}</small>}</div>{Object.entries(result.overrides||{}).map(([p,value])=><div className="ai-studio-channel-copy" key={p}><div><PlatformIcon platform={p as Platform} size={21}/><strong>{p==='google_business'?'Google Business':p[0].toUpperCase()+p.slice(1)}</strong><span>{String(value).length} chars</span></div><p>{value}</p><button type="button" onClick={()=>void copy(String(value))}><Copy size={13}/> Copy</button></div>)}</>}
     {mode==='calendar'&&<div className="ai-studio-calendar">{result.calendarPlan?.map((p,i)=><article key={i}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{p.title||'Content idea'}</strong><p>{p.caption}</p><small>{(p.platforms||platforms).map(x=>x==='google_business'?'Google Business':x.toUpperCase()).join(' · ')}</small></div></article>)}</div>}
     {mode==='audit'&&<><div className="ai-studio-score"><strong>{result.score??'—'}<small>/100</small></strong><div><b>{result.reason||'Content quality review'}</b><p>Editorial score, not a prediction of reach or engagement.</p></div></div><div className="ai-studio-audit-grid"><div><strong>What works</strong>{(result.strengths||[]).map((v,i)=><p key={i}>+ {v}</p>)}</div><div><strong>Improve</strong>{(result.improvements||[]).map((v,i)=><p key={i}>– {v}</p>)}</div></div><div className="ai-studio-copy-card"><strong>Suggested rewrite</strong><p>{result.rewrite}</p></div></>}
     {(mode==='hooks'||mode==='hashtags'||mode==='replies')&&<div className="ai-studio-list">{(result.items||[]).map((v,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{v}</p><button type="button" onClick={()=>void copy(v)}><Copy size={13}/></button></div>)}</div>}
     {mode==='ideas'&&<div className="ai-studio-calendar">{(result.ideas||[]).map((v,i)=><article key={i}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{v.title}</strong><p>{v.angle}</p><small>{v.format} · {v.goal}</small>{v.hook&&<em>{v.hook}</em>}</div><button type="button" className="outline-btn sm" onClick={()=>{setBrief(v.title+'. '+v.angle+' Hook: '+v.hook);setMode('post');setResult(null)}}>Use idea</button></article>)}</div>}
     <div className="ai-studio-result-actions">{mode==='calendar'?<button type="button" className="primary-btn" disabled={saved||!result.calendarPlan?.length} onClick={async()=>{setBusy(true);try{await onSavePlan(result.calendarPlan||[]);setSaved(true)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}}>{saved?<Check size={15}/>:<CalendarDays size={15}/>} {saved?'Saved as drafts':'Save plan as drafts'}</button>:<button type="button" className="primary-btn" onClick={applyGenerated} disabled={saved||(!result.caption&&!result.rewrite&&!result.overrides)}>{saved?<Check size={15}/>:<PenLine size={15}/>} {saved?'Applied to composer':'Use in composer'}</button>}<button type="button" className="outline-btn" onClick={()=>void run()} disabled={busy}><RefreshCw size={14}/> Regenerate</button></div>
    </div>}
   </section>
  </div>
  <div className="ai-studio-foot"><span><ShieldCheck size={15}/> Your AI key is encrypted in your workspace.</span><span>Free-tier quotas and model availability are controlled by Google.</span></div>
 </div>
}
