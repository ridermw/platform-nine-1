import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const names=['locomotive','tender','carriage','trolley','bench','sign','lantern'];
for(const name of names) {
  test(`${name} is a complete isolated GLB, not a reference-image stand-in`,()=>{
    const buffer=readFileSync(`public/models/${name}.glb`);
    assert.equal(buffer.readUInt32LE(0),0x46546c67);
    assert.equal(buffer.readUInt32LE(4),2);
    assert.equal(buffer.readUInt32LE(8),buffer.length);
    const jsonLength=buffer.readUInt32LE(12);
    const gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString());
    assert.equal(gltf.scenes.length,1);
    assert.ok(gltf.meshes.length>=3);
    assert.ok(gltf.nodes.every(node=>node.name.startsWith(`${name}_`)));
    assert.equal(gltf.images,undefined,'Models must not carry projected target imagery.');
    for(const mesh of gltf.meshes) {
      for(const p of mesh.primitives) {
        const position=gltf.accessors[p.attributes.POSITION];
        assert.ok(position.count>=3);
        assert.ok(position.min.every(Number.isFinite));
        assert.ok(position.max.every(Number.isFinite));
        assert.ok(p.attributes.NORMAL!==undefined);
        assert.ok(p.attributes.TEXCOORD_0!==undefined);
      }
    }
  });
}
test('all thirteen prepared materials have maps and provenance',()=>{
  const materials=JSON.parse(readFileSync('public/textures/provenance.json','utf8'));
  assert.equal(materials.length,13);
  for(const material of materials) {
    assert.match(material.sourceSha256,/^[a-f0-9]{64}$/);
    for(const file of material.files) assert.ok(existsSync(`public/textures/${file}`));
  }
});
test('runtime uses the Pages subpath and never fetches private reference files',()=>{
  const config=readFileSync('vite.config.js','utf8');
  assert.ok(config.includes("'/platform-nine-1/'"));
  const assetCode=readFileSync('src/config.ts','utf8');
  assert.ok(assetCode.includes('import.meta.env.BASE_URL'));
  for(const file of ['main.ts','assets.ts','station.ts','materials.ts','atmosphere.ts']) {
    assert.doesNotMatch(readFileSync(`src/${file}`,'utf8'),/target\.png|reference\/|\.dream-loop/);
  }
});
