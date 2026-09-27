"""Package the already-provided, alpha-validated steam references."""
from pathlib import Path
import json
import hashlib
from PIL import Image


def prepare(root):
    root=Path(root)
    source=root/".dream-loop/reference/companion/steam"
    output=root/"public/fx"
    output.mkdir(parents=True,exist_ok=True)
    metadata={"source":"reference/companion/steam","grid":4,"frames":16,"fps":12}
    for name,size in [("plume",(768,1152)),("flipbook",(1024,1024))]:
        check=json.loads((source/f"{name}.check.json").read_text())
        if check["verdict"]!="pass":
            raise ValueError(f"{name} failed its source alpha check")
        file=source/f"{name}.png"
        Image.open(file).convert("RGBA").resize(size).save(output/f"{name}.webp",quality=95,method=6)
        metadata[f"{name}Sha256"]=hashlib.sha256(file.read_bytes()).hexdigest()
    (output/"provenance.json").write_text(json.dumps(metadata,indent=2)+"\n")


if __name__=="__main__":
    prepare(Path(__file__).resolve().parents[1])
