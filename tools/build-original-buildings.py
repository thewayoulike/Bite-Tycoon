"""Original modular architecture for the separate Bite Tycoon building prototype.
Run with Blender 4.2 --background --python tools/build-original-buildings.py.
All geometry and procedural material textures are authored here; no library models.
Coordinates supplied to helpers are metres, Y up, entrance facing +Z.
"""
import bpy, bmesh, math, json
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/building-prototype'; OUT.mkdir(parents=True,exist_ok=True)
BUILD=ROOT/'artifacts/building-build'; BUILD.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}; manifest=[]; buckets={}; module=None; zone='shell'
def rgb(h):
 h=h.lstrip('#');return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def material(name,color,rough=.7,metal=0,alpha=1,emission=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');c=rgb(color)
 p.inputs['Base Color'].default_value=(*c,alpha);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=.08
 M[name]=m;return m
for name,color,rough,metal in [('stone','#b2a58d',.83,0),('ivory','#ded6c5',.75,0),('metal','#323b3f',.34,.65),('bronze','#776044',.4,.65),('glass','#46606c',.17,.5),('roof','#353b41',.9,.05),('wood','#865e3d',.65,0),('white','#e8e3d8',.65,0),('sage','#74827a',.9,0),('linen','#d4d0c2',.94,0),('blue','#59727d',.92,0),('red','#8a473b',.88,0),('black','#242a2c',.8,0),('soil','#4a4031',1,0),('green','#536843',.95,0),('brass','#b49a62',.3,.75),('tile','#bab8b0',.6,0)]:material(name,color,rough,metal)
material('window_lit','#a3987c',.25,.25,emission=True);material('lamp','#ffdf9b',.28,0,emission=True);material('atrium_glass','#66808b',.12,.15,.3)
# Deterministic original surface maps: brick mortar relief, stone pores and wood grain.
def texture_material(name,base,kind):
 m=material(name,base,.88);N=512;y,x=np.mgrid[0:N,0:N];rng=np.random.default_rng(416)
 noise=rng.random((N,N))-.5;c=np.array(rgb(base));variation=np.ones((N,N));height=np.ones((N,N))*.65
 if kind=='brick':
  rows=y//16;cols=((x+(rows%2)*32)//64)%8;tones=rng.uniform(.8,1.12,(32,8));variation=tones[rows,cols]+noise*.055
  mortar=(y%16<1.5)|((x+(rows%2)*32)%64<1.6);height=np.where(mortar,.14,.72+noise*.14)
  color=np.where(mortar[:,:,None],np.array([.43,.41,.37]),variation[:,:,None]*c)
 elif kind=='wood':
  grain=np.sin(y*.52+np.sin(x*.027)*2.8)*.045+np.sin(y*2.6+x*.008)*.023
  color=c*(1+grain[:,:,None]+noise[:,:,None]*.09);height=.55+grain+noise*.03
 elif kind=='siding':
  groove=y%48<3;color=c*(.98+noise[:,:,None]*.1);color[groove]*=.58;height=np.where(groove,.17,.67)
 elif kind=='roof':
  groove=(y%32<2)|((x+(y//32%2)*32)%64<1);color=c*(.86+noise[:,:,None]*.22);color[groove]*=.6;height=np.where(groove,.2,.6)
 else:
  color=c*(.97+noise[:,:,None]*.11+(.015*np.sin(x*.035)*np.sin(y*.041))[:,:,None]);height=.6+noise*.14
 color=np.clip(color,0,1)
 def image(name,data,space):
  im=bpy.data.images.new(name,width=N,height=N,alpha=True);im.colorspace_settings.name=space
  rgba=np.concatenate([data,np.ones((N,N,1))],axis=2).astype(np.float32);im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(BUILD/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
 im=image(name+'_color',color,'sRGB');n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=im;m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 dy,dx=np.gradient(height);normal=np.stack([-dx*2.3,-dy*2.3,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2)[:,:,None];im=image(name+'_normal',normal*.5+.5,'Non-Color')
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;normal_node=m.node_tree.nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.55;m.node_tree.links.new(tex.outputs['Color'],normal_node.inputs['Color']);m.node_tree.links.new(normal_node.outputs['Normal'],m.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
 return m
texture_material('brick_russet','#875b4b','brick');texture_material('brick_buff','#99846b','brick');texture_material('limestone','#c7bda7','stone');texture_material('cedar','#878d84','siding');texture_material('oak','#96704e','wood');texture_material('slate','#444b51','roof')

def xyz(p):return (p[0],-p[2],p[1])
def quad(points,mat):
 key=(zone,mat);d=buckets.setdefault(key,{'v':[],'f':[],'uv':[]});start=len(d['v']);d['v'] += [xyz(p) for p in points];d['f'].append(tuple(range(start,start+len(points))))
 a=np.array(points[1])-points[0];b=np.array(points[2])-points[0];normal=np.abs(np.cross(a,b));axis=int(np.argmax(normal));axes=(2,1) if axis==0 else (0,2) if axis==1 else (0,1)
 d['uv'] += [(p[axes[0]]/2.4,p[axes[1]]/2.4) for p in points]
def box(p,s,mat,angle=0):
 vs=[]
 for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
  x=a*s[0]/2;z=c*s[2]/2;vs.append((p[0]+x*math.cos(angle)+z*math.sin(angle),p[1]+b*s[1]/2,p[2]-x*math.sin(angle)+z*math.cos(angle)))
 for f in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:quad([vs[i] for i in f],mat)
def beam(a,b,width,mat):
 a=np.array(a);b=np.array(b);d=b-a;d=d/np.linalg.norm(d);u=np.cross(d,[0,1,0] if abs(d[1])<.99 else [1,0,0]);u=u/np.linalg.norm(u)*width/2;v=np.cross(d,u);vs=[p+su*u+sv*v for p in [a,b] for su,sv in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 for f in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:quad([vs[i] for i in f],mat)
def cylinder(p,r,h,mat,n=12):
 bottom=[(p[0]+math.sin(i*math.tau/n)*r,p[1]-h/2,p[2]+math.cos(i*math.tau/n)*r) for i in range(n)];top=[(x,y+h,z) for x,y,z in bottom]
 quad(list(reversed(bottom)),mat);quad(top,mat)
 for i in range(n):quad([bottom[i],bottom[(i+1)%n],top[(i+1)%n],top[i]],mat)
def plant(x,z,y=0,size=1):
 cylinder((x,y+.3*size,z),.28*size,.6*size,'stone');
 for i in range(7):
  a=i*2.4;xx=x+math.cos(a)*.23*size;zz=z+math.sin(a)*.23*size;beam((x,y+.5*size,z),(xx,y+(1.1+i*.07)*size,zz),.065*size,'green');box((xx,y+(1+i*.07)*size,zz),(.2*size,.37*size,.12*size),'green',a)
def window(x,y,z,w,h,lit=False,fr='metal',detail=True):
 box((x,y,z-.06),(w+.15,h+.15,.12),'black');box((x,y,z+.016),(w,h,.05),'window_lit' if lit else 'glass')
 for dx in [-w/2,w/2]:box((x+dx,y,z+.09),(.065,h+.1,.115),fr)
 for dy in [-h/2,h/2]:box((x,y+dy,z+.09),(w,.065,.115),fr)
 box((x,y,z+.10),(.045,h,.085),fr)
 if detail:
  box((x,y-h/2-.10,z+.13),(w+.30,.13,.34),'limestone');box((x,y+h/2+.09,z+.045),(w+.22,.1,.16),'limestone')
  box((x,y+.18,z+.095),(w,.035,.08),fr)
  if lit:box((x-w*.19,y+.04,z+.06),(w*.29,h-.1,.012),'linen')
def facade(width,depth,h,mat,windows=4):
 global zone
 for side in ['front','back']:
  zone=side;z=(depth/2)*(1 if side=='front' else -1);bottom=.82;top=2.5;pitch=width/windows;ww=pitch*.56
  box((0,bottom/2,z),(width,bottom,.26),mat);box((0,(h+top)/2,z),(width,h-top,.26),mat)
  for j in range(windows+1):box((-width/2+j*pitch,(bottom+top)/2,z),(pitch-ww,top-bottom,.27),mat)
  # Rear facade uses the same trim proportions with its outward direction reversed.
  for j in range(windows):
   x=-width/2+(j+.5)*pitch
   if side=='front':window(x,(bottom+top)/2,z+.02,ww,top-bottom,j%3==1)
   else:
    box((x,(bottom+top)/2,z-.07),(ww,top-bottom,.1),'glass');box((x,.76,z-.13),(ww+.25,.12,.36),'limestone');box((x,2.56,z-.07),(ww+.2,.1,.18),'limestone')
  box((0,h-.1,z+.07),(width+.12,.12,.16),'limestone')
 for side in [-1,1]:
  zone='left' if side<0 else 'right';box((side*width/2,h/2,0),(.26,h,depth),mat)
  for z in [-depth*.28,depth*.2]:
   box((side*(width/2+.15),1.7,z),(.07,1.7,1.35),'glass');box((side*(width/2+.19),.79,z),(.28,.12,1.6),'limestone');box((side*(width/2+.2),1.7,z),(.075,1.7,.05),'metal')
 zone='slab';box((0,.06,0),(width,.12,depth),'oak')
def storefront(cx,z,width,label_color='sage'):
 box((cx,1.35,z),(width,2.55,.1),'glass');
 for x in [cx-width/2,cx,cx+width/2]:box((x,1.35,z+.08),(.075,2.7,.13),'metal')
 box((cx,2.71,z+.10),(width+.12,.12,.18),'metal');box((cx,.15,z+.08),(width,.3,.15),'stone');box((cx,2.99,z+.14),(width+.1,.4,.20),label_color)
 box((cx+.18,1.15,z+.15),(.03,.48,.055),'brass');box((cx-.18,1.15,z+.15),(.03,.48,.055),'brass')
def sofa(x,z,color='sage',angle=0):
 box((x,.32,z),(2.15,.38,.84),'wood',angle);box((x,.56,z),(1.99,.19,.78),color,angle);box((x,.88,z-.35),(2.15,.68,.16),color,angle)
 for dx in [-1.01,1.01]:box((x+dx,.69,z),(.13,.46,.86),color,angle)
 for dx in [-.49,.49]:box((x+dx,.6,z+.02),(.93,.09,.71),color,angle)
def bed(x,z):
 box((x,.28,z),(1.72,.40,2.22),'oak');box((x,.54,z),(1.68,.21,2.18),'white');box((x,.69,z+.34),(1.72,.12,1.49),'linen');box((x,1.04,z-1.12),(1.92,1.28,.14),'oak')
 for dx in [-.42,.42]:box((x+dx,.72,z-.72),(.66,.13,.45),'white')
 box((x,.77,z+.81),(1.73,.045,.45),'blue')
 for dx in [-1.21,1.21]:
  box((x+dx,.31,z-.76),(.57,.62,.58),'oak');cylinder((x+dx,.73,z-.76),.06,.22,'brass');cylinder((x+dx,.93,z-.76),.17,.23,'linen')
def table(x,z,w=1.2,d=.7):
 box((x,.76,z),(w,.065,d),'oak');
 for dx in [-w/2+.1,w/2-.1]:
  for dz in [-d/2+.1,d/2-.1]:box((x+dx,.37,z+dz),(.045,.74,.045),'metal')
def chair(x,z,rot=0):
 for dx in [-.2,.2]:
  for dz in [-.2,.2]:box((x+dx,.24,z+dz),(.035,.48,.035),'oak')
 box((x,.49,z),(.48,.08,.49),'sage');box((x,.77,z-.23 if rot==0 else z+.23),(.48,.52,.045),'oak')
def kitchen(x,z,w=3):
 box((x,.45,z),(w,.90,.65),'ivory');box((x,.93,z),(w+.04,.055,.7),'stone')
 for i in range(5):box((x-w/2+(i+.5)*w/5,.46,z+.335),(w/5-.025,.81,.035),'oak')
 box((x-w*.28,.969,z),(.67,.015,.42),'metal');box((x+w*.27,.969,z),(.56,.015,.47),'black');beam((x-.8,.98,z-.18),(x-.8,1.26,z-.18),.035,'metal');beam((x-.8,1.26,z-.18),(x-.8,1.26,z+.02),.035,'metal')
 box((x+w/2+.40,1.03,z),(.72,2.06,.74),'white');box((x+w/2+.69,1.23,z+.39),(.035,.4,.05),'metal')
def shelf(x,z,w=2):
 box((x,1.1,z),(w,2.2,.1),'oak')
 for y in [.2,.65,1.1,1.55,2.0]:
  box((x,y,z+.22),(w,.055,.56),'oak')
  for i in range(9):box((x-w/2+.13+i*(w-.2)/9,y+.19,z+.15),(.12,.30,.22),['ivory','red','blue','sage'][i%4])
def counter(x,z,w=3):
 box((x,.5,z),(w,1,.8),'oak');box((x,1.02,z),(w+.1,.085,.9),'stone');box((x+.8,1.23,z),(.44,.3,.045),'metal');box((x+.8,1.07,z+.18),(.44,.035,.24),'black')
def bath(x,z):
 box((x,1.1,z),(2.3,2.2,.12),'ivory');box((x+1.15,1.1,z+1.1),(.12,2.2,2.2),'ivory');box((x,0.08,z+1.1),(2.2,.06,2.1),'tile');box((x+.46,.44,z+.5),(.50,.7,.64),'white');box((x-.65,.85,z+.45),(.65,.14,.55),'white');box((x-.65,1.55,z+.06),(.7,.7,.04),'glass')
 box((x,.15,z+1.64),(1.55,.08,.83),'white');box((x-.78,1.08,z+1.65),(.03,1.85,.9),'atrium_glass');box((x,1.08,z+2.08),(1.55,1.85,.03),'atrium_glass');beam((x+.5,.6,z+2.04),(x+.5,1.95,z+2.04),.028,'metal')
def stairs(x,z):
 for i in range(13):box((x,(i+.5)*.13,z-i*.17),(1.1,(i+1)*.26,.22),'oak')
 beam((x+.58,.95,z+.1),(x+.58,2.7,z-2.3),.045,'metal')
def rooftop(w,d):
 global zone;zone='roof';box((0,.04,0),(w+.3,.12,d+.3),'slate')
 for z in [-d/2,d/2]:box((0,.32,z),(w+.36,.55,.22),'limestone');box((0,.62,z),(w+.45,.08,.33),'metal')
 for x in [-w/2,w/2]:box((x,.32,0),(.22,.55,d),'limestone')
 box((-w*.2,.53,-d*.2),(2,.8,1.4),'metal')
 for j in range(8):box((-w*.2-.85+j*.24,.56,-d*.2+.72),(.065,.65,.035),'black')
 cylinder((w*.25,.46,-d*.15),.19,.8,'metal');cylinder((w*.25,.9,-d*.15),.3,.08,'metal')
def flush(parent,name):
 global buckets
 group=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(group);group.parent=parent;group['module']=name
 zones={}
 for (section,mat),data in buckets.items():
  if section not in zones:
   g=bpy.data.objects.new(section,None);bpy.context.collection.objects.link(g);g.parent=group;g['section']=section;zones[section]=g
  mesh=bpy.data.meshes.new(name+'_'+section+'_'+mat);mesh.from_pydata(data['v'],[],data['f']);mesh.update()
  # Geometry is authored with outward normals; preserve UV loop order.
  uv=mesh.uv_layers.new(name='UVMap')
  for face in mesh.polygons:
   for loop_index in face.loop_indices:uv.data[loop_index].uv=data['uv'][mesh.loops[loop_index].vertex_index]
  ob=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(ob);ob.parent=zones[section];mesh.materials.append(M[mat])
 buckets={};return group

for kind,w,d,h,default,maxfloors in [('house',10,9,2.9,2,2)]:
 root=bpy.data.objects.new(kind,None);bpy.context.collection.objects.link(root);root['originalDesign']=True
 for level in ['ground','level','roof']:
  buckets={};zone='shell'
  if level=='roof':
   if kind=='house':
    zone='roof';eave=h*.03;peak=2.8
    quad(list(reversed([(-5.45,eave,-4.9),(0,peak,-4.9),(0,peak,4.9),(-5.45,eave,4.9)])),'slate');quad(list(reversed([(0,peak,-4.9),(5.45,eave,-4.9),(5.45,eave,4.9),(0,peak,4.9)])),'slate')
    for z in [-4.55,4.55]:
     points=[(-5,eave,z),(5,eave,z),(0,peak,z)];quad(points if z>0 else list(reversed(points)),'cedar');beam((-5.45,0,z),(0,peak,z),.16,'ivory');beam((0,peak,z),(5.45,0,z),.16,'ivory')
    box((2.8,1.95,-1.8),(.7,3.5,.8),'brick_buff');box((2.8,3.75,-1.8),(.95,.16,1.02),'stone')
    for side in [-1,1]:beam((side*5.42,.04,-4.9),(side*5.42,.04,4.9),.12,'metal')
   else:
    rooftop(w,d)
    if kind=='hotel':
     for z in [-d/2,d/2]:box((0,.7,z),(w+.7,.19,.65),'ivory')
     for x in [-w/2,w/2]:box((x,.7,0),(.65,.19,d+.7),'ivory')
    if kind=='glass':
     for x in [-5,0,5]:plant(x,1.8,.2,1.2)
     for x in [-7,7]:beam((x,2,-4),(x,2,4),.11,'bronze');beam((x,.12,-4),(x,2,-4),.11,'bronze');beam((x,.12,4),(x,2,4),.11,'bronze')
     for z in [-4,-2,0,2,4]:beam((-7,2,z),(7,2,z),.12,'bronze')
   flush(root,level);continue
  ground=level=='ground'
  if kind=='row':
   # Three individually colored narrow storefronts share party walls.
   for j in range(3):
    cx=(j-1)*6;mat=['brick_russet','brick_buff','brick_russet'][j]
    if ground:
     zone='front';box((cx,1.62,d/2),(5.88,3.25,.28),mat);storefront(cx,d/2+.18,4.9,['sage','metal','red'][j]);box((cx,2.79,d/2+.88),(5.05,.08,1.5),['sage','metal','red'][j]);
     for i in range(8):box((cx-2.35+i*.65,2.83,d/2+.88),(.22,.025,1.5),'linen')
    else:
     zone='front';box((cx,1.62,d/2),(5.94,3.25,.28),mat)
     for x in [cx-1.4,cx+1.4]:window(x,1.65,d/2+.17,1.34,1.88,(j+int(x*10))%3==0)
     box((cx,3.1,d/2+.27),(6,.16,.5),'limestone')
    zone='back';box((cx,h/2,-d/2),(5.98,h,.25),mat)
    for x in [cx-1.4,cx+1.4]:box((x,1.6,-d/2-.16),(1.4,1.8,.08),'glass')
   for side in [-1,1]:
    zone='left' if side<0 else 'right';box((side*w/2,h/2,0),(.3,h,d),'brick_russet')
   zone='slab';box((0,.04,0),(w,.12,d),'oak');zone='inside'
   for x in [-3,3]:box((x,1.1,0),(.15,2.2,d),'ivory')
   if ground:
    counter(-6,-3,4.1);kitchen(-6,-4.3,3.2)
    for x in [-7.4,-4.6]:
     table(x,1.4,1.2,.85);chair(x,.62);chair(x,2.2,math.pi)
    shelf(-1.6,-4.6,2.2);shelf(1.2,-4.6,2.2);shelf(-1.8,-.8,1.7);counter(.8,2.0,2.2)
    counter(6,-1.7,4.1);shelf(6,-4.5,4.1);table(7.5,2.1,.9,.7);chair(7.5,1.42)
   else:
    for x in [-6,0,6]:bed(x,-2.5);sofa(x,2);table(x,3.3)
  elif kind in ['apartments','hotel']:
   facade(w,d,h,'limestone' if kind=='hotel' else 'brick_buff',4)
   if ground:
    zone='front';storefront(0,d/2+.22,3.5,'bronze' if kind=='hotel' else 'metal');box((0,3.03,d/2+1.25),(6,.12,2.8),'metal');box((0,3.14,d/2+1.25),(6,.08,2.8),'atrium_glass')
    for x in [-3,3]:beam((x,0,d/2+2.1),(x,3,d/2+2.1),.09,'bronze')
    if kind=='hotel':
     for x in [-5.5,5.5]:box((x,1.58,d/2+.3),(.40,3.15,.45),'ivory');box((x,.12,d/2+.3),(.62,.23,.66),'stone')
   elif kind=='apartments':
    zone='front'
    for x in [-4.8,-1.6,1.6,4.8]:
     box((x,.15,d/2+.75),(2.9,.18,1.65),'stone');box((x,.83,d/2+1.52),(2.84,1.13,.05),'atrium_glass');beam((x-1.43,1.43,d/2+1.52),(x+1.43,1.43,d/2+1.52),.055,'metal')
     for dx in [-1.43,1.43]:beam((x+dx,.22,d/2+1.52),(x+dx,1.43,d/2+1.52),.045,'metal')
     if x<0:plant(x,d/2+.58,.25,.65)
   else:
    zone='front'
    for x in [-5.25,-1.75,1.75,5.25]:
     box((x,.68,d/2+.41),(2,.07,.5),'stone');beam((x-1,1.2,d/2+.61),(x+1,1.2,d/2+.61),.035,'metal')
     for dx in np.arange(-1,1.01,.25):beam((x+dx,.73,d/2+.61),(x+dx,1.2,d/2+.61),.024,'metal')
   zone='inside'
   if ground:
    counter(-3,-1,4.4);sofa(3.7,1.7,'blue');sofa(3.7,-1.1,'linen');table(3.7,.35,1.7,.7);plant(-5.7,3.7,0,1.5);plant(5.6,-4.9,0,1.4)
    for x in [2.5,4.5]:box((x,1.27,-d/2+.2),(1.6,2.54,.12),'metal');box((x,1.27,-d/2+.28),(.028,2.4,.035),'black')
    stairs(-5.2,-2);box((-2.7,1.1,-3.1),(3,.04,1.3),'oak');box((-3,1.1,-2.1),(4,2.2,.1),'ivory')
   elif kind=='hotel':
    # Four guest rooms, a continuous central corridor, private bathrooms.
    for x in [-5.1,5.1]:
     for z in [-3.2,3.2]:bed(x,z)
    for x in [-1.15,1.15]:
     for z in [-4.5,0,4.5]:box((x,1.1,z),(.12,2.2,2),'ivory')
    for x in [-4.1,4.1]:box((x,1.1,0),(5.3,2.2,.14),'ivory')
    for x in [-2.5,2.5]:
     for z in [-5.6,.4]:bath(x,z)
   else:
    for sign in [-1,1]:
     x=sign*3.6;bed(sign*4.6,-3.5);box((sign*4.2,1.1,-1.8),(3.8,2.2,.13),'ivory');box((sign*1.2,1.1,-1.8),(.2,2.2,.13),'ivory');box((sign*1.8,2.18,-1.8),(1,.12,.13),'oak');sofa(x,1.2,'sage');table(x,2.65,1.25,.62);kitchen(x,4.7,2.5);bath(sign*2.15,-5.2)
    for x in [-.8,.8]:
     box((x,1.1,-2.3),(.12,2.2,5.3),'ivory');box((x,1.1,3.5),(.12,2.2,3),'ivory')
  elif kind=='house':
   facade(w,d,h,'cedar',3)
   zone='front'
   if ground:
    storefront(0,d/2+.20,1.45,'oak');box((0,.20,5.3),(6,.4,2.2),'oak');box((0,2.68,5.45),(6.4,.13,2.65),'slate')
    for x in [-2.8,2.8]:box((x,1.43,6.3),(.15,2.46,.15),'ivory')
    for z in [5.1,5.7,6.3]:box((0,.10,z),(2.2,.20,.45),'stone')
   else:window(0,1.58,d/2+.25,2.1,1.6,True,'ivory')
   for side in [-1,1]:zone='left' if side<0 else 'right';box((side*5.07,h/2,4.55),(.14,h,.14),'ivory')
   zone='inside'
   if ground:
    sofa(-2.5,1.3,'linen');table(-2.5,2.5,1.5,.7);kitchen(-2,-3.8,4.2);table(2.55,1,1.65,1.2)
    for x in [2.0,3.05]:chair(x,0);chair(x,2,math.pi)
    stairs(3.5,-1.7);box((0,1.1,-1),(.13,2.2,3.4),'ivory');plant(-4.2,3.8,0,1.1)
   else:
    bed(-2.6,-2.5);bed(2.55,-2.5);box((0,1.1,-2),(.14,2.2,5),'ivory');box((-3.2,1.1,.1),(3.2,2.2,.14),'ivory');box((3.2,1.1,.1),(3.2,2.2,.14),'ivory');bath(-3.4,1);sofa(2.5,2.2)
  elif kind=='glass':
   # A broad shopping pavilion: vertical bronze fins and a glazed corner atrium.
   zone='slab'
   for x in [-5.6,5.6]:box((x,.06,0),(5.8,.12,d),'tile')
   for z in [-5.1,5.1]:box((0,.06,z),(5.4,.12,3.8),'tile')
   if ground:box((0,.06,0),(5.4,.12,6.2),'tile')
   for side in ['front','back']:
    zone=side;z=d/2*(1 if side=='front' else -1)
    box((0,.19,z),(w,.34,.28),'limestone');box((0,h-.1,z),(w+.14,.18,.32),'metal')
    for i in range(9):
     x=-8+i*2;box((x,h/2,z+.12),(.075,h,.15),'bronze')
     if i<8:box((x+1,h/2,z),(1.92,h-.4,.08),'atrium_glass' if ground else 'glass')
    for x in [-6,-2,2,6]:box((x,h/2,z+.25),(.16,h,.45),'bronze')
    box((0,2.55,z+.09),(w,.05,.12),'metal')
   for side in [-1,1]:
    zone='left' if side<0 else 'right'
    for j in range(7):
     z=-6+j*2;box((side*w/2,h/2,z),(.08,h-.25,1.9),'glass');box((side*(w/2+.1),h/2,z+1),(.17,h,.07),'bronze')
    box((side*w/2,h-.1,0),(.28,.18,d),'metal')
   zone='front'
   if ground:
    box((0,2.96,8.6),(8,.14,3.3),'bronze');storefront(0,7.2,3.4,'metal')
    for x in [-3.7,3.7]:beam((x,0,9.8),(x,2.9,9.8),.12,'bronze')
   zone='inside'
   for x in [-7.5,7.5]:
    for z in [-5,0,5]:box((x,h/2,z),(.25,h,.25),'limestone')
   for x in [-2.72,2.72]:
    box((x,.8,0),(.04,1.2,6.1),'atrium_glass');beam((x,1.43,-3.1),(x,1.43,3.1),.05,'metal')
   if ground:
    counter(-5.7,-3,3.5);shelf(-6,-6.55,4);table(-5.7,1.8);chair(-5.7,1.0);chair(-5.7,2.6,math.pi)
    shelf(6,-6.55,4);counter(6,-3,3.7);shelf(7.8,.3,2.5);plant(-5,5,0,1.4);plant(5,5,0,1.4)
   else:
    for x in [-5.6,5.6]:
     shelf(x,-6.5,3.7);counter(x,-2.4,3.4);table(x,2.4,1.7,.8);chair(x,1.55);chair(x,3.2,math.pi)
   for side in [-1,1]:
    for i in range(16):box((side*1.1,.12+i*.15,-4.6+i*.19),(.9,.18,.23),'metal')
    beam((side*1.1-.54,1.05,-4.9),(side*1.1-.54,3.5,-1.5),.075,'metal');beam((side*1.1+.54,1.05,-4.9),(side*1.1+.54,3.5,-1.5),.075,'metal')
  flush(root,level)
 # Save each reusable architecture kit to its own GLB, not a flat joined city.
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 def select_tree(o):
  for child in o.children:child.select_set(True);select_tree(child)
 select_tree(root)
 path=OUT/(kind+'.glb');bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_materials='EXPORT')
 meshes=[o for o in root.children_recursive if o.type=='MESH'];tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 manifest.append({'id':kind,'width':w,'depth':d,'floorHeight':h,'defaultFloors':default,'maxFloors':maxfloors,'trianglesInKit':tris,'meshesInKit':len(meshes),'bytes':path.stat().st_size})
bpy.ops.wm.save_as_mainfile(filepath=str(BUILD/'original-neighborhood-buildings.blend'))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print('ORIGINAL BUILDING KITS',json.dumps(manifest))
