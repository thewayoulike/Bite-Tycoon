import * as THREE from 'three';

/** Instances share the kit's buffers; cutaways never change another instance. */
export function assembleBuilding(source: THREE.Object3D, design: {floorHeight:number}, floors: number, inside: boolean, floor: number) {
  const modules = new Map<string, THREE.Object3D>();
  source.traverse(node => { if (node.userData.module) modules.set(node.userData.module, node); });
  for (const key of ['ground','level','roof']) if (!modules.has(key)) throw new Error(`Building kit is missing its ${key} module.`);
  const result=new THREE.Group();
  const add=(key: string, y: number) => {
    const part=modules.get(key)!.clone(true); part.position.y=y;
    part.traverse(node => {
      const section=node.userData.section;
      if (section) node.visible=inside ? section !== 'front' && section !== 'right' : section !== 'inside';
      const mesh=node as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow=true; mesh.receiveShadow=true; }
    });
    result.add(part);
  };
  if (inside) add(floor === 0 ? 'ground' : 'level',0);
  else { add('ground',0); for (let i=1;i<floors;i++) add('level',i*design.floorHeight); add('roof',floors*design.floorHeight); }
  return result;
}
