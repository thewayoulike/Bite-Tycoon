"""Original, unbranded neighborhood vehicles. Run with Blender --background --python.
Meshes use real metre proportions and named wheel pivots; GLB is the runtime asset.
"""
import bpy, bmesh, math, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/street-assets'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,rough=.5,metal=0,emit=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if name=='paint':p.inputs['Coat Weight'].default_value=.6;p.inputs['Coat Roughness'].default_value=.18
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=.15
 return m
M={
 'paint':material('paint',(.34,.4,.46),.25,.55),
 'glass':material('glass',(.045,.085,.10),.12,.42),
 'trim':material('trim',(.022,.025,.027),.72,.05),
 'metal':material('metal',(.52,.56,.58),.26,.78),
 'headlights':material('headlights',(.91,.95,1),.22,.15,True),
 'taillights':material('taillights',(.52,.006,.007),.26,.15,True),
 'rubber':material('rubber',(.018,.02,.023),.87,0),
 'wheel':material('wheel',(.65,.65,.65),.52,.25)
}
wm=M['wheel'];n=wm.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color';wm.node_tree.links.new(n.outputs['Color'],wm.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
parts={};current='';wheel_parts=[]
def finish(o,category,smooth=False):
 o.data.materials.append(M[category]);parts.setdefault(category,[]).append(o)
 if smooth:
  for p in o.data.polygons:p.use_smooth=True
 return o
def mesh(name,vertices,faces,category,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in vertices],[],faces);data.update()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 return finish(o,category,smooth)
def box(name,p,size,category,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Panel normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,category)
def tube(name,a,b,r,category,segments=8):
 a,b=Vector(xyz(a)),Vector(xyz(b));d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return finish(o,category,True)
def loft(name,rings,category):
 n=len(rings[0]);vertices=[p for ring in rings for p in ring];faces=[]
 for s in range(len(rings)-1):
  for i in range(n):faces.append((s*n+i,s*n+(i+1)%n,(s+1)*n+(i+1)%n,(s+1)*n+i))
 faces.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))]);return mesh(name,vertices,faces,category)
