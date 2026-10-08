// Local-only full battery. No upload, hooks, Cloudflare resources or CMS mutations.
import { spawnSync } from 'node:child_process';
const php=process.env.SALERO_TEST_PHP || 'php';
const operations=[
 [process.execPath,['scripts/test-push-phase1.mjs',`--php=${php}`]],
 [php,['-d','pcre.jit=0','tests/editorial-push-staging-transport.php']],
 [process.execPath,['tests/editorial-github-store-simulation.mjs']],
 [process.execPath,['tests/editorial-snapshot-pages-simulation.mjs']],
 [process.execPath,['scripts/test-editorial.mjs']],
 ...[[],['--disabled'],['--unset-enabled'],['--autosave'],['--autosave','--disabled'],['--url-validation']].map(args=>[php,['-d','pcre.jit=0','tests/editorial-mu-plugin-simulation.php',...args]]),
 [process.execPath,['test.mjs'],'integrations/cloudflare/push-staging']
];
for(const [binary,args,cwd] of operations){const result=spawnSync(binary,args,{cwd,stdio:'inherit',env:{...process.env,SALERO_TEST_PHP:php,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)process.exit(result.status??1);}
console.log('PASS: complete isolated GitHub push suite; no remote deployment');
