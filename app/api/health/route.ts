export const runtime='nodejs';
export async function GET(req:Request){
 const providers=['facebook','instagram','tiktok','youtube','x'] as const;
 const ids:Record<string,string>={facebook:'FACEBOOK',instagram:'INSTAGRAM',tiktok:'TIKTOK',youtube:'YOUTUBE',x:'X'};
 return Response.json({live:!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),server:!!process.env.SUPABASE_SERVICE_ROLE_KEY,ai:!!process.env.CREDENTIAL_ENCRYPTION_KEY,aiProvider:'Gemini API · encrypted per-user key',requiresPersonalKey:!process.env.GEMINI_API_KEY,providers:Object.fromEntries(providers.map(p=>[p,!!process.env[ids[p]+'_CLIENT_ID']&&!!process.env[ids[p]+'_CLIENT_SECRET']])),missing:Object.fromEntries(providers.map(p=>[p,([ids[p]+'_CLIENT_ID',ids[p]+'_CLIENT_SECRET'] as string[]).filter(k=>!process.env[k])]))});
}
