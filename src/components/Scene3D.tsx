import React, { useRef, useMemo, useState, useEffect, Suspense, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Cylinder, Sphere, Plane, Html, Cone, Sky, Grid, Torus } from '@react-three/drei';
import { GameState } from '../hooks/useGameLoop';
import { RealCharacter3D } from './RealCharacter3D';
import { diningCastId } from '../characters/gameCast';
import { FoodIllustration } from './FoodIllustration';
import { OutdoorReflections3D } from './OutdoorReflections3D';
import { BistroTable3D } from './BistroFurniture3D';
import {restaurantLevel} from '../restaurantProgression';
import {isPickup,isPastry} from '../restaurantOperations';
import {PickupGuest3D} from './PickupGuest3D';
import {RestaurantIdentity3D} from './RestaurantIdentity3D';
import {RestaurantShell3D} from './RestaurantShell3D';
import {restaurantAppearance} from '../graphics/propertyArchitecture';
import { AttractiveCityScenery3D } from './CityScenery3D';
import {
  AttractiveFloor3D,
  CeilingBeams3D,
  AttractiveBarCounter3D,
  PendantLamp3D,
  IndoorPlant3D
} from './RestaurantDecor3D';
import {
  GasBurners3D,
  SteamParticles3D,
  VIPCrown3D,
  NeonRestaurantMarquee3D,
  AmbientDustMotes3D
} from './RestaurantFX3D';
import * as THREE from 'three';

import {mapPos,ROOM,customerSeatPath,seatPoint,DINING_SEATS,layoutKey} from '../restaurantLayout';

function CameraControls({ reset, neighborhood, street, people, focusKey }: { reset: number; neighborhood: boolean; street: boolean; people: boolean; focusKey: string }) {
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera, scene } = useThree();
  const person = useRef<THREE.Object3D | null>(null);
  const previous = useMemo(() => new THREE.Vector3(), []);
  const current = useMemo(() => new THREE.Vector3(), []);
  const movement = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    person.current = people ? scene.getObjectByName('diner-person') ?? null : null;
    if (person.current) {
      person.current.getWorldPosition(previous);
      controls.current?.target.copy(previous).add(new THREE.Vector3(0, 1.1, 0));
      camera.position.copy(previous).add(new THREE.Vector3(2.4, 2.1, 1.1));
      controls.current?.update();
      return;
    }
    camera.position.set(...(street ? [24, 9, -22] : neighborhood ? [60, 51, 77] : [0, 25, 32]) as [number, number, number]);
    controls.current?.target.set(...(street ? [5, 5, -38] : [0, 0, 0]) as [number, number, number]);
    controls.current?.update();
  }, [camera, scene, reset, neighborhood, street, people, people ? focusKey : '', previous]);
  useFrame(() => {
    if (!people || !person.current || !controls.current) return;
    person.current.getWorldPosition(current);
    movement.subVectors(current, previous);
    camera.position.add(movement);
    controls.current.target.add(movement);
    previous.copy(current);
  });
  return <OrbitControls ref={controls} enablePan enableDamping dampingFactor={0.08}
    minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={150} />;
}


// --- FLOATING STAMINA UI FOR STAFF ---
const StaminaBar = ({ entity, type, actions }: { entity: any, type: 'waiter'|'chef'|'cleaner', actions: any }) => {
  if (!entity) return null;
  const isExhausted = entity.stamina <= 20;

  return (
    <Html position={[0, 2.3, 0]} center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center pointer-events-none">
        {isExhausted && entity.state !== 'on_break' && (
          <div className="bg-red-500 text-white font-black text-[8px] px-1 rounded animate-pulse mb-0.5">TIRED!</div>
        )}

        <div className="w-12 h-1.5 bg-stone-900 rounded-full overflow-hidden mb-1 border border-stone-800 shadow-md">
          <div
            className={`h-full transition-all duration-100 ease-linear ${entity.stamina > 50 ? 'bg-green-400' : entity.stamina > 20 ? 'bg-orange-400' : 'bg-red-500'}`}
            style={{ width: `${entity.stamina}%` }}
          />
        </div>

        {entity.stamina < 50 && entity.state !== 'on_break' && (
          <button
            onClick={(e) => { e.stopPropagation(); actions.sendOnBreak(entity.id, type); }}
            className="px-1.5 py-0.5 bg-stone-100 hover:bg-white text-stone-900 border border-stone-800 text-[8px] font-black rounded shadow-md pointer-events-auto active:scale-95"
          >
            ☕ BREAK
          </button>
        )}

        {entity.state === 'on_break' && (
           <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-black rounded shadow-md animate-pulse">RELAXING</span>
        )}
      </div>
    </Html>
  );
};

