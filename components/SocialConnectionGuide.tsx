'use client';
import {useState} from 'react';
import {Copy,ExternalLink,CheckCircle2,LockKeyhole,Link2,RefreshCw,ShieldCheck,Info,ArrowUpRight} from 'lucide-react';
import type {Platform} from '../lib/types';
const platforms:Record<Platform,{name:string;portal:string;ids:[string,string];advice:string;scope:string}>={
facebook:{name:'Facebook Pages',portal:'https://developers.facebook.com/apps/',ids:['FACEBOOK_CLIENT_ID','FACEBOOK_CLIENT_SECRET'],advice:'Create a Meta app with Facebook Login and Pages access. You must manage the Page you connect.',scope:'pages_show_list, pages_manage_posts, pages_read_engagement'},
instagram:{name:'Instagram Professional',portal:'https://developers.facebook.com/apps/',ids:['INSTAGRAM_CLIENT_ID','INSTAGRAM_CLIENT_SECRET'],advice:'Create a Meta app with Instagram API with Instagram Login. Only Professional accounts (Business/Creator) can publish.',scope:'instagram_business_basic, instagram_business_content_publish'},
tiktok:{name:'TikTok',portal:'https://developers.tiktok.com/apps/',ids:['TIKTOK_CLIENT_ID','TIKTOK_CLIENT_SECRET'],advice:'Register TikTok Login Kit and Content Posting API. Direct posting requires approval; unaudited apps may only post privately.',scope:'user.info.basic, video.publish'},
youtube:{name:'YouTube',portal:'https://console.cloud.google.com/apis/credentials',ids:['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET'],advice:'Create a Google OAuth web app, enable YouTube Data API, and add a consent screen and allowed test users before public verification.',scope:'youtube.upload, youtube.readonly'},
x:{name:'X',portal:'https://developer.x.com/en/portal/dashboard',ids:['X_CLIENT_ID','X_CLIENT_SECRET'],advice:'Create an X developer app and enable OAuth2 write permissions. Posting API access may require a paid plan.',scope:'tweet.read, tweet.write, users.read, offline.access'}
};
type Props={selected:Platform|null;setSelected:(p:Platform|null)=>void;ready:Record<string,boolean>;serverReady:boolean;onCheck:()=>void;onConnect:(p:Platform)=>void};
export default function SocialConnectionGuide({selected,setSelected,ready,serverReady,onCheck,onConnect}:Props){
 const [copied,setCopied]=useState(false);
 if(!selected)return null;
 const p=platforms[selected],callback='https://omnipost-ai-theta.vercel.app/api/oauth/callback/'+selected;
 const readyForLogin=!!ready[selected]&&serverReady;
 const copy=async()=>{try{await navigator.clipboard.writeText(callback);setCopied(true)}catch{setCopied(false)}};
 return <section className="panel omni-social-guide" id="omni-social-guide" aria-label={'Set up '+p.name}>
 <div className="omni-social-guide-head"><div><span className="omni-step-label">OFFICIAL ACCOUNT INTEGRATION</span><h3>{p.name} developer setup</h3><p>Connect through the platform's secure authorization screen, never by entering a social password here.</p></div><button className="outline-btn sm" onClick={()=>setSelected(null)}>Close</button></div>
 <div className="omni-setup-steps">
  <div><span>01</span><div><h4>Register an app</h4><p>{p.advice}</p><a className="omni-step-link" href={p.portal} target="_blank" rel="noreferrer">Open official developer portal <ExternalLink size={14}/></a></div></div>
  <div><span>02</span><div><h4>Register this exact redirect URL</h4><p>Paste it into the platform's allowed OAuth / redirect URIs. Do not use your general homepage URL.</p><div className="omni-callback-value"><code>{callback}</code><button onClick={copy} title="Copy redirect URL"><Copy size={16}/>{copied?'Copied':'Copy'}</button></div></div></div>
  <div><span>03</span><div><h4>Configure server credentials in Vercel</h4><p>Add both environment variables to the OmniPost project, mark secrets Sensitive, and redeploy.</p><div className="omni-env-tags"><code>{p.ids[0]}</code><code>{p.ids[1]}</code></div><a className="omni-step-link" href="https://vercel.com/cz-95a8/omnipost-ai/settings/environment-variables" target="_blank" rel="noreferrer">Open Vercel settings <ExternalLink size={14}/></a></div></div>
  <div><span>04</span><div><h4>Request permissions and authorize</h4><p>Requested scopes: {p.scope}. You may need provider review before clients can connect or publishing can work.</p><p><strong>Protected publishing server:</strong> {serverReady?'Configured':'Not configured — SUPABASE_SERVICE_ROLE_KEY is required on Vercel.'}</p></div></div>
 </div>
 <div className="omni-guide-actions"><div className={'omni-readiness '+(readyForLogin?'success':'pending')}>{readyForLogin?<CheckCircle2 size={17}/>:<Info size={17}/>} {readyForLogin?'Backend configuration detected — continue to OAuth':'Official developer credentials or server access still missing'}</div><button className="outline-btn" onClick={onCheck}><RefreshCw size={15}/> Recheck setup</button><button className="primary-btn" disabled={!readyForLogin} onClick={()=>onConnect(selected)}><Link2 size={15}/> {readyForLogin?'Authorize '+p.name:'Complete setup first'} <ArrowUpRight size={15}/></button></div>
 </section>
}
