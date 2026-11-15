import {decrypt,fail,userDb,verifyUser} from '../../../lib/server';
export const runtime='nodejs';
export const maxDuration=60;
const ROOT='https://api.upload-post.com';
const COMMENT_PLATFORMS=['instagram','facebook','youtube','linkedin','tiktok','x','threads','bluesky'];
const DM_PLATFORMS=['instagram','bluesky','facebook','whatsapp'];
const DM_SEND_PLATFORMS=['instagram','bluesky'];
const clip=(v:unknown,n=500)=>String(v??'').trim().slice(0,n);
const iso=(v:unknown)=>{const d=v?new Date(String(v)):new Date();return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString()};
const safeUrl=(v:unknown)=>{const s=clip(v,900);return /^https:\/\//i.test(s)?s:''};
function array(value:any):any[]{if(Array.isArray(value))return value;if(Array.isArray(value?.items))return value.items;if(Array.isArray(value?.data))return value.data;return []}
async function pool<T,R>(items:T[],limit:number,work:(item:T)=>Promise<R>):Promise<R[]>{const results:R[]=[];let next=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;results[i]=await work(items[i])}});await Promise.all(workers);return results}
async function provider(key:string,path:string,method='GET',body?:any){
 const response=await fetch(ROOT+path,{method,headers:{Authorization:'Apikey '+key,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(18000)});
 const data:any=await response.json().catch(()=>({}));
 if(!response.ok||data.success===false)throw Error(String(data.message||data.error_description||data.error?.message||data.error||'Upload-Post request failed ('+response.status+').').slice(0,300));
 return data;
}
async function credentials(req:Request,userId:string){
 const {data,error}=await userDb(req).from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',userId).maybeSingle();
 if(error||!data?.api_key_ciphertext)throw Error('Connect your Upload-Post API key in Social Accounts first.');
 return decrypt(data.api_key_ciphertext);
}
function eventRecord(userId:string,profile:string,platform:string,source_type:string,external_id:string,direction:string,body:string,occurred_at:string,metadata:any,contact:any){
 return {user_id:userId,profile_username:profile,platform,source_type,external_id:clip(external_id,300),direction,body:clip(body,5000),occurred_at,metadata:metadata&&typeof metadata==='object'?metadata:{},contact};
}
function normalizeComment(platform:string,profile:string,post:any,comment:any){
 const author=comment.user||comment.author||comment.from||{};
 const id=clip(comment.id||comment.comment_id,280);if(!id)return null;
 const externalContact=clip(author.id||author.user_id||author.username||author.handle||('commenter-'+id),300);
 const body=clip(comment.text||comment.message||comment.body||comment.content,5000);if(!body)return null;
 return eventRecord('',profile,platform,'comment',id,'inbound',body,iso(comment.timestamp||comment.created_at||comment.createdAt),{postId:clip(post.id,300),postUrl:safeUrl(post.permalink||post.url),postCaption:clip(post.caption,700),commentId:id},{external_contact_id:externalContact,display_name:clip(author.name||author.display_name||author.username||author.handle||'Social user',180),handle:clip(author.username||author.handle,180),avatar_url:safeUrl(author.avatar||author.profile_picture||author.profilePicture)});
}
function normalizeDm(platform:string,profile:string,conversation:any,message:any,index:number){
 const participants=array(conversation.participants);
 const participant=conversation.other_participant||conversation.participant||conversation.contact||conversation.user||participants.find((p:any)=>p&&p.is_self!==true&&p.is_owner!==true)||{};
 const sender=message.sender||message.from||message.author||message.user||{};
 const directionRaw=String(message.direction||message.type||'').toLowerCase();
 const direction=directionRaw.includes('out')||directionRaw==='sent'||message.is_from_me===true||message.is_outgoing===true?'outbound':'inbound';
 const contactId=clip(participant.id||conversation.participant_id||conversation.recipient_id||conversation.user_id||sender.id||conversation.conversation_id||conversation.id,300);
 const body=clip(message.text||message.message||message.content||message.body,5000);if(!contactId||!body)return null;
 const conversationId=clip(conversation.conversation_id||conversation.id||conversation.thread_id,250);
 const occurred=iso(message.timestamp||message.created_at||message.createdAt||conversation.updated_at||conversation.last_message_at);
 const external=clip(message.id||message.message_id||('dm:'+conversationId+':'+occurred+':'+body.slice(0,55)),300);
 const name=clip(participant.display_name||participant.name||participant.username||participant.handle||sender.username||'Social contact',180);
 return eventRecord('',profile,platform,'dm',external,direction,body,occurred,{conversationId,recipientId:contactId,attachments:array(message.attachments).slice(0,4),replyTo:clip(message.reply_to||message.replyTo,200),messageIndex:index},{external_contact_id:contactId,display_name:name,handle:clip(participant.username||participant.handle,180),avatar_url:safeUrl(participant.avatar||participant.profile_picture||participant.avatar_url)});
}
async function persist(req:Request,userId:string,profile:string,rawEvents:any[]){
 const db=userDb(req),grouped=new Map<string,any>();
 for(const event of rawEvents){const c=event.contact;if(!c?.external_contact_id)continue;const key=event.platform+'\u0000'+c.external_contact_id;const previous=grouped.get(key);if(!previous||event.occurred_at>previous.last_interaction_at)grouped.set(key,{user_id:userId,profile_username:profile,platform:event.platform,external_contact_id:c.external_contact_id,display_name:c.display_name||'Social contact',handle:c.handle||'',avatar_url:c.avatar_url||null,last_interaction_at:event.occurred_at})}
 const {data:existing,error:existingError}=await db.from('omnipost_community_contacts').select('*').eq('user_id',userId).eq('profile_username',profile);
 if(existingError)throw Error('Could not load community contacts: '+existingError.message);
 const byKey=new Map<string,any>((existing||[]).map((c:any)=>[c.platform+'\u0000'+c.external_contact_id,c]));
 const inserts:any[]=[];
 for(const [key,record] of grouped){const found=byKey.get(key);if(found){record.id=found.id;const latest=record.last_interaction_at>String(found.last_interaction_at||'')?record.last_interaction_at:found.last_interaction_at;if(latest!==found.last_interaction_at||(!found.display_name&&record.display_name)||(!found.avatar_url&&record.avatar_url)){const {error}=await db.from('omnipost_community_contacts').update({last_interaction_at:latest,display_name:record.display_name||found.display_name,handle:record.handle||found.handle,avatar_url:record.avatar_url||found.avatar_url,updated_at:new Date().toISOString()}).eq('id',found.id).eq('user_id',userId);if(error)throw error}}else inserts.push({...record,status:'new',priority:'normal',notes:'',tags:[],follow_up_at:null})}
 if(inserts.length){const {data,error}=await db.from('omnipost_community_contacts').insert(inserts).select('*');if(error)throw Error('Could not save community contacts: '+error.message);for(const c of data||[])byKey.set(c.platform+'\u0000'+c.external_contact_id,c)}
 const eventRows=rawEvents.map(e=>{const c=byKey.get(e.platform+'\u0000'+e.contact.external_contact_id);return c?{user_id:userId,contact_id:c.id,profile_username:profile,platform:e.platform,source_type:e.source_type,external_id:e.external_id,direction:e.direction,body:e.body,metadata:e.metadata,occurred_at:e.occurred_at}:null}).filter(Boolean);
 if(eventRows.length){const {error}=await db.from('omnipost_community_events').upsert(eventRows,{onConflict:'user_id,profile_username,platform,source_type,external_id',ignoreDuplicates:true});if(error)throw Error('Could not save interaction history: '+error.message)}
 const [{data:contacts,error:contactError},{data:events,error:eventError}]=await Promise.all([
  db.from('omnipost_community_contacts').select('*').eq('user_id',userId).eq('profile_username',profile).order('last_interaction_at',{ascending:false}).limit(150),
  db.from('omnipost_community_events').select('*').eq('user_id',userId).eq('profile_username',profile).order('occurred_at',{ascending:false}).limit(500)
 ]);
 if(contactError)throw contactError;if(eventError)throw eventError;
 return {contacts:contacts||[],events:events||[]};
}
export async function GET(req:Request){
 try{
  const user=await verifyUser(req),url=new URL(req.url),profile=clip(url.searchParams.get('profile'),130),locationId=clip(url.searchParams.get('locationId'),300),linkedinPageId=clip(url.searchParams.get('linkedinPageId'),220);
  if(!profile)throw Error('Choose a client profile first.');
  const key=await credentials(req,user.id);
  const profileData=await provider(key,'/api/uploadposts/users');
  const selected=array(profileData.profiles).find((p:any)=>p.username===profile);
  if(!selected)throw Error('That client profile is not connected to your Upload-Post account.');
  const social=selected.social_accounts||{},connected=Object.keys(social).filter(p=>social[p]&&typeof social[p]==='object');
  const warnings:string[]=[],raw:any[]=[];
  const commentPlatforms=COMMENT_PLATFORMS.filter(p=>connected.includes(p));
  const mediaResults=await Promise.all(commentPlatforms.map(async platform=>{
   try{const params=new URLSearchParams({platform,user:profile,limit:'5'});if(platform==='linkedin'&&linkedinPageId)params.set('page_urn',linkedinPageId);const data=await provider(key,'/api/uploadposts/media?'+params.toString());return {platform,media:array(data.media).sort((a:any,b:any)=>Date.parse(b.timestamp||'')-Date.parse(a.timestamp||''))}}catch(e){warnings.push(platform.toUpperCase()+': '+(e instanceof Error?e.message:'Could not load recent posts'));return {platform,media:[]}}}));
  const commentTasks=mediaResults.flatMap(result=>result.media.slice(0,3).map((post:any)=>({platform:result.platform,post})));
  await pool(commentTasks,5,async task=>{
   try{
    const params=new URLSearchParams({platform:task.platform,user:profile,limit:'50'});
    if(task.post.id)params.set('post_id',String(task.post.id));else if(task.post.permalink)params.set('post_url',String(task.post.permalink));else return;
    const data=await provider(key,'/api/uploadposts/comments?'+params.toString());
    for(const comment of array(data.comments)){const e=normalizeComment(task.platform,profile,task.post,comment);if(e)raw.push(e)}
   }catch(e){warnings.push(task.platform.toUpperCase()+' comments: '+(e instanceof Error?e.message:'Comments could not be loaded'))}
  });
  for(const platform of DM_PLATFORMS.filter(p=>connected.includes(p))){
   try{
    const params=new URLSearchParams({platform,user:profile,limit:'25',messages_limit:'12'});
    const data=await provider(key,'/api/uploadposts/dms/conversations?'+params.toString());
    const conversations=array(data.conversations||data.data?.conversations||data.data);
    for(const conversation of conversations){const messages=array(conversation.messages?.items||conversation.messages?.data||conversation.messages||conversation.latest_messages||conversation.last_messages);for(let i=0;i<messages.length;i++){const e=normalizeDm(platform,profile,conversation,messages[i],i);if(e)raw.push(e)}}
   }catch(e){warnings.push(platform.toUpperCase()+' messages: '+(e instanceof Error?e.message:'Messages could not be loaded'))}
  }
  let locations:any[]=[];
  if(connected.includes('google_business')){
   try{
    const locationData=await provider(key,'/api/uploadposts/google-business/locations?'+new URLSearchParams({profile}).toString());
    locations=array(locationData.locations);
    const chosen=locationId||clip(locations[0]?.name||locations[0]?.id,300);
    if(chosen){
     const params=new URLSearchParams({user:profile,location_id:chosen,pageSize:'50',orderBy:'updateTime desc'});
     const reviewData=await provider(key,'/api/uploadposts/google-business/reviews?'+params.toString());
     for(const review of array(reviewData.reviews||reviewData.data?.reviews||reviewData.data)){
      const reviewer=review.reviewer||review.author||{},reviewName=clip(review.name||review.review_name||review.reviewName,500),reviewId=clip(review.reviewId||review.id||reviewName,280);
      if(!reviewId)continue;
      const ratingRaw=String(review.starRating||review.rating||'');const ratingMap:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};const rating=Number.isFinite(Number(ratingRaw))?Number(ratingRaw):ratingMap[ratingRaw.toUpperCase()]||null;const contactId=clip(reviewer.displayName||reviewer.name||reviewer.profilePhotoUrl||('reviewer-'+reviewId),300);
      const body=clip(review.comment||review.text||review.body||'Google Business review',5000);
      raw.push(eventRecord('',profile,'google_business','review',reviewId,'inbound',body,iso(review.updateTime||review.createTime),{reviewName,reviewId,locationId:chosen,rating,ownerReply:clip(review.reviewReply?.comment||review.ownerReply?.comment||'',1500)},{external_contact_id:contactId,display_name:clip(reviewer.displayName||reviewer.name||'Google reviewer',180),handle:'',avatar_url:safeUrl(reviewer.profilePhotoUrl)}));
      const ownerReply=clip(review.reviewReply?.comment||review.ownerReply?.comment||'',1500);
      if(ownerReply)raw.push(eventRecord('',profile,'google_business','review_reply',reviewId+':owner-reply','outbound',ownerReply,iso(review.reviewReply?.updateTime||review.updateTime),{reviewName,reviewId,locationId:chosen},{external_contact_id:contactId,display_name:clip(reviewer.displayName||reviewer.name||'Google reviewer',180),handle:'',avatar_url:safeUrl(reviewer.profilePhotoUrl)}));
     }
    }else warnings.push('Google Business: connect or select a business location to load reviews.');
   }catch(e){warnings.push('Google Business reviews: '+(e instanceof Error?e.message:'Reviews could not be loaded'))}
  }
  const saved=await persist(req,user.id,profile,raw);
  return Response.json({profile,connected,locations,warnings,contacts:saved.contacts,events:saved.events,refreshedAt:new Date().toISOString()});
 }catch(e){return fail(e,e instanceof Error&&/Invalid or expired|sign in/i.test(e.message)?401:502)}
}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req),input=await req.json(),action=clip(input.action,40),db=userDb(req),now=new Date().toISOString();
  if(action==='update_contact'){
   const id=clip(input.contactId,50);if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Choose a customer record first.');
   const {data:current,error:readError}=await db.from('omnipost_community_contacts').select('*').eq('id',id).eq('user_id',user.id).single();if(readError||!current)throw Error('Customer record not found.');
   const updates:any={updated_at:now};
   if(input.status!==undefined){if(!['new','open','waiting','resolved'].includes(input.status))throw Error('Choose a valid conversation status.');updates.status=input.status}
   if(input.priority!==undefined){if(!['normal','high','urgent'].includes(input.priority))throw Error('Choose a valid priority.');updates.priority=input.priority}
   if(input.notes!==undefined)updates.notes=clip(input.notes,4000);
   if(input.followUpAt!==undefined){const v=input.followUpAt?new Date(input.followUpAt):null;if(v&&!Number.isFinite(v.getTime()))throw Error('Choose a valid follow-up date.');updates.follow_up_at=v?.toISOString()||null}
   if(input.tags!==undefined)updates.tags=Array.isArray(input.tags)?input.tags.map((v:any)=>clip(v,32)).filter(Boolean).slice(0,10):[];
   const {data:updated,error}=await db.from('omnipost_community_contacts').update(updates).eq('id',id).eq('user_id',user.id).select('*').single();if(error)throw error;
   const note=clip(input.newNote,1500);
   if(note){const {error:noteError}=await db.from('omnipost_community_events').insert({user_id:user.id,contact_id:id,profile_username:current.profile_username,platform:current.platform,source_type:'note',external_id:null,direction:'internal',body:note,metadata:{},occurred_at:now});if(noteError)throw noteError}
   return Response.json({ok:true,contact:updated});
  }
  const eventId=clip(input.eventId,50);if(!/^[0-9a-f-]{36}$/i.test(eventId))throw Error('Select an interaction first.');
  const {data:event,error:eventError}=await db.from('omnipost_community_events').select('*').eq('id',eventId).eq('user_id',user.id).single();if(eventError||!event)throw Error('Interaction not found.');
  const {data:contact,error:contactError}=await db.from('omnipost_community_contacts').select('*').eq('id',event.contact_id).eq('user_id',user.id).single();if(contactError||!contact)throw Error('Customer record not found.');
  const message=clip(input.message,1500);if(!message)throw Error('Write a reply before sending.');
  const key=await credentials(req,user.id),profile=event.profile_username,platform=event.platform;
  let response:any={},source_type='',metadata:any={};
  if(action==='reply_comment'){
   if(event.source_type!=='comment')throw Error('Select a comment to reply to.');
   const visibility=input.visibility==='private'?'private':'public';
   if(visibility==='private'&&platform!=='instagram')throw Error('Private replies are currently available for Instagram comments only.');
   const payload={platform,user:profile,message,comment_id:event.external_id,...(event.metadata?.postId?{post_id:event.metadata.postId}:{})};
   const path=visibility==='private'?'/api/uploadposts/comments/reply':platform==='instagram'?'/api/uploadposts/comments/public-reply':'/api/uploadposts/comments/create';
   response=await provider(key,path,visibility==='private'||platform==='instagram'?'POST':'POST',visibility==='private'?{platform,user:profile,message,comment_id:event.external_id}:payload);
   source_type='comment_reply';metadata={parentCommentId:event.external_id,postId:event.metadata?.postId||null,postUrl:event.metadata?.postUrl||null,visibility};
  }else if(action==='send_dm'){
   if(event.source_type!=='dm')throw Error('Select a direct-message conversation.');
   if(!DM_SEND_PLATFORMS.includes(platform))throw Error('Sending DMs is currently supported for Instagram and Bluesky only.');
   const recipient=clip(event.metadata?.recipientId||contact.external_contact_id,300);
   response=await provider(key,'/api/uploadposts/dms/send','POST',{platform,user:profile,recipient_id:recipient,message});
   source_type='dm_reply';metadata={conversationId:event.metadata?.conversationId||null,recipientId:recipient};
  }else if(action==='reply_review'){
   if(event.source_type!=='review')throw Error('Select a Google Business review first.');
   const reviewName=clip(event.metadata?.reviewName,500),locationId=clip(event.metadata?.locationId,300);if(!reviewName)throw Error('This review does not include a replyable Google review resource name.');
   response=await provider(key,'/api/uploadposts/google-business/reviews/reply','PUT',{user:profile,comment:message,review_name:reviewName});
   source_type='review_reply';metadata={reviewName,locationId,parentReviewId:event.external_id};
  }else throw Error('Unknown community action.');
  const externalId=clip(response.id||response.comment_id||response.message_id||'',300)||null;
  const {error:insertError}=await db.from('omnipost_community_events').insert({user_id:user.id,contact_id:contact.id,profile_username:profile,platform,source_type,external_id:externalId,direction:'outbound',body:message,metadata,occurred_at:now});
  if(insertError)throw Error('The reply was sent, but the local activity log could not be updated: '+insertError.message);
  await db.from('omnipost_community_contacts').update({status:'waiting',last_interaction_at:now,updated_at:now}).eq('id',contact.id).eq('user_id',user.id);
  return Response.json({ok:true,message:'Reply sent successfully.',provider:response});
 }catch(e){return fail(e,e instanceof Error&&/Invalid or expired|sign in/i.test(e.message)?401:500)}
}
