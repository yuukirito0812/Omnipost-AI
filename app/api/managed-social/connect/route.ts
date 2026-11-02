import {verifyUser,userDb,decrypt} from '../../../../lib/server';
export const runtime='nodejs';
const BASE='https://api.upload-post.com/api/uploadposts';
const SUPPORTED=new Set(['facebook','instagram','youtube','x','tiktok']);
const ORIGIN='https://omnipost-ai-theta.vercel.app';
const invalid=(error:string,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  const user=await verifyUser(req);
  const body=await req.json().catch(()=>({}));
  const platform=String(body.platform||'').toLowerCase();
  const username=String(body.profile||'');
  if(!SUPPORTED.has(platform)||!username||username.length>128)return invalid('Choose a supported social network and connected workspace.');
  const {data:settings,error:settingsError}=await userDb(req).from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',user.id).maybeSingle();
  if(settingsError)throw Error('Your social connection settings could not be loaded.');
  if(!settings?.api_key_ciphertext)return invalid('Connect your Upload-Post account once before adding socials.',409);
  const key=decrypt(settings.api_key_ciphertext);
  const auth={Authorization:'Apikey '+key,Accept:'application/json'};
  const profilesResponse=await fetch(BASE+'/users',{headers:auth,cache:'no-store',signal:AbortSignal.timeout(12000)});
  const profiles:any=await profilesResponse.json().catch(()=>({}));
  if(!profilesResponse.ok||!Array.isArray(profiles.profiles))return invalid('Could not verify your Upload-Post account. Check the saved key and try refreshing.',502);
  if(!profiles.profiles.some((p:any)=>p.username===username))return invalid('The selected social workspace does not belong to your Upload-Post account.',403);
  const payload={
   username,
   redirect_url:ORIGIN+'/?social_return=1',
   logo_image:ORIGIN+'/omnipost-mark.svg',
   redirect_button_text:'Back to OmniPost AI',
   connect_title:'Connect '+({x:'X',facebook:'Facebook',instagram:'Instagram',youtube:'YouTube',tiktok:'TikTok'} as Record<string,string>)[platform],
   connect_description:'Sign in on the official social platform to link your account securely to OmniPost AI by Carl Vincent Zabala.',
   platforms:[platform],
   show_calendar:false,
   language:'en'
  };
  const response=await fetch(BASE+'/users/generate-jwt',{
   method:'POST',headers:{...auth,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(16000),cache:'no-store'
  });
  const data:any=await response.json().catch(()=>({}));
  const access=String(data.access_url||data.connect_url||'');
  if(response.ok&&/^https:\/\/app\.upload-post\.com\/connect(?:\?|\/)/.test(access)){
   return Response.json({url:access,provider:'upload-post',profile:username,platform,method:'hosted-connect'},{headers:{'Cache-Control':'no-store'}});
  }
  // Free accounts may not be entitled to white-label JWT links. Do not invent a
  // token or silently pretend the platform is connected; allow its hosted dashboard.
  if(response.status===401||response.status===403||response.status===402||data.error_code==='plan_required'||data.error_code==='feature_not_available'){
   return Response.json({url:'https://app.upload-post.com/',provider:'upload-post',profile:username,platform,method:'dashboard',notice:'The managed one-click authorization link requires Upload-Post plan access. The regular account dashboard is available: select your network there and sign in on its official page.'},{headers:{'Cache-Control':'no-store'}});
  }
  return invalid('Could not start the official login ('+response.status+'). '+String(data.error?.message||data.error||data.message||'Please try again.').slice(0,180),502);
 }catch(err){return invalid(err instanceof Error?err.message:String(err),500)}
}
