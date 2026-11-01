import {verifyUser,userDb,decrypt,fail} from '../../../../lib/server';
import type {ContentPost,Platform} from '../../../../lib/types';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export const maxDuration=60;
const origin='https://api.upload-post.com';
const recognized=new Set(['facebook','instagram','tiktok','youtube','x']);
type SocialProfile={username:string;social_accounts:Record<string,any>};

function validMedia(userId:string,mediaUrl:string){
 const storage=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
 const prefix=storage+'/storage/v1/object/public/omnipost-media/'+userId+'/';
 return mediaUrl.startsWith(prefix)&&!mediaUrl.slice(prefix.length).includes('..')&&!mediaUrl.slice(prefix.length).includes('?')&&!mediaUrl.slice(prefix.length).includes('#');
}
function failure(status:number,msg:string){return Response.json({error:msg},{status});}
function parseResult(raw:any){return typeof raw?.message==='string'?raw.message:typeof raw?.error==='string'?raw.error:raw?.error?.message||'Upload-Post rejected this request.'}
export async function POST(req:Request){
 try{
  const user=await verifyUser(req);
  const db=userDb(req);
  const payload=await req.json();
  const post:ContentPost=payload.post;
  const mode=payload.mode==='schedule'?'schedule':payload.mode==='now'?'now':null;
  const profile=String(payload.profile||'').trim();
  const selected:Platform[]=Array.isArray(payload.platforms)?Array.from(new Set<Platform>(payload.platforms.filter((p:unknown):p is Platform=>typeof p==='string'&&recognized.has(p)))):[];
  if(!post||!mode||!profile||!selected.length||selected.some(p=>!recognized.has(p)))return failure(400,'Choose your Upload-Post profile and at least one connected social account before posting.');
  if(!post.title?.trim()&&!post.caption?.trim()&&!post.mediaUrl)return failure(400,'Add a caption, title or media before publishing.');
  if(mode==='schedule'&&(!post.scheduledAt||!Number.isFinite(Date.parse(post.scheduledAt))||Date.parse(post.scheduledAt)<Date.now()+60000))return failure(400,'Choose a valid future time for scheduled publishing.');
  const {data:settings,error:settingsError}=await db.from('omnipost_managed_social_settings').select('api_key_ciphertext').eq('user_id',user.id).maybeSingle();
  if(settingsError)throw Error('Could not read social connection: '+settingsError.message);
  if(!settings?.api_key_ciphertext)return failure(409,'Connect your Upload-Post API key in Social Accounts before posting.');
  const apiKey=decrypt(settings.api_key_ciphertext);
  const headers={Authorization:'Apikey '+apiKey,Accept:'application/json'};
  const list=await fetch(origin+'/api/uploadposts/users',{headers,cache:'no-store',signal:AbortSignal.timeout(13000)});
  const listing:any=await list.json().catch(()=>({}));
  if(!list.ok||!Array.isArray(listing.profiles))return failure(502,'Upload-Post could not verify your linked accounts. Check the API key and refresh Social Accounts.');
  const connected:SocialProfile|undefined=listing.profiles.find((p:SocialProfile)=>p.username===profile);
  if(!connected)return failure(400,'This Upload-Post profile was not found. Refresh connected accounts, then select one.');
  const invalid=selected.filter(p=>{const a=connected.social_accounts?.[p];return !a||typeof a!=='object'||a.reauth_required===true});
  if(invalid.length)return failure(400,'These networks are not connected or need reauthorization: '+invalid.join(', ')+'. Connect them in Upload-Post and refresh.');
  let facebookPageId='';
  if(selected.includes('facebook')){
   const pagesResponse=await fetch(origin+'/api/uploadposts/facebook/pages?profile='+encodeURIComponent(profile),{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
   const pageData:any=await pagesResponse.json().catch(()=>({}));
   const pages=pagesResponse.ok&&Array.isArray(pageData.pages)?pageData.pages.filter((v:any)=>v.id):[];
   if(!pages.length)return failure(400,'Your Facebook login is connected but no Facebook Page is available to post to. Create or reconnect a Page in Upload-Post, then refresh.');
   if(pages.length===1)facebookPageId=String(pages[0].id);
   else {
    facebookPageId=String(payload.facebookPageId||'');
    if(!pages.some((p:any)=>String(p.id)===facebookPageId))return failure(400,'Choose a Facebook Page for this post. Available Pages: '+pages.map((p:any)=>String(p.name||p.id)).join(', ').slice(0,180));
   }
  }
  if(post.mediaType==='video'&& !post.mediaUrl)return failure(400,'Please upload a video first.');
  if(!post.mediaUrl&&selected.some(p=>!['facebook','x'].includes(p)))return failure(400,'Text-only posts can be sent to Facebook Pages and X. Add a photo or video for your other selected platforms.');
  if(post.mediaType==='image'&&selected.includes('youtube'))return failure(400,'YouTube requires video, not a still image. Remove YouTube or attach a video.');
  if(post.mediaUrl&&!validMedia(user.id,post.mediaUrl))return failure(400,'Media must be uploaded to your private OmniPost media folder before publishing.');
  const id=post.id&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(post.id)?post.id:randomUUID();
  const {data:existing,error:readError}=await db.from('omnipost_posts').select('id,status,data').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(readError)throw readError;
  if(existing&&!['draft','review','failed'].includes(existing.status))return failure(409,'This post was already submitted or scheduled. Open a new draft to avoid accidentally publishing twice.');
  const normalized={...post,id,status:'draft',platforms:selected,publishMode:'managed',managedProfile:profile,updatedAt:new Date().toISOString()};
  if(!existing){const {error}=await db.from('omnipost_posts').insert({id,user_id:user.id,data:normalized,status:'draft',scheduled_at:null});if(error)throw Error('Could not save a safe pending draft: '+error.message)}
  const form=new FormData();
  form.set('user',profile);
  for(const p of selected)form.append('platform[]',p);
  const caption=[post.caption.trim(),post.cta.trim(),post.tags.trim()].filter(Boolean).join('\n\n')||post.title.trim();
  form.set('title',post.mediaType==='video'&&selected.includes('youtube')?(post.title.trim()||caption.slice(0,95)):caption);
  if(facebookPageId)form.set('facebook_page_id',facebookPageId);
  if(post.mediaType==='video')form.set('description',caption);
  if(post.firstComment?.trim())form.set('first_comment',post.firstComment.slice(0,900));
  if(mode==='schedule')form.set('scheduled_date',new Date(post.scheduledAt).toISOString());
  // Per-platform caption overrides are supported by Upload-Post.
  for(const p of selected){const alternate=post.overrides?.[p];if(alternate?.trim())form.set(p+'_title',alternate.trim())}
  const requestId='omni-'+id;
  form.set('request_id',requestId);
  let path='/api/upload_text';
  if(post.mediaType==='image'&&post.mediaUrl){
   path='/api/upload_photos';
   const image=await fetch(post.mediaUrl,{signal:AbortSignal.timeout(18000)});
   if(!image.ok)throw Error('Could not read your uploaded photo. Reupload it to the media library.');
   const bytes=await image.arrayBuffer();
   if(bytes.byteLength>22*1024*1024)throw Error('Photo is too large for this route. Upload an image under 22 MB.');
   const type=image.headers.get('content-type')||'image/jpeg';
   form.append('photos[]',new Blob([bytes],{type}),post.mediaName||'omnipost-photo.jpg');
  }else if(post.mediaType==='video'&&post.mediaUrl){
   path='/api/upload';
   // Upload-Post accepts a public HTTPS video URL, eliminating large serverless request bodies.
   form.set('video',post.mediaUrl);
  }
  const response=await fetch(origin+path,{method:'POST',headers:{...headers,'Idempotency-Key':requestId},body:form,signal:AbortSignal.timeout(50000)});
  const result:any=await response.json().catch(()=>({}));
  if(!response.ok||result.success===false){
   const message=parseResult(result);
   await db.from('omnipost_posts').update({data:{...normalized,lastPublishError:message},updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
   return failure(response.status===429?429:502,'Upload-Post did not accept the post: '+message);
  }
  const results=Object.values(result.results||{}) as any[];
  const reported=results.length>0;
  const allConfirmed=reported&&results.every((v:any)=>v?.success===true&&!v?.skipped);
  const anyFailure=reported&&results.some((v:any)=>v?.success===false);
  const status=mode==='schedule'?'scheduled':allConfirmed?'published':anyFailure?'partial':'queued';
  const updated={...normalized,status,publishMode:'managed',managedProfile:profile,providerJobId:result.job_id||null,providerRequestId:result.request_id||requestId,providerResult:result.results||null,scheduledAt:mode==='schedule'?new Date(post.scheduledAt).toISOString():'',lastPublishError:null};
  const {error:saveError}=await db.from('omnipost_posts').update({data:updated,status,scheduled_at:mode==='schedule'?updated.scheduledAt:null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
  if(saveError)return Response.json({accepted:true,warning:'Upload-Post accepted the request, but the local record could not be updated. Do not resend. Check provider history using request ID.',requestId:updated.providerRequestId,status},{status:202});
  return Response.json({accepted:true,id,status,scheduled:mode==='schedule',requestId:updated.providerRequestId,jobId:updated.providerJobId,details:result.results||null},{status:202});
 }catch(e){return fail(e,500)}
}
