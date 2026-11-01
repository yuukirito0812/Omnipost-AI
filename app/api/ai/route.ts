import {verifyUser,fail} from '../../../lib/server';
import {generateMarketingText,parseAIJson} from '../../../lib/ai-gateway';
export const runtime='nodejs';
export async function POST(req:Request){try{await verifyUser(req);const {topic,tone,goal,audience,platforms,brand}=await req.json();if(!String(topic||'').trim())throw Error('Describe your content topic');
 const prompt=`You are an expert social media strategist. Create marketing copy that is accurate, non-deceptive, fluent, engaging, and tailored to selected platforms. No fabricated facts, pricing or testimonials. Return ONLY strict JSON with fields title:string, caption:string, tags:string (space separated hashtags), cta:string, firstComment:string, altText:string, overrides:object keyed by requested platforms with platform-specific ready-to-publish captions. YouTube needs SEO-ready description, TikTok concise hook, Instagram natural engaging copy, Facebook conversational, X concise <=280 characters. Topic: ${String(topic).slice(0,1500)}. Tone: ${String(tone).slice(0,100)}. Objective: ${String(goal).slice(0,100)}. Audience: ${String(audience).slice(0,200)}. Brand: ${String(brand).slice(0,150)}. Platforms: ${Array.isArray(platforms)?platforms.join(','):'all'}.`;
 const raw=await generateMarketingText('You are an expert social media strategist. Output only a valid JSON object. Never invent facts or performance metrics.',prompt,3500,req);
 const result=parseAIJson(raw);
 if(!result||typeof result!=='object'||typeof result.caption!=='string')throw Error('AI returned an unexpected structure. Please try again.');
 return Response.json(result);
 }catch(e){return fail(e);}}
