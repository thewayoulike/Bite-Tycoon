"""Import downloaded art into UnityComparison only, preserving Unity GUIDs.

Demo scripts/scenes and alternate render-pipeline copies are not needed by the
existing game. Only data assets and the included URP upgrade packages are used.
"""
import io
import json
import os
import sys
from pathlib import Path, PurePosixPath
import tarfile

ROOT = Path(__file__).resolve().parent.parent
PROJECT = (ROOT / "UnityComparison").resolve()
CACHE = Path(os.environ["APPDATA"]) / "Unity/Asset Store-5.x"
if PROJECT.parent != ROOT or not (PROJECT / "ProjectSettings").is_dir():
    raise RuntimeError("The isolated comparison project must exist first.")

ALLOWED = {".fbx", ".obj", ".mtl", ".prefab", ".mat", ".png", ".jpg", ".jpeg",
           ".tga", ".tif", ".tiff", ".psd", ".exr", ".hdr", ".asset",
           ".txt", ".md", ".pdf", ".shader", ".shadergraph", ".shadersubgraph",
           ".hlsl", ".cginc", ".compute", ".ttf", ".otf", ".anim", ".controller"}
report = []

def unpack(fileobj, label, only_urp=False):
    with tarfile.open(fileobj=fileobj, mode="r:gz") as archive:
        members = {item.name: item for item in archive.getmembers() if item.isfile()}
        records = []
        for name, item in members.items():
            if not name.endswith("/pathname"):
                continue
            path = archive.extractfile(item).read().decode("utf-8-sig").splitlines()[0].rstrip("\0")
            logical = PurePosixPath(path)
            if ".." in logical.parts or ":" in path or "\\" in path or logical.is_absolute():
                raise RuntimeError("Unsafe package path: " + path)
            if not path.startswith("Assets/"):
                continue  # Asset packs must not replace this game's project/package settings.
            guid = name.rsplit("/", 1)[0]
            records.append((path, guid))
        nested = []
        written = 0
        skipped = []
        for path, guid in records:
            suffix = PurePosixPath(path).suffix.lower()
            asset = members.get(guid + "/asset")
            metadata = members.get(guid + "/asset.meta")
            if suffix == ".unitypackage":
                if "urp" in path.lower() and asset and ("EasyRoads3D/" not in path or "URP_17_2_0" in path):
                    nested.append((path, archive.extractfile(asset).read()))
                continue
            if only_urp or (suffix and suffix not in ALLOWED):
                skipped.append(path)
                continue
            target = (PROJECT / path).resolve()
            if not target.is_relative_to(PROJECT / "Assets"):
                raise RuntimeError("Asset escaped the comparison project.")
            if asset:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(asset).read())
            else:
                target.mkdir(parents=True, exist_ok=True)
            if metadata:
                Path(str(target) + ".meta").write_bytes(archive.extractfile(metadata).read())
            written += 1
        report.append({"package": label, "imported": written, "skipped": skipped})
        for path, contents in nested:
            unpack(io.BytesIO(contents), label + " / " + Path(path).name)

for package in sorted(CACHE.rglob("*.unitypackage")):
    if len(sys.argv)>1 and package.stem not in sys.argv[1:]:
        continue
    # Only the packs requested/downloaded for this comparison are imported.
    if package.stem not in {
        "Free Food - Breakfast Time", "Fast Food Restaurant Kit",
        "Table pack - 3D Low Poly Office Furniture - Created with FastMesh Asset",
        "RPG Food Drinks Pack", "Coffee Shop Environment", "Food Pack Free Demo",
        "CITY package", "EasyRoads3D Free v3", "Apartment Kit",
        "Cute Low Poly Kitchen Pack - Colorful Interior Props",
        "EmbersStorm - Free Air Vehicles Planes Helicopters Fighter Jets Pack",
        "Urban building", "European Forests - Realistic Trees",
        "UK Terraced Houses Pack FREE", "Low Poly Road Vehicles Free Package",
        "Lowpoly Holiday House", "FREE Industrial buildingGarage",
        "Old Rowboat", "HQ Motorboats"
    }:
        continue
    with package.open("rb") as stream:
        unpack(stream, package.stem, only_urp=package.stem == "Coffee Shop Environment")
    print("Imported art: " + package.stem, flush=True)
out = ROOT / "artifacts/unity-comparison/import-report.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2), encoding="utf-8")
