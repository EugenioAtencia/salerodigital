import assert from 'node:assert/strict';
import {publicationTarget,assertProductionSnapshot} from '../integrations/cloudflare/editorial-promoter/target.mjs';
import {receiptMatches} from '../integrations/cloudflare/editorial-promoter/policy.mjs';
import {StagingPages} from '../integrations/cloudflare/editorial-promoter/pages.mjs';
const config={ENVIRONMENT:'production',PAGES_PROJECT:'salerodigital',CODE_BRANCH:'main',PAGES_ENVIRONMENT:'production'};
assert.equal(publicationTarget(config).project,'salerodigital');assert.equal(publicationTarget({}).project,'salerodigital-staging');
for(const key of ['PAGES_PROJECT','CODE_BRANCH','PAGES_ENVIRONMENT'])assert.throws(()=>publicationTarget({...config,[key]:'wrong'}),/publication_target/);
const packet={body:JSON.stringify({collections:{posts:[{link:'https://cms.webagencia360.com/real/'}]}})};assertProductionSnapshot(packet);
for(const value of ['https://staging6.cms.webagencia360.com/real/','RB-326-20261104','https://other.example/real/'])assert.throws(()=>assertProductionSnapshot({body:packet.body.replace('https://cms.webagencia360.com/real/',value)}));
const lease={jobId:'prod-test',generation:1,snapshotId:'hash',revision:'rev',sha256:'sha',counts:{posts:3}},code='a'.repeat(40);
const receipt={...lease,commit:code,branch:'main',scope:'rebotica',mode:'snapshot-coordinated',tests:'passed',buildSuccess:true,snapshotConsistent:true,sourceOrigin:'https://cms.webagencia360.com'};receiptMatches(receipt,lease,code,config);assert.throws(()=>receiptMatches({...receipt,sourceOrigin:'https://staging6.cms.webagencia360.com'},lease,code,config));
let posted=0;const pageClient=new StagingPages('offline-only',async(url,options)=>{if(options.method==='POST')posted++;return Response.json({success:true,result:{name:'salerodigital',production_branch:'wrong'}});},config);
await assert.rejects(pageClient.create({}),/pages_project_configuration/);assert.equal(posted,0);
console.log('PASS production destination, branch, snapshot provenance, staging-marker rejection, certified receipt and pre-deployment destination guard; no remote calls');

const okClient=new StagingPages('offline-only',async(url,options)=>{
 if(options.method==='GET')return Response.json({success:true,result:{name:'salerodigital',production_branch:'main'}});
 assert.equal(options.body.get('branch'),'main');assert.equal(options.body.get('commit_hash'),code);
 return Response.json({success:true,result:{id:'a'.repeat(8)+'-test',environment:'production',url:'https://aaaaaaaa.salerodigital.pages.dev',deployment_trigger:{metadata:{commit_hash:code,commit_message:'editorial-job:prod-test'}}}});
},config);
assert.equal((await okClient.create({files:[],special:{},codeSha:code,jobId:'prod-test'})).environment,'production');
console.log('PASS certified production POST targets main in salerodigital only; simulated API');
