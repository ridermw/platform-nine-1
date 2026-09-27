import * as THREE from 'three';
import { seededRandom, WORLD } from './config';

export function createSteam() {
  const group=new THREE.Group();
  group.name='Translucent steam';
  const random=seededRandom(1923);
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Could not create steam texture.');
  const gradient=ctx.createRadialGradient(64,64,2,64,64,61);
  gradient.addColorStop(0,'rgba(221,223,219,0.32)');
  gradient.addColorStop(.35,'rgba(211,216,212,0.22)');
  gradient.addColorStop(1,'rgba(207,214,212,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  const particles:{sprite:THREE.Sprite;seed:number;low:boolean}[]=[];
  for(let i=0;i<95;i++) {
    const low=i>=42;
    const mat=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:low?.19:.32,color:low?'#b2b4ac':'#b7b6ae',fog:true});
    const sprite=new THREE.Sprite(mat);
    group.add(sprite);particles.push({sprite,seed:random(),low});
  }
  function update(time:number) {
    for(const [i,p] of particles.entries()) {
      const age=(p.seed+time*(p.low?.048:.068))%1;
      const y=p.low?.75+age*.9:4.66+age*4.4;
      p.sprite.position.set(
        p.low?1.14+age*.42+Math.sin(i*3.7+time*.4)*.12:Math.sin(i*2.3+age*4)*age*.26-age*.3,
        y,
        p.low?1.7+(i%20)*.31+age*.8:1.2+age*2.0+Math.cos(i*1.7)*age*.24,
      );
      const size=p.low?.55+age*.8:.34+age*1.25;
      p.sprite.scale.set(size,size*1.15,1);
      p.sprite.material.opacity=(p.low?.24:.52)*Math.sin(age*Math.PI);
      p.sprite.material.rotation=p.seed*6+age*.8;
    }
  }
  update(0);
  return {group,update};
}

export function addLighting(scene:THREE.Scene) {
  scene.background=new THREE.Color('#86999d');
  scene.fog=new THREE.FogExp2('#6d7e81',.012);
  scene.add(new THREE.HemisphereLight('#b9cfde','#413227',1.3));
  const key=new THREE.DirectionalLight('#ffdc9e',2.3);
  key.position.set(5,13,26);key.target.position.set(-1,0,2);
  key.castShadow=true;
  key.shadow.mapSize.set(4096,4096);
  Object.assign(key.shadow.camera,{left:-16,right:16,top:20,bottom:-20,near:1,far:75});
  key.shadow.normalBias=.025;key.shadow.bias=-.00010;
  scene.add(key,key.target);
  const fill=new THREE.DirectionalLight('#e9c99e',1.4);
  fill.position.set(-4,7,-8);scene.add(fill);
  const back=new THREE.DirectionalLight('#e0ecf2',.35);
  back.position.set(2,10,78);scene.add(back);

  // Low-frequency station-shaped environment gives metal meaningful window highlights.
  const environment=new THREE.Scene();
  environment.background=new THREE.Color('#293c42');
  const wall=new THREE.Mesh(new THREE.BoxGeometry(30,20,40),new THREE.MeshBasicMaterial({color:'#253c44',side:THREE.BackSide}));
  environment.add(wall);
  for(const x of [-7,7]) {
    for(let z=-12;z<=12;z+=6) {
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(2,5),new THREE.MeshBasicMaterial({color:x===7?'#c98b4d':'#9bb8c3',side:THREE.DoubleSide}));
      panel.position.set(x,3,z);panel.rotation.y=Math.PI/2;environment.add(panel);
    }
  }
  const roof=new THREE.Mesh(new THREE.PlaneGeometry(6,30),new THREE.MeshBasicMaterial({color:'#b6c9d1',side:THREE.DoubleSide}));
  roof.rotation.x=Math.PI/2;roof.position.y=9;environment.add(roof);
  return environment;
}

export function createWetPatches() {
  const group=new THREE.Group();
  const material=new THREE.MeshPhysicalMaterial({
    color:'#38372e',metalness:.30,roughness:.16,transparent:true,opacity:.65,
    clearcoat:1,clearcoatRoughness:.06,depthWrite:false,
  });
  const random=seededRandom(612);
  for(let i=0;i<22;i++) {
    const shape=new THREE.Shape();
    for(let j=0;j<=40;j++) {
      const t=j*Math.PI*2/40, r=.75+.16*Math.sin(j*2.3+i)+random()*.08;
      const x=r*Math.cos(t),y=r*Math.sin(t)*.3;
      if(j===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    const puddle=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),material);
    puddle.rotation.x=-Math.PI/2;puddle.position.set(2.7+random()*2.8,WORLD.platform+.033,-3+i*3.1);
    puddle.scale.setScalar(.3+random()*.6);
    group.add(puddle);
  }
  return group;
}
