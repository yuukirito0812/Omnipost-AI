const assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const page=read('app/page.tsx'),ai=read('components/AssistantPanel.tsx'),routes=read('app/api/ai/settings/route.ts'),model=read('lib/ai-gateway.ts');
const critical=[
 ['account menu',page.includes('omni-profile-trigger')&&page.includes('onClick={()=>{setProfileOpen(v=>!v)')],
 ['workspace menu',page.includes('omni-workspace-trigger')&&page.includes('setWorkspaceOpen(v=>!v)')],
 ['AI setup form',page.includes('onSubmit={saveAIKey}')&&page.includes('aiKeyInput')],
 ['personal AI key management',page.includes('removeAIKey')&&page.includes('testAIKey')],
 ['AI sidebar setup action',ai.includes('onConfigure')&&ai.includes('Open AI settings')],
 ['media delete action',page.includes('onClick={()=>removeAsset(a)}')],
 ['post draft save',page.includes("savePost('draft')")],
 ['calendar create action',page.includes('omni-calendar-add')&&page.includes('setView(\'compose\')')],
 ['post editor controls',page.includes('togglePlatform(p)')&&page.includes("mutate('title'")],
 ['AI key encrypted',routes.includes('encrypt(key)')&&!routes.includes('localStorage')],
 ['user-scoped settings access',routes.includes("userDb(req)")&&routes.includes("eq('user_id',user.id)")],
 ['Gemini direct call',model.includes('generativelanguage.googleapis.com')&&model.includes("'x-goog-api-key':key")],
 ['Gateway not used by default',model.includes("process.env.AI_GATEWAY_ENABLED==='true'")]
];
for(const [name,pass] of critical)assert(pass, 'Broken contract: '+name);
const controls=[...page.matchAll(/<button\b([^>]*)>/g)];
const inert=controls.filter(m=>!m[1].includes('onClick')&&!m[1].includes('type="submit"'));
assert.equal(inert.length,0,'Buttons without action or submit semantics: '+inert.map(x=>x[0].slice(0,100)).join('; '));
console.log('PASS: '+critical.length+' feature contracts; '+controls.length+' button tags checked for click or form handlers.');
