"""Create labelled visual inventories without generating new artwork."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json

root = Path(__file__).resolve().parents[1]
files = sorted((root / ".dream-loop/reference").rglob("*.png"))
files += sorted((root / ".dream-loop/generated").glob("*.png"))
out = root / ".dream-loop/previews"
out.mkdir(parents=True, exist_ok=True)
inventory = []
for offset in range(0, len(files), 12):
    sheet = Image.new("RGB", (1600, 1020), "#333333")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(files[offset:offset + 12]):
        image = Image.open(path)
        label = str(path.relative_to(root / ".dream-loop"))
        inventory.append({"path": label, "size": image.size, "mode": image.mode})
        thumb = ImageOps.contain(image.convert("RGBA"), (388, 296))
        x = (index % 4) * 400 + 6
        y = (index // 4) * 340 + 25
        sheet.paste(thumb, (x + (388-thumb.width)//2, y + (296-thumb.height)//2), thumb)
        draw.text((x, y-20), label, fill="white")
    sheet.save(out / f"references-{offset//12+1}.jpg", quality=93)
(out / "reference-inventory.json").write_text(json.dumps(inventory, indent=2) + "\n")
print(f"Inventoried {len(inventory)} images across {(len(inventory)+11)//12} sheets.")
