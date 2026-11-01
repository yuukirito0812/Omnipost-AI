import {appUrl,fetchJson} from './server';
import {randomBytes,createHash} from 'node:crypto';
import type {Platform} from './types';
const K:Record<Platform,[string,string]>={facebook:['FACEBOOK_CLIENT_ID','FACEBOOK_CLIENT_SECRET'],instagram:['INSTAGRAM_CLIENT_ID','INSTAGRAM_CLIENT_SECRET'],youtube:['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET'],tiktok:['TIKTOK_CLIENT_ID','TIKTOK_CLIENT_SECRET'],x:['X_CLIENT_ID','X_CLIENT_SECRET']};
export function credentials(p:Platform){const k=K[p];if(!k)throw Error('Unknown network');const id=process.env[k[0]],secret=process.env[k[1]];if(!id||!secret)throw Error(`Set ${k[0]} and ${k[1]} in your environment`);return {id,secret};}
export const callbackUrl=(p:Platform)=>`${appUrl()}/api/oauth/callback/${p}`;
const b64=(s:Buffer)=>s.toString('base64url');
export function oauthAuthorize(p:Platform,state:string){
 const {id}=credentials(p),redir=callbackUrl(p),verifier=b64(randomBytes(48)); let url:URL;
 if(p==='youtube') {url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:id,redirect_uri:redir,response_type:'code',scope:'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',access_type:'offline',prompt:'select_account consent',state}).toString();}
 else if(p==='facebook'){url=new URL('https://www.facebook.com/v25.0/dialog/oauth');url.search=new URLSearchParams({client_id:id,redirect_uri:redir,response_type:'code',scope:'pages_show_list,pages_manage_posts,pages_read_engagement',state}).toString();}
 else if(p==='instagram'){url=new URL('https://www.instagram.com/oauth/authorize');url.search=new URLSearchParams({client_id:id,redirect_uri:redir,response_type:'code',scope:'instagram_business_basic,instagram_business_content_publish',state,enable_fb_login:'0',force_authentication:'1'}).toString();}
 else if(p==='tiktok'){url=new URL('https://www.tiktok.com/v2/auth/authorize/');url.search=new URLSearchParams({client_key:id,redirect_uri:redir,response_type:'code',scope:'user.info.basic,video.publish',state,disable_auto_auth:'1'}).toString();}
 else {url=new URL('https://x.com/i/oauth2/authorize');url.search=new URLSearchParams({client_id:id,redirect_uri:redir,response_type:'code',scope:'tweet.read tweet.write users.read offline.access',state,code_challenge:b64(createHash('sha256').update(verifier).digest()),code_challenge_method:'S256'}).toString();}
 return {url:url.toString(),verifier:p==='x'?verifier:null};
}
export type TokenReply={access_token:string;refresh_token?:string;expires_in?:number;user_id?:number;open_id?:string};
export async function oauthTokens(p:Platform,code:string,verifier:string|null):Promise<TokenReply>{
 const {id,secret}=credentials(p),redir=callbackUrl(p);
 if(p==='facebook'){const u=new URL('https://graph.facebook.com/v25.0/oauth/access_token');u.search=new URLSearchParams({client_id:id,client_secret:secret,redirect_uri:redir,code}).toString();return fetchJson(u.toString());}
 if(p==='instagram'){const f=new FormData();for(const [k,v] of Object.entries({client_id:id,client_secret:secret,grant_type:'authorization_code',redirect_uri:redir,code}))f.append(k,v);const short=await fetchJson('https://api.instagram.com/oauth/access_token',{method:'POST',body:f});const long=new URL('https://graph.instagram.com/access_token');long.search=new URLSearchParams({grant_type:'ig_exchange_token',client_secret:secret,access_token:short.access_token}).toString();const t=await fetchJson(long.toString());return {...t,user_id:short.user_id};}
 if(p==='tiktok'){const body=new URLSearchParams({client_key:id,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:redir});return fetchJson('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});}
 if(p==='youtube'){const body=new URLSearchParams({client_id:id,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:redir});return fetchJson('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});}
 const basic=Buffer.from(id+':'+secret).toString('base64');const body=new URLSearchParams({code,grant_type:'authorization_code',client_id:id,redirect_uri:redir,code_verifier:verifier||''});return fetchJson('https://api.x.com/2/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${basic}`},body});
}
export async function discoverAccounts(p:Platform,token:string,oauth:TokenReply):Promise<Array<{external_id:string;name:string;handle:string;token:string}>>{
 if(p==='facebook') {const j=await fetchJson(`https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token&limit=100`,{headers:{Authorization:`Bearer ${token}`}});return (j.data||[]).map((v:any)=>({external_id:v.id,name:v.name,handle:v.name,token:v.access_token}));}
 if(p==='instagram') {const j=await fetchJson(`https://graph.instagram.com/v25.0/me?fields=user_id,username,name&access_token=${encodeURIComponent(token)}`);return [{external_id:String(j.user_id||oauth.user_id||j.id),name:j.name||j.username||'Instagram account',handle:j.username||'',token}];}
 if(p==='youtube'){const j=await fetchJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:`Bearer ${token}`}});return (j.items||[]).map((v:any)=>({external_id:v.id,name:v.snippet?.title||'YouTube Channel',handle:v.snippet?.customUrl||'',token}));}
 if(p==='tiktok'){const j=await fetchJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username',{headers:{Authorization:`Bearer ${token}`}});const u=j.data?.user||{};return [{external_id:u.open_id||oauth.open_id||'current',name:u.display_name||'TikTok creator',handle:u.username||'',token}];}
 const j=await fetchJson('https://api.x.com/2/users/me?user.fields=profile_image_url',{headers:{Authorization:`Bearer ${token}`}});return [{external_id:j.data.id,name:j.data.name||'X account',handle:j.data.username||'',token}];
}
export async function refreshToken(p:Platform,refresh:string):Promise<TokenReply>{const {id,secret}=credentials(p);
 if(p==='youtube')return fetchJson('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'})});
 if(p==='tiktok')return fetchJson('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:id,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'})});
 if(p==='x')return fetchJson('https://api.x.com/2/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${Buffer.from(id+':'+secret).toString('base64')}`},body:new URLSearchParams({client_id:id,refresh_token:refresh,grant_type:'refresh_token'})});
 throw Error('Reconnect account when token expires');
}
