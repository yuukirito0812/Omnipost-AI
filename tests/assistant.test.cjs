// Server-side contract tests without any external service or database.
// Run after npm install: node tests/assistant.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const store={omnipost_ai_messages:[],omnipost_posts:[{id:'post-1',user_id:'user-1',status:'scheduled',data:{title:'Open house',caption:'Visit our open house',platforms:['facebook'],accountIds:['fb1'],scheduledAt:'2026-11-17T10:00:00Z'},scheduled_at:'2026-11-17T10:00:00Z',created_at:'2026-11-01T00:00:00Z'}],omnipost_social_accounts:[{id:'fb1',user_id:'user-1',name:'Demo page',handle:'demo',platform:'facebook'}],omnipost_publish_jobs:[]};
const mockDb=()=>({from(table){let filters=[],max=Infinity,reverse=false,projection=null,countOptions=null;
  const base={select(fields,opts){projection=fields;countOptions=opts;return this},eq(k,v){filters.push(x=>x[k]===v);return this},gte(k,v){filters.push(x=>x[k]>=v);return this},order(_k,o){reverse=o?.ascending===false;return this},limit(n){max=n;return this},insert(rows){const arr=Array.isArray(rows)?rows:[rows];for(const row of arr)store[table].push({...row,id:'id-'+store[table].length,created_at:new Date().toISOString()});return Promise.resolve({data:arr,error:null})},delete(){return {eq(k,v){store[table]=store[table].filter(x=>x[k]!==v);return Promise.resolve({error:null})}}},then(ok,err){let rows=store[table].filter(x=>filters.every(fn=>fn(x)));if(reverse)rows=rows.slice().reverse();rows=rows.slice(0,max);return Promise.resolve(countOptions?.head?{count:rows.length,error:null}:{data:rows,error:null}).then(ok,err)}};return base;}});
let requestedModel=0;
const mocks={
 '../../../lib/server':{
  userDb:mockDb,
  fail:(e,code=400)=>Response.json({error:String(e?.message||e)},{status:code}),
  verifyUser:async req=>{if(req.headers.get('Authorization')!=='Bearer valid')throw Error('Please sign in');return{id:'user-1'}}
 },
 '../../../lib/types':{PLATFORMS:['instagram','facebook','tiktok','youtube','x']},
 '../../../lib/ai-gateway':{
  generateMarketingText:async (instructions,prompt,tokens,req)=>{
   requestedModel++;
   assert(instructions.includes('never claim to have published'));
   assert(prompt.includes('Open house'));
   assert.equal(req.headers.get('Authorization'),'Bearer valid');
   return JSON.stringify({
    reply:'One Facebook post is scheduled.',
    draft:{title:'Market update',caption:'Our latest property tip.',platforms:['facebook','x'],overrides:{x:'Short tip.'}},
    calendarPlan:[{title:'Tuesday tips',caption:'One great idea',platforms:['instagram']}],
    reschedule:{postId:'fake-id',scheduledAt:'2030-01-01T10:00:00Z'},
    warnings:['Please review claims before posting']
   });
  },
  parseAIJson:raw=>JSON.parse(raw)
 }
};
const js=ts.transpileModule(fs.readFileSync('app/api/assistant/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const scope={exports:{},require:id=>{if(!mocks[id])throw Error('unexpected import '+id);return mocks[id]},Response,Request,URL,Date,Set,JSON,Error,AbortSignal,console,process:{env:{}},fetch};
vm.runInNewContext(js,scope,{filename:'assistant-route.js'});
(async()=>{const auth={Authorization:'Bearer valid'};
 const post=await scope.exports.POST(new Request('http://local/api/assistant',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({message:'What is scheduled? Draft a tip.',composer:{caption:''},brand:'Test brand'})}));assert.equal(post.status,200);const answer=await post.json();assert.equal(answer.reply,'One Facebook post is scheduled.');assert.equal(answer.draft.title,'Market update');assert.equal(answer.calendarPlan.length,1);assert.equal(answer.reschedule,null,'unknown post IDs must not be actionable');assert.equal(store.omnipost_ai_messages.length,2);assert.equal(requestedModel,1);
 const get=await scope.exports.GET(new Request('http://local/api/assistant',{headers:auth}));assert.equal((await get.json()).messages.length,2);
 const deleted=await scope.exports.DELETE(new Request('http://local/api/assistant',{method:'DELETE',headers:auth}));assert.equal(deleted.status,200);assert.equal(store.omnipost_ai_messages.length,0);
 const denied=await scope.exports.POST(new Request('http://local/api/assistant',{method:'POST',body:JSON.stringify({message:'hello'})}));assert.equal(denied.status,401);
 console.log('PASS: authenticated chat, grounded context, draft/plan normalization, unknown-ID guard, conversation storage, conversation clearing, rejected unauthenticated calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
