import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Point = [number, number, number];

export class Architecture {
  private batches = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, material: THREE.Material, transform?: THREE.Matrix4) {
    if (transform) geometry.applyMatrix4(transform);
    if (geometry.index) {
      const expanded = geometry.toNonIndexed();
      geometry.dispose();
      geometry = expanded;
    }
    if (!geometry.getAttribute('uv')) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
    }
    const current = this.batches.get(material) ?? [];
    current.push(geometry);
    this.batches.set(material, current);
  }

  box(material: THREE.Material, position: Point, size: Point, textureScale = 1, rotationY = 0) {
    const g = new THREE.BoxGeometry(...size);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4);
      const width = face < 2 ? size[2] : size[0];
      const height = face >= 2 && face < 4 ? size[2] : size[1];
      uv.setXY(i, uv.getX(i) * width / textureScale, uv.getY(i) * height / textureScale);
    }
    const matrix = new THREE.Matrix4().makeRotationY(rotationY).setPosition(...position);
    this.add(g, material, matrix);
  }

  beam(material: THREE.Material, from: Point, to: Point, radius = .04, sides = 8) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const g = new THREE.CylinderGeometry(radius, radius, dir.length(), sides);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.add(g, material, new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5), q, new THREE.Vector3(1,1,1)));
  }

  curve(material: THREE.Material, points: Point[], radius = .04, sides = 8) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    this.add(new THREE.TubeGeometry(curve, Math.max(16, points.length * 3), radius, sides, false), material);
  }

  girder(material: THREE.Material, points: Point[], depth=.32, width=.21) {
    const profile=[
      [-.5,-.5],[.5,-.5],[.5,-.36],[.09,-.36],[.09,.36],[.5,.36],
      [.5,.5],[-.5,.5],[-.5,.36],[-.09,.36],[-.09,-.36],[-.5,-.36],
    ];
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const count=Math.max(points.length*3,20);
    for(let i=0;i<=count;i++) {
      const t=i/count,p=curve.getPoint(t),tangent=curve.getTangent(t);
      const normal=new THREE.Vector3(tangent.y,-tangent.x,0).normalize();
      for(const [u,v] of profile) {
        vertices.push(p.x+normal.x*v*depth,p.y+normal.y*v*depth,p.z+u*width);
        uv.push(u+.5,t*16);
      }
      if(i) for(let j=0;j<12;j++) {
        const k=(j+1)%12,a=(i-1)*12+j,b=(i-1)*12+k,c=i*12+k,d=i*12+j;
        indices.push(a,b,c,a,c,d);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
    const flat=geo.toNonIndexed();flat.computeVertexNormals();geo.dispose();
    this.add(flat,material);
  }

  finish(parent: THREE.Group) {
    for (const [material, parts] of this.batches) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error(`Failed merging architecture material ${material.name}`);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `Architecture_${material.name}`;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      for (const part of parts) part.dispose();
    }
    this.batches.clear();
  }
}
