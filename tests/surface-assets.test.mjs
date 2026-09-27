import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('surface authoring preserves a solid mesh and distinct fixed UV coordinates',()=>{
  const data=readFileSync('public/models/locomotive-surfaced.glb');
  const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  const provenance=JSON.parse(readFileSync('public/models/locomotive-surfaced.provenance.json','utf8'));
  assert.equal(hash('public/models/locomotive.glb'),provenance.geometrySha256);
  assert.equal(hash('public/models/locomotive-surfaced.glb'),provenance.runtimeSha256);
  assert.equal(provenance.source,'isolation/delit/locomotive.png');
  assert.ok(provenance.faces>250000&&provenance.painted>0&&provenance.painted<provenance.faces);
  assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
  assert.ok(gltf.images.every(image=>image.bufferView!==undefined&&!image.uri));
  let painted=0;
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    const material=gltf.materials[primitive.material];
    const positions=gltf.accessors[primitive.attributes.POSITION];
    assert.ok(positions.min.every(Number.isFinite)&&positions.max.every(Number.isFinite));
    if(material.name.includes('_refpaint')){
      painted++;
      assert.equal(material.pbrMetallicRoughness.baseColorTexture.texCoord,1);
      assert.ok(primitive.attributes.TEXCOORD_0!==undefined&&primitive.attributes.TEXCOORD_1!==undefined);
      assert.ok(!material.alphaMode||material.alphaMode==='OPAQUE');
    }
  }
  assert.equal(painted,7);
});

test('steam uses the validated existing sixteen-frame reference sequence',()=>{
  const metadata=JSON.parse(readFileSync('public/fx/provenance.json','utf8'));
  assert.equal(metadata.frames,16);assert.equal(metadata.grid,4);assert.equal(metadata.fps,12);
  for(const name of ['plume','flipbook']){
    const image=readFileSync(`public/fx/${name}.webp`);
    assert.equal(image.subarray(0,4).toString(),'RIFF');
    assert.equal(image.subarray(8,12).toString(),'WEBP');
    assert.match(metadata[`${name}Sha256`],/^[a-f0-9]{64}$/);
  }
});
