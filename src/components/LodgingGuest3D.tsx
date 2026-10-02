import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VenueVisitor } from '../empire/venueSimulation';
import { FloorPoint, FloorWalker, LodgingLayout, lodgingWalkingPath, advanceFloorWalker, walkablePoint } from '../empire/lodgingLayout';
import { LodgingActivity, lodgingActivity } from '../empire/lodgingActivities';
import { RealCharacter3D } from './RealCharacter3D';

type Journey = 'queue' | 'toLift' | 'toRoom' | 'room' | 'fromRoom' | 'exit';
export function LodgingGuest({ person, index, layouts, floor, speed, isNight, onClick, onExited }: {
  person: VenueVisitor; index: number; layouts: LodgingLayout[]; floor: number; speed: number; isNight: boolean; onClick: () => void; onExited: (id: number) => void;
}) {
  const homeFloor = person.unit === null ? 1 : 1 + Math.floor(person.unit / (layouts[0].kind === 'hotel' ? 4 : 3));
  const home = layouts[homeFloor], room = home?.rooms.find(room => room.index === person.unit);
  const activity = useMemo(() => room ? lodgingActivity(home, room, isNight) : null, [home, room, isNight]);
  const initialFloor = person.state === 'using' ? homeFloor : 0;
  const group = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), currentFloor = useRef(initialFloor);
  const journey = useRef<Journey>(person.state === 'using' ? 'room' : person.state === 'leaving' ? 'exit' : 'queue');
  const walker = useRef<FloorWalker>({ position: person.state === 'using' && room ? { ...room.destination } : person.state === 'leaving' ? { ...layouts[0].elevator } : { ...layouts[0].entrance }, path: [], next: 0, heading: 0 });
  const [walking, setWalking] = useState(false), wasWalking = useRef(false), completed = useRef(false), lastLayout = useRef(layouts);
  const [resting, setResting] = useState<LodgingActivity | null>(null), rest = useRef<LodgingActivity | null>(null);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const route = (destination: FloorPoint) => { walker.current.path = lodgingWalkingPath(layouts[currentFloor.current], walker.current.position, destination); walker.current.next = 0; };
  useEffect(() => {
    rest.current = null; setResting(null);
    if (lastLayout.current !== layouts && !walkablePoint(layouts[currentFloor.current], walker.current.position)) {
      walker.current.position = { ...(currentFloor.current === 0 ? layouts[0].entrance : room?.destination ?? layouts[currentFloor.current].elevator) };
    }
    lastLayout.current = layouts;
    if (person.state === 'waiting') { journey.current = 'queue'; route(layouts[0].queue[Math.min(index, layouts[0].queue.length - 1)]); }
    else if (person.state === 'using') {
      if (currentFloor.current !== homeFloor) { journey.current = 'toLift'; route(layouts[currentFloor.current].elevator); }
      else if (room) { journey.current = 'toRoom'; route(activity?.approach ?? room.destination); }
    } else if (currentFloor.current > 0) { journey.current = 'fromRoom'; route(layouts[currentFloor.current].elevator); }
    else { journey.current = 'exit'; route(layouts[0].entrance); }
  }, [person.state, person.unit, index, layouts, activity]);
  useFrame((_, delta) => {
    const elapsed = Math.min(delta, .06) * speed;
    // Get out of the chair/bed before walking along the next collision-safe route.
    const gettingUp = !rest.current && !!body.current && body.current.position.lengthSq() > .001;
    const moved = !gettingUp && advanceFloorWalker(walker.current, elapsed * 2.25);
    const arrived = walker.current.path.length > 0 && walker.current.next >= walker.current.path.length;
    if (arrived && !gettingUp) {
      if (journey.current === 'toLift' && room) { currentFloor.current = homeFloor; walker.current.position = { ...home.elevator }; journey.current = 'toRoom'; route(activity?.approach ?? room.destination); }
      else if (journey.current === 'fromRoom') { currentFloor.current = 0; walker.current.position = { ...layouts[0].elevator }; journey.current = 'exit'; route(layouts[0].entrance); }
      else if (journey.current === 'toRoom') { journey.current = 'room'; rest.current = activity; setResting(activity); }
      else if (journey.current === 'exit' && !completed.current) { completed.current = true; onExited(person.id); }
    }
    if (wasWalking.current !== moved) { wasWalking.current = moved; setWalking(moved); }
    if (group.current) {
      group.current.visible = currentFloor.current === floor;
      group.current.position.set(walker.current.position.x, 0, walker.current.position.z);
      // Keep the walking root unrotated so room coordinates remain exact.
    }
    if (body.current) {
      const target = rest.current;
      offset.set(target ? target.position[0] - walker.current.position.x : 0, target?.position[1] ?? 0, target ? target.position[2] - walker.current.position.z : 0);
      body.current.position.lerp(offset, 1 - Math.exp(-elapsed * 8));
      const heading = target?.heading ?? walker.current.heading;
      const turn = Math.atan2(Math.sin(heading - body.current.rotation.y), Math.cos(heading - body.current.rotation.y));
      body.current.rotation.y += turn * Math.min(1, elapsed * 10);
    }
  });
  return <group ref={group} visible={initialFloor === floor} position={[walker.current.position.x, 0, walker.current.position.z]} name={`lodging-guest-${person.id}`} onClick={event => { event.stopPropagation(); onClick(); }}>
    <group ref={body}><RealCharacter3D role="customer" seed={person.seed} gameSpeed={speed} isWaitingFood={person.state === 'waiting'} isWalking={walking && !resting}
      isSitting={resting?.pose === 'sit'} isSleeping={resting?.pose === 'sleep'} seatHeight={resting?.seatHeight} /></group>
  </group>;
}
