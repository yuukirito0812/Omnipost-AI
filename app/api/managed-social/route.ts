import {decrypt,encrypt,fail,userDb,verifyUser} from '../../../lib/server';
export const runtime='nodejs';

type Profile={username:string;accounts:{platform:string;name:string;handle:string;externalId:string;avatar:string;reauthRequired:boolean}[];facebookPages:{id:string;name:string}[];facebookWarning?:string};
const ROOT='https://api.upload-post.com';
const platforms=new Set(['facebook','instagram','tiktok','youtube','x']);
async function getRemoteProfiles(key:string):Promise<{plan:string;limit:number|null;profiles:Profile[]}>{
 const r=await fetch(ROOT+'/api/uploadposts/users',{headers:{Authorization:'Apikey '+key,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(16000)});
 let data:any={};try{data=await r.json()}catch{}
 if(r.status===401||r.status===403)throw Error('Upload-Post rejected this API key or your account cannot access the API. Check the API Keys page.');
 if(r.status===429)throw Error('Upload-Post rate limit reached. Try refreshing later.');
 if(!r.ok||data.success===false)throw Error('Upload-Post account check failed ('+r.status+'). '+String(data.message||data.error||'Please try again.').slice(0,160));
 if(!Array.isArray(data.profiles))throw Error('Upload-Post returned an unexpected profile response.');
 const profiles:Profile[]=data.profiles.slice(0,100).filter((p:any)=>typeof p.username==='string').map((p:any)=>({
  username:String(p.username).slice(0,130),
  accounts:Object.entries(p.social_accounts||{}).filter(([platform,value])=>platforms.has(platform)&&value&&typeof value==='object').map(([platform,value])=>{
   const obj:any=value;
   const avatar=String(obj.social_images||obj.profile_picture||'');
   return {platform,name:String(obj.display_name||obj.name||obj.handle||platform).slice(0,120),handle:String(obj.handle||obj.username||'').slice(0,120),externalId:String(obj.username||obj.id||'').slice(0,200),avatar:/^https:\/\//.test(avatar)?avatar.slice(0,700):'',reauthRequired:obj.reauth_required===true}
  }),facebookPages:[]
 }));
 for(const profile of profiles.slice(0,10)){
  if(!profile.accounts.some(a=>a.platform==='facebook'))continue;
  try{const resp=await fetch(ROOT+'/api/uploadposts/facebook/pages?profile='+encodeURIComponent(profile.username),{headers:{Authorization:'Apikey '+key,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(9000)});const pages:any=await resp.json().catch(()=>({}));profile.facebookPages=resp.ok&&Array.isArray(pages.pages)?pages.pages.filter((p:any)=>p.id).map((p:any)=>({id:String(p.id),name:String(p.name||'Facebook Page')})).slice(0,30):[];if(!profile.facebookPages.length)profile.facebookWarning='Facebook login is connected, but no Facebook Page is available for publishing. Connect or create a Page in Upload-Post.';}catch{profile.facebookWarning='Could not verify Facebook Pages right now. Recheck your connection in Upload-Post.'}
 }
 return {plan:String(data.plan||'unknown'),limit:Number.isFinite(Number(data.limit))?Number(data.limit):null,profiles};
}
async function savedKey(req:Request,userId:string){
 const {data,error}=await userDb(req).from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',userId).maybeSingle();
 if(error)throw Error('Could not load managed social settings: '+error.message);
 return data?.api_key_ciphertext?decrypt(data.api_key_ciphertext):null;
}
export async function GET(req:Request){
 try{
  const user=await verifyUser(req);
  const key=await savedKey(req,user.id);
  if(!key)return Response.json({configured:false,profiles:[],plan:null,limit:null,provider:'Upload-Post'});
  const result=await getRemoteProfiles(key);
  return Response.json({configured:true,provider:'Upload-Post',...result});
 }catch(err){return fail(err,err instanceof Error&&/session|Sign in/i.test(err.message)?401:502)}
}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req);
  const input=await req.json();
  const key=String(input.apiKey||'').trim();
  if(key.length<8||key.length>512||/[\r\n]/.test(key))return Response.json({error:'Enter a valid Upload-Post API key from your dashboard. Never enter a social-media password.'},{status:400});
  // Validate with the actual provider before saving anything.
  const result=await getRemoteProfiles(key);
  const {error}=await userDb(req).from('omnipost_managed_social_settings').upsert({user_id:user.id,provider:'upload-post',api_key_ciphertext:encrypt(key),updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)throw Error('The Upload-Post key worked, but secure storage failed: '+error.message);
  return Response.json({configured:true,provider:'Upload-Post',...result});
 }catch(err){return fail(err,err instanceof Error&&/session|Sign in/i.test(err.message)?401:502)}
}
export async function DELETE(req:Request){
 try{
  const user=await verifyUser(req);
  const {error}=await userDb(req).from('omnipost_managed_social_settings').delete().eq('user_id',user.id);
  if(error)throw error;
  return Response.json({configured:false,profiles:[],message:'Removed the API key from OmniPost. Social accounts remain authorized in Upload-Post until revoked there.'});
 }catch(err){return fail(err,400)}
}
