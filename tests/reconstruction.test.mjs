import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('hero camera preserves the judged viewpoint',()=>{
  const camera=JSON.parse(readFileSync('src/hero-camera.json','utf8'));
  assert.deepEqual(camera.position,[-4.25,2.5,-8.1]);
  assert.deepEqual(camera.target,[2.75,1.05,34]);
  assert.equal(camera.fov,46);
  assert.ok(camera.near>0&&camera.far>60);
});

test('world wetness is a scalar support bake tied to the hero camera',()=>{
  const provenance=JSON.parse(readFileSync('public/textures/wetness-provenance.json','utf8'));
  assert.equal(provenance.source,'reference/wetness.png');
  assert.deepEqual(provenance.camera,JSON.parse(readFileSync('src/hero-camera.json','utf8')));
  const png=readFileSync('public/textures/wetness-world.png');
  assert.equal(png.readUInt32BE(16),512);
  assert.equal(png.readUInt32BE(20),4096);
  assert.equal(png[25],0,'Wetness must be grayscale scalar data, not beauty imagery.');
});
