"""Original, lightweight city architecture. Run with Blender --background --python."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"UnityComparison/Assets/Prototype/Art/Original/City"
SOURCE=ROOT/"artifacts/unity-setup/city-architecture"
OUT.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
report=[]

def material(name,hexcolor,rough=.65,metal=0,alpha=1):
    values=[int(hexcolor[i:i+2],16)/255 for i in (0,2,4)]
    values=[((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in values]
    m=bpy.data.materials.new(name);m.diffuse_color=(*values,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*values,1)
    p.inputs["Roughness"].default_value=rough;p.inputs["Metallic"].default_value=metal;p.inputs["Alpha"].default_value=alpha
    return m

def reset():
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    for data in (bpy.data.meshes,bpy.data.materials):
        for item in list(data):
            if item.users==0:data.remove(item)
    return {
      "brick":material("Terracotta brick","9d6553"),"buff":material("Buff brick","bdac8b"),
      "siding":material("Painted siding","aab7b5"),"ivory":material("Ivory trim","e4dfcf"),
      "slate":material("Slate roof","454d52"),"metal":material("Dark metal","293d40",.38,.55),
      "wood":material("Cedar timber","916f4c"),"window":material("Window glass","405d68",.15,.35),
      "clear":material("Clear storefront glazing","a1c5cb",.08,.05,.16),
      "stone":material("Limestone","d1c8b3"),"gold":material("Brass hardware","ae986c",.28,.7),
      "leaf":material("Planter leaves","526c48"),"solar":material("Solar panels","3d596a",.22,.45)}

def pos(p):return (p[0],-p[2],p[1])
def box(name,p,size,mat,bevel=0,tilt=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(p))
    o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new("Soft architectural edges","BEVEL");mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new("Weighted architectural normals","WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.rotation_euler[1]=tilt
    # World-scale planar UVs retain masonry detail when Unity assigns its brick texture.
    uv=o.data.uv_layers.active or o.data.uv_layers.new()
    for face in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
        for loop in face.loop_indices:
            v=o.data.vertices[o.data.loops[loop].vertex_index].co
            uv.data[loop].uv=(v[axes[0]]/2,v[axes[1]]/2)
    return o

def polygon(name,points,faces,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([pos(p) for p in points],[],faces);mesh.materials.append(mat)
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o

def gable(x,z,w,d,y,rise,m):
    half=w/2+.2
    for side in (-1,1):
        box("Sloping slate roof",(x+side*half/2,y+rise/2,z),(math.hypot(half,rise),.12,d+.45),m["slate"],.015,side*math.atan2(rise,half))
    for side in (-1,1):
        zz=z+side*d/2
        points=[(xx,yy,zz+depth) for depth in (-.08,.08) for xx,yy in [(x-w/2,y),(x+w/2,y),(x,y+rise)]]
        wall=polygon("Solid gable end",points,[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],m["ivory"])
        bm=bmesh.new();bm.from_mesh(wall.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(wall.data);bm.free()
    box("Ridge cap",(x,y+rise+.04,z),(.15,.12,d+.5),m["slate"])

def window(x,y,z,w,h,m,side=False):
    size=(.14,h+.2,w+.2) if side else (w+.2,h+.2,.14)
    box("Window surround",(x,y,z),size,m["ivory"])
    face=(.045,h,w) if side else (w,h,.045)
    sign=-1 if side==-1 else 1
    box("Window glass",(x+(.09*sign if side else 0),y,z-(0 if side else .09)),face,m["window"])
    box("Window mullion",(x+(.12*sign if side else 0),y,z-(0 if side else .12)),(.05,h,.05),m["ivory"])
    box("Window transom",(x+(.12*sign if side else 0),y+.12,z-(0 if side else .12)),(.05,.055,w) if side else (w,.055,.05),m["ivory"])
    box("Window sill",(x,y-h/2-.13,z),(.32,.10,w+.36) if side else (w+.36,.10,.32),m["ivory"])

def house(name,style):
    m=reset();w=6.2 if style!=2 else 5.2;d=7.3
    height=[5.8,3.1,8.0,5.8,4.5][style]
    wall=m["brick"] if style in (1,2) else m["siding"]
    box("Foundation",(0,.18,0),(w+.25,.36,d+.25),m["stone"],.03)
    box("House walls",(0,height/2+.35,0),(w,height,d),wall,.035)
    if style in (0,4):
        for n in range(int(height/.32)):
            y=.5+n*.32
            for side in (-1,1):
                box("Clapboard lap",(0,y,side*(d/2+.025)),(w,.035,.055),m["siding"])
                box("Side clapboard lap",(side*(w/2+.025),y,0),(.055,.035,d),m["siding"])
    floors=[2,1,3,2,1][style]
    for floor in range(floors):
        y=1.9+floor*2.65
        for x in (-w*.28,w*.28):
            if floor==0 and x>0:continue
            window(x,y,-d/2-.03,1.35,1.45,m)
        for z in (-2,1.4):
            for side in (-1,1):window(side*(w/2+.02),y,z,1.2,1.3,m,side)
        box("Storey band",(0,.45+(floor+1)*2.65,-d/2-.04),(w+.08,.12,.12),m["ivory"])
    doorx=w*.27
    box("Front entrance",(doorx,1.35,-d/2-.12),(1.1,2.1,.12),m["metal"])
    box("Door lintel",(doorx,2.47,-d/2-.17),(1.3,.14,.18),m["ivory"])
    box("Entrance steps",(doorx,.19,-d/2-.65),(1.8,.36,1.05),m["stone"],.03)
    box("Brass door handle",(doorx+.35,1.35,-d/2-.23),(.035,.32,.06),m["gold"])
    if style in (0,2,4):
        box("Entrance canopy",(doorx,2.72,-4.15),(1.9,.14,1.3),m["slate"],.025)
        for side in (-1,1):
            box("Canopy bracket",(doorx+side*.7,2.43,-3.95),(.06,.5,.06),m["metal"])
    if style==2:
        for y in (3.05,5.7,8.3):box("Townhouse masonry cornice",(0,y,-3.76),(w+.2,.16,.3),m["stone"],.02)
    if style in (0,4):
        gable(0,0,w,d,height+.35,1.6 if style==0 else 2.0,m)
        box("Brick chimney",(-w*.3,height+1.2,1.8),(.55,2,.65),m["brick"])
    elif style==1:
        y=height+.35
        polygon("Hipped roof",[(-3.4,y,-3.9),(3.4,y,-3.9),(3.4,y,3.9),(-3.4,y,3.9),(-1,y+1.7,0),(1,y+1.7,0)],
          [(4,5,1,0),(5,2,1),(5,4,3,2),(4,0,3)],m["slate"])
        box("Covered bungalow porch",(0,2.9,-4.1),(w+.3,.16,1.5),m["slate"],.04)
        for x in (-2.6,2.6):box("Porch column",(x,1.5,-4.65),(.14,2.8,.14),m["ivory"])
    else:
        box("Flat roof cornice",(0,height+.52,0),(w+.4,.24,d+.4),m["ivory"],.035)
        for x in (-w/2,w/2):box("Roof parapet",(x,height+.77,0),(.13,.5,d),m["slate"])
        if style==3:
            box("Balcony slab",(0,3.1,-4.05),(w,.16,1.1),m["stone"],.025)
            for x in (-2.8,0,2.8):box("Balcony post",(x,3.65,-4.55),(.055,1,.055),m["metal"])
            box("Balcony glass",(0,3.62,-4.52),(5.6,.8,.035),m["window"])
            for x in (-1.6,1.1):box("Roof solar",(x,height+.75,0),(2.1,.13,3.1),m["solar"])
    if style==4:
        box("Bay window projection",(-1.6,1.7,-3.95),(2.25,2.15,.7),m["ivory"],.02)
        window(-1.6,1.8,-4.32,1.8,1.45,m)
        gable(-1.6,-.5,2.5,1.3,height+.75,.85,m)
    finish(name)

def business(name,style,market=False):
    m=reset();w=17.6;d=16
    upper=style in (0,2);height=7.7 if upper else 6.2 if style==3 else 4.5
    wall=m["brick"] if style==0 else m["wood"] if style==1 else m["stone"]
    box("Stone foundation",(0,.22,0),(w+.3,.4,d+.3),m["stone"],.04)
    for x in (-w/2,w/2):box("Side wall",(x,height/2+.4,0),(.24,height,d),wall,.025)
    box("Rear wall",(0,height/2+.4,d/2),(w,height,.24),wall,.025)
    for x in (-8.6,-5.5,5.5,8.6):box("Street pilaster",(x,2.4,-8.05),(.25,4.0,.26),m["ivory"],.02)
    box("Storefront fascia",(0,4.0,-8.12),(w, .65,.3),m["wood"] if style==1 else m["metal"],.025)
    # Clear ground-floor glazing matches the real restaurant and supermarket rooms.
    for left,right in [(-8.5,-5.5),(-5.5,-2),(-2,2),(2,5.5),(5.5,8.5)]:
        x=(left+right)/2
        box("Clear storefront glazing",(x,2.0,-8.08),(right-left-.12,3.1,.035),m["clear"])
        box("Window mullion",(left,2.0,-8.13),(.07,3.25,.08),m["metal"])
    for x in (-.12,.12):box("Entry pull handle",(x,1.65,-8.22),(.04,.8,.06),m["gold"])
    box("Threshold",(0,.44,-8.45),(2.7,.12,.65),m["stone"],.025)
    if upper:
        box("Upper street wall",(0,(4.4+height+.4)/2,-8),(w,height-4.0,.25),wall,.03)
        box("Floor cornice",(0,4.5,-8.15),(w+.35,.24,.45),m["ivory"],.035)
        for x in (-6.8,-3.4,0,3.4,6.8):window(x,6.05,-8.18,1.45,1.75,m)
    if style==3:
        for side in (-1,1):
            box("Floating roof wing",(side*4.5,height+.7,0),(9.3,.22,d+.9),m["ivory"],.04,side*.065)
        for x in range(-8,9,2):
            box("Clerestory glazing",(x,5.3,-8.08),(1.88,1.8,.035),m["clear"])
            box("Clerestory frame",(x-.94,5.3,-8.14),(.055,1.85,.07),m["metal"])
        for x in (-8.4,8.4):
            box("Stone entrance pier",(x,3.2,-8.45),(.5,6.3,.5),m["stone"],.045)
        box("Cantilever canopy",(0,3.55,-9.0),(17.7,.18,2.4),m["metal"],.035)
        for x in range(-8,9):
            box("Canopy timber soffit",(x,3.41,-9.0),(.3,.08,2.3),m["wood"])
    elif style==0 and market:
        # A low market hall with three roof lanterns gives a different skyline.
        for x in (-5.8,0,5.8):gable(x,0,5.7,d,height+.4,1.35,m)
    else:
        box("Roof cap",(0,height+.48,0),(w+.4,.22,d+.4),m["slate"],.035)
        for x in (-8.7,8.7):box("Roof parapet",(x,height+.85,0),(.18,.65,d),m["ivory"],.025)
        if style==2:
            for x in (-8.2,-4.1,4.1,8.2):
                box("Deco facade fin",(x,height/2+.5,-8.38),(.32,height+.4,.2),m["ivory"],.03)
            box("Stepped crown",(0,height+.9,-7.5),(5,.8,1.1),m["stone"],.04)
    if style==1:
        box("Timber entrance canopy",(0,3.5,-8.8),(17.9,.18,1.7),m["wood"],.035)
        for x in range(-8,9,2):box("Canopy slat",(x,3.66,-8.8),(.12,.18,1.9),m["metal"])
        for x in (-6,0,6):box("Rooflight",(x,height+.65,1.4),(3.8,.15,5),m["solar"],.025)
    else:
        for x in (-5.6,5.6):box("Canvas awning",(x,3.48,-8.65),(5.1,.13,1.25),m["ivory"],.02)
    for x in (-7.8,7.8):
        box("Street planter",(x,.8,-8.85),(.85,.85,.75),m["wood"],.05)
        box("Clipped shrubs",(x,1.36,-8.85),(.72,.5,.64),m["leaf"],.12)
    for x in (-5,5):
        box("Rooftop plant",(x,height+.85,5),(1.6,.65,1.2),m["metal"],.04)
        for j in range(4):box("Vent louvre",(x,height+.65+j*.13,4.38),(1.4,.045,.04),m["ivory"])
    finish(name)

def finish(name):
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    # Join by material: six to ten draws per model instead of one per window.
    groups={}
    for obj in meshes:groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for key,objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        bpy.context.object.name=key
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f"{name}.blend"))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f"{name}.glb"),export_format="GLB",export_animations=False,export_yup=True)
    report.append({"name":name,"vertices":sum(len(o.data.vertices) for o in bpy.context.scene.objects if o.type=="MESH"),"materials":len(groups)})

for style,name in enumerate(["gableHome","gardenBungalow","brickTownhouse","modernHouse","bayCottage"]):house(name,style)
for style,name in enumerate(["brickBistro","timberRestaurant","decoRestaurant","pavilionRestaurant"]):business(name,style)
for style,name in enumerate(["marketHall","timberMarket","cityMarket","pavilionMarket"]):business(name,style,True)
(SOURCE/"report.json").write_text(json.dumps(report,indent=2))
print("CITY_ARCHITECTURE_READY",json.dumps(report))
