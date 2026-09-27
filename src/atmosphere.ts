import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { seededRandom, WORLD } from './config';

export function createSteam() {
  const group=new THREE.Group();
  group.name='Translucent steam';
  const random=seededRandom(1923);
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Could not create steam texture.');
  const image=ctx.createImageData(128,128);
  const noise=new ImprovedNoise();
  for(let y=0;y<128;y++) for(let x=0;x<128;x++) {
    const dx=(x-64)/62,dy=(y-64)/62,r=dx*dx+dy*dy;
    const cloud=.50+.28*noise.noise(x/19,y/19,1.4)+.13*noise.noise(x/8,y/8,2.1);
    const alpha=Math.max(0,1-r)**2*Math.max(0,cloud)*.48;
    const i=(y*128+x)*4;
    image.data[i]=image.data[i+1]=image.data[i+2]=224;image.data[i+3]=alpha*255;
  }
  ctx.putImageData(image,0,0);
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
        (p.low?1.14+age*.42+Math.sin(i*3.7+time*.4)*.12:Math.sin(i*2.3+age*4)*age*.26-age*.3)-1.4,
        p.low?y:y+.68,
        p.low?1.7+(i%20)*.31+age*.8:1.2+age*2.0+Math.cos(i*1.7)*age*.24,
      );
      const size=p.low?.55+age*.8:.35+age*2.4;
      p.sprite.scale.set(size,size*1.15,1);
      p.sprite.material.opacity=(p.low?.23:.82)*Math.sin(age*Math.PI);
      p.sprite.material.rotation=p.seed*6+age*.8;
    }
  }
  update(0);
  return {group,update};
}

export function addLighting(scene:THREE.Scene) {
  scene.background=new THREE.Color('#b4bec0');
  scene.fog=new THREE.FogExp2('#6d7e81',.012);
  scene.add(new THREE.HemisphereLight('#b9cfde','#413227',1.3));
  const key=new THREE.DirectionalLight('#ffdc9e',1.2);
  key.position.set(5,13,26);key.target.position.set(-1,0,2);
  key.castShadow=true;
  key.shadow.mapSize.set(4096,4096);
  Object.assign(key.shadow.camera,{left:-16,right:16,top:20,bottom:-20,near:1,far:75});
  key.shadow.normalBias=.025;key.shadow.bias=-.00010;
  scene.add(key,key.target);
  const fill=new THREE.DirectionalLight('#e9c99e',2.0);
  fill.position.set(-4,7,-8);scene.add(fill);
  const back=new THREE.DirectionalLight('#e0ecf2',.20);
  back.position.set(2,10,78);scene.add(back);
  RectAreaLightUniformsLib.init();
  const bouncedWindow=new THREE.RectAreaLight('#ebbe87',5.5,4,4);
  bouncedWindow.position.set(-5.5,5.0,4.8);bouncedWindow.lookAt(1.4,2.5,4.8);scene.add(bouncedWindow);
  const broadSkylight=new THREE.RectAreaLight('#b5c6d3',3.0,7,14);
  broadSkylight.position.set(-.5,8,7);broadSkylight.lookAt(0,0,7);scene.add(broadSkylight);
  const frontBounce=new THREE.RectAreaLight('#c5d1d7',6,4,5);
  frontBounce.position.set(-3.5,6,-5);frontBounce.lookAt(1.25,3.0,.5);scene.add(frontBounce);
  const lateSun=new THREE.RectAreaLight('#eabd77',4,3,7);
  lateSun.position.set(-2,8,42);lateSun.lookAt(-3,1,10);scene.add(lateSun);

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

export function createWetPatches(wetness:THREE.Texture) {
  const group=new THREE.Group();
  group.name='Localized wet stone reflections';
  const geometry=new THREE.PlaneGeometry(WORLD.wall-WORLD.edge,68);
  const reflector=new Reflector(geometry,{
    textureWidth:1024,textureHeight:1024,color:0x9f957e,clipBias:.004,multisample:0,
  });
  const reflect=reflector.onBeforeRender;
  reflector.onBeforeRender=function(renderer,scene,camera,geometry,material,group) {
    if(!scene.overrideMaterial)reflect.call(this,renderer,scene,camera,geometry,material,group);
  };
  const material=reflector.material;
  if(!(material instanceof THREE.ShaderMaterial))throw new Error('Reflector shader contract changed.');
  material.transparent=true;material.depthWrite=false;
  material.uniforms.floorWetness={value:wetness};
  material.vertexShader=material.vertexShader
    .replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vWaterUv;')
    .replace('void main() {','void main() { vWaterUv = vec2(uv.x,1.0-uv.y);');
  material.fragmentShader=material.fragmentShader
    .replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vWaterUv; uniform sampler2D floorWetness;')
    .replace('vec4 base = texture2DProj( tDiffuse, vUv );',
      `vec2 st = vUv.xy / vUv.w;
       vec2 d = vec2(0.0025);
       vec4 base = (texture2D(tDiffuse, st) * 2.0
         + texture2D(tDiffuse, st+d) + texture2D(tDiffuse, st-d)
         + texture2D(tDiffuse, st+vec2(d.x,-d.y))
         + texture2D(tDiffuse, st+vec2(-d.x,d.y))) / 6.0;`)
    .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
      `float water=texture2D(floorWetness,vWaterUv).r;
       gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.40*smoothstep(0.15,0.85,water) );`);
  reflector.rotation.x=-Math.PI/2;
  reflector.position.set((WORLD.edge+WORLD.wall)/2,WORLD.platform+.038,26);
  group.add(reflector);
  return group;
}

export function createLightShafts() {
  const group=new THREE.Group();group.name='Skylight scattering';
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:new THREE.Color('#c7c2a9')}},
    vertexShader:`varying vec2 vBeamUv;
      void main(){vBeamUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vBeamUv;uniform vec3 tint;
      void main(){
        float across=pow(max(0.0,1.0-abs(vBeamUv.x*2.0-1.0)),2.4);
        float along=smoothstep(0.0,0.12,vBeamUv.y)*(1.0-smoothstep(0.60,1.0,vBeamUv.y));
        gl_FragColor=vec4(tint,across*along*0.14);
      }`,
  });
  for(const z of [10,16.2,22.4,28.6]) {
    const start=new THREE.Vector3(-2,10.0,z),end=new THREE.Vector3(4.3,1.0,z+7);
    const length=start.distanceTo(end);
    const shaft=new THREE.Mesh(new THREE.PlaneGeometry(2.5,length),material);
    shaft.position.copy(start).add(end).multiplyScalar(.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),start.clone().sub(end).normalize());
    group.add(shaft);
  }
  return group;
}
