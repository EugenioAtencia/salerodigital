#!/usr/bin/env node
import assert from 'node:assert/strict';
import { acfOf, list, serviceListHtml, plainListHtml, faqsHtml } from '../scripts/generate-sectors-ssg.mjs';

assert.deepEqual(acfOf({salero_acf:{hero_title:'A'},acf:{hero_title:'B'}}),{hero_title:'A'});
assert.deepEqual(acfOf({acf:{hero_title:'B'}}),{hero_title:'B'});
assert.deepEqual(list([{punto:'Uno'},{punto:'Dos',url:'/dos/'},{}]),[{punto:'Uno'},{punto:'Dos',url:'/dos/'}]);
assert.equal(serviceListHtml([{punto:'SEO local',url:'/el-menu/el-pregonero/'},{punto:'Sin enlace',url:''}]),'<ul><li><a href="/el-menu/el-pregonero/">SEO local</a></li><li>Sin enlace</li></ul>');
assert.equal(plainListHtml([{punto:'A'},{punto:'B'}]),'<ul><li>A</li><li>B</li></ul>');
assert.match(faqsHtml([{pregunta:'¿Pregunta?',respuesta:'Respuesta'}]),/<details open><summary>¿Pregunta\?<\/summary><p>Respuesta<\/p><\/details>/);
console.log('sector SSG generator simulations passed');
