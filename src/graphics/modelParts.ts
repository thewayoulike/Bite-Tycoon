import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = [number, number, number];

/** Combines colored details into a single renderable surface. */
export class ModelParts {
  private parts: THREE.BufferGeometry[] = [];
  add(geometry: THREE.BufferGeometry, color: string, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0]) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    if (part !== geometry) geometry.dispose();
    part.deleteAttribute('uv');
    const tint = new THREE.Color(color), colors: number[] = [];
    for (let i = 0; i < part.getAttribute('position').count; i++) colors.push(tint.r, tint.g, tint.b);
    part.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (!part.hasAttribute('normal')) part.computeVertexNormals();
    this.parts.push(part);
  }
  ellipsoid(position: Vec3, scale: Vec3, color: string) {
    this.add(new THREE.SphereGeometry(1, 12, 8), color, position, scale);
  }
  box(position: Vec3, size: Vec3, color: string, rotation: Vec3 = [0, 0, 0]) {
    this.add(new THREE.BoxGeometry(...size), color, position, [1, 1, 1], rotation);
  }
  branch(start: Vec3, end: Vec3, radius: number, tip: number, color: string, segments = 7) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const geometry = new THREE.CylinderGeometry(tip, radius, direction.length(), segments);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    this.add(geometry, color, start.map((v, i) => (v + end[i]) / 2) as Vec3);
  }
  finish() {
    const result = mergeGeometries(this.parts)!;
    this.parts.forEach(part => part.dispose());
    result.computeBoundingSphere();
    return result;
  }
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = Math.imul(value ^ value >>> 15, 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}