def combine(objects,name,parent):
 if not objects:return None
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.parent=parent;return o
manifest=[]
for kind in ['sedan','hatchback','suv']:
 parts={};root=bpy.data.objects.new(kind,None);bpy.context.collection.objects.link(root)
 suv=kind=='suv';hatch=kind=='hatchback';length=4.55 if not hatch else 4.05;width=.90 if not suv else .97
 axle=1.37 if not hatch else 1.20;radius=.35 if not suv else .39;base=.29 if not suv else .37;belt=1.03 if not suv else 1.17;roof=1.47 if not suv else 1.76
 root['wheelRadius']=radius;root['vehicleType']=kind
 rings=[]
 for i in range(97):
  z=-length/2+i*length/96;edge=abs(z)/(length/2);w=width*(1-.10*edge**7);top=belt-.115*edge**4
  dist=min(abs(z-axle),abs(z+axle));arch=radius+.055
  bottom=radius+math.sqrt(max(0,arch*arch-dist*dist)) if dist<arch else base
  rings.append([(0,top+.028,z),(.72*w,top+.015,z),(.96*w,top-.025,z),(w,top-.105,z),(w*.999,bottom+.025,z),(.965*w,bottom,z),(-.965*w,bottom,z),(-w*.999,bottom+.025,z),(-w,top-.105,z),(-.96*w,top-.025,z),(-.72*w,top+.015,z)])
 loft('Sculpted body and wheel arches',rings,'paint')
 rear_roof=-1.13 if hatch or suv else -.7;rear_base=-1.63 if hatch or suv else -1.4;front_roof=.28;front_base=1.03 if not hatch else .93
 cabin=[]
 for z,w,y in [(rear_base,width*.90,belt),(rear_roof,width*.79,roof-.02),(front_roof,width*.78,roof-.035),(front_base,width*.92,belt)]:
  cabin.append([(-width*.96,belt-.018,z),(-w,y-.028,z),(0,y+.023,z),(w,y-.028,z),(width*.96,belt-.018,z)])
 loft('Tinted cabin glazing',cabin,'glass')
 # Thin curved roof skin, with the glass remaining visible beneath the pillars.
 roofrings=[]
 for i in range(13):
  t=i/12;z=rear_roof-.018+t*(front_roof-rear_roof+.036);y=roof+math.sin(t*math.pi)*.022;w=width*(.802-.015*t)
  roofrings.append([(-w,y-.025,z),(-w*.8,y+.004,z),(0,y+.025,z),(w*.8,y+.004,z),(w,y-.025,z),(w,y-.043,z),(-w,y-.043,z)])
 loft('Curved roof',roofrings,'paint')
 for side in [-1,1]:
  # Structural A/C pillars and a black B pillar; narrow bright window edging.
  tube('Front pillar',(side*width*.94,belt,front_base),(side*width*.79,roof,front_roof),.035,'paint')
  tube('Rear pillar',(side*width*.94,belt,rear_base),(side*width*.80,roof,rear_roof),.045,'paint')
  tube('Centre pillar',(side*width*.968,belt,-.32),(side*width*.801,roof,-.32),.032,'trim')
  tube('Window sill',(side*width*.972,belt+.003,rear_base),(side*width*.972,belt+.003,front_base),.012,'metal')
  tube('Lower body sill',(side*width*.985,base+.014,-axle+.37),(side*width*.985,base+.014,axle-.37),.024,'trim')
  for z in [-.35,.78]:tube('Door seam',(side*width*1.002,base+.11,z),(side*width*1.002,belt-.13,z),.0045,'trim',5)
  for z in [-.58,.51]:box('Recessed door handle',(side*width*1.007,belt-.16,z),(.026,.031,.16),'metal',.011)
  tube('Mirror arm',(side*width*.97,belt+.03,.80),(side*(width+.10),belt+.06,.70),.024,'trim')
  box('Painted wing mirror',(side*(width+.105),belt+.10,.68),(.18,.115,.15),'paint',.04)
  box('Mirror glass',(side*(width+.105),belt+.10,.60),(.145,.075,.009),'metal',.014)
  box('LED headlamp housing',(side*.63,belt-.145,length/2-.018),(.43,.105,.045),'trim',.035)
  box('LED daytime lamp',(side*.63,belt-.126,length/2+.009),(.365,.028,.022),'headlights',.01)
  box('Headlamp lens',(side*.69,belt-.167,length/2+.008),(.22,.044,.022),'headlights',.01)
  box('Rear lamp',(side*.68,belt-.09,-length/2+.016),(.40,.07,.045),'taillights',.02)
  box('Rear reflector',(side*.67,base+.12,-length/2+.015),(.18,.025,.025),'taillights',.01)
  if suv:tube('Roof rail',(side*.68,roof+.065,rear_roof+.1),(side*.68,roof+.065,front_roof-.03),.021,'metal')
 for end in [-1,1]:
  box('Bumper valence',(0,base+.10,end*(length/2-.012)),(width*1.6,.17,.075),'trim',.035)
  box('Number plate',(0,base+.26,end*(length/2+.025)),(.38,.11,.013),'metal',.007)
  for mark in range(6):box('Plate lettering',(-.12+mark*.045,base+.26,end*(length/2+.034)),(.018,.038,.003),'trim',0)
 box('Radiator grille',(0,belt-.25,length/2+.011),(.67,.18,.046),'trim',.037)
 for y in range(5):tube('Grille louvre',(-.27,belt-.31+y*.029,length/2+.04),(.27,belt-.31+y*.029,length/2+.04),.006,'metal',5)
 for side in [-1,1]:tube('Windshield wiper',(side*.47,belt+.028,front_base-.02),(side*.18,belt+.10,front_base-.15),.007,'trim',5)
 # Merge each body material, so the detail is not hundreds of separate draw calls.
 for category,objects in list(parts.items()):combine(objects,kind+'_'+category,root)
 for side in [-1,1]:
  for z in [-axle,axle]:
   parts={};centre=(side*(width-.018),radius,z)
   bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=10,major_radius=radius*.79,minor_radius=radius*.21,location=xyz(centre),rotation=(0,math.pi/2,0));finish(bpy.context.object,'rubber',True)
   for face in [-1,1]:
    x=centre[0]+face*.074
    tube('Brake disc',(x-.004,radius,z),(x+.004,radius,z),radius*.61,'trim',24)
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=radius*.60,minor_radius=.015,location=xyz((x,radius,z)),rotation=(0,math.pi/2,0));finish(bpy.context.object,'metal',True)
    for spoke in range(5 if not suv else 7):
     a=spoke*math.tau/(5 if not suv else 7)
     tube('Alloy spoke',(x+face*.013,radius+math.sin(a)*.045,z+math.cos(a)*.045),(x+face*.013,radius+math.sin(a+.1)*radius*.59,z+math.cos(a+.1)*radius*.59),.017,'metal',5)
   tube('Wheel hub',(centre[0]-.10,radius,z),(centre[0]+.10,radius,z),.052,'metal',12)
   objects=[o for group in parts.values() for o in group]
   for o in objects:
    color=o.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value
    attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for v in attr.data:v.color=color
    o.data.materials.clear();o.data.materials.append(wm)
   wheel=combine(objects,'wheel_'+('left' if side<0 else 'right')+('_rear' if z<0 else '_front'),root)
   # Each origin is its own axle, allowing actual wheel rotation while driving.
   bpy.context.scene.cursor.location=xyz(centre);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');wheel['wheel']=True
 children=list(root.children);triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in children)
 bpy.context.view_layer.update()
 points=[o.matrix_local@v.co for o in children for v in o.data.vertices]
 dimensions=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
 manifest.append({'id':kind,'length':dimensions[1],'height':dimensions[2],'widthIncludingMirrors':dimensions[0],'wheelRadius':radius,'triangles':triangles,'drawMeshes':len(children)})
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'artifacts/street-build/neighborhood-vehicles.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'vehicles.glb'),export_format='GLB',export_extras=True,export_yup=True,export_animations=False,export_materials='EXPORT')
(OUT/'vehicles-manifest.json').write_text(json.dumps(manifest,indent=2))
print('VEHICLE MODELS',json.dumps(manifest))
