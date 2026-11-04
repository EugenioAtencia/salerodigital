import {fail} from '../../../scripts/lib/editorial-push-snapshot.mjs';
// Closed release profiles; request bodies cannot select a destination.
export function publicationTarget(config={}) {
 const environment=config.ENVIRONMENT || 'staging';
 if(environment==='staging')return {environment,project:'salerodigital-staging',branch:'codex/rebotica-editorial-staging',pagesEnvironment:'preview',origin:'https://staging6.cms.webagencia360.com',host:/^https:\/\/[a-f0-9]{8}\.salerodigital-staging\.pages\.dev$/};
 if(environment!=='production'||config.PAGES_PROJECT!=='salerodigital'||config.CODE_BRANCH!=='main'||config.PAGES_ENVIRONMENT!=='production')fail('publication_target');
 return {environment,project:'salerodigital',branch:'main',pagesEnvironment:'production',origin:'https://cms.webagencia360.com',host:/^https:\/\/[a-f0-9]{8}\.salerodigital\.pages\.dev$/};
}
export function assertProductionSnapshot(packet) {
 const payload=JSON.parse(packet.body);
 if(/staging6\.cms\.webagencia360\.com|salerodigital-staging|RB-326-20261104/.test(packet.body))fail('production_snapshot_origin');
 for(const post of payload.collections.posts)if(new URL(post.link).origin!=='https://cms.webagencia360.com')fail('production_snapshot_origin');
 return payload;
}
