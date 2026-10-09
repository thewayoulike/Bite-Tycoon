import {memo,useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {outerCarBatches,outerTreeBatches,type StreetBatch} from '../graphics/outerStreetAssets';
import type {OuterCarPlacement,OuterTreePlacement} from '../graphics/outerCity';
import {sceneryLod} from '../graphics/sceneryPerformance';

export function SceneryInstances({batch}:{batch:StreetBatch}){
  const ref=useRef<THREE.InstancedMesh>(null),lastCamera=useRef(new THREE.Vector3(Infinity,Infinity,Infinity));
  const lastRotation=useRef(new THREE.Quaternion()),lastProjection=useRef(new THREE.Matrix4()),visible=useRef<number[]>([]);
  const {camera}=useThree();
  const view=useMemo(()=>({frustum:new THREE.Frustum(),matrix:new THREE.Matrix4(),sphere:new THREE.Sphere()}),[]);
  const radius=useMemo(()=>{
    batch.geometry.computeBoundingSphere();
    const bounds=batch.geometry.boundingSphere!;
    // The instance origin is at pavement height. Include its complete crown/body.
    return (bounds.radius+bounds.center.length())*Math.max(1,...batch.instances.map(i=>i.matrix.getMaxScaleOnAxis()));
  },[batch]);
  const update=()=>{
    const mesh=ref.current;if(!mesh)return;
    camera.updateMatrixWorld();
    view.frustum.setFromProjectionMatrix(view.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const selected:number[]=[];
    for(let i=0;i<batch.instances.length;i++){
      const item=batch.instances[i];
      const d=camera.position.distanceToSquared(item.position);
      if(batch.thresholds){
        item.lod=sceneryLod(Math.sqrt(d),item.lod,batch.thresholds);
        if(item.lod!==batch.lod||d>=850**2)continue;
      }else if(d<batch.minDistance**2||d>=batch.maxDistance**2)continue;
      view.sphere.set(item.position,radius);
      if(view.frustum.intersectsSphere(view.sphere))selected.push(i);
    }
    if(selected.length!==visible.current.length||selected.some((id,i)=>id!==visible.current[i])){
      selected.forEach((id,i)=>{const item=batch.instances[id];mesh.setMatrixAt(i,item.matrix);if(item.color)mesh.setColorAt(i,item.color);});
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      visible.current=selected;
    }
    mesh.count=selected.length;mesh.visible=selected.length>0;
    lastCamera.current.copy(camera.position);
    lastRotation.current.copy(camera.quaternion);lastProjection.current.copy(camera.projectionMatrix);
  };
  useLayoutEffect(()=>{visible.current=[];ref.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);update();},[batch,camera]);
  useFrame(()=>{if(lastCamera.current.distanceToSquared(camera.position)>1||1-Math.abs(lastRotation.current.dot(camera.quaternion))>.000001||!lastProjection.current.equals(camera.projectionMatrix))update();});
  if(!batch.instances.length)return null;
  return <instancedMesh ref={ref} args={[batch.geometry,batch.material,batch.instances.length]} frustumCulled={false} castShadow={batch.minDistance===0} receiveShadow dispose={null}/>;
}
export const OuterTrees3D=memo(function OuterTrees3D({library,placements}:{library:THREE.Group;placements:OuterTreePlacement[]}){
  const batches=useMemo(()=>outerTreeBatches(library,placements),[library,placements]);
  return <group name="outer-detailed-trees">{batches.map((batch,i)=><SceneryInstances key={i} batch={batch}/>)}</group>;
});
export const OuterCars3D=memo(function OuterCars3D({library,placements}:{library:THREE.Group;placements:OuterCarPlacement[]}){
  const batches=useMemo(()=>outerCarBatches(library,placements),[library,placements]);
  useEffect(()=>()=>{new Set(batches.map(b=>b.geometry)).forEach(g=>g.dispose());new Set(batches.map(b=>b.material)).forEach(m=>m.dispose());},[batches]);
  return <group name="outer-detailed-parked-cars">{batches.map((batch,i)=><SceneryInstances key={i} batch={batch}/>)}</group>;
});
