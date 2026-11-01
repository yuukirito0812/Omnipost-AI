import {userDb,verifyUser,encrypt,fail} from '../../../../lib/server';
export const runtime='nodejs';
const DEFAULT_MODEL='gemini-3.5-flash-lite';
const CANDIDATES=['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.8-flash','gemini-2.5-flash-lite'];
async function requestGoogle(key:string,model:string){
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
   method:'POST',
   headers:{'Content-Type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({contents:[{role:'user',parts:[{text:'Respond with: connected'}]}],generationConfig:{maxOutputTokens:24,temperature:0}}),
   signal:AbortSignal.timeout(18000),
 });
 let result:any={};try{result=await r.json()}catch{}
 return {ok:r.ok,status:r.status,reply:String(result.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('')||''),reason:String(result.error?.message||result.error?.status||'').slice(0,250)};
}
function reasonFromGoogle(status:number,reason:string):string{
 if(status===429)return 'Google recognizes the project but the model quota is exhausted. Check the free-tier rate limits or try later.';
 if(status===400||status===404)return 'The API key may be valid, but the selected model is unavailable for this project. Try a different supported model.';
 if(status===401||status===403)return 'Google rejected this key or its Gemini API permissions. Verify the Gemini API is enabled for the key in Google AI Studio.';
 return 'Google declined the test request ('+status+'). '+reason;
}
export async function GET(req:Request){
 try{
  const user=await verifyUser(req);
  const {data,error}=await userDb(req).from('omnipost_user_ai_settings').select('model,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return Response.json({configured:!!data||!!process.env.GEMINI_API_KEY,provider:data?'gemini-personal':process.env.GEMINI_API_KEY?'gemini-server':'unconfigured',model:data?.model||process.env.GEMINI_MODEL||DEFAULT_MODEL,updatedAt:data?.updated_at||null});
 }catch(e){return fail(e,401)}
}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req);
  const body=await req.json();
  const key=String(body.key||'').replace(/\s/g,'').trim();
  const choice=String(body.model||'auto').trim();
  if(!/^AIza[A-Za-z0-9_-]{20,190}$/.test(key))return Response.json({error:'This does not look like a Gemini API key from Google AI Studio. Copy the entire key (usually starts with AIza).',stage:'format'},{status:400});
  const candidates=choice==='auto'?CANDIDATES:[choice];
  if(candidates.some(model=>!/^gemini-[a-z0-9.\-]{1,65}$/.test(model)))return Response.json({error:'Select a supported Gemini text model.',stage:'model'},{status:400});
  let selected='',validationReason='';
  for(const model of candidates){
   const checked=await requestGoogle(key,model);
   if(checked.ok){selected=model;break;}
   if(checked.status===401||checked.status===403) return Response.json({error:reasonFromGoogle(checked.status,checked.reason),stage:'authentication',model},{status:400});
   validationReason=reasonFromGoogle(checked.status,checked.reason);
   if(checked.status===429)break; // Do not exhaust quotas with repeated retries.
  }
  if(!selected)return Response.json({error:validationReason||'Unable to validate this API key. Check Google AI Studio and retry.',stage:'model',helpUrl:'https://aistudio.google.com/api-keys'},{status:422});
  const {error}=await userDb(req).from('omnipost_user_ai_settings').upsert({user_id:user.id,key_ciphertext:encrypt(key),model:selected,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error){return Response.json({error:'Key validation passed, but saving the encrypted key failed: '+error.message,stage:'storage'},{status:500})}
  return Response.json({configured:true,provider:'gemini-personal',model:selected,verified:true});
 }catch(e){return fail(e,e instanceof Error&&/session|sign in/i.test(e.message)?401:500)}
}
export async function DELETE(req:Request){
 try{
  const user=await verifyUser(req);
  const {error}=await userDb(req).from('omnipost_user_ai_settings').delete().eq('user_id',user.id);
  if(error)throw error;
  return Response.json({configured:!!process.env.GEMINI_API_KEY});
 }catch(e){return fail(e,500)}
}
