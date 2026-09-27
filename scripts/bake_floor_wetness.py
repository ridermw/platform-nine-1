"""Bake a scalar support mask into fixed world-space material coordinates.

Only the supplied wetness pass is sampled. No beauty/reference colour pixels
are projected onto geometry or included in the runtime.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageFilter


def build_mask(root):
    root=Path(root)
    camera=json.loads((root/"src/hero-camera.json").read_text())
    source=root/".dream-loop/reference/wetness.png"
    image=np.array(Image.open(source).convert("L"),dtype=float)/255
    height,width=image.shape
    position=np.array(camera["position"],dtype=float)
    forward=np.array(camera["target"],dtype=float)-position
    forward/=np.linalg.norm(forward)
    right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right)
    up=np.cross(right,forward)
    x,z=np.meshgrid(np.linspace(-1.7,-7.4,512),np.linspace(-8,60,4096))
    points=np.stack([x,np.full_like(x,.838),z],axis=-1)-position
    depth=points@forward
    tangent=np.tan(np.deg2rad(camera["fov"]*.5))
    with np.errstate(divide="ignore",invalid="ignore"):
        u=((points@right)/depth/(tangent*16/9)*.5+.5)*(width-1)
        v=(.5-(points@up)/depth/tangent*.5)*(height-1)
    valid=(depth>.1)&np.isfinite(u)&np.isfinite(v)&(u>=0)&(u<width-1)&(v>=0)&(v<height-1)
    safe_u=np.clip(np.nan_to_num(u),0,width-2)
    safe_v=np.clip(np.nan_to_num(v),0,height-2)
    x0=safe_u.astype(int);y0=safe_v.astype(int)
    du=safe_u-x0;dv=safe_v-y0
    sample=(image[y0,x0]*(1-du)*(1-dv)+image[y0,x0+1]*du*(1-dv)
            +image[y0+1,x0]*(1-du)*dv+image[y0+1,x0+1]*du*dv)
    sample=np.where(valid,sample,0)
    output=Image.fromarray((np.clip(sample,0,1)*255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.4))
    output.save(root/"public/textures/wetness-world.png")
    provenance={"source":"reference/wetness.png","sourceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
                "camera":camera,"worldBounds":{"x":[-1.7,-7.4],"z":[-8,60],"y":.838},
                "meaning":"Scalar water coverage for roughness and reflection alpha only; no beauty pixels."}
    (root/"public/textures/wetness-provenance.json").write_text(json.dumps(provenance,indent=2)+"\n")


if __name__=="__main__":
    build_mask(Path(__file__).resolve().parents[1])
