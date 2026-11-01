import { createClient } from '@supabase/supabase-js';
import { createCipheriv,createDecipheriv,randomBytes,createHash } from 'node:crypto';
export function admin(){
 const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!u||!k)throw new Error('Configure Supabase server credentials');
 return createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function verifyUser(req:Request){
 const bearer=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!bearer)throw new Error('Please sign in to continue');
 const {data:{user},error}=await admin().auth.getUser(bearer);
 if(error||!user)throw new Error('Invalid or expired session');
 return user;
}
export function hash(s:string){return createHash('sha256').update(s).digest('hex');}
function secret(){const key=process.env.CREDENTIAL_ENCRYPTION_KEY;if(!key||!/^[0-9a-f]{64}$/i.test(key))throw new Error('Set CREDENTIAL_ENCRYPTION_KEY (64 hex characters)');return Buffer.from(key,'hex');}
export function encrypt(s:string){if(!s)return '';const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',secret(),iv),enc=Buffer.concat([c.update(s,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),enc]).toString('base64url');}
export function decrypt(s?:string|null){if(!s)return '';const b=Buffer.from(s,'base64url'),d=createDecipheriv('aes-256-gcm',secret(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8');}
export const fail=(e:unknown,code=400)=>Response.json({error:e instanceof Error?e.message:String(e)},{status:code});
export function appUrl(){return process.env.APP_URL?.replace(/\/$/,'')||'http://localhost:3000';}
export async function fetchJson(url:string,init?:RequestInit){const r=await fetch(url,init);const t=await r.text();let j:any;try{j=JSON.parse(t)}catch{j={raw:t.slice(0,300)}}if(!r.ok||j.error?.code && j.error.code!=='ok')throw Error(j.error_description||j.error?.message||j.error?.code||j.message||`API error ${r.status}`);return j;}
