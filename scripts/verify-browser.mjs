import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const url=process.argv[2]??'http://127.0.0.1:5173/platform-nine-1/';
const output=resolve('.dream-loop/verification');
const binary=resolve('node_modules/.bin/agent-browser');
const expected=JSON.parse(readFileSync('src/hero-camera.json','utf8'));
mkdirSync(output,{recursive:true});
function browser(...args) {
  const result=JSON.parse(execFileSync(binary,['--session','platform-nine-verification',...args,'--json'],{
    encoding:'utf8',timeout:120000,
  }));
  if(!result.success)throw new Error(JSON.stringify(result.error));
  return result.data;
}
const evaluate=code=>browser('eval',code).result;
function near(actual,expected) {
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-6));
}
const results=[];
try {
  browser('set','viewport','1920','1080');
  browser('--init-script',resolve('scripts/browser-hold-assets.js'),'open',`${url}${url.includes('?')?'&':'?'}verify`);
  browser('wait','--fn','window.__assetsHeld === true');
  browser('set','viewport','1280','800');
  evaluate('window.__releaseAssetRequests()');
  browser('wait','--fn','window.platformNine?.stats().ready === true');
  const loaded=evaluate('window.platformNine.stats()');
  assert.deepEqual(loaded.size,[1280,800]);
  assert.ok(Math.abs(loaded.camera.aspect-1.6)<1e-12);
  results.push('A viewport change during asset loading is reconciled before the scene becomes ready.');
  browser('set','viewport','1920','1080');
  browser('wait','--fn','window.platformNine.stats().size[0] === 1920');
  const start=evaluate('window.platformNine.stats()');
  near(start.camera.position,expected.position);near(start.camera.target,expected.target);
  assert.equal(start.camera.fov,expected.fov);
  results.push('Hero camera matches its shared configuration.');
  browser('snapshot','-i');
  browser('find','role','button','click','--name','Explore the platform');
  assert.equal(evaluate('window.platformNine.stats().exploring'),true);
  evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}))");
  browser('wait','--fn',`window.platformNine.camera.position.z > ${start.camera.position[2]+.25}`);
  evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}))");
  const walked=evaluate('window.platformNine.stats().camera.position');
  assert.ok(walked[2]>start.camera.position[2]+.25);
  assert.ok(walked[0]>=-6.95&&walked[0]<=-2.05);
  results.push('W key moves the camera along the platform.');
  const before=evaluate('window.platformNine.camera.quaternion.toArray()');
  browser('mouse','move','900','520');browser('mouse','down');
  browser('mouse','move','1040','570');browser('mouse','up');
  const after=evaluate('window.platformNine.camera.quaternion.toArray()');
  assert.ok(after.some((value,i)=>Math.abs(value-before[i])>.01));
  const exploration=browser('screenshot');
  copyFileSync(exploration.path,`${output}/exploration.png`);
  results.push('Pointer dragging changes the view without moving through the world.');
  browser('snapshot','-i');
  browser('find','role','button','click','--name','Pause exploration');
  near(evaluate('window.platformNine.camera.quaternion.toArray()'),after);
  browser('find','role','button','click','--name','Explore the platform');
  browser('press','Escape');
  near(evaluate('window.platformNine.camera.quaternion.toArray()'),after);
  results.push('Pause and Escape preserve the explored viewing direction.');
  browser('press','r');
  const reset=evaluate('window.platformNine.stats()');
  near(reset.camera.position,expected.position);near(reset.camera.target,expected.target);
  assert.equal(reset.exploring,false);
  results.push('R restores the exact hero view and stops movement.');
  // The pinned driver's native press can duplicate keydown; dispatch one key edge.
  evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'h'}))");
  assert.equal(evaluate("document.getElementById('controls').hidden"),true);
  evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'h',repeat:true}))");
  assert.equal(evaluate("document.getElementById('controls').hidden"),true);
  evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{key:'h'}))");
  evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'h'}))");
  evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{key:'h'}))");
  assert.equal(evaluate("document.getElementById('controls').hidden"),false);
  results.push('H hides and restores the interface.');
  browser('set','viewport','390','844');
  browser('wait','--fn','window.platformNine.stats().size[0] === 390');
  const mobile=evaluate('window.platformNine.stats()');
  assert.ok(Math.abs(mobile.camera.aspect-390/844)<1e-12);
  assert.ok(evaluate('document.documentElement.scrollWidth')<=390);
  copyFileSync(browser('screenshot').path,`${output}/portrait.png`);
  results.push('Portrait viewport resizes the renderer and camera without horizontal overflow.');
  assert.deepEqual(browser('errors').errors,[]);
  assert.deepEqual(evaluate('window.platformNine.stats().errors'),[]);
  results.push('No browser/runtime errors.');
  writeFileSync(`${output}/result.json`,JSON.stringify({url,status:'pass',results},null,2)+'\n');
  console.log(JSON.stringify({url,status:'pass',results},null,2));
} finally {
  browser('close');
}
