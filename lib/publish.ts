import {admin,decrypt,encrypt,fetchJson} from './server';
import {refreshToken} from './oauth';
import type {Platform,ContentPost} from './types';
export type Result={status:'published'|'submitted'|'manual_required';url?:string;id?:string;error?:string};
function media(p:ContentPost){if(!p.mediaUrl)return '';const u=new URL(p.mediaUrl),sup=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://example.supabase.co');if(u.protocol!=='https:'&&!(process.env.APP_URL?.includes('localhost')&&u.hostname==='localhost'))throw Error('Media must use HTTPS');if(u.hostname!==sup.hostname||!u.pathname.includes('/storage/v1/object/public/omnipost-media/'))throw Error('Use a media file uploaded to your workspace library');return u.toString();}
function caption(p:ContentPost,platform:Platform){const c=p.overrides?.[platform]?.trim()||[p.caption,p.cta,p.tags].filter(Boolean).join('\n\n');return c;}
async function tokenFor(a:any){const db=admin(),{data:t,error}=await db.from('omnipost_social_tokens').select('*').eq('account_id',a.id).single();if(error)throw error;let access=decrypt(t.access_ciphertext);
 if(t.expires_at&&new Date(t.expires_at).getTime()<Date.now()+120000){if(!t.refresh_ciphertext)throw Error('Connection token expired; reconnect account');const r=await refreshToken(a.platform,decrypt(t.refresh_ciphertext));access=r.access_token;await db.from('omnipost_social_tokens').update({access_ciphertext:encrypt(access),refresh_ciphertext:encrypt(r.refresh_token||decrypt(t.refresh_ciphertext)),expires_at:r.expires_in?new Date(Date.now()+r.expires_in*1000).toISOString():null}).eq('account_id',a.id);}
 return access;}
export async function publishOne(post:ContentPost,a:any):Promise<Result>{const p=a.platform as Platform,c=caption(post,p),file=media(post);if(!c.trim()&&!file)throw Error('Post has no content');
 if(['facebook','instagram','x'].includes(p)&&post.visibility!=='public')return {status:'manual_required',error:`${p} adapter does not support ${post.visibility} post visibility. This content was NOT published.`};
 if(p==='tiktok'&&post.visibility==='unlisted')return {status:'manual_required',error:'TikTok has no unlisted setting in this publishing workflow. This content was NOT published.'};
 const token=await tokenFor(a);
 if(p==='facebook'){
  if(post.mediaType==='video')return {status:'manual_required',error:'Facebook video/Reels adapter requires a separate upload implementation. Use manual publishing.'};
  const path=post.mediaType==='image'&&file?'photos':'feed',body=new URLSearchParams({access_token:token});
  if(path==='photos'){body.set('url',file);body.set('caption',c)}else{body.set('message',c);if(post.link)body.set('link',post.link)}
  const j=await fetchJson(`https://graph.facebook.com/v25.0/${a.external_id}/${path}`,{method:'POST',body});return {status:'published',id:j.post_id||j.id,url:`https://www.facebook.com/${j.post_id||j.id}`};
 }
 if(p==='x'){
  if(file)return {status:'manual_required',error:'X media upload needs a separate paid media upload integration. Text publishing is enabled.'};
  if(c.length>280)return {status:'manual_required',error:'X text exceeds 280 characters. Edit the X-specific copy.'};
  const j=await fetchJson('https://api.x.com/2/tweets',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text:c})});return {status:'published',id:j.data.id,url:`https://x.com/i/status/${j.data.id}`};
 }
 if(p==='instagram'){
  if(!file)return {status:'manual_required',error:'Instagram requires hosted image/video content; text-only posts are unsupported.'};
  const isVideo=post.mediaType==='video';const b=new URLSearchParams({access_token:token,caption:c});if(isVideo){b.set('media_type','REELS');b.set('video_url',file);b.set('share_to_feed','true')}else b.set('image_url',file);
  const container=await fetchJson(`https://graph.instagram.com/v25.0/${a.external_id}/media`,{method:'POST',body:b});
  if(isVideo){let ready=false;for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,1800));const st=await fetchJson(`https://graph.instagram.com/v25.0/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);if(st.status_code==='FINISHED'){ready=true;break}if(st.status_code==='ERROR')throw Error('Instagram video processing failed');}
   if(!ready)return {status:'manual_required',id:container.id,error:'Instagram is still processing this video. Retry later; no post has been published.'};}
  const pub=await fetchJson(`https://graph.instagram.com/v25.0/${a.external_id}/media_publish`,{method:'POST',body:new URLSearchParams({creation_id:container.id,access_token:token})});return {status:'published',id:pub.id,url:`https://www.instagram.com/`};
 }
 if(p==='tiktok'){
  if(!file)return {status:'manual_required',error:'TikTok requires an image or video; text-only posts cannot be directly published.'};
  const info=await fetchJson('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
  const permitted:string[]=info.data?.privacy_level_options||[];const preference=post.visibility==='private'?'SELF_ONLY':'PUBLIC_TO_EVERYONE';
  if(!permitted.includes(preference))return {status:'manual_required',error:`TikTok account does not allow ${preference} privacy in this app. Choose an authorized visibility.`};
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const isVideo=post.mediaType==='video';
  const post_info={privacy_level:preference,disable_comment:false,disable_duet:false,disable_stitch:false,brand_content_toggle:false,brand_organic_toggle:false,is_aigc:!!post.syntheticMedia};
  const endpoint=isVideo?'video/init/':'content/init/';const body=isVideo?{post_info:{...post_info,title:c.slice(0,2200)},source_info:{source:'PULL_FROM_URL',video_url:file}}:{post_info:{...post_info,title:(post.title||'Post').slice(0,80),description:c.slice(0,2200),auto_add_music:true},source_info:{source:'PULL_FROM_URL',photo_cover_index:0,photo_images:[file]},post_mode:'DIRECT_POST',media_type:'PHOTO'};
  const j=await fetchJson(`https://open.tiktokapis.com/v2/post/publish/${endpoint}`,{method:'POST',headers,body:JSON.stringify(body)});return {status:'submitted',id:j.data?.publish_id,error:'Submitted to TikTok; processing and public visibility are not yet confirmed.'};
 }
 if(p==='youtube'){
  if(post.mediaType!=='video'||!file)return {status:'manual_required',error:'YouTube publishing requires a video. Image or text-only posts are not uploadable.'};
  const res=await fetch(file,{redirect:'error'});if(!res.ok)throw Error('Could not read uploaded video');const len=Number(res.headers.get('content-length')||0);if(len>50*1024*1024)throw Error('Video exceeds 50 MB starter upload limit');const bytes=await res.arrayBuffer();if(bytes.byteLength>50*1024*1024)throw Error('Video too large');
  const mime=post.mediaName.toLowerCase().endsWith('.mov')?'video/quicktime':'video/mp4';
  const start=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Upload-Content-Length':String(bytes.byteLength),'X-Upload-Content-Type':mime},body:JSON.stringify({snippet:{title:(post.title||'Untitled video').slice(0,100),description:c,tags:post.tags.split(/[\s,]+/).map(x=>x.replace(/^#/,''))},status:{privacyStatus:post.visibility, selfDeclaredMadeForKids:!!post.madeForKids,containsSyntheticMedia:!!post.syntheticMedia}})});
  if(!start.ok)throw Error(`YouTube upload initiation failed (${start.status}): ${(await start.text()).slice(0,250)}`);const uploadUrl=start.headers.get('location');if(!uploadUrl)throw Error('YouTube did not issue upload session URL');const done=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':mime,'Content-Length':String(bytes.byteLength),Authorization:`Bearer ${token}`},body:Buffer.from(bytes)});if(!done.ok)throw Error(`YouTube upload failed (${done.status}): ${(await done.text()).slice(0,250)}`);const uploaded=await done.json();return {status:'published',id:uploaded.id,url:`https://www.youtube.com/watch?v=${uploaded.id}`};
 }
 throw Error(`Unsupported platform: ${p}`);
}
export async function runJob(job:any){const db=admin();const {data:post,error:pe}=await db.from('omnipost_posts').select('*').eq('id',job.post_id).single();if(pe)throw pe;
 const {data:account,error:ae}=await db.from('omnipost_social_accounts').select('*').eq('id',job.account_id).single();if(ae)throw ae;
 const result=await publishOne({...post.data,id:post.id} as ContentPost,account);
 await db.from('omnipost_publish_jobs').update({status:result.status,submitted_id:result.id||null,external_url:result.url||null,error:result.error||null,published_at:result.status==='published'?new Date().toISOString():null,attempted_at:new Date().toISOString(),attempts:job.attempts+1}).eq('id',job.id);
 const {data:jobs}=await db.from('omnipost_publish_jobs').select('status').eq('post_id',job.post_id);const statuses=(jobs||[]).map((j:any)=>j.status);const overall=statuses.every(s=>s==='published')?'published':statuses.some(s=>s==='failed'||s==='manual_required')?'partial':statuses.some(s=>s==='submitted')?'partial':'publishing';await db.from('omnipost_posts').update({status:overall}).eq('id',job.post_id);return result;
}
export async function processJobs(limit=8, userId?:string, postId?:string){const db=admin();let query=db.from('omnipost_publish_jobs').select('*,posts!inner(status,scheduled_at)').eq('status','queued');if(userId)query=query.eq('user_id',userId);if(postId)query=query.eq('post_id',postId);const {data:jobs,error}=await query.limit(limit);if(error)throw error;const results=[];
 for(const job of jobs||[]){const p:any=job.posts;if(p.status==='scheduled'&&new Date(p.scheduled_at).getTime()>Date.now())continue;if(!['queued','scheduled','publishing','partial'].includes(p.status))continue;
  // Claim the job to limit duplicate execution from concurrent schedulers.
  const {data:claim}=await db.from('omnipost_publish_jobs').update({status:'publishing',attempted_at:new Date().toISOString()}).eq('id',job.id).eq('status','queued').select('id').maybeSingle();if(!claim)continue;
  try{const result=await runJob(job);results.push({job:job.id,result});}catch(e){await db.from('omnipost_publish_jobs').update({status:'failed',error:e instanceof Error?e.message:String(e),attempts:job.attempts+1}).eq('id',job.id);await db.from('omnipost_posts').update({status:'partial'}).eq('id',job.post_id);results.push({job:job.id,error:String(e)});}
 }
 return results;}
