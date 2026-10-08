import { cp, mkdir, writeFile, rename, rm, stat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderVerifiedSnapshot } from './editorial-snapshot-ssg.mjs';
import { sha256, fail } from './editorial-push-snapshot.mjs';

// Isolated output only. No deploy, hook, promotion or modification of the source checkout.
export async function buildSnapshotArtifacts({ root, output, packet, key, jobId, check, codeSha, tests, scope = 'all', branch = 'main' }) {
  root = path.resolve(root); output = path.resolve(output);
  if (output === root || output.startsWith(root + path.sep) || root.startsWith(output + path.sep)) fail('isolated_output_required');
  if (!/^[a-f0-9]{40}$/.test(codeSha || '') || tests !== 'passed') fail('build_preconditions');
  const lease = await check(jobId);
  if (lease.codeSha !== codeSha) fail('code_revision');
  const rendered = await renderVerifiedSnapshot({ root, packet, key, jobId, check, includeIndividuals: true, scope });
  try { await stat(output); fail('output_exists'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temporary = output + '.preparing';
  await mkdir(temporary, { recursive: false });
  try {
    // Only public site directories/files. Source, credentials and Git are never copied.
    const directories = ['assets', 'functions', 'bio', 'hablamos', 'la-receta', 'el-menu', 'sectores', 'casos-de-exito', 'la-rebotica', 'nuestros-menus', 'contacto', 'sobre-nosotros', 'aviso-legal', 'politica-de-privacidad', 'politica-de-cookies'];
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if ((entry.isDirectory() && directories.includes(entry.name)) || (entry.isFile() && (/\.(html|xml|txt|ico)$/.test(entry.name) || ['_headers', '_redirects', '_routes.json'].includes(entry.name)))) {
        await cp(path.join(root, entry.name), path.join(temporary, entry.name), { recursive: true });
      }
    }
    // Rebuild the blog tree from the complete snapshot: withdrawn articles cannot survive.
    if (scope === 'rebotica') await rm(path.join(temporary, 'la-rebotica'), { recursive: true, force: true });
    const pages = {};
    for (const [file, html] of rendered.output) {
      await mkdir(path.dirname(path.join(temporary, file)), { recursive: true });
      await writeFile(path.join(temporary, file), html); pages[file] = sha256(html);
    }
    let sitemapSha256;
    if (scope === 'rebotica') {
      const original = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
      const removeBlog = xml => xml.replace(/\s*<url>\s*<loc>https:\/\/agenciaconsalero\.es\/la-rebotica\/[\s\S]*?<\/url>/g, '');
      const nodes = Object.keys(pages).filter(file => !file.includes('/page/')).map(file => `  <url><loc>https://agenciaconsalero.es/${file.replace('index.html', '')}</loc></url>`).join('\n');
      const sitemap = removeBlog(original).replace('</urlset>', `${nodes}\n</urlset>`);
      if (removeBlog(sitemap) !== removeBlog(original)) fail('sitemap_scope');
      await writeFile(path.join(temporary, 'sitemap.xml'), sitemap); sitemapSha256 = sha256(sitemap);
    }
    // Nuestros menús stays byte-for-byte from the checkout and is not snapshot-generated.
    if (await readFile(path.join(root, 'nuestros-menus/index.html'), 'utf8') !== await readFile(path.join(temporary, 'nuestros-menus/index.html'), 'utf8')) fail('menu_pack_changed');
    const finalLease = await check(jobId);
    if (finalLease.phase !== 'building' || finalLease.codeSha !== codeSha || finalLease.snapshotId !== packet.snapshotId || finalLease.generation !== packet.generation || finalLease.revision !== packet.revision) fail('obsolete_build');
    const receipt = { ...rendered.identity, commit: codeSha, branch, scope, mode: 'snapshot-coordinated', buildSuccess: true,
      snapshotConsistent: true, tests, pages, ...(sitemapSha256 ? { sitemapSha256 } : {}), publicationAuthorized: false };
    await writeFile(path.join(temporary, 'salero-build.json'), JSON.stringify(receipt, null, 2) + '\n');
    await rename(temporary, output);
    return { receipt, files: Object.keys(pages) };
  } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
}
