import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source=resolve('node_modules/three/examples/jsm/libs/draco/gltf');
const destination=resolve('public/draco');
mkdirSync(destination,{recursive:true});
for(const file of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js']) {
  copyFileSync(resolve(source,file),resolve(destination,file));
}
console.log('Prepared local Draco decoders from the pinned Three.js package.');
