import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_NAMES, assetURL, type ModelName, WORLD } from './config';
import { signFace, type Palette } from './materials';

export async function loadModels(manager: THREE.LoadingManager, palette: Palette) {
  const loader=new GLTFLoader(manager);
  const pairs=await Promise.all(MODEL_NAMES.map(async name=>{
    const gltf=await loader.loadAsync(assetURL(`models/${name}.glb`));
    gltf.scene.traverse(node=>{
      if(!(node instanceof THREE.Mesh)) return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      const replacements=materials.map(material=>{
        const key=material.name.replace(/^PN_/,'').replace(/\.\d+$/,'');
        const replacement=palette[key];
        if(!replacement) throw new Error(`Unknown material ${material.name} in ${name}`);
        material.dispose();
        return name==='lantern'&&key==='enamel'?palette.glow:replacement;
      });
      node.material=replacements.length===1?replacements[0]:replacements;
      node.castShadow=node.receiveShadow=true;
      // Explicit hard edges prevent box faces from shading like inflated cushions.
      if(node.geometry) node.geometry.computeVertexNormals();
    });
    gltf.scene.name=name;
    return [name,gltf.scene] as const;
  }));
  return Object.fromEntries(pairs) as Record<ModelName,THREE.Group>;
}

export function placeAssets(models:Record<ModelName,THREE.Group>, m:Palette) {
  const group=new THREE.Group();
  group.name='Hero assets';
  function place(name:ModelName,p:[number,number,number],rotation=0,scale=1) {
    const obj=models[name].clone(true);
    obj.position.set(...p);obj.rotation.y=rotation;obj.scale.setScalar(scale);
    group.add(obj);
    return obj;
  }
  const engine=place('locomotive',[.15,0,-.1]);
  engine.scale.y=1.15;
  place('tender',[0,0,10.2]);
  for(let i=0;i<5;i++) place('carriage',[0,0,14.3+i*10.5]);
  place('trolley',[6.35,WORLD.platform,-2.0],-.24,.98);
  for(const z of [3.9,15,28,41,55]) place('bench',[6.58,WORLD.platform,z],-Math.PI/2);
  const sign=place('sign',[6.06,4.71,.85],0,1.10);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.452,96),signFace(m.enamel.map));
  face.rotation.y=Math.PI;
  face.position.z=-.046;
  sign.add(face);
  const lamps:THREE.PointLight[]=[];
  for(const z of [1.9,9.5,21.9,34.3,46.7,59.1,71.5]) {
    place('lantern',[7.0,3.92,z],-Math.PI/2,1.20);
    const light=new THREE.PointLight('#ffbd6c',11,9,2);
    light.position.set(6.80,3.92,z);
    group.add(light);lamps.push(light);
  }
  // Smaller luggage by the benches.
  for(const [x,z] of [[6.52,2.7],[6.6,13.3],[6.48,27.3]]) {
    const luggage=new THREE.Group();
    const shell=new THREE.Mesh(new THREE.BoxGeometry(.48,.74,.27),m.leather);
    shell.position.y=.37;shell.castShadow=shell.receiveShadow=true;luggage.add(shell);
    for(const xx of [-.17,.17]) {
      const strap=new THREE.Mesh(new THREE.BoxGeometry(.025,.75,.285),m.brass);
      strap.position.set(xx,.37,0);luggage.add(strap);
    }
    luggage.position.set(x,WORLD.platform,z);luggage.rotation.y=.1;group.add(luggage);
  }
  // Original numerals and decoration are authored decals on real geometry.
  const plate=document.createElement('canvas');plate.width=512;plate.height=256;
  const ctx=plate.getContext('2d');
  if(!ctx) throw new Error('Could not create locomotive number plate.');
  ctx.fillStyle='#14191a';ctx.fillRect(0,0,512,256);
  ctx.strokeStyle='#bfa46b';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(256,128,243,112,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#c6ae76';ctx.font='190px Georgia';ctx.textAlign='center';ctx.fillText('8',256,194);
  const tex=new THREE.CanvasTexture(plate);tex.colorSpace=THREE.SRGBColorSpace;
  const number=new THREE.Mesh(new THREE.PlaneGeometry(.28,.14),new THREE.MeshStandardMaterial({map:tex,metalness:.4,roughness:.5}));
  number.rotation.y=Math.PI;number.position.set(0,2.33,.27);group.add(number);
  return {group,lamps};
}
