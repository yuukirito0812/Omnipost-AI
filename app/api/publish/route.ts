import {admin,verifyUser,fail} from '../../../lib/server';
import {processJobs} from '../../../lib/publish';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){try{const u=await verifyUser(req);const {postId}=await req.json();const db=admin();const {data:post,error}=await db.from('omnipost_posts').select('id,status').eq('id',postId).eq('user_id',u.id).single();if(error)throw error;if(post.status!=='queued')throw Error('Post is not queued for publishing');const results=await processJobs(10,u.id,postId);return Response.json({ok:true,results,postId});}catch(e){return fail(e);}}
