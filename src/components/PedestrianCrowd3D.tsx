import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RealCharacter3D } from './RealCharacter3D';

type Point = [number, number];
type Segment = { start: Point; end: Point; length: number };
type Route = { segments: Segment[]; total: number };

function routePosition(route: Route, distance: number) {
  let remaining = distance % route.total;
  const segment = route.segments.find(segment => {
    if (remaining < segment.length) return true;
    remaining -= segment.length;
    return false;
  }) ?? route.segments[0];
  const t = remaining / segment.length;
  return {
    x: THREE.MathUtils.lerp(segment.start[0], segment.end[0], t),
    z: THREE.MathUtils.lerp(segment.start[1], segment.end[1], t),
    heading: Math.atan2(segment.end[0] - segment.start[0], segment.end[1] - segment.start[1]),
  };
}

const Pedestrian3D = memo(function Pedestrian3D({ route, index, gameSpeed,size=1 }: {
  route: Route; index: number; gameSpeed: number;size?:number;
}) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const speed = .85 + index % 4 * .12;
  const start = useMemo(() => routePosition(route, index * 11.7), [route, index]);
  useFrame((_, delta) => {
    if (!group.current || gameSpeed === 0) return;
    elapsed.current += Math.min(delta, .06) * gameSpeed;
    const next = routePosition(route, elapsed.current * speed + index * 11.7);
    group.current.position.set(next.x, .1, next.z);
    const angle = next.heading - group.current.rotation.y;
    const shortestTurn = Math.atan2(Math.sin(angle), Math.cos(angle));
    group.current.rotation.y += shortestTurn * Math.min(1, delta * gameSpeed * 10);
  });
  return <group ref={group} position={[start.x, .1, start.z]} rotation={[0, start.heading, 0]} scale={size*(.94 + index % 3 * .06)}>
    <RealCharacter3D role="customer" seed={index * 7 + 3} isWalking gameSpeed={gameSpeed * speed}
      detail="crowd" name="street-person" />
  </group>;
});

// The same modeled people as the restaurant, with fewer surface subdivisions.
// Shared geometry/materials and one body draw per pedestrian keep the crowd light.
export const PedestrianCrowd3D = memo(function PedestrianCrowd3D({ routes, gameSpeed, count = 20,size=1 }: {
  routes: Point[][]; gameSpeed: number; count?: number;size?:number;
}) {
  const paths = useMemo(() => routes.map(route => {
    const segments = route.map((start, i) => {
      const end = route[(i + 1) % route.length];
      return { start, end, length: Math.hypot(end[0] - start[0], end[1] - start[1]) };
    }).filter(segment => segment.length > .001);
    return { segments, total: segments.reduce((sum, segment) => sum + segment.length, 0) };
  }).filter(route => route.total > 0), [routes]);
  if (!paths.length) return null;
  return <group name="street-crowd">
    {Array.from({ length: count }, (_, index) => <Pedestrian3D key={index}
      route={paths[index % paths.length]} index={index} gameSpeed={gameSpeed} size={size} />)}
  </group>;
});
