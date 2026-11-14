"""Crop supplied iPhone screenshots without repainting their UI.
Usage: python3 scripts/prepare-installation-images.py --source-dir /path/to/screenshots
Requires Pillow. Original files are never modified.
"""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True, type=Path)
parser.add_argument('--output-dir', type=Path, default=Path('public/tutorial/ios'))
args = parser.parse_args()
args.output_dir.mkdir(parents=True, exist_ok=True)
crops = [
 ('IMG_9622.PNG','safari-menu.webp',(20,2500,1270,2740),1250),
 ('IMG_9623.PNG','share-context.webp',(265,1140,1005,1560),900),
 ('IMG_9624.PNG','share-action.webp',(280,1630,975,1768),1000),
 ('IMG_9625.PNG','add-to-home.webp',(36,2330,1253,2760),1217),
 ('IMG_9626.PNG','open-as-app.webp',(15,825,1275,1135),1260),
 ('IMG_9626.PNG','confirm-add.webp',(10,182,1280,752),1270),
]
for source, name, box, max_width in crops:
 with Image.open(args.source_dir/source) as im:
  if im.size != (1290,2796):
   raise ValueError(f'{source}: expected 1290 x 2796, got {im.size}; review crop coordinates first')
  crop = im.convert('RGB').crop(box)
  if crop.width > max_width:
   crop = crop.resize((max_width,round(crop.height*max_width/crop.width)),Image.Resampling.LANCZOS)
  crop.save(args.output_dir/name,'WEBP',quality=91,method=6)
  print(name,crop.size)
