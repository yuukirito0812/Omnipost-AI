const assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const loginHub=read('components/ManagedAccountSync.tsx'),loginApi=read('app/api/managed-social/connect/route.ts'),page=read('app/page.tsx'),ai=read('components/AssistantPanel.tsx'),routes=read('app/api/ai/settings/route.ts'),model=read('lib/ai-gateway.ts'),preview=read('components/PlatformPreview.tsx'),social=read('components/SocialConnectionGuide.tsx'),health=read('app/api/health/route.ts'),layout=read('app/layout.tsx');
const publish=read('app/api/managed-social/publish/route.ts'),postApi=read('app/api/posts/route.ts'),statusApi=read('app/api/managed-social/status/route.ts');
const studio=read('app/studio.css'),commands=read('components/CommandPalette.tsx');
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
 ['managed official social login screen',page.includes('<ManagedAccountSync')&&loginHub.includes('omni-login-network')&&loginHub.includes('NETWORKS')],
 ['social password privacy',loginHub.includes('never sees your Facebook')&&loginApi.includes("username")&&loginApi.includes('userDb(req)')],
 ['no false live social connections',loginHub.includes('reauthRequired')&&loginHub.includes('connected')],
 ['clickable overview stats and drafts',page.includes('omni-stat-action')&&page.includes("setPostFilter('open')")],
 ['publish now shortcut',page.includes('Post now</b>')&&page.includes("setScheduleMode('now')")],
 ['manual calendar scheduling',postApi.includes('publishMode:status')&&page.includes('MANUAL reminder')],
 ['managed account chooser',page.includes('omni-connected-dest')&&page.includes('setManagedPlatform(p)')],
 ['real provider submission with idempotency',publish.includes('Idempotency-Key')&&publish.includes('/api/upload_text')&&publish.includes('/api/upload_photos')],
 ['live post status refresh and schedule cancellation',statusApi.includes('/api/uploadposts/status?')&&statusApi.includes("method:'DELETE'")],
 ['no premature success',page.includes('if(!result.accepted)throw Error')&&publish.includes('result.success===false')],
 ['one-click OAuth launch backed by private key',loginHub.includes("'/api/managed-social/connect'")&&loginApi.includes('api_key_ciphertext')&&loginApi.includes('generate-jwt')],
 ['provider validation before redirect',loginApi.includes('profiles.some')&&loginApi.includes('app\\.upload-post')],
 ['login fallback on free plans',loginApi.includes("method:'dashboard'")&&loginHub.includes('window.location.assign')],
 ['return from OAuth auto-refresh',loginHub.includes('social_return')&&page.includes("setView('accounts')")],
 ['advanced developer setup optional',page.includes('advancedSocialOpen')&&!page.includes('<SimpleSocialConnect')],
 ['light studio stylesheet',read('app/layout.tsx').includes("import './studio.css'")&&studio.includes('color-scheme:light')],
 ['real dusk mode preference',page.includes('setAppearance(')&&page.includes('omnipost-appearance')&&studio.includes('data-studio-theme="dusk"')],
 ['command palette mounted',page.includes('<CommandPalette')&&commands.includes('onNavigate')&&commands.includes('onKeyDown={onKey}')],
 ['keyboard command shortcut',page.includes("e.key.toLowerCase()==='k'")&&commands.includes('ArrowDown')&&commands.includes('Escape')],
 ['content starters editable',page.includes('STARTERS.map')&&page.includes('function startTemplate(index:number)')&&page.includes("setView('compose')")],
 ['real CSV export',page.includes('function exportContentCSV()')&&page.includes('Export CSV')&&page.includes('URL.createObjectURL')],
 ['all analytics cards navigate',page.includes("name=\"Content created\"")&&page.includes("name=\"Connected accounts\"")&&page.includes("onClick={()=>setView('accounts')}")],
 ['bounded live database queries',page.includes(".limit(250)")&&page.includes(".limit(100)")],
 ['no demo storage boot',!page.includes("setPosts(safeRead")&&!page.includes("setAssets(safeRead")],
 ['cleanup auth subscription',page.includes('subscription?.unsubscribe()')&&page.includes('controller.abort()')],
 ['lazy media previews',preview.includes('preload="metadata"')&&preview.includes('decoding="async"')&&preview.includes('memo(PlatformPreview)')],
 ['respect reduced motion',studio.includes('prefers-reduced-motion')],
 ['new theme responsive',studio.includes('@media(max-width:600px)')&&studio.includes('studio-starters-grid')]

];
for(const [name,pass] of critical)assert(pass, 'Broken contract: '+name);
const controls=[...page.matchAll(/<button\b([^>]*)>/g),...social.matchAll(/<button\b([^>]*)>/g),...commands.matchAll(/<button\b([^>]*)>/g)];
const inert=controls.filter(m=>!m[1].includes('onClick')&&!m[1].includes('type="submit"'));
assert.equal(inert.length,0,'Buttons without action or submit semantics: '+inert.map(x=>x[0].slice(0,100)).join('; '));
console.log('PASS: '+critical.length+' feature contracts; '+controls.length+' button tags checked for click or form handlers.');
