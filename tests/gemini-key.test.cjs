// The user-supplied key stays inside the server request: test AQ auth and legacy AIza formats.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const source=fs.readFileSync('app/api/ai/settings/route.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let rows=[],requestedKeys=[],googleStatus=200;
const mocks={'../../../../lib/server':{
  verifyUser:async()=>({id:'user-1'}),
  userDb:()=>({from:()=>({upsert:async row=>{rows.push(row);return {error:null}}})}),
  encrypt:raw=>'sealed:'+raw.slice(0,2),
  fail:(error,code=400)=>Response.json({error:error instanceof Error?error.message:String(error)},{status:code})
}};
const scope={exports:{},require:id=>{if(!mocks[id])throw Error('Unexpected import: '+id);return mocks[id]},Response,Request,Date,JSON,Error,AbortSignal,process:{env:{}},fetch:async(_url,opts)=>{
  requestedKeys.push(opts.headers['x-goog-api-key']);
  return {ok:googleStatus===200,status:googleStatus,json:async()=>googleStatus===200?{candidates:[{content:{parts:[{text:'connected'}]}}]}:{error:{message:'Authentication rejected'}}};
}};
vm.runInNewContext(js,scope,{filename:'ai-settings-test.js'});
const send=async key=>scope.exports.POST(new Request('https://local.test/api/ai/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,model:'auto'})}));
(async()=>{
 const aq='AQ.'+'AbC0123_xyz-'.repeat(4);
 const legacy='AIza'+'B1a2'.repeat(11);
 for(const key of [aq,legacy]){
  const response=await send(key),body=await response.json();
  assert.equal(response.status,200,'Valid Google key format rejected');
  assert.equal(body.configured,true);
  assert.equal(body.verified,true);
  assert.equal(requestedKeys[requestedKeys.length-1],key,'Google must receive original key in secure header');
  assert.equal(rows[rows.length-1].key_ciphertext.startsWith('sealed:'),true,'Key must be encrypted at rest');
  assert(!JSON.stringify(body).includes(key),'Secret must never be returned to browser');
 }
 googleStatus=403;
 const rejected=await send('AQ.'+'a'.repeat(35));
 assert.equal(rejected.status,400,'Rejected Google auth credentials should not be stored');
 assert.equal(rows.length,2);
 const tooShort=await send('abc');
 assert.equal(tooShort.status,400,'Malformed input should show a useful error');
 assert.equal(rows.length,2);
 console.log('PASS: new AQ. keys and legacy AIza keys accepted; Google validation, secure storage and authentication rejection covered.');
})().catch(error=>{console.error(error);process.exitCode=1});
