import {verifyUser,admin,fail} from '../../../lib/server';
import type {ContentPost} from '../../../lib/types';
export const runtime='nodejs';
export async function POST(req:Request){try{const user=await verifyUser(req);const post:ContentPost=await req.json(),db=admin();
 if(!post.title?.trim()&&!post.caption?.trim())throw Error('Add a title or caption');
 if(!['draft','review','scheduled','queued'].includes(post.status))throw Error('Invalid status');
 if(post.status==='scheduled'&&(!post.scheduledAt||new Date(post.scheduledAt).getTime()<=Date.now()))throw Error('Choose a future schedule date and time');
 if(['queued','scheduled'].includes(post.status)&&!post.accountIds?.length)throw Error('Choose a connected social account first');
 let validAccounts:any[]=[];
 if(['queued','scheduled'].includes(post.status)){
  const {data:accounts,error:ae}=await db.from('omnipost_social_accounts').select('id,platform').eq('user_id',user.id).in('id',post.accountIds);
  if(ae)throw ae;if(!accounts||accounts.length!==new Set(post.accountIds).size)throw Error('One or more connected accounts were not found');
  validAccounts=accounts;
 }
 const data={...post,id:undefined};const {data:row,error}=await db.from('omnipost_posts').insert({user_id:user.id,data,status:post.status,scheduled_at:post.status==='scheduled'?post.scheduledAt:null}).select('*').single();if(error)throw error;
 if(validAccounts.length){const {error:je}=await db.from('omnipost_publish_jobs').insert(validAccounts.map((a:any)=>({user_id:user.id,post_id:row.id,account_id:a.id,status:'queued'})));if(je){await db.from('omnipost_posts').delete().eq('id',row.id).eq('user_id',user.id);throw je;}}
 return Response.json({id:row.id});}catch(e){return fail(e);}}
export async function PATCH(req:Request){try{const u=await verifyUser(req),{id,...patch}=await req.json();const db=admin();const {data:existing,error:err}=await db.from('omnipost_posts').select('*').eq('id',id).eq('user_id',u.id).single();if(err)throw err;if(!['draft','review','scheduled'].includes(existing.status))throw Error('Cannot edit a post already being published');
 const status=patch.status||existing.status;if(!['draft','review','scheduled'].includes(status))throw Error('Use the publish action to submit posts');const data={...existing.data,...patch};if(status==='scheduled'&&(!Array.isArray(data.accountIds)||!data.accountIds.length))throw Error('Choose at least one connected account to schedule');if(status==='scheduled'&&(!data.scheduledAt||Date.parse(data.scheduledAt)<=Date.now()))throw Error('Choose a future publishing time');const {error}=await db.from('omnipost_posts').update({data,status,scheduled_at:status==='scheduled'?data.scheduledAt:null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',u.id);if(error)throw error;
 if(status==='scheduled'){
 const {data:acc,error:ae}=await db.from('omnipost_social_accounts').select('id').eq('user_id',u.id).in('id',data.accountIds||[]);if(ae)throw ae;if(!acc||acc.length!==new Set(data.accountIds).size)throw Error('One or more social accounts are missing');await db.from('omnipost_publish_jobs').delete().eq('post_id',id).eq('user_id',u.id);if(acc?.length){const {error:je}=await db.from('omnipost_publish_jobs').insert(acc.map((a:any)=>({user_id:u.id,post_id:id,account_id:a.id,status:'queued'})));if(je)throw je;}
 }else await db.from('omnipost_publish_jobs').delete().eq('post_id',id).eq('user_id',u.id);
 return Response.json({ok:true});}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{const u=await verifyUser(req),id=new URL(req.url).searchParams.get('id');if(!id)throw Error('Missing ID');const db=admin();const {data:p,error:e}=await db.from('omnipost_posts').select('status').eq('id',id).eq('user_id',u.id).single();if(e)throw e;if(['publishing','published','partial'].includes(p.status))throw Error('Cannot delete posts that may have already been submitted to a social platform');const {error}=await db.from('omnipost_posts').delete().eq('id',id).eq('user_id',u.id);if(error)throw error;return Response.json({ok:true});}catch(e){return fail(e);}}
