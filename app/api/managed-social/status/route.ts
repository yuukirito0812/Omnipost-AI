import {verifyUser,userDb,decrypt,fail} from '../../../../lib/server';
export const runtime='nodejs';
const validId=(s:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(s);
async function getResources(req:Request,id:string){
 const user=await verifyUser(req),db=userDb(req);
 const {data:post,error}=await db.from('omnipost_posts').select('*').eq('user_id',user.id).eq('id',id).single();
 if(error||!post)throw Error('This saved post was not found.');
 if(post.data?.publishMode!=='managed')throw Error('This post is a local calendar item, not an Upload-Post job.');
 const {data:settings,error:se}=await db.from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',user.id).maybeSingle();
 if(se||!settings?.api_key_ciphertext)throw Error('Reconnect your Upload-Post API key to check the job status.');
 return {user,db,post,key:decrypt(settings.api_key_ciphertext)};
}
export async function GET(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!validId(id))return Response.json({error:'Invalid post ID'},{status:400});
  const {user,db,post,key}=await getResources(req,id);
  const jobId=post.data?.providerJobId,requestId=post.data?.providerRequestId;
  if(!jobId&&!requestId)throw Error('This provider request has no tracking ID.');
  const params=new URLSearchParams(jobId?{job_id:jobId}:{request_id:requestId});
  const r=await fetch('https://api.upload-post.com/api/uploadposts/status?'+params,{headers:{Authorization:'Apikey '+key},cache:'no-store',signal:AbortSignal.timeout(14000)});
  const result:any=await r.json().catch(()=>({}));
  if(!r.ok)return Response.json({error:'Upload-Post status check failed: '+String(result.message||result.error||r.status).slice(0,180)},{status:502});
  const states=Array.isArray(result.results)?result.results:[];
  const failed=states.filter((x:any)=>x.success===false||['failed','skipped','retryable'].includes(x.status));
  const successful=states.filter((x:any)=>x.success===true||x.status==='completed');
  const next=result.status==='completed'?(failed.length?'partial':'published'):result.status==='failed'?(successful.length?'partial':'failed'):post.status==='scheduled'?'scheduled':'queued';
  const data={...post.data,status:next,providerStatus:result.status,providerResults:states};
  const {error:updateError}=await db.from('omnipost_posts').update({data,status:next,scheduled_at:next==='scheduled'?post.scheduled_at:null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
  if(updateError)throw Error('Upload-Post responded, but local status could not be saved: '+updateError.message);
  return Response.json({status:next,providerStatus:result.status,results:states,completed:result.completed??null,total:result.total??null});
 }catch(e){return fail(e,400)}
}
export async function DELETE(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!validId(id))return Response.json({error:'Invalid post ID'},{status:400});
  const {user,db,post,key}=await getResources(req,id);
  if(post.status!=='scheduled'||!post.data?.providerJobId)throw Error('Only scheduled provider posts can be cancelled.');
  const r=await fetch('https://api.upload-post.com/api/uploadposts/schedule/'+encodeURIComponent(post.data.providerJobId),{method:'DELETE',headers:{Authorization:'Apikey '+key},signal:AbortSignal.timeout(14000)});
  const result:any=await r.json().catch(()=>({}));
  if(!r.ok||result.success===false)throw Error('Could not cancel the provider job: '+String(result.message||result.error||r.status).slice(0,140));
  const data={...post.data,publishMode:'none',providerJobId:null,providerRequestId:null,scheduledAt:'',status:'draft'};
  const {error}=await db.from('omnipost_posts').update({data,status:'draft',scheduled_at:null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
  if(error)throw Error('Provider cancelled the job, but the local draft update failed. Do not assume it is still scheduled.');
  return Response.json({ok:true,status:'draft',message:'Cancelled at Upload-Post. Your post is back in drafts.'});
 }catch(e){return fail(e,400)}
}
