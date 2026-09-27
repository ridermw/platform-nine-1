import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HERO } from './config';
import { loadMaterials } from './materials';
import { createStation } from './station';
import { loadModels, placeAssets } from './assets';
import { addLighting, createSteam, createWetPatches } from './atmosphere';
import './style.css';

function element<T extends HTMLElement>(id:string):T {
  const e=document.getElementById(id);
  if(!e) throw new Error(`Missing interface element #${id}`);
  return e as T;
}
const params=new URLSearchParams(location.search);
const capture=params.has('capture');
let ready=false;
const failures:string[]=[];
function fail(error:unknown) {
  const message=error instanceof Error?error.message:String(error);
  failures.push(message);console.error(error);
  element('loading').hidden=true;
  element('error').hidden=false;
  element('error').textContent=`The platform could not be loaded.\n${message}\nPlease reload. If this persists, report the message above.`;
}
window.addEventListener('unhandledrejection',e=>fail(e.reason));

async function boot() {
  const renderer=new THREE.WebGLRenderer({canvas:element<HTMLCanvasElement>('world'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(capture?1:Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.info.autoReset=false;
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL graphics context was lost.'));});
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(HERO.fov,innerWidth/innerHeight,HERO.near,HERO.far);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.enabled=false;controls.maxPolarAngle=Math.PI*.92;
  controls.minDistance=1;controls.maxDistance=60;controls.panSpeed=.5;controls.rotateSpeed=.40;
  const reset=()=>{
    camera.position.set(...HERO.position);camera.fov=HERO.fov;
    controls.target.set(...HERO.target);camera.lookAt(controls.target);camera.updateProjectionMatrix();
    controls.update();
  };
  reset();
  const environment=addLighting(scene);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environmentTarget=pmrem.fromScene(environment,.07,.1,100);
  scene.environment=environmentTarget.texture;scene.environmentIntensity=.32;
  pmrem.dispose();
  const manager=new THREE.LoadingManager();
  manager.onProgress=(url,loaded,total)=>{
    element<HTMLProgressElement>('progress').value=loaded/total;
    element('loading-text').textContent=`Preparing the platform · ${loaded} / ${total}`;
  };
  manager.onError=url=>fail(new Error(`Asset failed: ${url}`));
  const materials=await loadMaterials(manager);
  const models=await loadModels(manager,materials);
  const world=new THREE.Group();
  world.name='Platform Nine world';world.scale.x=-1;
  scene.add(world);
  world.add(createStation(materials));
  const {group}=placeAssets(models,materials);world.add(group);
  const steam=createSteam();world.add(steam.group,createWetPatches());

  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.12,.5,1.4);
  composer.addPass(bloom);composer.addPass(new OutputPass());
  let time=0,last=performance.now(),frames=0;
  const durations:number[]=[];
  let uiVisible=!capture;
  const setUI=(show:boolean)=>{
    uiVisible=show;
    document.querySelectorAll<HTMLElement>('.interface').forEach(e=>e.hidden=!show);
  };
  element('reset').addEventListener('click',reset);
  element('explore').addEventListener('click',()=>{
    controls.enabled=!controls.enabled;
    element('explore').textContent=controls.enabled?'Pause exploration':'Explore the platform';
  });
  element('hide').addEventListener('click',()=>setUI(false));
  window.addEventListener('keydown',event=>{
    if(event.key.toLowerCase()==='r')reset();
    if(event.key.toLowerCase()==='h')setUI(!uiVisible);
    if(event.key==='Escape') { controls.enabled=false;setUI(true);element('explore').textContent='Explore the platform'; }
  });
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  });
  const stats=()=>({
    ready,frames,errors:[...failures],
    meanFPS:durations.length?1000/(durations.reduce((a,b)=>a+b,0)/durations.length):0,
    frameP95:durations.length?[...durations].sort((a,b)=>a-b)[Math.floor(durations.length*.95)]:0,
    triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,
    models:group.children.length,
    camera:{position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,aspect:camera.aspect},
    size:renderer.getSize(new THREE.Vector2()).toArray(),
  });
  Object.assign(window,{platformNine:{
    stats,reset,
    setCamera:(p:[number,number,number],t:[number,number,number],fov:number)=>{
      camera.position.set(...p);controls.target.set(...t);camera.fov=fov;camera.updateProjectionMatrix();controls.update();
    },
    setTime:(t:number)=>{time=t;steam.update(t);},
    setUI,
    scene,camera,renderer,materials,controls,
  }});
  await renderer.compileAsync(scene,camera);
  element('loading').hidden=true;setUI(!capture);ready=true;
  renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(!capture)time+=dt;
    controls.update();steam.update(time);
    const start=performance.now();
    renderer.info.reset();
    composer.render();
    const elapsed=performance.now()-start;
    if(frames>30){durations.push(Math.max(elapsed,dt*1000));if(durations.length>240)durations.shift();}
    frames++;
  });
}
boot().catch(fail);
