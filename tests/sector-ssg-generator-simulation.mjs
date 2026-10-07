#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { acfOf, list, renderIntoTemplate, faqsHtml } from '../scripts/generate-sectors-ssg.mjs';

assert.deepEqual(acfOf({salero_acf:{hero_title:'A'},acf:{hero_title:'B'}}),{hero_title:'A'});
assert.deepEqual(acfOf({acf:{hero_title:'B'}}),{hero_title:'B'});
assert.deepEqual(list([{punto:'Uno'},{punto:'Dos',url:'/dos/'},{}]),[{punto:'Uno'},{punto:'Dos',url:'/dos/'}]);
assert.match(faqsHtml([{pregunta:'¿Pregunta?',respuesta:'Respuesta'}]),/<details open><summary>¿Pregunta\?<\/summary><p>Respuesta<\/p><\/details>/);

// The editorial-layout migration (2598a42) retired serviceListHtml/plainListHtml.
// Exercise their current replacements through the generator's public renderer.
// Render in memory: no CMS requests or writes to the published sector pages.
const slug = 'marketing-para-almazaras-aceite';
const template = await readFile(new URL(`../sectores/${slug}/index.html`, import.meta.url), 'utf8');
const rendered = renderIntoTemplate(template, { slug, title: { rendered: 'Sector de prueba' }, acf: {
  servicios_recomendados: [{ punto: 'SEO & local', url: '/el-menu/el-pregonero/' }, { punto: 'Sin enlace', url: '' }, {}],
  beneficios: [{ punto: 'Beneficio A' }, 'Beneficio B', {}],
  ejemplos_acciones: [{ punto: 'Acción A' }, { punto: 'Acción B' }],
  hero_card_items: [{ punto: 'Resumen A' }, { punto: 'Resumen B' }],
  sidebar_items: [{ punto: 'Cata A & B' }, 'Cata C']
} });
assert.match(rendered, /<a class="se2-service-card" href="\/el-menu\/el-pregonero\/">[\s\S]*?<h3>SEO &amp; local<\/h3><\/a>/);
assert.match(rendered, /<article class="se2-service-card">[\s\S]*?<h3>Sin enlace<\/h3><\/article>/);
assert.equal((rendered.match(/class="se2-service-card"/g) || []).length, 2);
assert.equal((rendered.match(/class="se2-benefit-card"/g) || []).length, 2);
assert.ok(rendered.indexOf('<p>Beneficio A</p>') < rendered.indexOf('<p>Beneficio B</p>'));
assert.match(rendered, /<p>Beneficio A<\/p>/);
assert.match(rendered, /<p>Beneficio B<\/p>/);
assert.equal((rendered.match(/class="se2-method-item"/g) || []).length, 2);
assert.match(rendered, /<h3>Acción A<\/h3>/);
assert.match(rendered, /<h3>Acción B<\/h3>/);
assert.match(rendered, /<ul><li>Resumen A<\/li><li>Resumen B<\/li><\/ul>/);
assert.match(rendered, /<ul class="se2-cata-list"><li>Cata A &amp; B<\/li><li>Cata C<\/li><\/ul>/);
console.log('sector SSG generator simulations passed');
