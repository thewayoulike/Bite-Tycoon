import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Point = [number, number];
const PARTS = 13;
const CLOTHES = ['#b86954', '#668b90', '#d0a85a', '#798765', '#8b7794', '#e0cbb0'];

// One draw call for bodies and one for hair, rather than hundreds of small meshes.
export const PedestrianCrowd3D = memo(function PedestrianCrowd3D({ routes, gameSpeed, count = 20 }: {
  routes: Point[][]; gameSpeed: number; count?: number;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const root = useMemo(() => new THREE.Object3D(), []);
  const part = useMemo(() => new THREE.Object3D(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const people = useMemo(() => Array.from({ length: count }, (_, index) => {
    const route = routes[index % routes.length];
    const lengths = route.map((p, i) => Math.hypot(route[(i + 1) % route.length][0] - p[0], route[(i + 1) % route.length][1] - p[1]));
    return { route, lengths, total: lengths.reduce((sum, length) => sum + length, 0), heading: 0 };
  }), [count, routes]);
  useLayoutEffect(() => {
    if (!bodies.current || !hair.current) return;
    const color = new THREE.Color();
    people.forEach((_, index) => {
      const skin = ['#e7ba96', '#bd865f', '#865b43', '#f2d0b3'][index % 4];
      const shirt = CLOTHES[index % CLOTHES.length];
      const pants = index % 2 ? '#3e5260' : '#4d4b44';
      [shirt, skin, '#302c29', '#302c29', pants, pants, '#e4dfd1', '#e4dfd1', shirt, shirt, skin, skin, '#ac825a'].forEach((value, i) => bodies.current!.setColorAt(index * PARTS + i, color.set(value)));
      hair.current!.setColorAt(index, color.set(index % 4 === 0 ? '#b9a78a' : '#44362f'));
    });
    bodies.current.instanceColor!.needsUpdate = true;
    hair.current.instanceColor!.needsUpdate = true;
    bodies.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    hair.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // All routes are contained in this known block; avoid recomputing bounds each frame.
    bodies.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 60);
    hair.current.boundingSphere = bodies.current.boundingSphere.clone();
  }, [people]);
  useFrame((_, delta) => {
    if (!bodies.current || !hair.current) return;
    elapsed.current += Math.min(delta, 0.1) * gameSpeed;
    people.forEach((person, index) => {
      const speed = 0.85 + index % 4 * 0.12;
      let distance = (elapsed.current * speed + index * 11.7) % person.total;
      let segment = 0;
      while (distance >= person.lengths[segment] && segment < person.lengths.length - 1) distance -= person.lengths[segment++];
      const start = person.route[segment];
      const end = person.route[(segment + 1) % person.route.length];
      const t = distance / person.lengths[segment];
      const heading = Math.atan2(end[0] - start[0], end[1] - start[1]);
      const difference = Math.atan2(Math.sin(heading - person.heading), Math.cos(heading - person.heading));
      person.heading += difference * Math.min(1, delta * gameSpeed * 10);
      const stride = Math.sin(elapsed.current * speed * 7 + index);
      root.position.set(THREE.MathUtils.lerp(start[0], end[0], t), 0.1 + Math.abs(stride) * 0.025, THREE.MathUtils.lerp(start[1], end[1], t));
      root.rotation.y = person.heading;
      root.scale.setScalar(0.94 + index % 3 * 0.06);
      root.updateMatrix();
      const place = (i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0) => {
        part.position.set(x, y, z);
        part.scale.set(sx, sy, sz);
        part.rotation.set(rx, 0, 0);
        part.updateMatrix();
        matrix.multiplyMatrices(root.matrix, part.matrix);
        bodies.current!.setMatrixAt(index * PARTS + i, matrix);
      };
      place(0, 0, 1.23, 0, 0.22, 0.32, 0.17);
      place(1, 0, 1.74, 0, 0.21, 0.24, 0.2);
      place(2, -0.073, 1.77, 0.182, 0.018, 0.018, 0.018);
      place(3, 0.073, 1.77, 0.182, 0.018, 0.018, 0.018);
      [-1, 1].forEach((side, i) => {
        const swing = stride * side * 0.4;
        place(4 + i, side * 0.11, 0.96 - Math.cos(swing) * 0.4, -Math.sin(swing) * 0.4, 0.075, 0.44, 0.075, swing);
        place(6 + i, side * 0.11, 0.96 - Math.cos(swing) * 0.83, -Math.sin(swing) * 0.83 + 0.06, 0.1, 0.06, 0.17);
        const arm = -swing * 0.7;
        place(8 + i, side * 0.255, 1.38 - Math.cos(arm) * 0.17, -Math.sin(arm) * 0.17, 0.07, 0.21, 0.07, arm);
        place(10 + i, side * 0.255, 1.38 - Math.cos(arm) * 0.42, -Math.sin(arm) * 0.42, 0.047, 0.11, 0.05, arm);
      });
      if (index % 3 === 0) place(12, 0.27, 0.65, 0, 0.14, 0.19, 0.1);
      else if (index % 3 === 1) place(12, 0, 1.2, -0.22, 0.15, 0.2, 0.11);
      else place(12, 0, 1.2, 0, 0, 0, 0);
      part.position.set(0, 1.8, -0.02); part.scale.set(0.225, 0.225, 0.225); part.rotation.set(0, 0, 0); part.updateMatrix();
      matrix.multiplyMatrices(root.matrix, part.matrix);
      hair.current!.setMatrixAt(index, matrix);
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    hair.current.instanceMatrix.needsUpdate = true;
  });
  return <group>
    <instancedMesh ref={bodies} args={[undefined, undefined, count * PARTS]} castShadow>
      <sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial roughness={0.95} />
    </instancedMesh>
    <instancedMesh ref={hair} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 10, 8, 0, Math.PI * 2, 0, 1.3]} /><meshStandardMaterial roughness={1} side={THREE.DoubleSide} />
    </instancedMesh>
  </group>;
});