const Person3D = memo(({ color, isWalking, isSitting, role = 'customer', seed = 0, hasTray = false, trayRecipeId, isTakingOrder = false, isWaitingOrder = false, isWaitingFood = false, isEating = false, isVIP = false, isWorking = false, gameSpeed = 1 }: any) => {
  return (
    <RealCharacter3D size={2}
      color={color}
      isWalking={isWalking}
      isSitting={isSitting}
      role={role}
      seed={seed}
      hasTray={hasTray}
      trayRecipeId={trayRecipeId}
      isTakingOrder={isTakingOrder}
      isWaitingOrder={isWaitingOrder}
      isWaitingFood={isWaitingFood}
      isEating={isEating}
      isVIP={isVIP}
      isWorking={isWorking}
      gameSpeed={gameSpeed}
    />
  );
}, (prev, next) => (
  prev.isWalking === next.isWalking &&
  prev.isSitting === next.isSitting &&
  prev.hasTray === next.hasTray &&
  prev.trayRecipeId === next.trayRecipeId &&
  prev.isTakingOrder === next.isTakingOrder &&
  prev.isWaitingOrder === next.isWaitingOrder &&
  prev.isWaitingFood === next.isWaitingFood &&
  prev.isEating === next.isEating &&
  prev.isVIP === next.isVIP &&
  prev.color === next.color &&
  prev.seed === next.seed &&
  prev.role === next.role &&
  prev.isWorking === next.isWorking &&
  prev.gameSpeed === next.gameSpeed
));

const CustomerMember3D = ({ index, customer, table, tables, color, seed, castId, gameSpeed }: any) => {
  const ref=useRef<THREE.Group>(null);
  const leaving=customer.state==='leaving',signature=layoutKey(tables);
  const seatedOnMount=useRef(customer.state!=='entering');
  const [isWalking,setIsWalking]=useState(false),[isSitting,setIsSitting]=useState(seatedOnMount.current&&!leaving);
  const arrival=useMemo(()=>customerSeatPath(table,index,tables),[table.id,table.x,table.y,index,signature]);
  const route=useMemo(()=>leaving?[...arrival].reverse():arrival,[arrival,leaving]);
  const cursor=useRef(seatedOnMount.current&&!leaving?route.length:1),delay=useRef(index*.35);
  useEffect(()=>{cursor.current=leaving?1:seatedOnMount.current?route.length:1;delay.current=index*.35;},[route]);
  const initial=useRef(seatedOnMount.current?seatPoint(table,index):{x:0,z:ROOM.entry});
  useFrame((_,delta)=>{
    if(!ref.current||!gameSpeed)return;
    let elapsed=Math.min(delta,.25)*gameSpeed;
    if(delay.current>0){const waiting=Math.min(delay.current,elapsed);delay.current-=waiting;elapsed-=waiting;}
    let distance=4*elapsed;const position=ref.current.position;
    const before={x:position.x,z:position.z};
    while(distance>0&&cursor.current<route.length){
      const next=route[cursor.current],length=Math.hypot(next.x-position.x,next.z-position.z);
      if(length<=distance){position.x=next.x;position.z=next.z;cursor.current++;distance-=length;}
      else{position.x+=(next.x-position.x)/length*distance;position.z+=(next.z-position.z)/length*distance;distance=0;}
    }
    const walking=Math.hypot(position.x-before.x,position.z-before.z)>.0001;
    const sitting=!leaving&&cursor.current===route.length&&route.length>1;
    setIsWalking(walking);setIsSitting(sitting);
    const angle=sitting?DINING_SEATS[index%4].rotation:walking?Math.atan2(position.x-before.x,position.z-before.z):ref.current.rotation.y;
    const difference=Math.atan2(Math.sin(angle-ref.current.rotation.y),Math.cos(angle-ref.current.rotation.y));
    ref.current.rotation.y+=difference*Math.min(1,delta*12*gameSpeed);
  });
  return <group ref={ref} name={'dining-guest-'+customer.id+'-'+index} position={[initial.current.x,0,initial.current.z]} rotation={[0,seatedOnMount.current&&!leaving?DINING_SEATS[index%4].rotation:0,0]}>
    {customer.isVIP&&index===0&&<VIPCrown3D position={[0,4.5,0]}/>}
    <RealCharacter3D size={2} role="customer" castId={castId} gameSpeed={gameSpeed} color={color} seed={seed} isWalking={isWalking} isSitting={isSitting}
      isWaitingOrder={isSitting&&customer.state==='waiting_order'} isWaitingFood={isSitting&&customer.state==='waiting_food'} isEating={isSitting&&customer.state==='eating'} isVIP={customer.isVIP}/>
  </group>;
};

