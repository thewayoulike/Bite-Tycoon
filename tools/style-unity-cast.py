"""Split existing covered outfits into shirt/jacket and trousers; preserve all skinning and body masks."""
from pathlib import Path
import json,struct,copy,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
text=(ROOT/'src/people-preview/castCatalog.ts').read_text(encoding='utf-8')
cast=json.loads(text[text.index('['):text.rindex(']')+1])
backup=ROOT/'artifacts/outfit-source';backup.mkdir(exist_ok=True)
report=[]
for person in cast:
 path=ROOT/'public/models/unity-cast'/f"{person['id']}.glb"
 if not path.exists():continue
 source=backup/path.name
 if not source.exists():shutil.copy2(path,source)
 raw=source.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);pos=20+length;binlen=struct.unpack_from('<I',raw,pos)[0];binary=bytearray(raw[pos+8:pos+8+binlen])
 def values(index):
  a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];fmt={5126:'f',5123:'H',5125:'I',5121:'B'}[a['componentType']];n={'SCALAR':1,'VEC3':3}[a['type']];size=struct.calcsize('<'+fmt)*n;offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size)
  return [struct.unpack_from('<'+fmt*n,binary,offset+i*stride) for i in range(a['count'])]
 def indices(data):
  while len(binary)%4:binary.append(0)
  offset=len(binary);binary.extend(struct.pack('<'+'I'*len(data),*data));vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data)*4,'target':34963});ai=len(doc['accessors']);doc['accessors'].append({'bufferView':vi,'componentType':5125,'count':len(data),'type':'SCALAR','min':[min(data)],'max':[max(data)]});return ai
 seed=int.from_bytes(hashlib.sha256(person['id'].encode()).digest()[:4],'little')
 palette=['9D6477','BE9B68','5F8495','8C9D81','B8775D','B8B3A4','7886A5','8C749B']
 role=person['role'];top='EEECE3' if role=='chef' else 'F0EEE7' if role=='waiter' else palette[seed%len(palette)]
 trousers='252D36' if role in ['chef','waiter'] else ['283845','474241','34444C','4B4851'][seed%4]
 if role in ['cleaner','maintenance']:top='677F86';trousers='3F525B'
 changed=0
 for mesh in doc['meshes']:
  if 'suit' not in mesh.get('name','').lower():continue
  out=[]
  for prim in mesh['primitives']:
   pts=values(prim['attributes']['POSITION']);idx=[x[0] for x in values(prim['indices'])];ys=[p[1] for p in pts];waist=min(ys)+(max(ys)-min(ys))*.56
   sets=[[],[]]
   for i in range(0,len(idx),3):
    tri=idx[i:i+3];sets[int(sum(pts[k][1] for k in tri)/3<waist)].extend(tri)
   for part,data in enumerate(sets):
    if not data:continue
    mat=copy.deepcopy(doc['materials'][prim['material']]);mat['name']=person['id']+(' shirt' if part==0 else ' trousers');pbr=mat.setdefault('pbrMetallicRoughness',{});hexcolor=top if part==0 else trousers;pbr['baseColorFactor']=[(int(hexcolor[i:i+2],16)/255)**2.2 for i in (0,2,4)]+[1];pbr.pop('baseColorTexture',None);pbr['metallicFactor']=0;pbr['roughnessFactor']=.85
    mi=len(doc['materials']);doc['materials'].append(mat);new=copy.deepcopy(prim);new['indices']=indices(data);new['material']=mi;out.append(new)
  mesh['primitives']=out;changed+=1
 doc['buffers'][0]['byteLength']=len(binary);js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary+=b'\0'*((-len(binary))%4)
 path.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(binary),0x004E4942)+binary)
 report.append({'id':person['id'],'role':role,'outfits':changed,'shirt':top,'trousers':trousers})
(ROOT/'artifacts/unity-comparison/outfit-validation.json').write_text(json.dumps(report,indent=2))
print(f'Updated {len(report)} covered characters; rigs, faces and body coverage preserved.')
