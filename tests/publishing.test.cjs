// Contract tests for submit-now and provider scheduling. No real API or platform calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('typescript');
function runModule(path){
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('module','exports','require',code)(module,module.exports,require);
 return module.exports;
}
const formats=runModule('lib/channel-formats.ts');
const types=runModule('lib/types.ts');
const growth=runModule('lib/growth.ts');
let profiles=[{username:'default',social_accounts:{facebook:{handle:'samplePage',display_name:'Sample Page'},youtube:{handle:'@video',display_name:'Video Channel'},tiktok:''}}];
let stored=[],calls=[];
const db=()=>({from(table){
 let filters=[],next=null;
 const query={
  select(){return this},eq(k,v){filters.push([k,v]);return this},
  async maybeSingle(){
   if(table==='omnipost_managed_social_settings')return {data:{api_key_ciphertext:'encrypted'},error:null};
   return {data:stored.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:null};
  },
  insert(row){stored.push({...row});return Promise.resolve({error:null})},
  update(row){next=row;return this},
  then(success,fail){const match=stored.find(r=>filters.every(([k,v])=>r[k]===v));if(match)Object.assign(match,next);return Promise.resolve({error:null}).then(success,fail)}
 };
 return query;
}});
const mocks={
 '../../../../lib/server':{verifyUser:async()=>({id:'user-1'}),userDb:db,decrypt:()=> 'private-provider-key',fail:(e,code=400)=>Response.json({error:String(e?.message||e)},{status:code})},
 '../../../../lib/types':types,
 '../../../../lib/channel-formats':formats,
 'node:crypto':{randomUUID:()=> '11111111-1111-4111-8111-111111111111'}
};
let providerResponse={success:true,results:{facebook:{success:true,url:'https://facebook.com/post/123'}}};
const mockFetch=async(url,options={})=>{
 calls.push({url,options});
 if(url.endsWith('/api/uploadposts/users'))return {ok:true,status:200,json:async()=>({success:true,profiles})};
 if(url.includes('/api/uploadposts/facebook/pages'))return {ok:true,status:200,json:async()=>({success:true,pages:[{id:'fb-page-1',name:'Sample Page'}]})};
 return {ok:true,status:200,json:async()=>providerResponse};
};
const code=ts.transpileModule(fs.readFileSync('app/api/managed-social/publish/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},require:n=>{if(!mocks[n])throw Error('Unexpected import '+n);return mocks[n]},Request,Response,FormData,URLSearchParams,Blob,AbortSignal,Set,Array,Date,String,Number,Error,JSON,fetch:mockFetch,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://storage.example'}},console};
vm.runInNewContext(code,context,{filename:'managed-publish.js'});
const draft={id:'local-test',title:'Our new listing',caption:'Welcome to your dream home',mediaType:'',mediaUrl:'',overrides:{},firstComment:'',cta:'',tags:'',scheduledAt:''};
async function invoke(body){
 const request=new Request('https://local/api/managed-social/publish',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await context.exports.POST(request);
 return {status:result.status,data:await result.json()};
}
(async()=>{
 let result=await invoke({mode:'now',post:draft,profile:'default',platforms:[]});
 assert.equal(result.status,400);
 assert.equal(calls.length,0,'Empty destination must never make an external request');
 result=await invoke({mode:'now',post:draft,profile:'default',platforms:['tiktok']});
 assert.equal(result.status,400);
 assert(calls.every(v=>v.url.endsWith('/users')),'Unconnected network must never receive a publish request');
 stored=[];calls=[];
 result=await invoke({mode:'now',post:draft,profile:'default',platforms:['facebook']});
 assert.equal(result.status,202);
 assert.equal(result.data.status,'published');
 assert.equal(stored[0].status,'published');
 assert(calls.some(x=>x.url.endsWith('/api/upload_text')),'A text post should call the real text endpoint');
 const sent=calls.find(x=>x.url.endsWith('/api/upload_text'));
 assert.equal(sent.options.body.get('user'),'default');
 assert.equal(sent.options.body.get('platform[]'),'facebook');
 assert.equal(sent.options.body.get('facebook_page_id'),'fb-page-1','Must select actual available Facebook Page');
 stored=[];calls=[];providerResponse={success:true,job_id:'scheduled-123',request_id:'omni-scheduled'};
 result=await invoke({mode:'schedule',post:{...draft,scheduledAt:'2030-11-03T10:30:00.000Z'},profile:'default',platforms:['facebook']});
 assert.equal(result.status,202);
 assert.equal(result.data.status,'scheduled');
 assert.equal(calls.find(x=>x.url.endsWith('/api/upload_text')).options.body.get('scheduled_date'),'2030-11-03T10:30:00.000Z');
 assert.equal(stored[0].data.providerJobId,'scheduled-123');
 stored=[];calls=[];
 providerResponse={success:true,request_id:'omni-youtube-test'};
 const video={...draft,mediaType:'video',mediaUrl:'https://storage.example/storage/v1/object/public/omnipost-media/user-1/clip.mp4',
  mediaDetails:{width:1920,height:1080,duration:90},visibility:'public',
  channelTitles:{youtube:'Three viewing questions'},overrides:{youtube:'The detailed YouTube description.',facebook:'The Facebook caption.'}};
 result=await invoke({mode:'now',post:video,profile:'default',platforms:['youtube','facebook']});
 assert.equal(result.status,202);
 const videoForm=calls.find(x=>x.url.endsWith('/api/upload')).options.body;
 assert.equal(videoForm.get('youtube_title'),'Three viewing questions');
 assert.equal(videoForm.get('youtube_description'),'The detailed YouTube description.');
 assert.equal(videoForm.get('facebook_description'),'The Facebook caption.');
 assert.equal(videoForm.get('facebook_media_type'),'VIDEO');
 assert.equal(videoForm.get('privacyStatus'),'public');
 stored=[];calls=[];
 result=await invoke({mode:'now',post:{...video,visibility:'private'},profile:'default',platforms:['facebook','youtube']});
 assert.equal(result.status,400);
 assert.equal(calls.length,0,'Unsupported visibility must never be sent to the provider');

 assert.equal(formats.channelCopy({...types.INITIAL_POST,caption:'a'.repeat(257)+' https://example.com/example-with-a-long-url'},'x').textCount,281);
 assert.equal(formats.channelCopy({...types.INITIAL_POST,caption:'🇵🇭'},'x').textCount,2);
 assert.equal(formats.channelCopy({...types.INITIAL_POST,caption:'é'},'youtube').textCount,2);
 assert.equal(formats.postFormat('youtube','video',{width:1080,height:1080,duration:180}),'shorts');
 assert.equal(formats.postFormat('youtube','video',{width:1080,height:1920,duration:181}),'watch');
 assert.equal(formats.managedChannelFields({...types.INITIAL_POST,mediaType:'image',title:'A photo title',caption:'Full photo description',visibility:'private'},['tiktok']).tiktok_description,'Full photo description');
 const now=Date.parse('2026-11-15T05:00:00Z');
 const specimens=[44,55,60].map((outcome,index)=>({platform:'instagram',goal:'engagement',format:'Feed or photo',postedAt:'2026-11-'+String(9+index).padStart(2,'0')+'T23:00:00Z',outcome,reach:1000}));
 const scored=growth.postingSlots({entries:specimens,platform:'instagram',goal:'engagement',timezone:'America/New_York',now});
 assert.equal(scored[0].samples,3);
 assert.equal(scored[0].score,53);
 assert.equal(scored[0].at,Date.parse('2026-11-16T23:00:00Z'));
 const overflow=growth.postingSlots({entries:specimens.slice(0,2),platform:'instagram',goal:'engagement',timezone:'America/New_York',now,reserved:[scored[0].at]});
 assert.equal(overflow[0].score,null);
 assert.equal(overflow[0].at,Date.parse('2026-11-17T23:00:00Z'));
 console.log('PASS: publishing rejects missing/unconnected targets, uses verified profile, submits now and schedules via real provider contract.');
})().catch(e=>{console.error(e);process.exitCode=1});
