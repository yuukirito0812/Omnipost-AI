import {verifyUser,userDb,decrypt,fail} from '../../../../lib/server';
export const runtime='nodejs';
const ROOT='https://api.upload-post.com';
const SUPPORTED=new Set(['instagram','tiktok','linkedin','facebook','x','youtube','threads','pinterest']);
const safe=(v:unknown,n=200)=>String(v??'').trim().slice(0,n);
export async function GET(req:Request){
 try{
  const user=await verifyUser(req),url=new URL(req.url),profile=safe(url.searchParams.get('profile'),130);
  if(!profile)throw Error('Choose a client profile first.');
  const db=userDb(req),{data:settings,error}=await db.from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',user.id).maybeSingle();
  if(error||!settings?.api_key_ciphertext)throw Error('Connect your Upload-Post API key in Social Accounts first.');
  const key=decrypt(settings.api_key_ciphertext),headers={Authorization:'Apikey '+key,Accept:'application/json'};
  const profileResponse=await fetch(ROOT+'/api/uploadposts/users',{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
  const profileData:any=await profileResponse.json().catch(()=>({}));
  if(!profileResponse.ok||!Array.isArray(profileData.profiles))throw Error('Could not verify your Upload-Post client profiles.');
  const selected=profileData.profiles.find((p:any)=>p.username===profile);
  if(!selected)throw Error('That client profile is not connected to your Upload-Post account.');
  const connected=Object.keys(selected.social_accounts||{}).filter(p=>SUPPORTED.has(p));
  const requested=connected.filter(p=>(p!=='facebook'||!!url.searchParams.get('facebookPageId'))&&(p!=='linkedin'||!!url.searchParams.get('linkedinPageId')));
  const omitted:string[]=[];
  if(connected.includes('facebook')&&!url.searchParams.get('facebookPageId'))omitted.push('Facebook analytics needs a selected Page.');
  if(connected.includes('linkedin')&&!url.searchParams.get('linkedinPageId'))omitted.push('LinkedIn analytics is available for company Pages, not personal profiles. Select a Page.');
  const unavailable=Object.keys(selected.social_accounts||{}).filter(p=>!SUPPORTED.has(p));
  if(unavailable.length)omitted.push('Analytics is not available for: '+unavailable.join(', ')+'.');
  if(!requested.length)return Response.json({profile,platforms:{},totalImpressions:null,omitted,refreshedAt:new Date().toISOString()});
  const params=new URLSearchParams({platforms:requested.join(',')});
  const fb=safe(url.searchParams.get('facebookPageId'),160),li=safe(url.searchParams.get('linkedinPageId'),200);
  if(requested.includes('facebook')&&fb)params.set('page_id',fb);
  if(requested.includes('linkedin')&&li)params.set('page_urn',li);
  const [analyticsResponse,totalResponse]=await Promise.all([
   fetch(ROOT+'/api/analytics/'+encodeURIComponent(profile)+'?'+params.toString(),{headers,cache:'no-store',signal:AbortSignal.timeout(22000)}),
   fetch(ROOT+'/api/uploadposts/total-impressions/'+encodeURIComponent(profile)+'?breakdown=true',{headers,cache:'no-store',signal:AbortSignal.timeout(22000)}).catch(()=>null)
  ]);
  const analytics:any=await analyticsResponse.json().catch(()=>({}));
  if(!analyticsResponse.ok)throw Error(String(analytics.message||analytics.error||'Analytics provider request failed ('+analyticsResponse.status+').').slice(0,260));
  let total:any=null;if(totalResponse?.ok)total=await totalResponse.json().catch(()=>null);
  const metricsByPlatform=analytics.platforms||analytics.analytics||analytics.data||analytics;
  const platformMetrics=Object.fromEntries(requested.map(p=>[p,metricsByPlatform?.[p]??null]));
  const impressionValues=requested.map(p=>Number(platformMetrics[p]?.impressions??platformMetrics[p]?.total_impressions)).filter(Number.isFinite);
  const computedImpressions=impressionValues.reduce((sum,n)=>sum+n,0);
  const suppliedTotal=Number(total?.total_impressions??analytics.total_impressions);
  const totalImpressions=Number.isFinite(suppliedTotal)?suppliedTotal:(impressionValues.length?computedImpressions:null);
  return Response.json({profile,platforms:platformMetrics,totalImpressions,totalPerPlatform:total?.per_platform||analytics.per_platform||{},totalPerDay:total?.per_day||analytics.per_day||{},omitted,refreshedAt:new Date().toISOString()});
 }catch(e){return fail(e,e instanceof Error&&/session|Sign in/i.test(e.message)?401:502)}
}
