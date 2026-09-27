import * as THREE from 'three';
import { Architecture } from './geometry';
import { WORLD, seededRandom } from './config';
import type { Palette } from './materials';

export function createStation(m: Palette) {
  const root = new THREE.Group();
  root.name = 'Station';
  const a = new Architecture();
  const { wall, edge, platform, roofCenter, roofRadius, roofSpring, roofRise } = WORLD;
  a.box(m.mortar, [4.65,.37,32], [5.7,.74,96]);
  a.box(m.ballast, [-1.7,-.08,32], [7,.2,96], 2.3);
  a.box(m.stone, [-7.7,.42,32], [3.5,.84,96], 3);
  a.box(m.stone, [4.7,.77,32], [5.7,.12,96], 3.1);
  const random = seededRandom();
  // Separate coping stones create a readable silhouette along the platform edge.
  for (let z=-14;z<80;z+=1.05) {
    a.box(m.stone, [edge+.17,.81,z], [.36,.19,1.025], .85);
    a.box(m.enamel, [edge+.47,.838,z], [.08,.01,.97], 1);
  }
  for (let z=-14;z<80;z+=.63) {
    a.box(m.wood, [0,.025,z], [2.35,.15,.23], .45);
    for (const x of [-.717,.717]) {
      a.box(m.black, [x,.115,z], [.20,.06,.34], .5);
      a.box(m.steel, [x,.205,z], [.073,.08,.66], .7);
      for (const side of [-1,1]) {
        a.box(m.black, [x+side*.081,.155,z], [.027,.05,.045]);
      }
    }
  }
  // Loose ballast is instanced over the flat aggregate bed for true near-field relief.
  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0), m.ballast, 3400);
  const dummy = new THREE.Object3D();
  for (let i=0;i<3400;i++) {
    dummy.position.set(-3.6+random()*5.3,.02+random()*.045,-13+random()*47);
    dummy.scale.set(.035+random()*.09,.025+random()*.045,.04+random()*.10);
    dummy.rotation.set(random()*3,random()*6,random()*3);
    dummy.updateMatrix();
    stones.setMatrixAt(i,dummy.matrix);
    stones.setColorAt(i,new THREE.Color().setScalar(.6+random()*.5));
  }
  stones.receiveShadow = true;
  stones.name = 'Individual ballast stones';
  root.add(stones);

  for (const side of [-1,1]) {
    const wx = side===1 ? wall : -9;
    for (let z0=-14;z0<80;z0+=6.2) {
      const center=3.1, radius=1.12, spring=4.9, bottom=1.26;
      const shape=new THREE.Shape();
      shape.moveTo(0,platform);
      shape.lineTo(6.2,platform); shape.lineTo(6.2,9.5); shape.lineTo(0,9.5); shape.closePath();
      const hole=new THREE.Path();
      hole.moveTo(center-radius,bottom);
      hole.lineTo(center-radius,spring);
      hole.absarc(center,spring,radius,Math.PI,0,true);
      hole.lineTo(center+radius,bottom); hole.closePath();
      shape.holes.push(hole);
      const geo=new THREE.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:false,curveSegments:24});
      const uv=geo.getAttribute('uv');
      for(let j=0;j<uv.count;j++) uv.setXY(j,uv.getX(j)/2.9,uv.getY(j)/2.9);
      a.add(geo,m.brick,new THREE.Matrix4().makeRotationY(-Math.PI/2).setPosition(wx+.18,0,z0));
      const ix=wx-side*.22;
      for(const dz of [-1.22,1.22]) {
        a.box(m.stone,[ix,3.08,z0+center+dz],[.22,3.8,.18],.6);
      }
      const arch: [number,number,number][]=[];
      for(let j=0;j<=32;j++) {
        const t=j*Math.PI/32;
        arch.push([ix,spring+1.25*Math.sin(t),z0+center+1.25*Math.cos(t)]);
      }
      a.curve(m.brick,arch,.12,8);
      // Radial voussoirs emphasize the masonry arch rather than a painted cutout.
      for(let j=0;j<24;j++) {
        const t=j*Math.PI/23;
        a.beam(m.mortar,[ix-.03,spring+1.13*Math.sin(t),z0+center+1.13*Math.cos(t)],
          [ix-.03,spring+1.37*Math.sin(t),z0+center+1.37*Math.cos(t)],.008,4);
      }
      a.box(m.stone,[ix,1.22,z0+center],[.45,.18,2.75],.8);
      for(const dz of [-1.05,0,1.05]) {
        a.box(m.green,[ix-side*.025,3.13,z0+center+dz],[.12,3.75,.062],.5);
      }
      for(const y of [1.34,2.17,3.06,3.95,4.85]) {
        a.box(m.green,[ix-side*.035,y,z0+center],[.12,.060,2.16],.5);
      }
      const glassShape=new THREE.Shape();
      glassShape.moveTo(-1.06,bottom);glassShape.lineTo(1.06,bottom);
      glassShape.lineTo(1.06,spring);glassShape.absarc(0,spring,1.06,0,Math.PI,false);glassShape.closePath();
      const glass=new THREE.ShapeGeometry(glassShape,32);
      a.add(glass,m.glass,new THREE.Matrix4().makeRotationY(-Math.PI/2).setPosition(wx+.07,0,z0+center));
      const top:[number,number,number][]=[];
      for(let j=0;j<=24;j++) {
        const t=j*Math.PI/24;
        top.push([ix,spring+1.06*Math.sin(t),z0+center+1.06*Math.cos(t)]);
      }
      a.curve(m.green,top,.041,8);
      for(const y of [2.5,4.2,6.75]) {
        a.box(m.brick,[wx-side*.21,y,z0+.18],[.36,.18,.45],.3);
      }
      // Wall piers and cornice mouldings.
      a.box(m.brick,[wx-side*.18,4.3,z0+.12],[.38,7.0,.45],1.3);
      a.box(m.stone,[wx-side*.22,7.72,z0+3.1],[.25,.14,6.2],2);
    }
  }

  const roofPoint=(t:number,z:number,dy=0):[number,number,number] =>
    [roofCenter+roofRadius*Math.cos(t),roofSpring+roofRise*Math.sin(t)+dy,z];
  const roofGlass=new THREE.MeshStandardMaterial({
    name:'Sooted roof glass',color:'#617574',metalness:.25,roughness:.55,
    side:THREE.DoubleSide,transparent:true,opacity:.60,
    emissive:'#80989c',emissiveIntensity:.13,
  });
  const roofOpaque=m.wood.clone();
  roofOpaque.name='Sooted roof boards';roofOpaque.color.set('#414340');roofOpaque.side=THREE.DoubleSide;
  for(let z=-14;z<=80;z+=6.2) {
    for(const dy of [0,-.30]) {
      a.curve(m.iron,Array.from({length:41},(_,i)=>roofPoint(i*Math.PI/40,z,dy)),.075,8);
    }
    for(let i=0;i<32;i++) {
      const t0=i*Math.PI/32,t1=(i+1)*Math.PI/32;
      a.beam(m.iron,roofPoint(t0,z),roofPoint(t1,z,-.30),.022,6);
      a.beam(m.iron,roofPoint(t0,z,-.30),roofPoint(t1,z),.018,6);
    }
    for(const x of [roofCenter-roofRadius,roofCenter+roofRadius]) {
      a.beam(m.iron,[x,platform,z],[x,roofSpring,z],.11,12);
      a.box(m.stone,[x,1.02,z],[.43,.48,.43]);
      for(const y of [1.28,5.0,5.25]) a.box(m.iron,[x,y,z],[.38,.12,.38]);
    }
    if(z>=79) continue;
    for(let i=0;i<20;i++) {
      const t0=i*Math.PI/20,t1=(i+1)*Math.PI/20;
      a.beam(m.iron,roofPoint(t0,z),roofPoint(t0,z+6.2),.036,6);
      const p=[roofPoint(t0,z),roofPoint(t1,z),roofPoint(t1,z+6.2),roofPoint(t0,z+6.2)];
      const panel=new THREE.BufferGeometry();
      panel.setAttribute('position',new THREE.Float32BufferAttribute(p.flat(),3));
      panel.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,3,0,3],2));
      panel.setIndex([0,1,2,0,2,3]);panel.computeVertexNormals();
      a.add(panel,i>=6&&i<=12?roofGlass:roofOpaque);
      a.beam(m.iron,roofPoint(t0,z+3.1),roofPoint(t1,z+3.1),.022,6);
      if(i%3===0) a.beam(m.iron,roofPoint(t0,z),roofPoint(t1,z+6.2),.018,6);
    }
  }
  // Arched, gridded end wall lets the cool daylight define the vanishing point.
  const endShape=new THREE.Shape();
  endShape.moveTo(-8.8,.8);endShape.lineTo(7.4,.8);endShape.lineTo(7.4,5.5);
  endShape.absellipse(-.7,5.5,8.1,5,0,Math.PI,false,0);endShape.closePath();
  const endGlass=new THREE.MeshStandardMaterial({
    name:'Distant daylight',color:'#a2b8bc',emissive:'#a2b8bc',emissiveIntensity:.85,roughness:1,
    side:THREE.DoubleSide,
  });
  a.add(new THREE.ShapeGeometry(endShape,48),endGlass,new THREE.Matrix4().makeTranslation(0,0,77));
  for(let x=-8;x<7.4;x+=.65) {
    const h=5.5+5*Math.sqrt(Math.max(0,1-((x+.7)/8.1)**2));
    a.beam(m.iron,[x,.8,76.8],[x,h,76.8],.04);
  }
  for(const y of [2.8,4.8,6.5,8.4]) a.beam(m.iron,[-8,y,76.8],[7,y,76.8],.06);
  // Railings across the opposite platform.
  for(let z=-9;z<71;z+=.28) a.beam(m.iron,[-5.8,.82,z],[-5.8,1.6,z],.019,6);
  a.beam(m.iron,[-5.8,1.58,-9],[-5.8,1.58,71],.035);
  a.finish(root);
  return root;
}
