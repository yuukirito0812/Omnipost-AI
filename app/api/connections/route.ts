import {verifyUser,admin,fail} from '../../../lib/server';
export const runtime='nodejs';
export async function DELETE(req:Request){try{const u=await verifyUser(req);const id=new URL(req.url).searchParams.get('id');if(!id)throw Error('Missing account ID');const {error}=await admin().from('omnipost_social_accounts').delete().eq('id',id).eq('user_id',u.id);if(error)throw error;return Response.json({ok:true});}catch(e){return fail(e);}}
