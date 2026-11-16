import {verifyUser,fail} from '../../../lib/server';
import {generateMarketingText,parseAIJson} from '../../../lib/ai-gateway';
import {CHANNELS, channelCopy, channelTitleField} from '../../../lib/channel-formats';
import {INITIAL_POST, PLATFORMS,type Platform} from '../../../lib/types';
export const runtime='nodejs';
export const maxDuration=45;
type Mode='post'|'hooks'|'hashtags'|'calendar'|'repurpose'|'audit'|'ideas'|'replies'|'performance'|'community_reply'|'caption_variants'|'growth_audit';
const MODES=new Set<Mode>(['post','hooks','hashtags','calendar','repurpose','audit','ideas','replies','performance','community_reply','caption_variants','growth_audit']);
const clip=(v:unknown,n=1800)=>String(v??'').trim().slice(0,n);
const cleanPlatforms=(value:unknown):Platform[]=>{
 const values=Array.isArray(value)?value.filter((v):v is Platform=>typeof v==='string'&&PLATFORMS.includes(v as Platform)):[];
 return values.length?Array.from(new Set(values)).slice(0,9):['instagram','facebook','youtube','linkedin'];
};
const platformGuidance:Record<Platform,string>={
 instagram:'Instagram: strong first line, readable spacing, useful caption, relevant hashtags. Personal consumer accounts are not supported for API publishing.',
 facebook:'Facebook: conversational, community-focused, clear CTA. Page publishing only.',
 tiktok:'TikTok: short spoken-style hook, natural language, compact caption and a clear video concept.',
 youtube:'YouTube: searchable title, useful description, topic keywords and clear viewer value.',
 x:'X: concise, conversational, no more than 280 characters for the post text.',
 linkedin:'LinkedIn: professional insight, practical context and a discussion prompt. Avoid corporate jargon.',
 threads:'Threads: natural, conversational, short-form copy that invites replies.',
 pinterest:'Pinterest: descriptive searchable title and keyword-rich pin description; make the visual idea explicit.',
 google_business:'Google Business Profile: local, factual, concise update with a clear action. Never invent a location or offer.'
};
function normalizeProposal(value:any,platforms:Platform[]){
 const overrides:Partial<Record<Platform,string>>={};
 for(const p of platforms)if(typeof value?.overrides?.[p]==='string')overrides[p]=clip(value.overrides[p],5000);
 return {title:clip(value?.title,120),caption:clip(value?.caption,6000),tags:clip(value?.tags,700),cta:clip(value?.cta,400),firstComment:clip(value?.firstComment,700),altText:clip(value?.altText,500),overrides,platforms};
}
export async function POST(req:Request){
 try{
  await verifyUser(req);
  const body=await req.json();
  const mode=(MODES.has(body.mode)?body.mode:'post') as Mode;
  const topic=clip(body.topic,1800),caption=clip(body.caption,5000),tone=clip(body.tone||'Natural, clear and engaging',100),goal=clip(body.goal||'Engagement',100),audience=clip(body.audience||'General audience',240),brand=clip(body.brand||'My Brand',150),interactionContext=clip(body.interactionContext,1200),platforms=cleanPlatforms(body.platforms);
  if(!topic&&!caption)throw Error(mode==='audit'||mode==='replies'||mode==='community_reply'?'Paste the post or comment first.':'Add a topic or campaign brief first.');
  const mediaType = body.mediaType==='image'||body.mediaType==='video' ? body.mediaType : '';
  const target = platforms[0];
  const targetDraft = {...INITIAL_POST,mediaType};
  const limits = channelCopy(targetDraft, target);
  const titleField = channelTitleField(target, mediaType);
  const context=`Brand: ${brand}. Audience: ${audience}. Goal: ${goal}. Tone: ${tone}. Platforms: ${platforms.join(', ')}.
Platform requirements:
${platforms.map(p=>'- '+platformGuidance[p]).join('\n')}
Never fabricate facts, prices, locations, reviews, results, testimonials, statistics, deadlines, availability, or trending status. Use clear placeholders when facts are missing. Avoid cringe, filler, clickbait, generic AI phrases and excessive emojis. Make copy sound like a capable human SMM wrote it.`;
  const specs:Record<Mode,string>={
   post:`Create one ready-to-edit social post. Return strict JSON with title, caption, tags (hashtags), cta, firstComment, altText, and overrides (object with one platform-specific caption for every selected platform). Keep the master caption useful and make every override native to its channel. Do not repeat the same generic copy across all platforms.`,
   caption_variants: `Write three distinct, complete captions for the selected ${CHANNELS[target].name} layout. ${CHANNELS[target].guidance} Use the reader's language and actual topic in the opening line. Vary the opening angles: lead with the practical answer, make a short actionable list, and ask a specific audience question or tell a brief true story using supplied facts. Where relevant, include one natural call to action tied to the stated goal. Use relevant search phrases without stuffing hashtags. Each caption is the entire platform copy, including any CTA or hashtags. Keep it under ${limits.limit} ${limits.unit} including spaces. ${titleField ? 'Write a separate ' + titleField.label + ' under ' + titleField.limit + ' characters.' : 'Leave the title empty.'} Return strict JSON {variants:[{angle:string,title:string,caption:string,rationale:string}]} with exactly three items. Keep rationales to one sentence about what to test. Never invent a ranking signal, trending audio, audience metrics, property facts or product claims.`,
   growth_audit: `Build a practical growth audit for the selected channel and objective. Use verified facts supplied by the user. Mark possible causes as hypotheses. If past results are sparse, give a measurement plan. Include two original content series with an example hook, a 7-day action to start useful conversations, and a one-variable experiment the user can run. Return strict JSON {audit:string[]} with 4 to 6 concise recommendations, each a standalone item.`,
   hooks:`Create 8 distinct opening hooks for the topic. Mix curiosity, useful insight, relatable situations and clear value. No fake urgency or clickbait. Return strict JSON {hooks:string[]}.`,
   hashtags:`Suggest 12 relevant, specific hashtags for the topic and selected channels. Mix broad and niche tags, avoid spam and never claim a tag is trending. Return strict JSON {hashtags:string[],note:string}.`,
   calendar:`Create a practical 7-day social content plan for the brand. Vary formats and goals; do not make every day a sales post. Each entry must be a complete, editable draft. Return strict JSON {calendarPlan:[{title,caption,tags,cta,firstComment,altText,platforms,overrides}]}. Use 7 entries and only selected platforms. No dates are needed; the user will choose a schedule.`,
   repurpose:`Repurpose the supplied source post into distinct platform-native captions. Keep the original facts intact; do not add claims. Return strict JSON {title,tags,cta,overrides:{platform:caption}} for each selected platform, plus a concise master caption.`,
   audit:`Audit the supplied caption as a practical SMM editor. Assess clarity, opening hook, audience fit, readability, CTA and platform fit. Return strict JSON {score:number (0-100),strengths:string[],improvements:string[],rewrite:string,reason:string}. Be honest; do not invent performance metrics.`,
   ideas:`Generate 10 distinct content ideas for the brand and audience. Include a mix of educational, community, proof/process (without fabricated testimonials), promotional and conversation-led ideas. Return strict JSON {ideas:[{title,angle,format,goal,hook}]}.`,
   replies:`Write 6 natural comment/DM reply options for the supplied message. Include friendly, concise, helpful and boundary-setting variations as appropriate. Do not promise a price, refund, availability or action not supplied. Return strict JSON {replies:string[]}.`,
   community_reply:`Write one concise, human-sounding customer-service reply to the incoming social comment, direct message or public review. Address the actual question, acknowledge emotion where relevant, stay on-brand and avoid sounding scripted. Never invent prices, stock, availability, policies, refunds, property details, appointment slots, actions already taken, or promises. If important information is missing, ask one clear follow-up question instead of guessing. If the message raises legal, safety, discrimination, privacy, payment, complaint escalation or a sensitive personal issue, use a calm acknowledgement and recommend human review rather than attempting to resolve it. Return strict JSON {reply:string,rationale:string,needsHumanReview:boolean,followUpQuestion:string,tone:string}.`
   ,performance:`Analyze the supplied real social analytics. Return strict JSON {summary:string,wins:string[],opportunities:string[],nextActions:string[],platformNotes:[{platform,observation,recommendation}]}. Separate measured facts from hypotheses. Compare platforms only where metrics are comparable. Do not invent missing numbers, targets, causes, or benchmarks. Give 3 prioritized actions that can be tested next week.`
  };
  const instructions='You are Omni, a senior social media strategist and channel editor. Produce accurate, useful and publishable work. Follow the requested JSON schema exactly. '+context;
  const prompt=`TASK: ${specs[mode]}\nBRIEF / TOPIC: ${topic||'(use source below)'}\nSOURCE CAPTION / MESSAGE: ${caption||'(none)'}\nINTERACTION CONTEXT: ${interactionContext||'(none)'}\n${context}`;
  const raw=await generateMarketingText(instructions,prompt,mode==='calendar'?5200:mode==='ideas'?3000:mode==='caption_variants'?2400:3600,req);
  const result=parseAIJson(raw);
  if(!result||typeof result!=='object')throw Error('AI returned an unexpected result. Try again with a shorter brief.');
  if(mode==='caption_variants'){
   const variants: {angle:string;title:string;caption:string;rationale:string}[]=[];
   for(const item of Array.isArray(result.variants)?result.variants.slice(0,3):[]){
    const variant={angle:clip(item?.angle,72),title:titleField?clip(item?.title,130):'',caption:clip(item?.caption,6000),rationale:clip(item?.rationale,240)};
    const copy=channelCopy({...targetDraft,title:variant.title,caption:variant.caption},target);
    const hasValidTitle=!titleField || !!variant.title && copy.titleCount<=titleField.limit;
    if(variant.caption && hasValidTitle && copy.textCount<=limits.limit && (target!=='youtube'||!/[<>]/.test(variant.title+variant.caption)))variants.push(variant);
   }
   if(!variants.length)throw Error('The captions exceeded the channel limits. Try again with a shorter brief.');
   return Response.json({mode,variants});
  }
  if(mode==='growth_audit'){
   const audit=(Array.isArray(result.audit)?result.audit:[]).slice(0,6).map((item:unknown)=>clip(item,480)).filter(Boolean);
   if(!audit.length)throw Error('The audit came back empty. Try a more specific brief.');
   return Response.json({mode,audit});
  }
  if(mode==='post'){
   if(typeof result.caption!=='string'||!result.caption.trim())throw Error('AI could not create a complete caption. Please try again.');
   return Response.json({mode,...normalizeProposal(result,platforms)});
  }
  if(mode==='repurpose'){
   const normalized=normalizeProposal(result,platforms);
   if(!Object.keys(normalized.overrides).length)throw Error('AI did not return platform-specific versions. Try again.');
   return Response.json({mode,...normalized});
  }
  if(mode==='calendar'){
   const calendarPlan=Array.isArray(result.calendarPlan)?result.calendarPlan.slice(0,7).map((p:any)=>normalizeProposal(p,cleanPlatforms(p.platforms).filter(x=>platforms.includes(x)))).filter((p:any)=>p.title||p.caption):[];
   if(calendarPlan.length<3)throw Error('AI returned too few complete content ideas. Try again.');
   return Response.json({mode,calendarPlan,reply:clip(result.reply||'Your 7-day content plan is ready.',500)});
  }
  if(mode==='performance')return Response.json({mode,summary:clip(result.summary,900),wins:Array.isArray(result.wins)?result.wins.slice(0,5).map((v:any)=>clip(v,260)):[],opportunities:Array.isArray(result.opportunities)?result.opportunities.slice(0,5).map((v:any)=>clip(v,260)):[],nextActions:Array.isArray(result.nextActions)?result.nextActions.slice(0,5).map((v:any)=>clip(v,320)):[],platformNotes:Array.isArray(result.platformNotes)?result.platformNotes.slice(0,9).map((v:any)=>({platform:clip(v.platform,40),observation:clip(v.observation,240),recommendation:clip(v.recommendation,260)})):[]});
  if(mode==='community_reply'){const reply=clip(result.reply,1500);if(!reply)throw Error('AI could not produce a safe reply. Try again or write one manually.');return Response.json({mode,reply,rationale:clip(result.rationale,350),needsHumanReview:result.needsHumanReview===true,followUpQuestion:clip(result.followUpQuestion,350),tone:clip(result.tone||tone,80)});}
  if(mode==='audit')return Response.json({mode,score:Math.max(0,Math.min(100,Number(result.score)||0)),strengths:Array.isArray(result.strengths)?result.strengths.slice(0,6).map((v:any)=>clip(v,250)):[],improvements:Array.isArray(result.improvements)?result.improvements.slice(0,6).map((v:any)=>clip(v,250)):[],rewrite:clip(result.rewrite,5000),reason:clip(result.reason,600)});
  if(mode==='hooks'||mode==='hashtags'||mode==='replies')return Response.json({mode,items:(Array.isArray(result[mode])?result[mode]:Array.isArray(result.items)?result.items:[]).slice(0,12).map((v:any)=>clip(typeof v==='string'?v:v?.text||v?.reply||v?.hook||'',500)).filter(Boolean),note:clip(result.note,400)});
  if(mode==='ideas')return Response.json({mode,ideas:(Array.isArray(result.ideas)?result.ideas:[]).slice(0,10).map((v:any)=>typeof v==='string'?{title:clip(v,120),angle:'',format:'Post',goal:'Engagement',hook:''}:{title:clip(v.title,120),angle:clip(v.angle,300),format:clip(v.format,80),goal:clip(v.goal,80),hook:clip(v.hook,250)}).filter((v:any)=>v.title)});
  return Response.json({mode,...result});
 }catch(e){return fail(e,e instanceof Error&&/Invalid or expired|sign in/i.test(e.message)?401:500)}
}
