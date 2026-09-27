import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const url=process.argv[2] ?? 'http://127.0.0.1:5173/platform-nine-1/';
const name=process.argv[3] ?? 'current';
if(!/^[a-zA-Z0-9-]+$/.test(name)) throw new Error('Capture name must be alphanumeric with hyphens.');
const session=`platform-nine-${name}`;
const binary=resolve('node_modules/.bin/agent-browser');
const output=resolve('.dream-loop/captures',name);
mkdirSync(output,{recursive:true});
function browser(...args) {
  const text=execFileSync(binary,['--session',session,...args,'--json'],{encoding:'utf8',timeout:120000});
  const result=JSON.parse(text);
  if(!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
}
try {
  browser('set','viewport','1920','1080');
  browser('open',`${url}${url.includes('?')?'&':'?'}capture`);
  browser('wait','--fn','window.platformNine?.stats().ready && window.platformNine.stats().frames > 300');
  const result=browser('eval','window.platformNine.stats()');
  const stats=result.result ?? result;
  assert.equal(stats.ready,true);
  assert.equal(stats.errors.length,0);
  assert.ok(stats.triangles>100000,'Expected a genuine geometry scene.');
  assert.ok(stats.models>=20,'Expected all hero and station assets.');
  const shot=browser('screenshot');
  copyFileSync(shot.path,`${output}/hero.png`);
  writeFileSync(`${output}/metrics.json`,JSON.stringify(stats,null,2)+'\n');
  const errors=browser('errors');
  writeFileSync(`${output}/console.json`,JSON.stringify(errors,null,2)+'\n');
  assert.deepEqual(errors.errors,[],'Browser reported uncaught errors.');
  console.log(JSON.stringify({output,stats},null,2));
} finally {
  browser('close');
}
