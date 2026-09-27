import * as THREE from 'three';
import { assetURL } from './config';

export type Palette = Record<string, THREE.MeshStandardMaterial>;

export async function loadMaterials(manager: THREE.LoadingManager): Promise<Palette> {
  const loader = new THREE.TextureLoader(manager);
  const specs: [string, number, number, number][] = [
    ['brick', 0, 1, .26], ['stone', 0, 1, .26], ['ballast', .04, 1, .75],
    ['wood', 0, .95, .24], ['scarlet', .22, 1, .12], ['black', .34, .95, .10],
    ['leather', 0, 1, .28], ['brass', .83, .85, .12], ['green', .48, .92, .18],
    ['cloth', 0, 1, .52], ['enamel', .06, .8, .10], ['soot', .25, 1, .24],
    ['slab', 0, 1, .25],
  ];
  const entries = await Promise.all(specs.map(async ([name, metalness, roughness, normalScale]) => {
    const [map, normalMap, roughnessMap] = await Promise.all([
      loader.loadAsync(assetURL(`textures/${name}.jpg`)),
      loader.loadAsync(assetURL(`textures/${name}-normal.jpg`)),
      loader.loadAsync(assetURL(`textures/${name}-rough.jpg`)),
    ]);
    map.colorSpace = THREE.SRGBColorSpace;
    for (const t of [map, normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if(name==='black') t.repeat.set(1.5,1.5);
      if(name==='leather') t.repeat.set(2,2);
    }
    const material = new THREE.MeshStandardMaterial({
      name, map, normalMap, roughnessMap, metalness, roughness,
      normalScale: new THREE.Vector2(normalScale, normalScale),
    });
    return [name, material] as const;
  }));
  const materials = Object.fromEntries(entries);
  materials.black.color.setScalar(.8);
  materials.stone.color.set('#aaa391');
  materials.steel = materials.black.clone();
  materials.steel.color.setScalar(2.7);
  materials.steel.roughness = .60;
  materials.glass = new THREE.MeshStandardMaterial({
    color: '#1b261c', metalness: .20, roughness: .36,
    side: THREE.DoubleSide, emissive: '#a86c27', emissiveIntensity: .22,
  });
  materials.interior = materials.wood.clone();
  materials.interior.color.set('#9b6c43');
  materials.interior.emissive.set('#d08b35');
  materials.interior.emissiveIntensity = .10;
  materials.windowGlass = new THREE.MeshPhysicalMaterial({
    name:'Weathered window glass',color:'#8e9e87',metalness:.20,roughness:.21,
    transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,
    normalMap:materials.black.normalMap,normalScale:new THREE.Vector2(.008,.008),
  });
  materials.iron = materials.green.clone();
  materials.iron.color.set('#adb9b5');
  materials.iron.emissive.set('#172827');
  materials.iron.emissiveIntensity=.24;
  materials.iron.metalness = .72;
  materials.mortar = new THREE.MeshStandardMaterial({ color: '#6f6658', roughness: 1 });
  materials.glow = new THREE.MeshStandardMaterial({
    color: '#e8bb77', emissive: '#ffbf65', emissiveIntensity: .75, roughness: .35,
  });
  return materials;
}

export function signFace(enamel: THREE.Texture | null) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas textures are unavailable.');
  ctx.fillStyle = '#dfc89c';
  ctx.fillRect(0, 0, 1024, 1024);
  const image = enamel?.image;
  if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
    ctx.drawImage(image, 0, 0, 1024, 1024);
  }
  const stain = ctx.createRadialGradient(512, 512, 285, 512, 512, 515);
  stain.addColorStop(0, '#23150b00');
  stain.addColorStop(1, '#23150baf');
  ctx.fillStyle = stain;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = '#393025';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(512, 512, 480, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#171715';
  ctx.textAlign = 'center';
  ctx.font = 'bold 720px Georgia, serif';
  ctx.fillText('9', 410, 781);
  ctx.font = '340px Georgia, serif';
  ctx.fillText('3', 759, 434);
  ctx.fillText('4', 759, 794);
  ctx.fillRect(658, 474, 204, 12);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .57, metalness: .08 });
}
