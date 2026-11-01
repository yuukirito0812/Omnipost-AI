import {admin,verifyUser,hash,fail} from '../../../../lib/server';
import {oauthAuthorize} from '../../../../lib/oauth';
import type {Platform} from '../../../../lib/types';
import {randomBytes} from 'node:crypto';
export const runtime='nodejs';
export async function POST(req:Request){try{const user=await verifyUser(req);const {platform}=await req.json();const p=platform as Platform;const state=randomBytes(32).toString('base64url');const {url,verifier}=oauthAuthorize(p,state);
 const {error}=await admin().from('omnipost_oauth_states').insert({state_hash:hash(state),user_id:user.id,platform:p,verifier,expires_at:new Date(Date.now()+10*60*1000).toISOString()});if(error)throw error;return Response.json({url});}catch(e){return fail(e);}}
