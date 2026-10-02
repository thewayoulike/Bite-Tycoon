import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CAST_BY_ID } from '../people-preview/cast';
import { createResourcePool } from './resourcePool';

const loader = new GLTFLoader();
function disposeSource(source: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>();
  source.traverse(node => {
    const mesh = node as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
    if (mesh.isSkinnedMesh) skeletons.add(mesh.skeleton);
  });
  materials.forEach(material => {
    Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    material.dispose();
  });
  geometries.forEach(geometry => geometry.dispose());
  skeletons.forEach(skeleton => skeleton.dispose());
  textures.forEach(texture => { texture.dispose(); const image = texture.source.data as { close?: () => void } | undefined; image?.close?.(); });
}

export const castAssets = createResourcePool(async id => {
  const member = CAST_BY_ID.get(id);
  if (!member) throw new Error(`Unknown cast member: ${id}`);
  return (await loader.loadAsync(`/models/people-preview/cast/${id}.glb?v=${member.assetVersion}`)).scene;
}, disposeSource);
