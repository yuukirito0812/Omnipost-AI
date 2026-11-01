import {verifyUser,userDb,fail} from '../../../lib/server';
import type {ContentPost} from '../../../lib/types';
export const runtime='nodejs';
const editable=new Set(['draft','review','scheduled']);
const validUuid=(s:any)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(s);
function validate(post:ContentPost,status:string){
 if(!editable.has(status))throw Error('Use the managed publishing action for real social delivery.');
 if(!post.title?.trim()&&!post.caption?.trim()&&!post.mediaUrl)throw Error('Add a caption, title, or media before saving.');
 if(status==='scheduled'&&(!post.scheduledAt||Date.parse(post.scheduledAt)<Date.now()+60000))throw Error('Select a future date and time.');
}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req),raw:ContentPost=await req.json();
  const status=raw.status||'draft';validate(raw,status);
  const data={...raw,id:undefined,status,publishMode:status==='scheduled'?'planner':'none',deliveryStatus:status==='scheduled'?'Manual calendar reminder — not auto-published':undefined};
  const db=userDb(req);
  const {data:row,error}=await db.from('omnipost_posts').insert({user_id:user.id,data,status,scheduled_at:status==='scheduled'?new Date(raw.scheduledAt).toISOString():null}).select('id').single();
  if(error)throw error;
  return Response.json({id:row.id,status,automatic:false,message:status==='scheduled'?'Added to your content calendar (manual reminder). No social post will be sent automatically.':'Saved in your private workspace.'});
 }catch(e){return fail(e)}
}
export async function PATCH(req:Request){
 try{
  const user=await verifyUser(req),input=await req.json(),id=input.id;
  if(!validUuid(id))throw Error('Select an existing saved post to edit.');
  const db=userDb(req);
  const {data:existing,error:readError}=await db.from('omnipost_posts').select('*').eq('id',id).eq('user_id',user.id).single();
  if(readError)throw readError;
  if(!editable.has(existing.status)||existing.data?.publishMode==='managed')throw Error('Provider-submitted posts cannot be edited here. Use the provider’s scheduled-job editor.');
  const status=input.status||existing.status;
  const merged:ContentPost={...existing.data,...input,id,status};
  validate(merged,status);
  const data={...merged,publishMode:status==='scheduled'?'planner':'none',deliveryStatus:status==='scheduled'?'Manual calendar reminder — not auto-published':undefined};
  const {error}=await db.from('omnipost_posts').update({data,status,scheduled_at:status==='scheduled'?new Date(merged.scheduledAt).toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
  if(error)throw error;
  return Response.json({id,status,automatic:false,message:status==='scheduled'?'Calendar reminder updated (manual publishing).':'Post updated.'});
 }catch(e){return fail(e)}
}
export async function DELETE(req:Request){
 try{
  const user=await verifyUser(req),id=new URL(req.url).searchParams.get('id');
  if(!validUuid(id))throw Error('Missing or invalid post ID.');
  const db=userDb(req);
  const {data:post,error:readError}=await db.from('omnipost_posts').select('status,data').eq('id',id).eq('user_id',user.id).single();
  if(readError)throw readError;
  if(post.data?.publishMode==='managed'||!['draft','review','failed','scheduled'].includes(post.status))throw Error('Cannot delete a post submitted to a provider. Cancel the provider job first.');
  const {error}=await db.from('omnipost_posts').delete().eq('id',id).eq('user_id',user.id);
  if(error)throw error;
  return Response.json({ok:true});
 }catch(e){return fail(e)}
}
