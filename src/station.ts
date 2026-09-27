import * as THREE from 'three';
import { Architecture } from './geometry';
import { WORLD, seededRandom } from './config';
import type { Palette } from './materials';

export function createStation(m: Palette) {
  const root = new THREE.Group();
  root.name = 'Station';
  const a = new Architecture();
  const { wall, edge, platform, roofCenter, roofRadius, roofSpring, roofRise } = WORLD;
  a.box(m.mortar, [(edge+wall)/2,.37,32], [wall-edge,.74,96]);
  a.box(m.ballast, [-1.7,-.08,32], [7,.2,96], 2.3);
  a.box(m.stone, [-7.7,.42,32], [3.5,.84,96], 3);
  const flagstones: THREE.Matrix4[]=[];
  const flagstoneColors: THREE.Color[]=[];
  const pavingRandom=seededRandom(10234);
  for(let z=-14;z<80;) {
    const length=.74+pavingRandom()*.67;
    for(let x=edge+.36;x<wall;) {
      const width=Math.min(.58+pavingRandom()*.70,wall-x);
      const position=new THREE.Vector3(x+width/2,.776+pavingRandom()*.012,z+length/2);
      const matrix=new THREE.Matrix4().compose(position,new THREE.Quaternion(),new THREE.Vector3(width-.017,.092,length-.015));
      const color=new THREE.Color().setScalar(.65+pavingRandom()*.32);
      flagstones.push(matrix);
      flagstoneColors.push(color);
      x+=width;
    }
    z+=length;
  }
  const paving=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),m.slab,flagstones.length);
  paving.name='Individually laid Yorkstone slabs';
  flagstones.forEach((matrix,i)=>{paving.setMatrixAt(i,matrix);paving.setColorAt(i,flagstoneColors[i]);});
  paving.receiveShadow=true;root.add(paving);
  const random = seededRandom();
  // Separate coping stones create a readable silhouette along the platform edge.
  for (let z=-14;z<80;z+=1.05) {
    a.box(m.stone, [edge+.17,.81,z], [.36,.19,1.025], .85);
  }
  for (let z=-14;z<80;z+=.63) {
    a.box(m.wood, [-1.40,.025,z], [2.35,.15,.23], .45);
    for (const x of [-2.117,-.683]) {
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

  const litRooms=Array.from({length:5},(_,i)=>{
    const material=m.interior.clone();
    material.emissiveIntensity=.15+i*.065;
    return material;
  });
  for (const side of [-1,1]) {
    const wx=side===1?wall:-9, ix=wx-side*.24;
    for(let z0=-16;z0<80;z0+=6.2) {
      const windows=side===1
        ? [{center:3.1,r:1.12,bottom:1.26,spring:4.9}]
        : [{center:1.58,r:.76,bottom:1.14,spring:2.94},
           {center:4.55,r:.76,bottom:1.14,spring:2.94},
           {center:1.58,r:.50,bottom:5.03,spring:6.00},
           {center:4.55,r:.50,bottom:5.03,spring:6.00}];
      const wallShape=new THREE.Shape();
      wallShape.moveTo(0,platform);wallShape.lineTo(6.2,platform);
      wallShape.lineTo(6.2,9.5);wallShape.lineTo(0,9.5);wallShape.closePath();
      for(const w of windows) {
        const hole=new THREE.Path();
        hole.moveTo(w.center-w.r,w.bottom);hole.lineTo(w.center-w.r,w.spring);
        hole.absarc(w.center,w.spring,w.r,Math.PI,0,true);
        hole.lineTo(w.center+w.r,w.bottom);hole.closePath();wallShape.holes.push(hole);
        const h=w.spring-w.bottom,cz=z0+w.center;
        const ring:[number,number,number][]=[];
        const frame:[number,number,number][]=[];
        for(let j=0;j<=32;j++) {
          const t=j*Math.PI/32;
          ring.push([ix,w.spring+(w.r+.08)*Math.sin(t),cz+(w.r+.08)*Math.cos(t)]);
          frame.push([ix-side*.055,w.spring+(w.r-.025)*Math.sin(t),cz+(w.r-.025)*Math.cos(t)]);
        }
        a.curve(m.brick,ring,.125,8);a.curve(m.green,frame,.04,8);
        for(let j=0;j<24;j++) {
          const t=j*Math.PI/23;
          a.beam(m.mortar,[ix-side*.05,w.spring+w.r*Math.sin(t),cz+w.r*Math.cos(t)],
            [ix-side*.05,w.spring+(w.r+.20)*Math.sin(t),cz+(w.r+.20)*Math.cos(t)],.006,4);
        }
        a.box(m.stone,[ix,w.bottom-.055,cz],[.50,.17,w.r*2+.34],.7);
        for(const dz of [-w.r,w.r]) {
          a.box(m.green,[ix,w.bottom+h*.5,cz+dz],[.14,h,.09],.5);
        }
        for(let dz=-w.r+.34;dz<w.r;dz+=.34) {
          const top=w.spring+Math.sqrt(w.r*w.r-dz*dz);
          a.box(m.green,[ix-side*.045,(w.bottom+top)*.5,cz+dz],[.085,top-w.bottom,.026],.4);
        }
        for(let y=w.bottom+.44;y<=w.spring;y+=.44) {
          a.box(m.green,[ix-side*.055,y,cz],[.085,.033,w.r*2],.4);
        }
        const glassShape=new THREE.Shape();
        glassShape.moveTo(-w.r,w.bottom);glassShape.lineTo(w.r,w.bottom);
        glassShape.lineTo(w.r,w.spring);glassShape.absarc(0,w.spring,w.r,0,Math.PI,false);glassShape.closePath();
        a.add(new THREE.ShapeGeometry(glassShape,32),m.windowGlass,
          new THREE.Matrix4().makeRotationY(-Math.PI/2).setPosition(wx,0,cz));
        // Recessed, enclosed rooms remain dimensional when the camera moves.
        const room=litRooms[Math.abs(Math.round(z0+w.bottom*3))%litRooms.length];
        const roomHeight=h+w.r+.15,mid=w.bottom+roomHeight/2;
        a.box(room,[wx+side*1.45,mid,cz],[.10,roomHeight,w.r*2+.2],1.2);
        for(const dz of [-w.r-.05,w.r+.05]) a.box(m.wood,[wx+side*.8,mid,cz+dz],[1.6,roomHeight,.09],1);
        for(const y of [w.bottom,w.bottom+roomHeight]) a.box(m.wood,[wx+side*.8,y,cz],[1.6,.08,w.r*2+.15],1);
        for(let y=w.bottom+.65;y<w.spring;y+=1.0) {
          a.box(m.wood,[wx+side*1.02,y,cz],[.7,.06,w.r*1.88],.5);
          for(let j=0;j<7;j++) {
            a.box(j%2?m.leather:m.wood,[wx+side*1.1,y+.18,cz-w.r*.78+j*w.r*.23],[.22,.31,.12],.35);
          }
        }
        if(w.bottom<2) {
          a.beam(m.black,[wx+side*.6,w.spring+.1,cz],[wx+side*.6,w.spring-.33,cz],.012);
          a.box(m.glow,[wx+side*.6,w.spring-.42,cz],[.12,.20,.12],.2);
        }
      }
      const wallGeo=new THREE.ExtrudeGeometry(wallShape,{depth:.48,bevelEnabled:false,curveSegments:24});
      const uv=wallGeo.getAttribute('uv');
      for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.75,uv.getY(i)/2.75);
      a.add(wallGeo,m.brick,new THREE.Matrix4().makeRotationY(-Math.PI/2).setPosition(wx+.24,0,z0));
      a.box(m.brick,[wx-side*.23,4.3,z0+.1],[.46,7.0,.55],1.3);
      for(const y of [1.0,4.35,6.85,7.15]) {
        a.box(m.stone,[wx-side*.22,y,z0+3.1],[.28,.115,6.2],2);
      }
    }
  }

  const roofPoint=(t:number,z:number,dy=0):[number,number,number] =>
    [roofCenter+roofRadius*Math.cos(t),roofSpring+roofRise*Math.sin(t)+dy,z];
  const roofGlass=new THREE.MeshStandardMaterial({
    name:'Sooted roof glass',color:'#91a9c1',map:m.enamel.map,metalness:.25,roughness:.55,
    side:THREE.DoubleSide,transparent:true,opacity:.60,
    emissive:'#80989c',emissiveIntensity:.04,
  });
  const roofOpaque=m.wood.clone();
  roofOpaque.name='Sooted roof boards';roofOpaque.color.set('#b7a78f');roofOpaque.side=THREE.DoubleSide;
  roofOpaque.emissive.set('#3a3022');roofOpaque.emissiveIntensity=.30;
  for(let z=-14;z<=80;z+=6.2) {
    for(const dy of [0,-.60]) {
      a.girder(m.iron,Array.from({length:41},(_,i)=>roofPoint(i*Math.PI/40,z,dy)),.22,.20);
    }
    for(let i=0;i<48;i++) {
      const t0=i*Math.PI/48,t1=(i+1)*Math.PI/48;
      a.beam(m.iron,roofPoint(t0,z),roofPoint(t1,z,-.60),.028,6);
      a.beam(m.iron,roofPoint(t0,z,-.60),roofPoint(t1,z),.022,6);
    }
    for(const x of [roofCenter-roofRadius,roofCenter+roofRadius]) {
      a.beam(m.iron,[x,platform,z],[x,roofSpring,z],.11,12);
      a.box(m.stone,[x,1.02,z],[.43,.48,.43]);
      for(const y of [1.28,5.0,5.25]) a.box(m.iron,[x,y,z],[.38,.12,.38]);
    }
    if(z>=-2) {
      const cx=-4.8,cz=z+6,top=roofSpring+roofRise*Math.sqrt(1-((cx-roofCenter)/roofRadius)**2);
      a.beam(m.iron,[cx,.8,cz],[cx,top-.6,cz],.145,12);
      for(const y of [1.02,1.3,5.60,5.88,6.15]) a.box(m.iron,[cx,y,cz],[.48,.12,.48]);
      for(const direction of [-1,1]) {
        const end=cx+direction*1.5;
        const ey=roofSpring+roofRise*Math.sqrt(1-((end-roofCenter)/roofRadius)**2)-.5;
        a.curve(m.iron,[[cx,5.8,cz],[cx+direction*.18,6.8,cz],
          [cx+direction*.60,ey-.5,cz],[end,ey,cz]],.09,8);
        a.beam(m.iron,[cx,6.5,cz],[end,ey,cz],.040,6);
        for(let i=0;i<5;i++) a.beam(m.iron,[cx,6.7+i*.3,cz],
          [cx+direction*(.25+i*.24),ey-.25+i*.03,cz],.018,6);
      }
    }
    if(z>=79) continue;
    a.girder(m.iron,Array.from({length:31},(_,i)=>roofPoint(.22+i*(Math.PI-.44)/30,z+3.1,-.22)),.18,.14);
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
      if(i>=5&&i<=13) {
        a.beam(m.iron,roofPoint(t0,z),roofPoint(t1,z+6.2),.025,6);
        a.beam(m.iron,roofPoint(t1,z),roofPoint(t0,z+6.2),.025,6);
      }
      if(i>=6&&i<=12) {
        for(let k=1;k<4;k++) {
          a.beam(m.iron,roofPoint(t0,z+k*1.55),roofPoint(t1,z+k*1.55),.020,6);
        }
      }
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
  a.add(new THREE.ShapeGeometry(endShape,48),endGlass,new THREE.Matrix4().makeTranslation(0,0,60));
  for(let x=-8;x<7.4;x+=.65) {
    const h=5.5+5*Math.sqrt(Math.max(0,1-((x+.7)/8.1)**2));
    a.beam(m.iron,[x,.8,59.8],[x,h,59.8],.04);
  }
  for(const y of [2.8,4.8,6.5,8.4]) a.beam(m.iron,[-8,y,59.8],[7,y,59.8],.06);
  // Railings across the opposite platform.
  for(let z=-9;z<71;z+=.28) a.beam(m.iron,[-5.8,.82,z],[-5.8,1.6,z],.019,6);
  a.beam(m.iron,[-5.8,1.58,-9],[-5.8,1.58,71],.035);
  a.finish(root);
  return root;
}
