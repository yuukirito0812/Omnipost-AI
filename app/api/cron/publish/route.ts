import {processJobs} from '../../../../lib/publish';
import {fail} from '../../../../lib/server';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(req:Request){if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});try{return Response.json({ok:true,processed:await processJobs(8)});}catch(e){return fail(e,500);}}
