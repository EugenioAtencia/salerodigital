import {spawnSync} from 'node:child_process';
const node=['tests/editorial-github-auth-simulation.mjs','scripts/test-editorial.mjs','tests/editorial-push-simulation.mjs','tests/editorial-github-store-simulation.mjs','tests/editorial-snapshot-pages-simulation.mjs','tests/rebotica-snapshot-simulation.mjs','tests/editorial-artifact-handoff-simulation.mjs','tests/editorial-independent-promoter-simulation.mjs'];
for(const file of node){const r=spawnSync(process.execPath,[file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
for(const file of ['tests/editorial-push-exporter-simulation.php','tests/editorial-push-staging-transport.php','tests/rebotica-journal-simulation.php','tests/rebotica-wordpress-hooks-simulation.php','tests/editorial-mu-plugin-simulation.php']){const r=spawnSync(process.env.SALERO_TEST_PHP||'php',['-d','pcre.jit=0',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
console.log('PASS Rebotica editorial suite; no remote publishing');
