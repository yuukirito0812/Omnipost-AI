import {admin,verifyUser,fail} from '../../../../lib/server';
export const runtime='nodejs';
export async function POST(req:Request){try{
 const u=await verifyUser(req),{jobId}=await req.json();if(typeof jobId!=='string'||!jobId)throw Error('Missing job ID');
 const db=admin();const {data:job,error}=await db.from('omnipost_publish_jobs').select('id,status,attempts,post_id').eq('id',jobId).eq('user_id',u.id).single();if(error)throw error;
 if(job.status!=='failed')throw Error('Only failed jobs can be retried. Correct unsupported content or account permissions before creating a new post.');
 if(job.attempts>=5)throw Error('Retry limit reached. Resolve the API issue and create a fresh post to prevent duplicate submissions.');
 const {error:update}=await db.from('omnipost_publish_jobs').update({status:'queued',error:null}).eq('id',jobId).eq('user_id',u.id).eq('status','failed');if(update)throw update;
 return Response.json({ok:true,jobId});
 }catch(e){return fail(e);}}
