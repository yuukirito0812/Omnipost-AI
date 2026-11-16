'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, ArrowUpRight, BarChart3, Check, Clipboard, Flame, Lightbulb, Loader2, MessageCircle, Play, Send, Sparkles, Target, TrendingUp, Users, WandSparkles } from 'lucide-react';

type Goal = 'followers' | 'engagement' | 'views' | 'leads';
type Platform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'threads' | 'x' | 'pinterest';
const PLATFORMS: Platform[] = ['instagram','facebook','tiktok','youtube','linkedin','threads','x','pinterest'];
const LABELS: Record<Platform,string> = {instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',linkedin:'LinkedIn',threads:'Threads',x:'X',pinterest:'Pinterest'};
const GOALS: {id:Goal;label:string;desc:string}[] = [
 {id:'followers',label:'Grow followers',desc:'Reach people likely to follow and return'},
 {id:'engagement',label:'More reactions & shares',desc:'Earn meaningful comments, saves and sends'},
 {id:'views',label:'Increase views',desc:'Improve hooks, retention and discovery'},
 {id:'leads',label:'Generate leads',desc:'Turn attention into inquiries and action'}
];
export default function GrowthPage(){
 const [token,setToken]=useState('');
 const [auth,setAuth]=useState<'checking'|'signed-in'|'signed-out'>('checking');
 const [brand,setBrand]=useState('My Brand');
 const [niche,setNiche]=useState('');
 const [audience,setAudience]=useState('');
 const [offer,setOffer]=useState('');
 const [goal,setGoal]=useState<Goal>('followers');
 const [platforms,setPlatforms]=useState<Platform[]>(['instagram','facebook','tiktok']);
 const [voice,setVoice]=useState('Helpful, confident and conversational');
 const [topic,setTopic]=useState('');
 const [result,setResult]=useState('');
 const [kind,setKind]=useState<'audit'|'calendar'|'ideas'|'rewrite'>('audit');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const [metrics,setMetrics]=useState({followers:'',reach:'',views:'',likes:'',comments:'',shares:'',saves:''});
 const [postText,setPostText]=useState('');
 const [postFormat,setPostFormat]=useState('Short-form video / Reel');
 const [snapshotSaved,setSnapshotSaved]=useState(false);
 const supabase=useMemo(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),[]);
 useEffect(()=>{
  let active=true;
  supabase.auth.getSession().then(({data})=>{if(!active)return;const t=data.session?.access_token||'';setToken(t);setAuth(t?'signed-in':'signed-out')});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(active){setToken(session?.access_token||'');setAuth(session?'signed-in':'signed-out')}});
  try{const saved=localStorage.getItem('omnipost-growth-profile');if(saved){const p=JSON.parse(saved);setBrand(p.brand||'My Brand');setNiche(p.niche||'');setAudience(p.audience||'');setOffer(p.offer||'');setGoal(p.goal||'followers');setPlatforms(p.platforms||['instagram','facebook','tiktok']);setVoice(p.voice||'Helpful, confident and conversational')}}catch{}
  try{const m=localStorage.getItem('omnipost-growth-metrics');if(m)setMetrics(JSON.parse(m))}catch{}
  return()=>{active=false;subscription.unsubscribe()};
 },[supabase]);
 function togglePlatform(p:Platform){setPlatforms(old=>old.includes(p)?old.filter(x=>x!==p):[...old,p])}
 function saveProfile(){localStorage.setItem('omnipost-growth-profile',JSON.stringify({brand,niche,audience,offer,goal,platforms,voice}));setSnapshotSaved(true);window.setTimeout(()=>setSnapshotSaved(false),2200)}
 function saveMetrics(){localStorage.setItem('omnipost-growth-metrics',JSON.stringify(metrics));setSnapshotSaved(true);window.setTimeout(()=>setSnapshotSaved(false),2200)}
 async function run(action:'audit'|'calendar'|'ideas'|'rewrite'){
  if(!token){setError('Sign in to OmniPost first, then reopen Growth Lab.');return}
  if(!niche.trim()||!audience.trim()){setError('Add your niche and target audience so the strategy is relevant.');return}
  setBusy(true);setError('');setResult('');setKind(action);
  const metricText=Object.entries(metrics).filter(([,v])=>v.trim()).map(([k,v])=>k+': '+v).join(', ')||'No verified metrics supplied';
  const task=action==='audit'
   ? 'Create a practical account growth audit. Explain the strongest opportunities, content pillars, audience-specific hooks, profile conversion improvements, engagement habits, and a 14-day action plan. Separate evidence from hypotheses. Do not invent account metrics.'
   : action==='calendar'
   ? 'Create a 7-day content calendar with one high-quality post per day. For each day provide platform, format, content pillar, opening hook, outline, caption, CTA, visual direction, and why the target audience would care. Adapt copy separately to each selected platform. Make it sustainable and non-repetitive.'
   : action==='ideas'
   ? 'Generate 15 distinctive post concepts engineered for audience relevance and shareability. For each include a scroll-stopping but truthful hook, format, audience pain point/desire, payoff, and a natural comment/save/share CTA. Avoid engagement bait, misleading claims and recycled generic trends.'
   : 'Review the supplied post and rewrite it for stronger clarity, retention, usefulness and shareability. Give 3 hook options, an improved caption, visual/shot direction, on-screen text, accessible alt text, relevant keywords/hashtags, and one natural CTA. Explain the changes briefly.';
  const prompt='Act as OmniPost Growth Strategist. Build an ethical, evidence-led social growth plan. Never promise virality or guaranteed follower growth. Do not recommend buying followers, engagement pods, bots, spam comments, mass-follow/unfollow, fake giveaways, or misleading hooks. Prioritize original content, clear niche signals, audience value, retention, saves/shares, meaningful replies, search intent, and repeatable series. Platform ranking differs and changes; do not claim one universal algorithm.\n\nBRAND: '+brand+'\nNICHE: '+niche+'\nTARGET AUDIENCE: '+audience+'\nOFFER / VALUE: '+(offer||'Not specified')+'\nGOAL: '+goal+'\nPLATFORMS: '+platforms.map(p=>LABELS[p]).join(', ')+'\nVOICE: '+voice+'\nPOST FORMAT: '+postFormat+'\nPOST TO REVIEW: '+(postText||'None supplied')+'\nUSER-PROVIDED METRICS (not independently verified): '+metricText+'\nCURRENT TOPIC / CAMPAIGN: '+(topic||'Choose based on audience relevance')+'\n\nTASK: '+task+'\n\nUse clear headings, concise recommendations and examples. Include platform-specific guidance. If metrics are absent, provide a baseline measurement plan instead of pretending to know performance.';
  try{
   const res=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({message:prompt,brand,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Manila'})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'Growth analysis failed');
   setResult(data.reply||'No response returned.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to reach Omni AI.');}
  finally{setBusy(false)}
 }
 async function copyResult(){await navigator.clipboard.writeText(result);setCopied(true);window.setTimeout(()=>setCopied(false),1600)}
 const fields:[keyof typeof metrics,string,string][]=[['followers','Followers','Current follower count'],['reach','Reach','Accounts reached'],['views','Views','Video / post views'],['likes','Likes / reactions','Likes and reactions'],['comments','Comments','Comments received'],['shares','Shares / sends','Shares or DMs'],['saves','Saves','Saved posts']];
 return <main className="growth-shell">
  <style jsx global>{`
   .growth-shell{min-height:100vh;background:radial-gradient(ellipse at 10% 0%,rgba(134,95,246,.13),transparent 36%),#f7f7fb;color:#202033;padding:28px clamp(16px,4vw,54px) 64px;font-family:inherit}
   [data-studio-theme="dusk"] .growth-shell{background:radial-gradient(ellipse at 10% 0%,rgba(134,95,246,.18),transparent 36%),#10111a;color:#f4f3fa}
   .growth-wrap{max-width:1220px;margin:auto}.growth-back{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:none;font-size:13px;font-weight:700;opacity:.72;margin-bottom:24px}
   .growth-hero{border-radius:28px;padding:clamp(24px,4vw,46px);background:linear-gradient(120deg,#25203e,#4c3b78 62%,#8065c7);color:white;position:relative;overflow:hidden;box-shadow:0 18px 55px #40306422}
   .growth-hero:after{content:"";position:absolute;width:340px;height:340px;border:1px solid #ffffff24;border-radius:50%;right:-90px;top:-170px;box-shadow:0 0 0 35px #ffffff08,0 0 0 75px #ffffff06}
   .growth-kicker{display:inline-flex;gap:8px;align-items:center;font-size:11px;letter-spacing:.16em;font-weight:800;color:#e1d7ff}
   .growth-hero h1{font-size:clamp(32px,5vw,54px);line-height:1.04;letter-spacing:-.045em;margin:15px 0 12px}.growth-hero p{max-width:650px;color:#e7e1f5;line-height:1.65;margin:0;font-size:15px}
   .growth-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:18px;margin-top:20px}
   .growth-card{background:white;border:1px solid #e8e6ef;border-radius:20px;padding:22px;box-shadow:0 7px 24px #26203d08}
   [data-studio-theme="dusk"] .growth-card{background:#191a27;border-color:#303043;color:#f4f3fa}
   .growth-card h2{font-size:17px;margin:0 0 5px;letter-spacing:-.02em}.growth-sub{font-size:12px;opacity:.65;margin:0 0 18px;line-height:1.5}
   .growth-label{font-size:11px;font-weight:800;display:block;margin:15px 0 7px;letter-spacing:.03em}.growth-input,.growth-select,.growth-textarea{width:100%;border:1px solid #dedbe8;border-radius:11px;padding:11px 12px;background:#fff;color:#252238;font:inherit;font-size:13px;outline:none}.growth-input:focus,.growth-select:focus,.growth-textarea:focus{border-color:#8870d2;box-shadow:0 0 0 3px #8870d21c}
   .growth-textarea{resize:vertical;min-height:92px;line-height:1.5}.growth-platforms{display:flex;gap:8px;flex-wrap:wrap}.growth-chip{border:1px solid #e0ddea;background:transparent;color:inherit;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}.growth-chip.active{background:#eee9ff;border-color:#9b84e6;color:#5a419e}
   .growth-goals{display:grid;grid-template-columns:1fr 1fr;gap:8px}.growth-goal{border:1px solid #e4e1eb;background:transparent;color:inherit;text-align:left;border-radius:12px;padding:12px;cursor:pointer}.growth-goal.active{border-color:#9276dc;background:#f2edff}.growth-goal b{display:block;font-size:12px}.growth-goal small{display:block;font-size:10px;opacity:.65;margin-top:4px;line-height:1.4}
   .growth-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.growth-btn{border:0;border-radius:11px;padding:12px 13px;background:#654bb0;color:white;font-weight:800;font-size:12px;display:flex;justify-content:center;align-items:center;gap:8px;cursor:pointer}.growth-btn.secondary{background:#eee9fb;color:#59439a}.growth-btn:disabled{opacity:.55;cursor:wait}
   .growth-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px}.growth-metrics label{font-size:10px;font-weight:800;opacity:.75}.growth-metrics input{display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #e2dfeb;border-radius:9px;background:transparent;color:inherit}
   .growth-result{white-space:pre-wrap;line-height:1.65;font-size:13px;max-height:700px;overflow:auto}.growth-error{margin-top:14px;background:#fff0f0;color:#9b2929;padding:11px 13px;border-radius:10px;font-size:12px}.growth-note{font-size:11px;line-height:1.55;opacity:.65;margin-top:14px}.growth-result-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.growth-copy{border:1px solid #dedbe8;background:transparent;color:inherit;border-radius:9px;padding:8px 10px;display:flex;gap:7px;align-items:center;font-size:11px;font-weight:700;cursor:pointer}
   @media(max-width:850px){.growth-grid{grid-template-columns:1fr}.growth-shell{padding:18px 14px 45px}.growth-card{padding:18px}}
   @media(max-width:480px){.growth-actions{grid-template-columns:1fr}.growth-goals{grid-template-columns:1fr}.growth-hero{border-radius:20px}}
  `}</style>
  <div className="growth-wrap">
   <Link className="growth-back" href="/"><ArrowLeft size={16}/> Back to OmniPost</Link>
   <section className="growth-hero"><span className="growth-kicker"><Sparkles size={15}/> OMNIPOST INTELLIGENCE</span><h1>Growth Lab</h1><p>Build an audience people actually want to follow. Turn your niche, audience signals and content into a practical growth strategy—without fake metrics, spam tactics or promises of overnight virality.</p></section>
   {auth==='checking'?<section className="growth-card" style={{marginTop:18}}>Checking your secure OmniPost session…</section>:auth==='signed-out'?<section className="growth-card" style={{marginTop:18}}><h2>Sign in required</h2><p className="growth-sub">Sign in to your OmniPost workspace to use the connected AI strategist.</p><Link href="/" className="growth-btn" style={{display:'inline-flex',textDecoration:'none'}}>Go to sign in <ArrowUpRight size={15}/></Link></section>:<div className="growth-grid">
    <section className="growth-card"><h2><Target size={18} style={{verticalAlign:'middle',marginRight:7}}/> Your growth profile</h2><p className="growth-sub">Tell Omni AI who you want to reach. Save this profile to reuse it for future plans.</p>
     <label className="growth-label">Brand / account name</label><input className="growth-input" value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Your brand"/>
     <label className="growth-label">Your niche / industry *</label><input className="growth-input" value={niche} onChange={e=>setNiche(e.target.value)} placeholder="e.g. real estate tips for first-time buyers"/>
     <label className="growth-label">Who do you want to attract? *</label><textarea className="growth-textarea" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Describe their interests, problems, goals, location or experience level."/>
     <label className="growth-label">What value do you offer?</label><input className="growth-input" value={offer} onChange={e=>setOffer(e.target.value)} placeholder="What can people learn, solve or get from following you?"/>
     <label className="growth-label">Primary growth objective</label><div className="growth-goals">{GOALS.map(g=><button key={g.id} className={'growth-goal '+(goal===g.id?'active':'')} onClick={()=>setGoal(g.id)}><b>{g.label}</b><small>{g.desc}</small></button>)}</div>
     <label className="growth-label">Platforms</label><div className="growth-platforms">{PLATFORMS.map(p=><button key={p} className={'growth-chip '+(platforms.includes(p)?'active':'')} onClick={()=>togglePlatform(p)}>{LABELS[p]}</button>)}</div>
     <label className="growth-label">Brand voice</label><input className="growth-input" value={voice} onChange={e=>setVoice(e.target.value)}/>
     <label className="growth-label">Current campaign / topic (optional)</label><input className="growth-input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. home-buying mistakes, seasonal offers"/>
     <button className="growth-btn" style={{width:'100%',marginTop:17}} onClick={saveProfile}><Check size={15}/>{snapshotSaved?'Saved':'Save growth profile'}</button>
    </section>
    <div style={{display:'grid',gap:18,alignContent:'start'}}>
     <section className="growth-card"><h2><TrendingUp size={18} style={{verticalAlign:'middle',marginRight:7}}/> Performance snapshot</h2><p className="growth-sub">Optional: enter metrics from your platform insights. OmniPost labels these as user-provided—not live API data.</p><div className="growth-metrics">{fields.map(([key,label,hint])=><label key={key}>{label}<input value={metrics[key]} onChange={e=>setMetrics(m=>({...m,[key]:e.target.value}))} placeholder={hint}/></label>)}</div><button className="growth-btn secondary" style={{marginTop:13,width:'100%'}} onClick={saveMetrics}><Check size={14}/>{snapshotSaved?'Saved snapshot':'Save metrics snapshot'}</button></section>
     <section className="growth-card"><h2><WandSparkles size={18} style={{verticalAlign:'middle',marginRight:7}}/> Growth strategist</h2><p className="growth-sub">Choose a task. Omni AI uses your profile and existing workspace context to return an actionable plan.</p>
      <label className="growth-label">Post format to optimize</label><select className="growth-select" value={postFormat} onChange={e=>setPostFormat(e.target.value)}><option>Short-form video / Reel</option><option>Carousel / multi-image</option><option>Single image</option><option>Text post / discussion</option><option>YouTube long-form video</option><option>Story</option></select>
      <label className="growth-label">Specific post to review (optional)</label><textarea className="growth-textarea" value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Paste a draft caption, hook or script to improve."/>
      <div className="growth-actions"><button className="growth-btn" disabled={busy||!platforms.length} onClick={()=>run('audit')}><Target size={15}/> Growth audit</button><button className="growth-btn secondary" disabled={busy||!platforms.length} onClick={()=>run('calendar')}><BarChart3 size={15}/> 7-day plan</button><button className="growth-btn secondary" disabled={busy||!platforms.length} onClick={()=>run('ideas')}><Flame size={15}/> 15 content ideas</button><button className="growth-btn secondary" disabled={busy||!platforms.length} onClick={()=>run('rewrite')}><Lightbulb size={15}/> Improve my post</button></div>
      {busy&&<p className="growth-note"><Loader2 size={14} style={{verticalAlign:'middle',marginRight:6}}/> Omni AI is building your recommendations…</p>}
      {error&&<p className="growth-error">{error}</p>}
     </section>
     <section className="growth-card"><div className="growth-result-head"><h2><Sparkles size={18} style={{verticalAlign:'middle',marginRight:7}}/> Your strategy</h2>{result&&<button className="growth-copy" onClick={copyResult}>{copied?<Check size={14}/>:<Clipboard size={14}/>} {copied?'Copied':'Copy strategy'}</button>}</div>{result?<div className="growth-result">{result}</div>:<p className="growth-sub">Your growth audit, content plan or post recommendations will appear here. Nothing is published automatically.</p>}</section>
    </div>
   </div>}
   <p className="growth-note">Growth advice is guidance, not a reach guarantee. Platform recommendations are personalized and change over time. Use real insights from each connected account to validate what works.</p>
  </div>
 </main>
}
