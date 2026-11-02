const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('app/api/managed-social/connect/route.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let requested=[],scenario='direct';
const fakeFetch=async (url,options={})=>{
 requested.push({url,options});
 if(url.endsWith('/users'))return {ok:true,status:200,json:async()=>({profiles:[{username:'default'}]})};
 if(url.includes('/oauth/')){
  if(scenario==='direct')return {ok:true,status:200,json:async()=>({authorize_url:'https://www.facebook.com/dialog/oauth?state=secure-test-state'})};
  if(scenario==='evil')return {ok:true,status:200,json:async()=>({authorize_url:'https://evil.example/phishing'})};
  return {ok:false,status:403,json:async()=>({error_code:'feature_not_available'})};
 }
 if(url.endsWith('/generate-jwt')){
  if(scenario==='fallback')return {ok:true,status:200,json:async()=>({access_url:'https://app.upload-post.com/connect?token=test-jwt'})};
  return {ok:false,status:403,json:async()=>({error_code:'plan_required'})};
 }
 throw Error('Unexpected fetch: '+url);
};
const mocks={'../../../../lib/server':{
 verifyUser:async()=>({id:'user1'}),
 userDb:()=>({from:()=>({select(){return this},eq(){return this},async maybeSingle(){return {data:{api_key_ciphertext:'encrypted'},error:null}}})}),
 decrypt:()=> 'provider-secret-key'
}};
const context={exports:{},require:id=>{if(!mocks[id])throw Error('Unexpected dependency '+id);return mocks[id]},Request,Response,URL,AbortSignal,JSON,Date,Error,String,process:{env:{}},fetch:fakeFetch};
vm.runInNewContext(code,context,{filename:'social-connect-route.js'});
async function go(platform='facebook',profile='default'){
 return context.exports.POST(new Request('https://omnipost-ai-theta.vercel.app/api/managed-social/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform,profile})}));
}
(async()=>{
 let response=await go(),data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.method,'official-oauth');
 assert(data.url.startsWith('https://www.facebook.com/'));
 assert.equal(requested[1].options.headers.Authorization,'Apikey provider-secret-key');
 assert.equal(JSON.parse(requested[1].options.body).redirect_url,'https://omnipost-ai-theta.vercel.app/?social_return=1');
 requested=[];scenario='fallback';
 response=await go();data=await response.json();
 assert.equal(data.method,'hosted-connect');
 assert.equal(data.url,'https://app.upload-post.com/connect?token=test-jwt');
 requested=[];scenario='dashboard';
 response=await go();data=await response.json();
 assert.equal(data.method,'dashboard');
 assert.equal(data.url,'https://app.upload-post.com/');
 requested=[];scenario='evil';
 response=await go();data=await response.json();
 assert.equal(response.status,502);
 assert.equal(data.url,undefined);
 requested=[];
 response=await go('unknown-platform');data=await response.json();
 assert.equal(response.status,400);
 assert.equal(requested.length,0);
 console.log('PASS: 1-click official social login, trusted URLs, account verification, hosted fallback, free-plan fallback and malicious redirect rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});