const Customer3D = ({ customer, table, tables, actions, staff, gameSpeed }: any) => {


  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < customer.id.length; i++) { hash = ((hash << 5) - hash) + customer.id.charCodeAt(i); hash |= 0; }
    return Math.abs(hash);
  }, [customer.id]);

  // FIX: Visually render the exact amount of people that the engine decided for this group
  const groupSize = customer.partySize || ((seed % 4) + 1);

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#06b6d4"];
  const color = colors[seed % colors.length];

  return (
    <group>
      {Array.from({ length: groupSize }).map((_, i) => (
        <CustomerMember3D
          key={i}
          index={i}
          customer={customer}
          table={table}
          tables={tables}
          color={colors[(seed + i * 3) % colors.length]}
          seed={seed + i * 23}
          castId={diningCastId(seed, i, groupSize)}
          isWaitingOrder={customer.state === 'waiting_order'}
          isWaitingFood={customer.state === 'waiting_food'}
          isEating={customer.state === 'eating'}
          isVIP={customer.isVIP}
          gameSpeed={gameSpeed}
        />
      ))}

      {customer.state !== 'entering' && customer.state !== 'leaving' && (
        <Html position={[mapPos(table.x), 4.5, mapPos(table.y)]} center>
          <div className="flex flex-col items-center pointer-events-none">
            {customer.bookingName&&<span className="rounded bg-[#e8dfce] px-2 text-[10px] font-bold">Reserved · {customer.bookingName}</span>}
            {customer.isVIP && (
              <div className="bg-yellow-400 border-2 border-yellow-600 text-yellow-900 font-black text-[10px] px-2 py-0.5 rounded-full mb-1 shadow-md animate-bounce">
                ⭐ VIP
              </div>
            )}
            <div className={`w-16 h-2 bg-white rounded-full overflow-hidden mb-1 border shadow-md ${customer.isVIP ? 'border-yellow-600' : 'border-stone-800'}`}>
              <div className={`h-full transition-all duration-100 ease-linear ${customer.isVIP ? 'bg-yellow-400' : customer.state === 'eating' ? 'bg-green-400' : customer.patience > 50 ? 'bg-blue-400' : customer.patience > 25 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${(customer.patience / customer.maxPatience) * 100}%` }} />
            </div>

            {customer.state === 'waiting_order' && (
              <button onClick={() => actions.takeOrder(customer.id)} className={`px-2 py-1 text-[10px] font-black rounded shadow-md border border-stone-800 pointer-events-auto transition-transform active:scale-95 ${customer.isVIP ? 'bg-yellow-400 hover:bg-yellow-300 text-yellow-900 animate-pulse' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                {customer.isVIP ? '⭐ TAKE VIP ORDER' : 'TAKE ORDER'}
              </button>
            )}
            {customer.state === 'waiting_food' && <span className="text-[10px] font-black text-stone-800 bg-white px-1 rounded border border-stone-800">HUNGRY</span>}
            {customer.state === 'eating' && <span className="text-[10px] font-black text-stone-800 bg-white px-1 rounded border border-stone-800">EATING</span>}
          </div>
        </Html>
      )}
    </group>
  );
};

const Waiter3D = ({ index, state, actions }: any) => {
  const ref = useRef<THREE.Group>(null);
  const entity = state.waiterEntities[index];
  const isInitializedRef = useRef(false);
  const targetAngleRef = useRef(0);
  const [isWalking, setIsWalking] = useState(false);

  useFrame((threeState, delta) => {
    if (!ref.current || !entity || state.gameSpeed === 0) return;

    if (!isInitializedRef.current) {
      ref.current.position.set(entity.x, 0, entity.y);
      isInitializedRef.current = true;
    }

    // Smooth position interpolation without frame stutter
    const targetX = entity.x;
    const targetZ = entity.y;
    const dx = targetX - ref.current.position.x;
    const dz = targetZ - ref.current.position.z;
    const dist = Math.hypot(dx, dz);

    const lerpSpeed = Math.min(1, delta * 9);
    ref.current.position.x += dx * lerpSpeed;
    ref.current.position.z += dz * lerpSpeed;

    const moving = dist > 0.12 && entity.state !== 'idle' && entity.state !== 'taking_order' && entity.state !== 'on_break';
    if (moving !== isWalking) {
      setIsWalking(moving);
    }

    // Heading direction
    if (dist > 0.12) {
      // Actively walking: smoothly face movement direction
      targetAngleRef.current = Math.atan2(dx, dz);
    } else if (entity.state === 'taking_order') {
      // At table: turn to face table center
      const table = state.tables.find((t: any) => t.id === entity.targetTableId);
      if (table) {
        const tableX = mapPos(table.x);
        const tableZ = mapPos(table.y);
        targetAngleRef.current = Math.atan2(tableX - ref.current.position.x, tableZ - ref.current.position.z);
      }
    } else if (entity.state === 'idle' || entity.state === 'on_break') {
      // At kitchen bar counter / resting: face welcoming towards dining room (+Z)
      targetAngleRef.current = 0;
    }

    // Shortest-arc angle lerp (prevents 360-degree snap spins)
    let angleDiff = targetAngleRef.current - ref.current.rotation.y;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    ref.current.rotation.y += angleDiff * Math.min(1, delta * 8);
  });

  if (!entity) return null;
  const hasTray = entity.state === 'walking_to_serve';

  return (
    <group ref={ref}>
      <Person3D
        color="#1e293b"
        isWalking={isWalking}
        role="waiter"
        seed={index + 10}
        hasTray={hasTray}
        trayRecipeId={state.orders.find((order: any) => order.tableId === entity.targetTableId && order.state === 'ready')?.recipeId}
        isTakingOrder={entity.state === 'taking_order'}
        gameSpeed={state.gameSpeed}
      />
      <StaminaBar entity={entity} type="waiter" actions={actions} />
    </group>
  );
};

const Cleaner3D = ({ index, state, actions }: any) => {
  const ref = useRef<THREE.Group>(null);
  const entity = state.cleanerEntities[index];
  const isInitializedRef = useRef(false);
  const targetAngleRef = useRef(0);
  const [isWalking, setIsWalking] = useState(false);

  useFrame((threeState, delta) => {
    if (!ref.current || !entity || state.gameSpeed === 0) return;

    if (!isInitializedRef.current) {
      ref.current.position.set(entity.x, 0, entity.y);
      isInitializedRef.current = true;
    }

    const dx = entity.x - ref.current.position.x;
    const dz = entity.y - ref.current.position.z;
    const dist = Math.hypot(dx, dz);

    const lerpSpeed = Math.min(1, delta * 9);
    ref.current.position.x += dx * lerpSpeed;
    ref.current.position.z += dz * lerpSpeed;

    const moving = dist > 0.12 && entity.state !== 'idle' && entity.state !== 'cleaning' && entity.state !== 'on_break';
    if (moving !== isWalking) {
      setIsWalking(moving);
    }

    if (dist > 0.12) {
      targetAngleRef.current = Math.atan2(dx, dz);
    } else if (entity.state === 'cleaning') {
      const table = state.tables.find((t: any) => t.id === entity.targetTableId);
      if (table) {
        targetAngleRef.current = Math.atan2(mapPos(table.x) - ref.current.position.x, mapPos(table.y) - ref.current.position.z);
      }
    } else {
      targetAngleRef.current = 0;
    }

    let angleDiff = targetAngleRef.current - ref.current.rotation.y;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    ref.current.rotation.y += angleDiff * Math.min(1, delta * 8);
  });

  if (!entity) return null;

  return (
    <group ref={ref}>
      <Person3D color="#0ea5e9" isWalking={isWalking} role="cleaner" seed={index + 20} isWorking={entity.state === 'cleaning'} gameSpeed={state.gameSpeed} />
      <StaminaBar entity={entity} type="cleaner" actions={actions} />
    </group>
  );
};

const Chef3D = ({ index, state, actions }: any) => {
  const ref = useRef<THREE.Group>(null);
  const [target, setTarget] = useState([-5 + index * 2.5, -12.5]);
  const [isWalking, setIsWalking] = useState(false);
  const targetAngleRef = useRef(0);
  const entity = state.chefEntities[index] || { stamina: 100, state: 'idle', id: `c_${index}` };

  useFrame((threeState, delta) => {
    if (state.gameSpeed === 0) return;
    if (entity.state === 'on_break') {
      setIsWalking(false);
      return;
    }
    if (Math.random() < 0.015) {
      setTarget([-5 + index * 2.5 + (Math.random() * 3 - 1.5), -12.5 + (Math.random() * 0.8 - 0.4)]);
    }
    if (ref.current) {
      const dx = target[0] - ref.current.position.x;
      const dz = target[1] - ref.current.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.1) {
        setIsWalking(true);
        ref.current.position.x += dx * Math.min(1, delta * 2.5);
        ref.current.position.z += dz * Math.min(1, delta * 2.5);
        targetAngleRef.current = Math.atan2(dx, dz);
      } else {
        setIsWalking(false);
        targetAngleRef.current = 0; // Face dining area
      }

      let angleDiff = targetAngleRef.current - ref.current.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      ref.current.rotation.y += angleDiff * Math.min(1, delta * 6);
    }
  });

  return (
    <group ref={ref} position={[-5 + index * 2.5, 0, -12.5]}>
      <Person3D color="#f8fafc" isWalking={isWalking} role="chef" seed={index + 30} isWorking={!isWalking && entity.state !== 'on_break' && state.orders.some((order: any) => order.state === 'cooking')} gameSpeed={state.gameSpeed} />
      <StaminaBar entity={entity} type="chef" actions={actions} />
    </group>
  );
};

const Bench = ({ position, rotation = [0, 0, 0] }: any) => (
  <group position={position} rotation={rotation}>
    <Box args={[2, 0.1, 0.8]} position={[0, 0.4, 0]} castShadow><meshStandardMaterial color="#8B4513" /></Box>
    <Box args={[2, 0.8, 0.1]} position={[0, 0.8, -0.35]} castShadow><meshStandardMaterial color="#8B4513" /></Box>
    <Box args={[0.1, 0.4, 0.8]} position={[-0.8, 0.2, 0]} castShadow><meshStandardMaterial color="#333" /></Box>
    <Box args={[0.1, 0.4, 0.8]} position={[0.8, 0.2, 0]} castShadow><meshStandardMaterial color="#333" /></Box>
  </group>
);

const Cat = memo(({ position, rotation, color }: any) => {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <Box args={[0.3, 0.3, 0.6]} position={[0, 0.15, 0]}><meshStandardMaterial color={color} /></Box>
      <Sphere args={[0.2, 16, 16]} position={[0, 0.4, 0.3]}><meshStandardMaterial color={color} /></Sphere>
      <Cone args={[0.08, 0.15, 4]} position={[-0.1, 0.55, 0.35]} rotation={[0, Math.PI/4, 0]}><meshStandardMaterial color={color} /></Cone>
      <Cone args={[0.08, 0.15, 4]} position={[0.1, 0.55, 0.35]} rotation={[0, Math.PI/4, 0]}><meshStandardMaterial color={color} /></Cone>
      <Cylinder args={[0.04, 0.04, 0.4]} position={[0, 0.3, -0.35]} rotation={[Math.PI/4, 0, 0]}><meshStandardMaterial color={color} /></Cylinder>
    </group>
  );
}, () => true);

const CatTree = memo(({ position }: any) => {
  return (
    <group position={position}>
      <Box args={[2, 0.2, 2]} position={[0, 0.1, 0]}><meshStandardMaterial color="#fef3c7" /></Box>
      <Cylinder args={[0.15, 0.15, 2, 16]} position={[-0.5, 1.1, 0]}><meshStandardMaterial color="#e5e5e5" /></Cylinder>
      <Box args={[1.5, 0.2, 1.5]} position={[-0.5, 2.2, 0]}><meshStandardMaterial color="#fef3c7" /></Box>
      <Cylinder args={[0.15, 0.15, 1.5, 16]} position={[0.5, 0.85, 0.5]}><meshStandardMaterial color="#e5e5e5" /></Cylinder>
      <Box args={[1.2, 0.2, 1.2]} position={[0.5, 1.7, 0.5]}><meshStandardMaterial color="#fef3c7" /></Box>
    </group>
  );
}, () => true);

const Lantern = memo(({ position }: any) => (
  <group position={position}>
    {/* Brass Top Mount & Ring */}
    <Torus args={[0.15, 0.025, 8, 16]} position={[0, 0.18, 0]} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
    </Torus>
    <Cylinder args={[0.45, 0.35, 0.15, 16]} position={[0, 0.05, 0]}>
      <meshStandardMaterial color="#1c1917" metalness={0.8} />
    </Cylinder>
    {/* Amber Frosted Glass Body */}
    <Cylinder args={[0.38, 0.38, 1.1, 16]} position={[0, -0.55, 0]}>
      <meshStandardMaterial color="#ef4444" emissive="#f87171" emissiveIntensity={0.5} transparent opacity={0.85} />
    </Cylinder>
    {/* Brass Frame Ribs */}
    <Box args={[0.04, 1.1, 0.8]} position={[0, -0.55, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
    </Box>
    {/* Base Cap with Brass Tassel */}
    <Cylinder args={[0.35, 0.45, 0.12, 16]} position={[0, -1.15, 0]}>
      <meshStandardMaterial color="#1c1917" metalness={0.8} />
    </Cylinder>
    <Cylinder args={[0.04, 0.08, 0.3, 12]} position={[0, -1.35, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.9} />
    </Cylinder>
  </group>
), () => true);

const AnimatedDoor = memo(({ isNear, position = [0, 0, 14.8], rotation = [0, Math.PI / 2, 0], layout = 0, customFrameColor }: any) => {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);

  const frameColor = customFrameColor || "#2c1810";
  const doorFrameColor = customFrameColor || "#3f2314";

  useFrame((state, delta) => {
    const targetZLeft = isNear ? -1.5 : -0.75;
    const targetZRight = isNear ? 1.5 : 0.75;
    if (leftDoorRef.current && rightDoorRef.current) {
      leftDoorRef.current.position.z = THREE.MathUtils.lerp(leftDoorRef.current.position.z, targetZLeft, delta * 5);
      rightDoorRef.current.position.z = THREE.MathUtils.lerp(rightDoorRef.current.position.z, targetZRight, delta * 5);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Molded Frame Header with Polished Brass Transom Plaque */}
      <Box args={[0.65, 0.35, 3.6]} position={[0, 6.4, 0]} castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </Box>
      <Box args={[0.68, 0.18, 2.4]} position={[0, 6.4, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>
      {/* Vertical Frame Jambs */}
      <Box args={[0.65, 6.5, 0.15]} position={[0, 3.25, -1.72]} castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </Box>
      <Box args={[0.65, 6.5, 0.15]} position={[0, 3.25, 1.72]} castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </Box>

      {/* Left Sliding Door */}
      <group ref={leftDoorRef} position={[0, 3.1, -0.75]}>
        <Box args={[0.1, 6, 1.4]}>
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} depthWrite={false} roughness={0.08} />
        </Box>
        <Box args={[0.22, 6, 0.15]} position={[0, 0, 0.65]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 6, 0.15]} position={[0, 0, -0.65]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 0.18, 1.4]} position={[0, 2.9, 0]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 0.45, 1.4]} position={[0, -2.78, 0]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        {/* Brass Kickplate */}
        <Box args={[0.24, 0.35, 1.3]} position={[0, -2.8, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Box>
        {/* Polished Brass Vertical Push Bar */}
        <Cylinder args={[0.035, 0.035, 1.4, 16]} position={[0.15, 0, 0.45]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
        </Cylinder>
      </group>

      {/* Right Sliding Door */}
      <group ref={rightDoorRef} position={[0, 3.1, 0.75]}>
        <Box args={[0.1, 6, 1.4]}>
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} depthWrite={false} roughness={0.08} />
        </Box>
        <Box args={[0.22, 6, 0.15]} position={[0, 0, 0.65]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 6, 0.15]} position={[0, 0, -0.65]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 0.18, 1.4]} position={[0, 2.9, 0]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        <Box args={[0.22, 0.45, 1.4]} position={[0, -2.78, 0]}><meshStandardMaterial color={doorFrameColor} roughness={0.6} /></Box>
        {/* Brass Kickplate */}
        <Box args={[0.24, 0.35, 1.3]} position={[0, -2.8, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Box>
        {/* Polished Brass Vertical Push Bar */}
        <Cylinder args={[0.035, 0.035, 1.4, 16]} position={[0.15, 0, -0.45]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
        </Cylinder>
      </group>
    </group>
  );
}, (prev, next) => prev.isNear === next.isNear && prev.customFrameColor === next.customFrameColor && prev.layout === next.layout);

export const Scene3D = ({ state, actions }: { state: GameState, actions: any }) => {
  const isNight = state.time > 70 || state.time < 10;
  const [cameraReset, setCameraReset] = useState(0);
  const [cutaway, setCutaway] = useState(true);
  const [neighborhood, setNeighborhood] = useState(false);
  const [peopleView, setPeopleView] = useState(false);
  const [streetView, setStreetView] = useState(false);
  const [fastGraphics, setFastGraphics] = useState(false);

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden border-4 border-stone-800 shadow-inner relative transition-colors duration-1000 ${isNight ? 'bg-slate-900' : 'bg-sky-200'}`}>

      <RestaurantOrders state={state} actions={actions}/>
      <div className="scene-tools absolute bottom-24 right-4 z-20 flex gap-2">
        <select className="mc-button px-3 py-2 text-xs" aria-label="Graphics quality" title="Fast graphics disables real-time shadows and caps rendering resolution." value={fastGraphics ? 'fast' : 'detailed'} onChange={event => setFastGraphics(event.target.value === 'fast')}>
          <option value="detailed">Graphics: Detailed</option>
          <option value="fast">Graphics: Fast</option>
        </select>
        <button className="mc-button px-3 py-2 text-xs" aria-pressed={peopleView} title="Look closely at a guest or staff member. Drag to orbit; scroll to zoom." onClick={() => { setPeopleView(v => !v); setNeighborhood(false); setStreetView(false); }}>{peopleView ? 'Leave character view' : 'Character view'}</button>
        <button className="mc-button px-3 py-2 text-xs" aria-pressed={streetView} onClick={() => {setStreetView(v => !v);setPeopleView(false);setNeighborhood(false);}}>{streetView ? 'Leave street view' : 'Street view'}</button>
        <button className="mc-button px-3 py-2 text-xs" aria-pressed={neighborhood} onClick={() => { setNeighborhood(v => !v); setPeopleView(false); setStreetView(false); }}>{neighborhood ? 'Restaurant view' : 'Wide view'}</button>
        <button className="mc-button px-3 py-2 text-xs" onClick={() => { setNeighborhood(false); setPeopleView(false); setStreetView(false); setCameraReset(n => n + 1); }}>Reset view</button>
        <button className="mc-button px-3 py-2 text-xs" aria-pressed={cutaway} onClick={() => setCutaway(v => !v)}>{cutaway ? 'Show full room' : 'Cutaway view'}</button>
      </div>
      <Canvas
        shadows={fastGraphics ? false : 'percentage'}
        dpr={fastGraphics ? 1 : [1, 1.5]}
        camera={{ position: [0, 25, 32], fov: 48, near: 0.1, far: 250 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <color attach="background" args={[isNight ? '#17263e' : '#cbdce3']} />
        <fog attach="fog" args={[isNight ? '#17263e' : '#cbdce3', 100, 240]} />
        <hemisphereLight intensity={isNight ? 0.65 : 1.5} color={isNight ? '#a7c4eb' : '#e5f1ff'} groundColor="#8b6246" />
        <ambientLight intensity={isNight ? 0.2 : 0.3} color="#ffdfb2" />
        <directionalLight
          position={[-12, 24, 8]}
          intensity={isNight ? 0.65 : 2.4}
          color={isNight ? "#94a3b8" : "#fef3c7"}
          castShadow={!fastGraphics}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-camera-near={0.5}
          shadow-camera-far={75}
          shadow-normalBias={0.04}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[10, 12, -8]} intensity={isNight ? 0.3 : 0.55} color="#b8d4ef" />

        <CameraControls reset={cameraReset} neighborhood={neighborhood} street={streetView} people={peopleView} focusKey={state.customers[0]?.id ?? 'staff'} />
        <OutdoorReflections3D isNight={isNight} />

        {!isNight && <Sky sunPosition={[10, 20, 10]} />}

        <AttractiveCityScenery3D isNight={isNight} gameSpeed={state.gameSpeed} />
        <RestaurantContents3D state={state} actions={actions} cutaway={cutaway} isNight={isNight}/>
      </Canvas>
    </div>
  );
}

export function RestaurantOrders({state,actions}:{state:GameState;actions:any}){
  const groupedOrders = useMemo(() => {
    const groups: Record<string, typeof state.orders> = {};
    state.orders.forEach(order => {
      if (!groups[order.tableId]) groups[order.tableId] = [];
      groups[order.tableId].push(order);
    });
    return groups;
  }, [state.orders]);


return <>
      {/* RESTAURANT ORDER TICKETS */}
      <div className="order-queue absolute left-0 right-0 px-4 z-10 pointer-events-none flex gap-3 overflow-x-auto items-start">
        {Object.entries(groupedOrders).map(([tableId, tableOrders]) => {

          const isOnline = tableId.startsWith('online_');
          const appName = isOnline ? tableId.split('_')[1] : '';
          const tableIndex = !isOnline ? state.tables.findIndex(t => t.id === tableId) + 1 : 0;

          const allReady = tableOrders.every(o => o.state === 'ready');
          const anyCooking = tableOrders.some(o => o.state === 'cooking');
          const anyOnFire = tableOrders.some(o => o.isOnFire);

          return (
            <div
              key={tableId}
              className={`pointer-events-auto w-[170px] rounded-lg p-2.5 flex flex-col shadow-xl border-4 relative transition-colors ${
                anyOnFire ? 'border-red-600 bg-red-100 animate-pulse' :
                isOnline ? 'border-blue-800' : 'border-stone-800'
              } ${
                !anyOnFire && allReady ? 'bg-green-100' :
                !anyOnFire && anyCooking ? 'bg-orange-100' :
                !anyOnFire ? 'bg-white' : ''
              }`}
            >
              <div className="flex justify-between items-center border-b-2 border-stone-300 pb-1 mb-2">
                {isOnline ? (
                  <span className="font-black text-[10px] text-blue-700 uppercase drop-shadow-sm flex items-center gap-1">
                    {appName==='pickup'?'🥡 Counter pickup':`📱 ${appName}`}
                  </span>
                ) : (
                  <span className="font-black text-xs text-stone-800 uppercase">Table {tableIndex}</span>
                )}
                <span className="font-bold text-[10px] text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded shadow-inner">{tableOrders.length} Items</span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mb-2">
                {tableOrders.map(order => (
                  <div key={order.id} className={`relative flex flex-col items-center p-1 rounded border border-stone-300 ${order.isOnFire ? 'bg-red-200 border-red-500' : 'bg-white/50'}`}>
                    <FoodIllustration recipeId={order.recipeId} name={state.recipes.find(recipe => recipe.id === order.recipeId)?.name ?? 'Prepared dish'} />
                    <div className="w-8 h-1.5 mt-1 bg-stone-300 rounded-full overflow-hidden border border-stone-500">
                      <div
                        className={`h-full transition-all duration-100 ease-linear ${order.isOnFire ? 'bg-red-500' : order.state === 'ready' ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {state.restaurantType==='cafe'&&tableOrders.some(o=>o.state==='ready'&&isPastry(o.recipeId))&&<span className="text-[10px] font-bold text-center">{tableOrders.some(o=>isPastry(o.recipeId)&&o.readyAt!==undefined&&(state.time-o.readyAt)*1.8>10)?'Pastries cooling · serve now':'Fresh from the bakery'}</span>}

              {!allReady && <button className="w-full mb-2 rounded border border-amber-500 bg-amber-50 text-amber-900 text-[10px] font-bold py-1" aria-pressed={state.priorityTableId === tableId} onClick={() => actions.prioritizeTable(tableId)}>{state.priorityTableId === tableId ? '★ Kitchen priority' : 'Prioritize this table'}</button>}

              {!allReady && <span className="block text-center text-[10px] text-stone-600 py-1">Your chef is preparing this order</span>}
              {allReady && !isOnline && (
                <button
                  onClick={() => tableOrders.forEach(o => { if(o.state === 'ready') actions.serveFood(o.id) })}
                  className="w-full py-1.5 bg-green-500 hover:bg-green-400 active:scale-95 text-white rounded text-[10px] font-black border-2 border-stone-800 transition-all animate-pulse shadow-sm"
                >
                  SERVE TABLE
                </button>
              )}
              {allReady && isOnline && (
                <span className="w-full py-1.5 bg-blue-500 text-white rounded text-[10px] font-black border-2 border-stone-800 text-center animate-pulse shadow-sm">
                  {appName==='pickup'?'READY TO COLLECT':'DRIVER ARRIVING...'}
                </span>
              )}
            </div>
          );
        })}
      </div>

</>;
}

export function RestaurantContents3D({state,actions,cutaway=true,isNight=false}:{state:GameState;actions:any;cutaway?:boolean;isNight?:boolean}){
const isNearDoor=state.customers.some(c=>c.state==='entering'||c.state==='leaving');
const identity=state.restaurantIdentity??'diner';
return <>
        <group position={[0,0,4]} scale={[40/30,1,38/30]}><AttractiveFloor3D/>{!cutaway&&<CeilingBeams3D/>}</group><RestaurantIdentity3D identity={identity} isNight={isNight} terrace={state.advanced?.terrace} level={state.restaurantType?restaurantLevel(state):1}/>

        {/* Ambient warm dining area pendant lights */}
        <PendantLamp3D position={[-7, 9.8, -2]} isNight={isNight} />
        <PendantLamp3D position={[7, 9.8, -2]} isNight={isNight} />
        <PendantLamp3D position={[-7, 9.8, 6]} isNight={isNight} />
        <PendantLamp3D position={[7, 9.8, 6]} isNight={isNight} />

        {/* Corner architectural houseplants */}
        <IndoorPlant3D position={[-18.5, 0, -13.5]} type="tall" />
        <IndoorPlant3D position={[18.5, 0, -13.5]} type="fiddle" />
        <IndoorPlant3D position={[-18.5, 0, 21]} type="palm" />
        <IndoorPlant3D position={[18.5, 0, 21]} type="fiddle" />

        {isNight && <pointLight position={[0, 6, 0]} intensity={75} distance={32} color="#ffdab1" />}

        <RestaurantShell3D appearance={restaurantAppearance(identity,state)} cutaway={cutaway} roof={false} isNight={isNight} doorOpen={isNearDoor}/>
        <Lantern position={[-8, 8, -10]} />
        <Lantern position={[8, 8, -10]} />
        <Lantern position={[-10, 8, 0]} />
        <Lantern position={[10, 8, 0]} />


        {/* Upgraded Service Counter, Bar, Espresso Machine & Pastry Case */}
        {identity==='diner'&&<AttractiveBarCounter3D isNight={isNight} />}

        {/* Commercial Kitchen Gas Stove Burners & Simmering Stockpots behind counter */}
        {identity!=='cafe'&&<GasBurners3D position={[-2, 0, -12.6]} />}

        {/* Dynamic Volumetric Steam rising from Espresso Machine & Soup Pots */}
        <SteamParticles3D position={[-7, 3.4, -10.3]} count={6} spread={0.2} />
        <SteamParticles3D position={[-4.7, 2.7, -12.6]} count={5} spread={0.25} />
        <SteamParticles3D position={[0.7, 2.7, -12.6]} count={5} spread={0.25} />

        {/* Warm Ambient Dust Motes in Lighting Beams */}
        <AmbientDustMotes3D count={28} />

        {/* Exterior Neon 3D Restaurant Marquee over entrance */}

        {identity==='cafe'&&<><CatTree position={[17.8, 0, 21]} /><Cat position={[17.5, 2.3, 21]} rotation={[0, -Math.PI/4, 0]} color="#1c1917" /></>}

        {/* Upgraded Bistro Tables & Chairs */}
        {state.tables.map((table, i) => {
          const isEating = state.customers.some(c => c.tableId === table.id && c.state === 'eating');
          const servedRecipeIds = state.customers.find(c => c.tableId === table.id && c.state === 'eating')?.servedRecipeIds;
          return <BistroTable3D key={table.id} table={table} index={i} identity={identity} level={restaurantLevel(state)} isEating={isEating} servedRecipeIds={servedRecipeIds} actions={actions} />
        })}

        <Suspense fallback={null}>
          {state.customers.filter(customer=>state.tables.some(table=>table.id===customer.tableId)).map(customer => (
            <Customer3D key={customer.id} customer={customer} tables={state.tables} table={state.tables.find(t => t.id === customer.tableId)} actions={actions} staff={state.staff} gameSpeed={state.gameSpeed}/>
          ))}
          {state.customers.filter(customer=>isPickup(customer.tableId)).map(customer=><PickupGuest3D key={customer.id} customer={customer} gameSpeed={state.gameSpeed}/>)}
          {Array.from({ length: state.staff.chefs }).map((_, i) => (
            <Chef3D key={`chef-${i}`} index={i} state={state} actions={actions} />
          ))}
          {Array.from({ length: state.staff.waiters }).map((_, i) => (
            <Waiter3D key={`waiter-${i}`} index={i} state={state} actions={actions} />
          ))}
          {Array.from({ length: state.staff.cleaners || 0 }).map((_, i) => (
            <Cleaner3D key={`cleaner-${i}`} index={i} state={state} actions={actions} />
          ))}
        </Suspense>

</>;
}
