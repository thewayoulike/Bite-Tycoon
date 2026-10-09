import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {getDeliveryTruck} from './deliveryTruck';

export type StreetLibrary = 'trees' | 'vehicles';
export type VehicleStyle = 'sedan' | 'hatchback' | 'suv' | 'truck';
export const streetLibraries: Partial<Record<StreetLibrary, THREE.Group>> = {};
const requests: Partial<Record<StreetLibrary, Promise<THREE.Group | null>>> = {};

// Two local files, loaded once. Instances share their geometry and textures.
export function loadStreetLibrary(kind: StreetLibrary) {
  return requests[kind] ??= new GLTFLoader().loadAsync(`/models/street-assets/${kind}.glb?v=1`).then(gltf => {
    gltf.scene.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const material = mat as THREE.MeshStandardMaterial;
        if (material.map) material.map.anisotropy = 4;
        if (material.normalMap) material.normalMap.anisotropy = 4;
        if (material.alphaTest > 0) material.shadowSide = THREE.DoubleSide;
      }
    });
    streetLibraries[kind] = gltf.scene;
    return gltf.scene;
  }).catch(error => {
    console.warn(`Could not load ${kind}; keeping the built-in scenery.`, error);
    return null;
  });
}

export function chooseVehicleStyle(color: string, speed: number, taxi = false): VehicleStyle {
  if (taxi) return 'sedan';
  const hash = [...color].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, Math.abs(Math.floor(speed)));
  return (['sedan', 'hatchback', 'suv'] as const)[hash % 3];
}

const paints = new Map<string, THREE.MeshStandardMaterial>();
const lights = new Map<string, THREE.MeshStandardMaterial>();
export function vehicleSource(library:THREE.Group,style:VehicleStyle){
  return style==='truck'?getDeliveryTruck():library.getObjectByName(style);
}
export function createVehicleInstance(library: THREE.Group, style: VehicleStyle, color: string, night: boolean) {
  const source = vehicleSource(library,style);
  if (!source) throw new Error(`Vehicle model missing: ${style}`);
  const root = source.clone(true), wheels: THREE.Object3D[] = [];
  root.traverse(node => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.wheel) wheels.push(mesh);
    const original = mesh.material as THREE.MeshStandardMaterial;
    if (original.name === 'paint') {
      let paint = paints.get(color);
      if (!paint) { paint = original.clone(); paint.color.set(color); paints.set(color, paint); }
      mesh.material = paint;
    } else if (original.name === 'headlights' || original.name === 'taillights') {
      const key = `${original.name}:${night}`;
      let lamp = lights.get(key);
      if (!lamp) {
        lamp = original.clone();
        lamp.emissiveIntensity = night ? (original.name === 'headlights' ? 2.5 : 1.8) : .15;
        lights.set(key, lamp);
      }
      mesh.material = lamp;
    }
  });
  return {root, wheels, radius: Number(root.userData.wheelRadius) || .35};
}

export function getTreeParts(library: THREE.Group, species: string, lod: number) {
  return {
    bark: library.getObjectByName(`${species}_bark_lod${lod}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
    leaves: library.getObjectByName(`${species}_leaves_lod${lod}`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  };
}

const blossomMaterials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
export function treeLeafMaterial(source: THREE.MeshStandardMaterial, blossom: boolean) {
  if (!blossom) return source;
  let material = blossomMaterials.get(source);
  if (!material) {
    material = source.clone();
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float petalShade = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 2.0, 0.3, 0.92);
        diffuseColor.rgb = vec3(0.92, 0.63, 0.72) * petalShade;`);
    };
    material.customProgramCacheKey = () => 'street-blossom-v1';
    blossomMaterials.set(source, material);
  }
  return material;
}
