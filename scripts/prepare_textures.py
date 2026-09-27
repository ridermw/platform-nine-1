"""Prepare portable colour and inferred micro-surface maps from existing atlases."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np
import json
import hashlib

root=Path(__file__).resolve().parents[1]
out=root/"public/textures"
out.mkdir(parents=True,exist_ok=True)
names={"masonry":["brick","stone","ballast","wood"],
       "hero":["scarlet","black","leather","brass"],
       "details":["green","cloth","enamel","soot"]}
manifest=[]
for atlas, materials in names.items():
    source=root/".dream-loop/generated"/f"{atlas}.png"
    image=Image.open(source).convert("RGB")
    w,h=image.size
    for i,name in enumerate(materials):
        x,y=(i%2)*w//2,(i//2)*h//2
        crop=image.crop((x,y,x+w//2,y+h//2)).resize((1024,1024))
        if name=="green":
            crop=crop.crop((48,48,415,435)).resize((1024,1024))
        crop.save(out/f"{name}.jpg",quality=91)
        height=np.array(ImageOps.grayscale(crop.filter(ImageFilter.GaussianBlur(.7))),dtype=float)/255
        dx=(np.roll(height,1,1)-np.roll(height,-1,1))*2.0
        dy=(np.roll(height,1,0)-np.roll(height,-1,0))*2.0
        normal=np.stack([dx,dy,np.ones_like(dx)],axis=-1)
        normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
        Image.fromarray(((normal*.5+.5)*255).astype("uint8")).save(out/f"{name}-normal.jpg",quality=90)
        base={"stone":.63,"scarlet":.48,"black":.60,"brass":.45,"leather":.70,"cloth":.95}.get(name,.8)
        rough=np.clip(base+(height-height.mean())*.35,0,1)
        Image.fromarray((rough*255).astype("uint8")).save(out/f"{name}-rough.jpg",quality=90)
        manifest.append({"id":name,"source":f"{atlas}.png","sourceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
                         "normal":"Inferred micro-height gradients; not measured surface normals.",
                         "files":[f"{name}.jpg",f"{name}-normal.jpg",f"{name}-rough.jpg"]})
(out/"provenance.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(f"Prepared {len(manifest)} material sets.")
