'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,AlertCircle,ArrowRight,ArrowUpRight,BarChart3,CalendarClock,CheckCircle2,Clock3,Eye,Lightbulb,Loader2,RefreshCw,Sparkles,Target,TrendingUp,Users,Video} from 'lucide-react';
import PlatformIcon from './PlatformIcon';
import type {Platform} from '../lib/types';
type Period='last_day'|'last_week'|'last_month'|'last_3months'|'last_year';
type Snapshot={profile:string;period?:Period;platforms:Record<string,any>;totalImpressions:number|null;totalPerPlatform:Record<string,number>;totalPerDay:Record<string,number>;omitted:string[];refreshedAt:string};
type Analysis={summary:string;wins:string[];opportunities:string[];nextActions:string[];platformNotes:{platform:string;observation:string;recommendation:string}[]};
const LABELS:Record<string,string>={instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',x:'X',linkedin:'LinkedIn',threads:'Threads',pinterest:'Pinterest'};
const METRIC_LABELS:Record<string,string>={
 followers:'Followers',follower_count:'Followers',followers_count:'Followers',subscribers:'Subscribers',subscriber_count:'Subscribers',
 views:'Views',view_count:'Views',video_views:'Video views',impressions:'Impressions',reach:'Reach',accounts_reached:'Accounts reached',
 engagement:'Engagement',engagement_rate:'Engagement rate',engagements:'Engagements',likes:'Likes',like_count:'Likes',
 comments:'Comments',comment_count:'Comments',shares:'Shares',saved:'Saves',saves:'Saves',profile_visits:'Profile visits',
 website_clicks:'Website clicks',total_watch_time:'Watch time',watch_time:'Watch time',average_watch_time:'Average watch time'
};
const EXCLUDE=new Set(['id','user_id','account_id','page_id','profile_id','post_id','media_id','created_at','updated_at','timestamp','date','status','success','code','http_status']);
function pretty(value:string){return value.replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatMetric(key:string,value:any){
 const n=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;
 if(!Number.isFinite(n))return String(value);
 const k=key.toLowerCase();
 if(k.includes('rate')||k.includes('percent')||k.endsWith('_pct'))return n<=1?(n*100).toFixed(1)+'%':n.toFixed(1)+'%';
 if(k.includes('watch_time')||k.includes('duration'))return n>=3600?Math.round(n/3600*10)/10+'h':n>=60?Math.round(n/60)+'m':Math.round(n)+'s';
 return new Intl.NumberFormat('en-US',{notation:n>=100000?'compact':'standard',maximumFractionDigits:1}).format(n);
}
function extractMetrics(input:any){
 const found:{key:string;label:string;value:any}[]=[];const seen=new Set<string>();
 const walk=(obj:any,depth:number)=>{
  if(!obj||typeof obj!=='object'||depth>3)return;
  for(const [raw,v] of Object.entries(obj)){
   const key=raw.toLowerCase().replace(/\s+/g,'_');
   if(EXCLUDE.has(key)||seen.has(key))continue;
   if(typeof v==='number'||typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))){
    if(!METRIC_LABELS[key]&&!/(follower|subscriber|view|impression|reach|engagement|like|comment|share|save|visit|click|watch_time|duration)/i.test(key))continue;
    seen.add(key);found.push({key,label:METRIC_LABELS[key]||pretty(raw),value:v});
   }else if(v&&typeof v==='object'&&!Array.isArray(v))walk(v,depth+1);
  }
 };
 walk(input,0);
 const priority=['followers','follower_count','followers_count','subscribers','views','video_views','impressions','reach','engagement_rate','engagement','engagements','likes','comments','shares','saved','saves','profile_visits','website_clicks','total_watch_time','watch_time'];
 return found.sort((a,b)=>{const x=priority.indexOf(a.key),y=priority.indexOf(b.key);return (x<0?999:x)-(y<0?999:y)}).slice(0,8);
}
function safeNumber(value:any){const n=Number(value);return Number.isFinite(n)?n:null}
export default function AnalyticsDashboard({token,profile,facebookPageId,linkedinPageId,aiReady,brand,onConnect,onAISettings}:{token:string|null;profile:string;facebookPageId:string;linkedinPageId:string;aiReady:boolean;brand:string;onConnect:()=>void;onAISettings:()=>void}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[refreshKey,setRefreshKey]=useState(0),[period,setPeriod]=useState<Period>('last_month'),[analysis,setAnalysis]=useState<Analysis|null>(null),[analysing,setAnalysing]=useState(false),[analysisError,setAnalysisError]=useState('');
 useEffect(()=>{
  if(!token||!profile){setSnapshot(null);return}
  const controller=new AbortController();setLoading(true);setError('');setAnalysis(null);setAnalysisError('');
  const params=new URLSearchParams({profile,period});if(facebookPageId)params.set('facebookPageId',facebookPageId);if(linkedinPageId)params.set('linkedinPageId',linkedinPageId);
  fetch('/api/managed-social/analytics?'+params.toString(),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal})
   .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Could not load social analytics.');return j as Snapshot})
   .then(setSnapshot).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Analytics request failed.')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return ()=>controller.abort();
 },[token,profile,facebookPageId,linkedinPageId,period,refreshKey]);
 const channels=useMemo(()=>Object.entries(snapshot?.platforms||{}).filter(([,v])=>v&&typeof v==='object'),[snapshot]);
 const metricCount=channels.reduce((n,[,v])=>n+extractMetrics(v).length,0);
 const totalImpressions=safeNumber(snapshot?.totalImpressions);
 const topMetrics=useMemo(()=>channels.flatMap(([platform,value])=>extractMetrics(value).map(m=>({...m,platform}))),[channels]);
 async function runAnalysis(){
  if(!token||!snapshot||!aiReady)return;
  setAnalysing(true);setAnalysisError('');setAnalysis(null);
  try{
   const body={mode:'performance',brand,goal:'Improve social media performance and content decisions',audience:'The brand audience',platforms:channels.map(([p])=>p),caption:JSON.stringify({profile:snapshot.profile,totalImpressions:snapshot.totalImpressions,totalPerPlatform:snapshot.totalPerPlatform,platforms:snapshot.platforms,omitted:snapshot.omitted},null,2)};
   const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
   const j=await r.json();if(!r.ok)throw Error(j.error||'AI analysis could not be completed.');
   setAnalysis(j as Analysis);
  }catch(e){setAnalysisError(e instanceof Error?e.message:String(e))}
  finally{setAnalysing(false)}
 }
 const refreshed=snapshot?.refreshedAt?new Date(snapshot.refreshedAt).toLocaleString():null;
 const periodLabel:Record<Period,string>={last_day:'Last 24 hours',last_week:'Last 7 days',last_month:'Last 30 days',last_3months:'Last 3 months',last_year:'Last 12 months'};
 if(!profile)return <section className="panel analytics-empty"><div className="analytics-empty-icon"><BarChart3 size={26}/></div><h3>Connect a social client to see real performance</h3><p>Link your Upload-Post workspace, choose a client profile and connect its social channels. OmniPost will show provider-reported metrics here — not made-up demo numbers.</p><button className="primary-btn" onClick={onConnect}>Connect social accounts <ArrowRight size={15}/></button></section>;
 return <div className="analytics-dashboard">
  <div className="analytics-toolbar"><div><span className="analytics-live-dot"/><strong>Live provider insights</strong><span className="analytics-profile-label">{profile}</span>{refreshed&&<small>Updated {refreshed}</small>}</div><div className="analytics-toolbar-actions"><label>Impression period<select aria-label="Impression reporting period" value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="last_day">Last 24 hours</option><option value="last_week">Last 7 days</option><option value="last_month">Last 30 days</option><option value="last_3months">Last 3 months</option><option value="last_year">Last 12 months</option></select></label><button type="button" className="outline-btn sm" disabled={loading} onClick={()=>setRefreshKey(v=>v+1)}>{loading?<Loader2 size={14} className="spin"/>:<RefreshCw size={14}/>} Refresh</button></div></div>
  {error&&<div className="analytics-alert"><AlertCircle size={16}/><span>{error}</span><button onClick={()=>setRefreshKey(v=>v+1)}>Try again</button></div>}
  {loading&&!snapshot&&<div className="analytics-loading"><Loader2 size={24} className="spin"/><span>Loading verified metrics from connected platforms…</span></div>}
  {snapshot&&<>
   <div className="analytics-kpis">
    <article><span className="analytics-kpi-icon violet"><Activity size={18}/></span><small>Channels reporting</small><strong>{channels.length}</strong><span>Connected channels with returned insights</span></article>
    <article><span className="analytics-kpi-icon blue"><Target size={18}/></span><small>Metrics returned</small><strong>{metricCount}</strong><span>Numeric measures from the provider</span></article>
    <article><span className="analytics-kpi-icon green"><Eye size={18}/></span><small>Total impressions</small><strong>{totalImpressions===null?'—':formatMetric('impressions',totalImpressions)}</strong><span>{totalImpressions===null?'Not supplied by this provider response':'Provider-reported total'}</span></article>
    <article><span className="analytics-kpi-icon amber"><Clock3 size={18}/></span><small>Data freshness</small><strong>{refreshed?new Date(snapshot.refreshedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</strong><span>{refreshed||'No refresh timestamp'}</span></article>
   </div>
   <div className="analytics-content-grid">
    <section className="panel analytics-platform-panel"><div className="panel-head"><div><h3>Performance by platform</h3><p>Metrics returned by the connected social accounts</p></div><span className="analytics-provider-badge"><CheckCircle2 size={13}/> Live data</span></div>
     {channels.length?<div className="analytics-platform-list">{channels.map(([platform,value])=>{const metrics=extractMetrics(value);return <article className="analytics-platform-card" key={platform}><div className="analytics-platform-heading"><span className="analytics-platform-brand"><PlatformIcon platform={platform as Platform} size={24}/></span><div><strong>{LABELS[platform]||pretty(platform)}</strong><small>{metrics.length?'Insights available':'Connected · no metric values returned'}</small></div><span className="analytics-platform-state">{metrics.length?'Reporting':'No data'}</span></div>{metrics.length?<div className="analytics-metric-grid">{metrics.slice(0,4).map(m=><div key={m.key}><small>{m.label}</small><strong>{formatMetric(m.key,m.value)}</strong></div>)}</div>:<p className="analytics-no-metrics">This channel did not return standard numeric insights. Check its account permissions or platform analytics availability.</p>}</article>})}</div>:<div className="analytics-no-data"><BarChart3 size={25}/><strong>No channel metrics returned</strong><p>The profile is connected, but no supported analytics were returned for the selected destinations.</p></div>}
    </section>
    <section className="panel analytics-ai-panel"><div className="analytics-ai-heading"><span><Sparkles size={19}/></span><div><h3>Omni performance coach</h3><p>Turn your actual account metrics into next steps.</p></div></div>
     {!aiReady?<div className="analytics-ai-empty"><p>Connect your free Gemini key to get an AI performance review.</p><button className="outline-btn sm" onClick={onAISettings}>Open account settings <ArrowUpRight size={14}/></button></div>:<><button className="primary-btn analytics-ai-run" disabled={analysing||loading||!channels.length} onClick={runAnalysis}>{analysing?<Loader2 size={15} className="spin"/>:<Sparkles size={15}/>} {analysing?'Reviewing real metrics…':'Analyze performance'}</button>{analysisError&&<p className="analytics-ai-error">{analysisError}</p>}{analysis&&<div className="analytics-ai-result"><p>{analysis.summary}</p>{analysis.wins?.length>0&&<div><strong>What is working</strong>{analysis.wins.map((v,i)=><p key={i}>✓ {v}</p>)}</div>}{analysis.opportunities?.length>0&&<div><strong>Opportunities</strong>{analysis.opportunities.map((v,i)=><p key={i}>↗ {v}</p>)}</div>}{analysis.nextActions?.length>0&&<div><strong>Next actions</strong>{analysis.nextActions.map((v,i)=><p key={i}>{i+1}. {v}</p>)}</div>}{analysis.platformNotes?.length>0&&<div><strong>Channel notes</strong>{analysis.platformNotes.map((v,i)=><p key={i}><b>{LABELS[v.platform]||v.platform}:</b> {v.observation} {v.recommendation}</p>)}</div>}</div>}</>}
    </section>
   </div>
   {snapshot.omitted?.length>0&&<div className="analytics-alert analytics-caveat"><AlertCircle size={16}/><div><strong>Some channels need attention</strong>{snapshot.omitted.map((v,i)=><p key={i}>{v}</p>)}</div></div>}
   <div className="analytics-footnote"><ShieldCheckIcon/> Insights come from connected platform APIs. Availability, definitions and reporting windows vary by network; a missing metric is shown as unavailable, never estimated.</div>
  </>}
 </div>;
}
function ShieldCheckIcon(){return <CheckCircle2 size={15}/>}
