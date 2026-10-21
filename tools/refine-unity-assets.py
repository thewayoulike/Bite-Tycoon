"""Run with official Blender in background; source models remain untouched."""
import bpy, bmesh, json, math
import shutil
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "UnityComparison/Assets/Prototype/Art"
OUT = ROOT / "artifacts/unity-setup"
report = {"furniture": [], "characters": []}

# These source GLBs reference a separate palette; preserve its relative path.
food_source = OUT / "free-assets/food/Models/GLB format"
food_destination = ART / "Kenney/Food"
(food_destination / "Textures").mkdir(parents=True, exist_ok=True)
for name in ["apple", "banana", "pear", "carrot"]:
    shutil.copy2(food_source / f"{name}.glb", food_destination / f"{name}.glb")
shutil.copy2(food_source / "Textures/colormap.png", food_destination / "Textures/colormap.png")

def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)

def export(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_animations=False,
                              export_yup=True, export_skins=True, export_all_influences=False)

for name in ["loungeSofa", "tableCoffee", "plantSmall1", "lampRoundFloor", "televisionModern"]:
    clear()
    source = OUT / f"free-assets/furniture/Models/GLTF format/{name}.glb"
    bpy.ops.import_scene.gltf(filepath=str(source))
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        bevel = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        bevel.width = min(.012, max(.0015, max(obj.dimensions) * .009))
        bevel.segments = 3
        bevel.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        normal = obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
        normal.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normal.name)
    export(ART / f"Kenney/Furniture/{name}.glb")
    report["furniture"].append(name)

# Original rounded concierge counter, modelled in Blender for hotel and mall lobbies.
clear()
def material(name, color, rough=.5, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Roughness"].default_value=rough
    p.inputs["Metallic"].default_value=metal
    return m
oak=material("Warm oak",(.32,.17,.08),.52)
stone=material("Warm porcelain",(.77,.74,.65),.24)
bronze=material("Brushed bronze",(.47,.33,.15),.3,.72)
dark=material("Recessed base",(.035,.048,.045),.5)
def box(name,location,size,mat,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    mod=obj.modifiers.new("Rounded edges","BEVEL");mod.width=bevel;mod.segments=4
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new("Face normals","WEIGHTED_NORMAL")
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj
box("Shadow plinth",(0,0,.1),(5.7,1.25,.2),dark)
box("Curved oak reception",(0,0,.68),(5.9,1.4,1.14),oak,.2)
box("Stone counter",(0,0,1.3),(6.1,1.54,.14),stone,.14)
for i in range(51):
    box("Oak fluting",(-2.73+i*.109,-.71,.68),(.042,.05,.95),bronze,.012)
box("Transaction ledge",(.4,.63,.95),(1.7,.35,.08),stone,.03)
export(ART / "Original/conciergeDesk.glb")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"concierge-desk.blend"))

# Covered outfits use a complete body beneath the clothes in the source assets.
# Remove only hidden body faces; retain face, neck, wrists, hands and their rig.
source_dir=ROOT/"public/models/people-preview/cast"
dest=ROOT/"public/models/unity-cast"
dest.mkdir(parents=True,exist_ok=True)
for path in sorted(source_dir.glob("*.glb")):
    clear();bpy.ops.import_scene.gltf(filepath=str(path))
    bodies=[o for o in bpy.context.scene.objects if o.type=="MESH" and o.data.name.split(".")[0]=="base"]
    if len(bodies)!=1:
        raise RuntimeError(f"{path.name}: expected one body, found {len(bodies)}")
    body=bodies[0]
    allowed={g.index for g in body.vertex_groups if any(t in g.name.lower() for t in
             ("head","neck","hand","thumb","index_","middle_","ring_","pinky_","eye"))}
    if not allowed:
        raise RuntimeError(f"{path.name}: missing face/hand weights")
    bm=bmesh.new();bm.from_mesh(body.data);weights=bm.verts.layers.deform.active
    before=len(bm.faces)
    hidden=[f for f in bm.faces if not any(sum(w for i,w in v[weights].items() if i in allowed)>.25 for v in f.verts)]
    bmesh.ops.delete(bm,geom=hidden,context="FACES")
    bm.to_mesh(body.data);bm.free();body.data.update()
    if not 0 < len(body.data.polygons) < before:
        raise RuntimeError(f"{path.name}: invalid body mask")
    export(dest/path.name)
    report["characters"].append({"id":path.stem,"removedHiddenFaces":len(hidden),
                                 "remainingBodyFaces":len(body.data.polygons)})
    (OUT/"blender-refinement.json").write_text(json.dumps(report,indent=2))
print(f"BLENDER_REFINEMENT_COMPLETE: {len(report['furniture'])} props, concierge desk, {len(report['characters'])} covered characters")
