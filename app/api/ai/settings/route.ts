import {userDb,verifyUser,encrypt,fail} from '../../../../lib/server';
export const runtime='nodejs';

export async function GET(req:Request){
 try{
  const user=await verifyUser(req);
  const {data,error}=await userDb(req).from('omnipost_user_ai_settings').select('model,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return Response.json({configured:!!data||!!process.env.GEMINI_API_KEY,provider:data?'gemini-personal':process.env.GEMINI_API_KEY?'gemini-server':'unconfigured',model:data?.model||process.env.GEMINI_MODEL||'gemini-2.5-flash',updatedAt:data?.updated_at||null});
 }catch(e){return fail(e,401)}
}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req);
  const body=await req.json();
  const key=String(body.key||'').trim();
  const model=String(body.model||'gemini-2.5-flash').trim();
  if(!/^AIza[A-Za-z0-9_\-]{20,190}$/.test(key))return Response.json({error:'Enter a valid Gemini API key from Google AI Studio.'},{status:400});
  if(!/^gemini-[a-z0-9.\-]{1,50}$/.test(model))return Response.json({error:'Choose a supported Gemini text model.'},{status:400});
  const checked=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(10000)});
  if(!checked.ok){
   if(checked.status===400||checked.status===401||checked.status===403)return Response.json({error:'Google rejected that API key or the project cannot access the Gemini API. Verify the key in Google AI Studio.'},{status:400});
   return Response.json({error:'Google API validation could not be completed. Please retry after checking your key and quota.'},{status:502});
  }
  const {error}=await userDb(req).from('omnipost_user_ai_settings').upsert({user_id:user.id,key_ciphertext:encrypt(key),model,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)throw error;
  return Response.json({configured:true,provider:'gemini-personal',model});
 }catch(e){return fail(e,500)}
}
export async function DELETE(req:Request){
 try{
  const user=await verifyUser(req);
  const {error}=await userDb(req).from('omnipost_user_ai_settings').delete().eq('user_id',user.id);
  if(error)throw error;
  return Response.json({configured:!!process.env.GEMINI_API_KEY});
 }catch(e){return fail(e,500)}
}
