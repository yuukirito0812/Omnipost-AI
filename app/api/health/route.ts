export const runtime='nodejs';
export async function GET(req:Request){
 const providers=['facebook','instagram','tiktok','youtube','x'] as const;
 const ids:Record<string,string>={facebook:'FACEBOOK_CLIENT_ID',instagram:'INSTAGRAM_CLIENT_ID',tiktok:'TIKTOK_CLIENT_ID',youtube:'YOUTUBE_CLIENT_ID',x:'X_CLIENT_ID'};
 return Response.json({live:!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),server:!!process.env.SUPABASE_SERVICE_ROLE_KEY,ai:!!process.env.CREDENTIAL_ENCRYPTION_KEY,aiProvider:'Gemini API · encrypted per-user key',requiresPersonalKey:!process.env.GEMINI_API_KEY,providers:Object.fromEntries(providers.map(p=>[p,!!process.env[ids[p]]]))});
}
