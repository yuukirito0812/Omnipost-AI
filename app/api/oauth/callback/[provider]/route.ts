import {admin,encrypt,hash,appUrl} from '../../../../../lib/server';
import {oauthTokens,discoverAccounts} from '../../../../../lib/oauth';
import type {Platform} from '../../../../../lib/types';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{provider:string}>}){
 const {provider}=await params,p=provider as Platform,url=new URL(req.url),state=url.searchParams.get('state'),code=url.searchParams.get('code'),e=url.searchParams.get('error');
 const back=(status:string)=>Response.redirect(`${appUrl()}/?connection=${encodeURIComponent(status)}`);
 if(e)return back(`error: ${e}`);if(!state||!code)return back('error: missing login response');
 try{const db=admin(),{data:s,error:se}=await db.from('omnipost_oauth_states').select('*').eq('state_hash',hash(state)).single();if(se||!s||s.platform!==p||new Date(s.expires_at).getTime()<Date.now())throw Error('Authorization expired or invalid. Reconnect.');
 await db.from('omnipost_oauth_states').delete().eq('state_hash',hash(state));
 const t=await oauthTokens(p,code,s.verifier);const accounts=await discoverAccounts(p,t.access_token,t);
 if(!accounts.length)throw Error('No eligible Pages or accounts found. Check platform permissions.');
 for(const a of accounts){const {data:row,error}=await db.from('omnipost_social_accounts').upsert({user_id:s.user_id,platform:p,external_id:a.external_id,name:a.name,handle:a.handle},{onConflict:'user_id,platform,external_id'}).select('id').single();if(error)throw error;
 const {error:te}=await db.from('omnipost_social_tokens').upsert({account_id:row.id,access_ciphertext:encrypt(a.token),refresh_ciphertext:t.refresh_token?encrypt(t.refresh_token):null,expires_at:t.expires_in?new Date(Date.now()+t.expires_in*1000).toISOString():null},{onConflict:'account_id'});if(te)throw te;}
 return back(`success: ${accounts.length} ${p} account(s) connected`);
 }catch(err){return back(`error: ${err instanceof Error?err.message:'Connection failed'}`);}
}
