import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODEL_NAMES, assetURL, type ModelName, WORLD } from './config';
import { signFace, type Palette } from './materials';

export async function loadModels(manager: THREE.LoadingManager, palette: Palette) {
  const loader=new GLTFLoader(manager);
  const draco=new DRACOLoader(manager);
  draco.setDecoderPath(assetURL('draco/'));draco.setWorkerLimit(2);
  loader.setDRACOLoader(draco);
  const pairs=await Promise.all(MODEL_NAMES.map(async name=>{
    const file=name==='locomotive'?'locomotive-surfaced':name;
    const gltf=await loader.loadAsync(assetURL(`models/${file}.glb`));
    gltf.scene.traverse(node=>{
      if(!(node instanceof THREE.Mesh)) return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      const replacements=materials.map(material=>{
        const label=material.name.replace(/^PN_/,'').replace(/\.\d+$/,'');
        const painted=label.endsWith('_refpaint');
        const key=label.replace(/_refpaint$/,'');
        const replacement=palette[key];
        if(!replacement) throw new Error(`Unknown material ${material.name} in ${name}`);
        if(painted) {
          if(!(material instanceof THREE.MeshStandardMaterial))throw new Error('Surface-authored material must be PBR.');
          material.roughness=replacement.roughness;material.metalness=replacement.metalness;
          material.normalMap=replacement.normalMap;material.normalScale.copy(replacement.normalScale);
          material.roughnessMap=replacement.roughnessMap;
          material.color.copy(replacement.color).multiplyScalar(key==='scarlet'?.32:.65);
          return material;
        }
        material.dispose();
        return name==='lantern'&&key==='enamel'?palette.glow:replacement;
      });
      node.material=replacements.length===1?replacements[0]:replacements;
      node.castShadow=node.receiveShadow=true;
      // Explicit hard edges prevent box faces from shading like inflated cushions.
      if(node.geometry&&name!=='locomotive') node.geometry.computeVertexNormals();
    });
    gltf.scene.name=name;
    return [name,gltf.scene] as const;
  }));
  draco.dispose();
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
  const engine=place('locomotive',[-1.25,0,-.1]);
  engine.scale.y=1.15;
  engine.scale.z=1.24;
  place('tender',[-1.40,0,12.5]);
  for(let i=0;i<4;i++) {
    const carriage=new THREE.LOD();
    carriage.name='Distance-adaptive passenger carriage';
    carriage.addLevel(models.carriage.clone(true),0);
    carriage.addLevel(models['carriage-far'].clone(true),42);
    carriage.position.set(-1.40,0,16.6+i*10.5);group.add(carriage);
  }
  const trolley=place('trolley',[5.95,WORLD.platform,-3.7],-.24,1.0);
  trolley.scale.y=.85;
  for(const z of [1.8,15,28,41,55]) place('bench',[6.58,WORLD.platform,z],-Math.PI/2);
  const sign=place('sign',[5.73,4.91,2.4],0,1.45);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.452,96),signFace(m.enamel.map));
  face.rotation.y=Math.PI;
  face.position.z=-.046;
  sign.add(face);
  const lamps:THREE.PointLight[]=[];
  for(const z of [12,18,28,40,52,64,74]) {
    const hero=z===12,x=hero?5.7:6.8,y=hero?4.45:3.92;
    place('lantern',[x,y,z],Math.PI/2,hero?1.5:1.20);
    const light=new THREE.PointLight('#ffbd6c',5.5,9,2);
    light.position.set(x-.12,y,z);
    group.add(light);lamps.push(light);
  }
  const lampBoom=new THREE.Mesh(new THREE.BoxGeometry(1.13,.028,.038),m.iron);
  lampBoom.position.set(6.85,4.0,12);group.add(lampBoom);
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
  // Printed notices remain surface decals on real framed boards.
  const paper=document.createElement('canvas');paper.width=256;paper.height=640;
  const pc=paper.getContext('2d');
  if(!pc)throw new Error('Could not create station notices.');
  pc.fillStyle='#bba37a';pc.fillRect(0,0,256,640);
  pc.strokeStyle='#3d3325';pc.lineWidth=5;pc.strokeRect(13,13,230,614);
  pc.fillStyle='#302b23';pc.textAlign='center';pc.font='bold 26px Georgia';
  pc.fillText('RAILWAY',128,73);pc.font='14px Georgia';pc.fillText('PASSENGER NOTICE',128,115);
  for(let i=0;i<20;i++)pc.fillRect(32,160+i*19,132+(i%3)*18,2);
  const paperTexture=new THREE.CanvasTexture(paper);paperTexture.colorSpace=THREE.SRGBColorSpace;
  paperTexture.repeat.x=-1;paperTexture.offset.x=1;
  const paperMaterial=new THREE.MeshStandardMaterial({map:paperTexture,roughness:1});
  for(const z of [2.8,9.0,21.4,33.8]) {
    const frame=new THREE.Mesh(new THREE.BoxGeometry(.07,1.14,.40),m.wood);
    frame.position.set(7.14,2.52,z);group.add(frame);
    const notice=new THREE.Mesh(new THREE.PlaneGeometry(.32,1.06),paperMaterial);
    notice.rotation.y=-Math.PI/2;notice.position.set(7.095,2.52,z);group.add(notice);
  }
  const crest=document.createElement('canvas');crest.width=crest.height=512;
  const cc=crest.getContext('2d');
  if(!cc)throw new Error('Could not create carriage insignia.');
  cc.strokeStyle='#bea363';cc.fillStyle='#bea363';cc.lineWidth=7;
  cc.beginPath();cc.arc(256,270,93,0,Math.PI*2);cc.stroke();
  for(let i=0;i<13;i++) {
    const t=Math.PI*.10+i*Math.PI*.066;
    cc.beginPath();cc.ellipse(256+125*Math.cos(t),258+125*Math.sin(t),9,24,-t,0,Math.PI*2);cc.stroke();
  }
  cc.beginPath();cc.moveTo(203,151);cc.lineTo(194,103);cc.lineTo(227,127);cc.lineTo(256,80);
  cc.lineTo(285,127);cc.lineTo(318,103);cc.lineTo(309,151);cc.closePath();cc.stroke();
  const crestTexture=new THREE.CanvasTexture(crest);crestTexture.colorSpace=THREE.SRGBColorSpace;
  const heraldry=new THREE.Mesh(new THREE.PlaneGeometry(.80,1.05),new THREE.MeshStandardMaterial({map:crestTexture,transparent:true,roughness:.5,metalness:.35,depthWrite:false}));
  heraldry.rotation.y=Math.PI/2;heraldry.position.set(-.085,2.42,14.1);group.add(heraldry);
  const clockCanvas=document.createElement('canvas');clockCanvas.width=clockCanvas.height=512;
  const clockCtx=clockCanvas.getContext('2d');
  if(!clockCtx)throw new Error('Could not create station clock.');
  clockCtx.fillStyle='#b8af95';clockCtx.fillRect(0,0,512,512);
  clockCtx.strokeStyle='#252e2c';clockCtx.fillStyle='#252e2c';clockCtx.lineWidth=8;
  clockCtx.beginPath();clockCtx.arc(256,256,240,0,Math.PI*2);clockCtx.stroke();
  for(let i=0;i<12;i++) {
    const t=i*Math.PI/6;
    clockCtx.beginPath();clockCtx.moveTo(256+201*Math.sin(t),256-201*Math.cos(t));
    clockCtx.lineTo(256+226*Math.sin(t),256-226*Math.cos(t));clockCtx.stroke();
  }
  clockCtx.lineWidth=12;clockCtx.beginPath();clockCtx.moveTo(201,174);clockCtx.lineTo(256,256);clockCtx.lineTo(382,224);clockCtx.stroke();
  const clockTexture=new THREE.CanvasTexture(clockCanvas);clockTexture.colorSpace=THREE.SRGBColorSpace;
  clockTexture.repeat.x=-1;clockTexture.offset.x=1;
  const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.30,64),new THREE.MeshStandardMaterial({map:clockTexture,roughness:.55,metalness:.1}));
  clockFace.rotation.y=Math.PI;clockFace.position.set(4.6,3.9,23.95);group.add(clockFace);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.30,.027,10,64),m.black);
  rim.position.set(4.6,3.9,23.96);group.add(rim);
  const bracket=new THREE.Mesh(new THREE.BoxGeometry(2.6,.035,.035),m.iron);
  bracket.position.set(5.9,4.25,24);group.add(bracket);
  const hanger=new THREE.Mesh(new THREE.BoxGeometry(.025,.35,.025),m.iron);
  hanger.position.set(4.6,4.28,24);group.add(hanger);
  return {group,lamps};
}
