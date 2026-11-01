const assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const easy=read('components/SimpleSocialConnect.tsx'),page=read('app/page.tsx'),ai=read('components/AssistantPanel.tsx'),routes=read('app/api/ai/settings/route.ts'),model=read('lib/ai-gateway.ts'),preview=read('components/PlatformPreview.tsx'),social=read('components/SocialConnectionGuide.tsx'),health=read('app/api/health/route.ts'),layout=read('app/layout.tsx');
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
 ['Gateway not used by default',model.includes("process.env.AI_GATEWAY_ENABLED==='true'")],
 ['Gemini actual model validation',routes.includes('generateContent')&&routes.includes('CANDIDATES')&&routes.includes('key_ciphertext')],
 ['explicit Gemini failure states',page.includes('aiConnectionError')&&page.includes('role="alert"')],
 ['original visual identity',page.includes('/omnipost-mark.svg')&&page.includes('Carl Vincent Zabala')&&layout.includes('icons:')],
 ['platform preview component',page.includes('<PlatformPreview')&&preview.includes("platform==='instagram'")&&preview.includes("platform==='tiktok'")],
 ['YouTube and X previews',preview.includes("platform==='youtube'")&&preview.includes('channel-x')],
 ['Facebook preview',preview.includes("platform==='facebook'")],
 ['no fabricated social engagement',preview.includes('No engagement data')],
 ['social setup guidance',page.includes('<SocialConnectionGuide')&&social.includes('callback')&&social.includes('onCheck')],
 ['complete OAuth readiness',health.includes("'_CLIENT_SECRET'")&&social.includes('serverReady')],
 ['secure redirect links',social.includes('oauth/callback/')&&social.includes('navigator.clipboard')],
 ['managed official-social-login guidance',page.includes('<SimpleSocialConnect')&&easy.includes('https://app.upload-post.com/')&&easy.includes('10 uploads')],
 ['social password privacy',easy.includes('never')||easy.includes("won't collect")],
 ['no false live social connections',easy.includes('does not activate native OmniPost publishing')]
];
for(const [name,pass] of critical)assert(pass, 'Broken contract: '+name);
const controls=[...page.matchAll(/<button\b([^>]*)>/g),...social.matchAll(/<button\b([^>]*)>/g)];
const inert=controls.filter(m=>!m[1].includes('onClick')&&!m[1].includes('type="submit"'));
assert.equal(inert.length,0,'Buttons without action or submit semantics: '+inert.map(x=>x[0].slice(0,100)).join('; '));
console.log('PASS: '+critical.length+' feature contracts; '+controls.length+' button tags checked for click or form handlers.');
