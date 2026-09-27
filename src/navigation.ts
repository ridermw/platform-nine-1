import * as THREE from 'three';

/** Drag-to-look walking remains on the platform, outside the train and props. */
export class Navigation {
  enabled=false;
  private keys=new Set<string>();
  private pointer:number|null=null;
  private last=new THREE.Vector2();
  private rotation=new THREE.Euler(0,0,0,'YXZ');
  private direction=new THREE.Vector3();
  private right=new THREE.Vector3();
  private up=new THREE.Vector3(0,1,0);

  constructor(private camera:THREE.PerspectiveCamera, canvas:HTMLCanvasElement) {
    canvas.addEventListener('pointerdown',event=>{
      if(!this.enabled)return;
      this.pointer=event.pointerId;this.last.set(event.clientX,event.clientY);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.enabled||this.pointer!==event.pointerId)return;
      this.rotation.y-=(event.clientX-this.last.x)*.0022;
      this.rotation.x=THREE.MathUtils.clamp(this.rotation.x-(event.clientY-this.last.y)*.0022,-.75,1.25);
      this.camera.quaternion.setFromEuler(this.rotation);
      this.last.set(event.clientX,event.clientY);
    });
    const release=()=>{this.pointer=null;};
    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',release);
    canvas.addEventListener('wheel',event=>{
      if(!this.enabled)return;
      event.preventDefault();this.move(-event.deltaY*.003,0);
    },{passive:false});
    window.addEventListener('keydown',event=>{
      if(!this.enabled)return;
      const key=event.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        this.keys.add(key);event.preventDefault();
      }
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur',()=>{this.keys.clear();release();});
  }

  setEnabled(value:boolean) {
    this.enabled=value;this.keys.clear();this.pointer=null;
    this.rotation.setFromQuaternion(this.camera.quaternion,'YXZ');
  }

  update(dt:number) {
    if(!this.enabled)return;
    const forward=Number(this.keys.has('w')||this.keys.has('arrowup'))-Number(this.keys.has('s')||this.keys.has('arrowdown'));
    const sideways=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));
    const length=Math.hypot(forward,sideways)||1;
    this.move(forward/length*dt*2.2,sideways/length*dt*2.2);
  }

  private move(forward:number,sideways:number) {
    if(!forward&&!sideways)return;
    this.camera.getWorldDirection(this.direction);
    this.direction.y=0;this.direction.normalize();
    this.right.crossVectors(this.direction,this.up).normalize();
    const next=this.camera.position.clone().addScaledVector(this.direction,forward).addScaledVector(this.right,sideways);
    next.x=THREE.MathUtils.clamp(next.x,-6.95,-2.05);
    next.z=THREE.MathUtils.clamp(next.z,-8.1,55);
    const trolley=next.x<-5.0&&next.z>-4.9&&next.z<-3.0;
    const benches=[1.8,15,28,41,55].some(z=>next.x<-5.85&&Math.abs(next.z-z)<1.18);
    if(!trolley&&!benches) this.camera.position.copy(next);
  }
}
