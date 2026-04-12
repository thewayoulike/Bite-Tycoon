import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Cylinder, Sphere, Plane, Html, Cone, Sky } from '@react-three/drei';
import { GameState } from '../hooks/useGameLoop';
import * as THREE from 'three';

// Helper to map 2D percentages (0-100) to 3D coordinates (-10 to 10)
const mapPos = (percent: number) => (percent / 100) * 20 - 10;

const getFoodEmoji = (id: string) => {
  const foods = ['🍔', '🍕', '🌭', '🌮', '🥗', '🍝', '🍣', '🍜', '🥩', '🥪'];
  const charCodeSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return foods[charCodeSum % foods.length];
};

const Person3D = ({ position, color, isWalking, isSitting, role, seed = 0 }: { position: [number, number, number], color: string, isWalking: boolean, isSitting?: boolean, role?: 'chef' | 'waiter' | 'customer', seed?: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const skinColors = ["#fcd34d", "#fca5a5", "#d6a262", "#8b5a2b", "#ffcda2"];
  const hairColors = ["#1c1917", "#451a03", "#fef08a", "#ea580c", "#78350f"];
  const pantsColors = ["#1e293b", "#334155", "#0f172a", "#475569"];

  const skinColor = role === 'customer' ? skinColors[seed % skinColors.length] : "#ffcda2";
  const hairColor = role === 'customer' ? hairColors[(seed * 2) % hairColors.length] : "#1c1917";
  const pantsColor = role === 'chef' ? '#ffffff' : role === 'waiter' ? '#1a1a1a' : pantsColors[seed % pantsColors.length];
  const shirtColor = role === 'waiter' ? '#ffffff' : role === 'chef' ? '#ffffff' : color;
  const shoeColor = "#1c1917";

  useFrame((state) => {
    if (isSitting) {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -Math.PI / 2, 0.1);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -Math.PI / 2, 0.1);
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      }
      if (bodyRef.current) {
         bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.7, 0.1);
         bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, 0, 0.1);
      }
    } else if (isWalking) {
      const t = state.clock.getElapsedTime() * 10;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(t) * 0.6;
        rightLegRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        if (role === 'waiter') {
          rightArmRef.current.rotation.x = -Math.PI / 2; // Hold tray
        } else {
          rightArmRef.current.rotation.x = Math.sin(t) * 0.6;
        }
      }
      if (bodyRef.current) {
         bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(t * 2)) * 0.05;
         bodyRef.current.rotation.y = Math.sin(t) * 0.1;
      }
    } else {
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.1);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.1);
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        if (role === 'waiter') {
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.PI / 2, 0.1);
        } else {
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
        }
      }
      if (bodyRef.current) {
         bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 1.1, 0.1);
         bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, 0, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={bodyRef} position={[0, 1.1, 0]}>
        {/* Neck */}
        <Cylinder args={[0.06, 0.08, 0.15, 16]} position={[0, 0.45, 0]}>
          <meshStandardMaterial color={skinColor} />
        </Cylinder>

        {/* Head */}
        <group position={[0, 0.7, 0]}>
          {/* Head Base */}
          <Sphere args={[0.22, 32, 32]} scale={[1.05, 0.95, 1]}>
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </Sphere>

          {/* Ears */}
          <Sphere args={[0.04, 16, 16]} position={[-0.22, 0, 0.02]} scale={[0.5, 1, 1]}>
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </Sphere>
          <Sphere args={[0.04, 16, 16]} position={[0.22, 0, 0.02]} scale={[0.5, 1, 1]}>
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </Sphere>
          
          {/* Face Elements */}
          <group position={[0, -0.02, 0.2]}>
            {/* Left Eye */}
            <group position={[-0.08, 0.05, 0]}>
              {/* White */}
              <Sphere args={[0.035, 16, 16]} scale={[1, 1.3, 0.2]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
              {/* Pupil */}
              <Sphere args={[0.022, 16, 16]} scale={[1, 1.3, 0.2]} position={[0.005, 0, 0.005]}>
                <meshStandardMaterial color="#291e17" />
              </Sphere>
              {/* Highlight */}
              <Sphere args={[0.006, 8, 8]} scale={[1, 1, 0.5]} position={[0.01, 0.01, 0.01]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
            </group>

            {/* Right Eye */}
            <group position={[0.08, 0.05, 0]}>
              {/* White */}
              <Sphere args={[0.035, 16, 16]} scale={[1, 1.3, 0.2]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
              {/* Pupil */}
              <Sphere args={[0.022, 16, 16]} scale={[1, 1.3, 0.2]} position={[-0.005, 0, 0.005]}>
                <meshStandardMaterial color="#291e17" />
              </Sphere>
              {/* Highlight */}
              <Sphere args={[0.006, 8, 8]} scale={[1, 1, 0.5]} position={[-0.002, 0.01, 0.01]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
            </group>
            
            {/* Eyebrows */}
            <mesh position={[-0.08, 0.12, -0.02]} rotation={[0, 0, -0.1]}>
              <capsuleGeometry args={[0.006, 0.03, 4, 8]} />
              <meshStandardMaterial color="#291e17" />
            </mesh>
            <mesh position={[0.08, 0.12, -0.02]} rotation={[0, 0, 0.1]}>
              <capsuleGeometry args={[0.006, 0.03, 4, 8]} />
              <meshStandardMaterial color="#291e17" />
            </mesh>

            {/* Nose */}
            <Sphere args={[0.015, 16, 16]} position={[0, 0.01, 0.02]} scale={[1.2, 0.8, 0.5]}>
              <meshStandardMaterial color={skinColor} roughness={0.7} />
            </Sphere>
            
            {/* Mouth (Smile) */}
            <mesh position={[0, -0.03, 0.01]} rotation={[0.2, 0, Math.PI]}>
              <torusGeometry args={[0.02, 0.004, 16, 32, Math.PI * 0.6]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
          </group>

          {/* Hair (Chunky Cartoon Style) */}
          {role !== 'chef' && (
            <group position={[0, 0.18, -0.05]}>
              <Sphere args={[0.23, 16, 16]} position={[0, 0, 0]} scale={[1.05, 0.8, 1.05]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              {/* Front bangs */}
              <Sphere args={[0.1, 16, 16]} position={[-0.1, -0.05, 0.18]} scale={[1, 1, 0.5]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              <Sphere args={[0.12, 16, 16]} position={[0.05, -0.08, 0.19]} scale={[1, 1, 0.5]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              <Sphere args={[0.08, 16, 16]} position={[0.15, -0.04, 0.15]} scale={[1, 1, 0.5]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              {/* Side/Back bulk */}
              <Sphere args={[0.15, 16, 16]} position={[-0.15, -0.1, -0.05]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              <Sphere args={[0.15, 16, 16]} position={[0.15, -0.1, -0.05]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
              <Sphere args={[0.18, 16, 16]} position={[0, -0.15, -0.15]}>
                <meshStandardMaterial color={hairColor} />
              </Sphere>
            </group>
          )}
          {/* Chef Hat */}
          {role === 'chef' && (
            <group position={[0, 0.2, 0]}>
              <Cylinder args={[0.15, 0.15, 0.25, 32]} position={[0, 0, 0]}><meshStandardMaterial color="#ffffff" /></Cylinder>
              <Sphere args={[0.22, 32, 32]} position={[0, 0.15, 0]} scale={[1, 0.8, 1]}><meshStandardMaterial color="#ffffff" /></Sphere>
            </group>
          )}
        </group>

        {/* Torso */}
        <Cylinder args={[0.22, 0.18, 0.7, 32]} position={[0, 0.05, 0]}>
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </Cylinder>
        
        {/* Waiter Apron */}
        {role === 'waiter' && (
          <Cylinder args={[0.19, 0.19, 0.4, 32]} position={[0, -0.15, 0.01]}>
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </Cylinder>
        )}
        {/* Chef Apron */}
        {role === 'chef' && (
          <Cylinder args={[0.19, 0.19, 0.5, 32]} position={[0, -0.1, 0.01]}>
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </Cylinder>
        )}
        {/* Waiter Bowtie */}
        {role === 'waiter' && (
          <group position={[0, 0.35, 0.2]}>
            <Cone args={[0.05, 0.1, 16]} rotation={[0, 0, Math.PI/2]} position={[-0.05, 0, 0]}><meshStandardMaterial color="#ef4444" /></Cone>
            <Cone args={[0.05, 0.1, 16]} rotation={[0, 0, -Math.PI/2]} position={[0.05, 0, 0]}><meshStandardMaterial color="#ef4444" /></Cone>
            <Sphere args={[0.02, 16, 16]}><meshStandardMaterial color="#ef4444" /></Sphere>
          </group>
        )}

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.28, 0.35, 0]}>
          <Sphere args={[0.07, 16, 16]}><meshStandardMaterial color={shirtColor} /></Sphere>
          <Cylinder args={[0.05, 0.04, 0.5, 16]} position={[-0.02, -0.25, 0]} rotation={[0, 0, -0.1]}>
            <meshStandardMaterial color={skinColor} />
          </Cylinder>
          {/* Sleeve */}
          <Cylinder args={[0.07, 0.06, 0.25, 16]} position={[-0.01, -0.12, 0]} rotation={[0, 0, -0.1]}>
            <meshStandardMaterial color={shirtColor} />
          </Cylinder>
          {/* Hand */}
          <Sphere args={[0.05, 16, 16]} position={[-0.04, -0.5, 0]}><meshStandardMaterial color={skinColor} /></Sphere>
        </group>

        <group ref={rightArmRef} position={[0.28, 0.35, 0]}>
          <Sphere args={[0.07, 16, 16]}><meshStandardMaterial color={shirtColor} /></Sphere>
          <Cylinder args={[0.05, 0.04, 0.5, 16]} position={[0.02, -0.25, 0]} rotation={[0, 0, 0.1]}>
            <meshStandardMaterial color={skinColor} />
          </Cylinder>
          {/* Sleeve */}
          <Cylinder args={[0.07, 0.06, 0.25, 16]} position={[0.01, -0.12, 0]} rotation={[0, 0, 0.1]}>
            <meshStandardMaterial color={shirtColor} />
          </Cylinder>
          {/* Hand */}
          <Sphere args={[0.05, 16, 16]} position={[0.04, -0.5, 0]}><meshStandardMaterial color={skinColor} /></Sphere>
          
          {/* Waiter Tray */}
          {role === 'waiter' && (
            <group position={[0.04, -0.55, 0.15]} rotation={[Math.PI/2, 0, 0]}>
              <Cylinder args={[0.25, 0.25, 0.02, 32]}><meshStandardMaterial color="#94a3b8" metalness={0.8} /></Cylinder>
              <Cylinder args={[0.04, 0.03, 0.15, 16]} position={[0.1, 0.08, 0]}><meshStandardMaterial color="#bae6fd" transparent opacity={0.6} /></Cylinder>
              <Cylinder args={[0.04, 0.03, 0.15, 16]} position={[-0.1, 0.08, 0.1]}><meshStandardMaterial color="#bae6fd" transparent opacity={0.6} /></Cylinder>
            </group>
          )}
        </group>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.12, 0.7, 0]}>
        <Sphere args={[0.08, 16, 16]}><meshStandardMaterial color={pantsColor} /></Sphere>
        <Cylinder args={[0.08, 0.06, 0.7, 16]} position={[0, -0.35, 0]}>
          <meshStandardMaterial color={pantsColor} />
        </Cylinder>
        {/* Shoe */}
        <mesh position={[0, -0.75, 0.05]} rotation={[Math.PI/2, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.15, 16, 16]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.12, 0.7, 0]}>
        <Sphere args={[0.08, 16, 16]}><meshStandardMaterial color={pantsColor} /></Sphere>
        <Cylinder args={[0.08, 0.06, 0.7, 16]} position={[0, -0.35, 0]}>
          <meshStandardMaterial color={pantsColor} />
        </Cylinder>
        {/* Shoe */}
        <mesh position={[0, -0.75, 0.05]} rotation={[Math.PI/2, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.15, 16, 16]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
      </group>
    </group>
  );
};

const CustomerMember3D = ({ 
  index, 
  isSitting, 
  isWalking, 
  color, 
  seed 
}: { 
  index: number, 
  isSitting: boolean, 
  isWalking: boolean, 
  color: string, 
  seed: number 
}) => {
  const ref = useRef<THREE.Group>(null);

  // Chair positions relative to table center
  const chairPositions = [
    { pos: [-1.5, 0, 0], rot: Math.PI / 2 },
    { pos: [1.5, 0, 0], rot: -Math.PI / 2 },
    { pos: [0, 0, -1.5], rot: 0 },
    { pos: [0, 0, 1.5], rot: Math.PI },
  ];

  // When walking, cluster them together. When sitting, move to chairs.
  const walkPos = [
    (index % 2 === 0 ? 1 : -1) * 0.5 * Math.floor(index / 2),
    0,
    (index % 2 === 0 ? -1 : 1) * 0.5 * Math.floor((index + 1) / 2)
  ];
  
  const targetPos = isSitting ? chairPositions[index].pos : walkPos;
  const targetRot = isSitting ? chairPositions[index].rot : 0;

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetPos[0], delta * 5);
      ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetPos[2], delta * 5);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRot, delta * 5);
    }
  });

  return (
    <group ref={ref} position={walkPos as [number, number, number]}>
      <Person3D 
        position={[0, 0, 0]} 
        color={color} 
        isWalking={isWalking} 
        isSitting={isSitting} 
        role="customer" 
        seed={seed} 
      />
    </group>
  );
};

const Customer3D = ({ customer, table, actions, staff }: { customer: any, table: any, actions: any, staff: any }) => {
  const ref = useRef<THREE.Group>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  
  const seed = parseInt(customer.id.replace(/\D/g, '')) || 0;
  
  // Determine group size (1 to 4) based on seed
  const groupSize = useMemo(() => {
    return (seed % 4) + 1;
  }, [seed]);
  
  // Target position (center of table)
  let targetX = table ? mapPos(table.x) : 0;
  let targetZ = table ? mapPos(table.y) : 0;
  
  if (customer.state === 'leaving') {
    targetX = -15; // Walk off screen
    targetZ = 5;
  } else if (customer.state === 'entering') {
    // Start position if just entering
    if (!ref.current) {
      targetX = -15;
      targetZ = 5;
    }
  }

  // Smooth movement
  useFrame((state, delta) => {
    if (ref.current) {
      const dist = Math.sqrt(
        Math.pow(targetX - ref.current.position.x, 2) + 
        Math.pow(targetZ - ref.current.position.z, 2)
      );
      
      if (dist > 0.1) {
        setIsWalking(true);
        setIsSitting(false);
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, delta * 2);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, targetZ, delta * 2);
        
        // Look at target
        const angle = Math.atan2(targetX - ref.current.position.x, targetZ - ref.current.position.z);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, angle, delta * 5);
      } else {
        setIsWalking(false);
        if (table && customer.state !== 'leaving' && customer.state !== 'entering') {
          setIsSitting(true);
          ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0, delta * 5);
        } else {
          setIsSitting(false);
          ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0, delta * 5);
        }
      }
    }
  });

  // Color based on patience
  const color = customer.state === 'eating' ? '#4ade80' : 
                customer.patience > 50 ? '#60a5fa' : 
                customer.patience > 25 ? '#fb923c' : '#ef4444';

  // Chair positions relative to table center
  const chairPositions = [
    { pos: [-1.5, 0, 0], rot: Math.PI / 2 },
    { pos: [1.5, 0, 0], rot: -Math.PI / 2 },
    { pos: [0, 0, -1.5], rot: 0 },
    { pos: [0, 0, 1.5], rot: Math.PI },
  ];

  return (
    <group ref={ref} position={[-15, 0, 5]}>
      {/* Render group members */}
      {Array.from({ length: groupSize }).map((_, i) => (
        <CustomerMember3D 
          key={i}
          index={i}
          isSitting={isSitting}
          isWalking={isWalking}
          color={color}
          seed={seed + i}
        />
      ))}
      
      {/* Status Text & Actions */}
      {customer.state !== 'entering' && customer.state !== 'leaving' && (
        <Html position={[0, 4.5, 0]} center>
          <div className="flex flex-col items-center pointer-events-none">
            <div className="w-16 h-2 bg-white rounded-full overflow-hidden mb-1 border border-stone-800 shadow-md">
              <div 
                className={`h-full transition-all duration-100 ease-linear ${
                  customer.state === 'eating' ? 'bg-green-400' :
                  customer.patience > 50 ? 'bg-blue-400' : 
                  customer.patience > 25 ? 'bg-orange-400' : 'bg-red-500'
                }`}
                style={{ width: `${(customer.patience / customer.maxPatience) * 100}%` }}
              />
            </div>
            {customer.state === 'waiting_order' && staff.waiters === 0 && (
              <button 
                onClick={() => actions.takeOrder(customer.id)}
                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black rounded shadow-md border border-stone-800 pointer-events-auto"
              >
                ORDER
              </button>
            )}
            {customer.state === 'waiting_order' && staff.waiters > 0 && (
              <span className="text-[10px] font-black text-stone-800 bg-white px-1 rounded border border-stone-800">WAITING</span>
            )}
            {customer.state === 'waiting_food' && (
              <span className="text-[10px] font-black text-stone-800 bg-white px-1 rounded border border-stone-800">HUNGRY</span>
            )}
            {customer.state === 'eating' && (
              <span className="text-[10px] font-black text-stone-800 bg-white px-1 rounded border border-stone-800">EATING</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

const Waiter3D = ({ index, state }: { index: number, state: GameState }) => {
  const ref = useRef<THREE.Group>(null);
  const [target, setTarget] = useState([-5 + index * 2, -8]);
  const [isWalking, setIsWalking] = useState(false);

  useFrame((threeState, delta) => {
    // Randomly move around the counter area or to tables if there are orders
    if (Math.random() < 0.01) {
      // Find a table that needs serving or taking order
      const needsService = state.customers.find(c => c.state === 'waiting_order' || c.state === 'waiting_food');
      if (needsService) {
        const table = state.tables.find(t => t.id === needsService.tableId);
        if (table) {
          setTarget([mapPos(table.x) + (Math.random() * 2 - 1), mapPos(table.y) - 2]);
        }
      } else {
        // Idle near counter
        setTarget([-5 + index * 2 + (Math.random() * 4 - 2), -6 + (Math.random() * 2 - 1)]);
      }
    }

    if (ref.current) {
      const dist = Math.sqrt(
        Math.pow(target[0] - ref.current.position.x, 2) + 
        Math.pow(target[1] - ref.current.position.z, 2)
      );
      
      if (dist > 0.1) {
        setIsWalking(true);
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, target[0], delta * 2);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, target[1], delta * 2);
        
        const angle = Math.atan2(target[0] - ref.current.position.x, target[1] - ref.current.position.z);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, angle, delta * 5);
      } else {
        setIsWalking(false);
      }
    }
  });

  return (
    <group ref={ref} position={[-5 + index * 2, 0, -8]}>
      <Person3D position={[0, 0, 0]} color="#1e293b" isWalking={isWalking} role="waiter" seed={index} />
    </group>
  );
};

const Chef3D = ({ index, state }: { index: number, state: GameState }) => {
  const ref = useRef<THREE.Group>(null);
  const [target, setTarget] = useState([-5 + index * 2, -12.5]);
  const [isWalking, setIsWalking] = useState(false);

  useFrame((threeState, delta) => {
    if (Math.random() < 0.02) {
      setTarget([-5 + index * 2 + (Math.random() * 4 - 2), -12.5 + (Math.random() * 1 - 0.5)]);
    }

    if (ref.current) {
      const dist = Math.sqrt(
        Math.pow(target[0] - ref.current.position.x, 2) + 
        Math.pow(target[1] - ref.current.position.z, 2)
      );
      
      if (dist > 0.1) {
        setIsWalking(true);
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, target[0], delta * 2);
        ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, target[1], delta * 2);
        
        const angle = Math.atan2(target[0] - ref.current.position.x, target[1] - ref.current.position.z);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, angle, delta * 5);
      } else {
        setIsWalking(false);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0, delta * 5);
      }
    }
  });

  return (
    <group ref={ref} position={[-5 + index * 2, 0, -12.5]}>
      <Person3D position={[0, 0, 0]} color="#f8fafc" isWalking={isWalking} role="chef" seed={index} />
    </group>
  );
};

const Cat = ({ position, rotation, color }: { position: [number, number, number], rotation?: [number, number, number], color: string }) => {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Body */}
      <Box args={[0.3, 0.3, 0.6]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      {/* Head */}
      <Sphere args={[0.2, 16, 16]} position={[0, 0.4, 0.3]}>
        <meshStandardMaterial color={color} />
      </Sphere>
      {/* Ears */}
      <Cone args={[0.08, 0.15, 4]} position={[-0.1, 0.55, 0.35]} rotation={[0, Math.PI/4, 0]}>
        <meshStandardMaterial color={color} />
      </Cone>
      <Cone args={[0.08, 0.15, 4]} position={[0.1, 0.55, 0.35]} rotation={[0, Math.PI/4, 0]}>
        <meshStandardMaterial color={color} />
      </Cone>
      {/* Tail */}
      <Cylinder args={[0.04, 0.04, 0.4]} position={[0, 0.3, -0.35]} rotation={[Math.PI/4, 0, 0]}>
        <meshStandardMaterial color={color} />
      </Cylinder>
    </group>
  );
};

const CatTree = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Base */}
      <Box args={[2, 0.2, 2]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#fef3c7" />
      </Box>
      {/* Pole 1 */}
      <Cylinder args={[0.15, 0.15, 2, 16]} position={[-0.5, 1.1, 0]}>
        <meshStandardMaterial color="#e5e5e5" />
      </Cylinder>
      {/* Platform 1 */}
      <Box args={[1.5, 0.2, 1.5]} position={[-0.5, 2.2, 0]}>
        <meshStandardMaterial color="#fef3c7" />
      </Box>
      {/* Pole 2 */}
      <Cylinder args={[0.15, 0.15, 1.5, 16]} position={[0.5, 0.85, 0.5]}>
        <meshStandardMaterial color="#e5e5e5" />
      </Cylinder>
      {/* Platform 2 */}
      <Box args={[1.2, 0.2, 1.2]} position={[0.5, 1.7, 0.5]}>
        <meshStandardMaterial color="#fef3c7" />
      </Box>
    </group>
  );
};

const RestaurantWall = ({ position, rotation, width, height }: { position: [number, number, number], rotation: [number, number, number], width: number, height: number }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Wall (Wainscoting) */}
      <Box args={[width, height * 0.4, 0.4]} position={[0, height * 0.2, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </Box>
      {/* Upper Wall (Wallpaper/Paint) */}
      <Box args={[width, height * 0.6, 0.2]} position={[0, height * 0.7, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#fef3c7" roughness={1} />
      </Box>
      {/* Trim / Chair Rail */}
      <Box args={[width, 0.15, 0.45]} position={[0, height * 0.4, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#451a03" />
      </Box>
      {/* Baseboard */}
      <Box args={[width, 0.2, 0.45]} position={[0, 0.1, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#451a03" />
      </Box>
      {/* Crown Molding */}
      <Box args={[width, 0.3, 0.45]} position={[0, height - 0.15, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#451a03" />
      </Box>
      
      {/* Decorative Wall Panels / Art */}
      {Array.from({ length: Math.floor(width / 4) }).map((_, i) => (
        <group key={i} position={[-width/2 + 2 + i * 4, height * 0.7, 0.15]}>
          {/* Frame */}
          <Box args={[1.6, 2.1, 0.05]}>
            <meshStandardMaterial color="#451a03" />
          </Box>
          {/* Canvas */}
          <Box args={[1.4, 1.9, 0.06]}>
            <meshStandardMaterial color="#fffbeb" />
          </Box>
          {/* Art (Abstract shape) */}
          <Box args={[0.8, 0.8, 0.07]} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <meshStandardMaterial color="#ef4444" />
          </Box>
        </group>
      ))}
    </group>
  );
};

const Lantern = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <Cylinder args={[0.4, 0.4, 1.2, 16]} position={[0, -0.6, 0]}>
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </Cylinder>
      <Cylinder args={[0.45, 0.45, 0.1, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1c1917" />
      </Cylinder>
      <Cylinder args={[0.45, 0.45, 0.1, 16]} position={[0, -1.2, 0]}>
        <meshStandardMaterial color="#1c1917" />
      </Cylinder>
      <pointLight position={[0, -0.6, 0]} intensity={0.5} color="#fca5a5" distance={10} />
    </group>
  );
};

const Table3D = ({ table, index, state }: { table: any, index: number, state: GameState }) => {
  const x = mapPos(table.x);
  const z = mapPos(table.y);
  
  const customerAtTable = state.customers.find(c => c.tableId === table.id);
  const isEating = customerAtTable?.state === 'eating';

  return (
    <group position={[x, 0, z]}>
      {/* Table Base (Pedestal) */}
      <Cylinder args={[0.4, 0.4, 0.05, 32]} position={[0, 0.025, 0]}>
        <meshStandardMaterial color="#78350f" />
      </Cylinder>
      <Cylinder args={[0.08, 0.08, 1, 16]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#78350f" />
      </Cylinder>
      
      {/* Table Top */}
      <Cylinder args={[1.2, 1.2, 0.1, 32]} position={[0, 1.05, 0]}>
        <meshStandardMaterial color="#f8fafc" />
      </Cylinder>

      {/* Chairs */}
      <group position={[-1.4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Seat */}
        <Box args={[0.6, 0.1, 0.6]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Backrest */}
        <Box args={[0.6, 0.8, 0.1]} position={[0, 0.95, -0.25]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Legs */}
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
      </group>
      <group position={[1.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Seat */}
        <Box args={[0.6, 0.1, 0.6]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Backrest */}
        <Box args={[0.6, 0.8, 0.1]} position={[0, 0.95, -0.25]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Legs */}
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
      </group>
      <group position={[0, 0, -1.4]} rotation={[0, 0, 0]}>
        {/* Seat */}
        <Box args={[0.6, 0.1, 0.6]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Backrest */}
        <Box args={[0.6, 0.8, 0.1]} position={[0, 0.95, -0.25]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Legs */}
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
      </group>
      <group position={[0, 0, 1.4]} rotation={[0, Math.PI, 0]}>
        {/* Seat */}
        <Box args={[0.6, 0.1, 0.6]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Backrest */}
        <Box args={[0.6, 0.8, 0.1]} position={[0, 0.95, -0.25]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#e06666" />
        </Box>
        {/* Legs */}
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, -0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[-0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
        <Cylinder args={[0.04, 0.04, 0.5]} position={[0.25, 0.25, 0.25]}><meshStandardMaterial color="#d4a373" /></Cylinder>
      </group>
      
      {/* Food Plate */}
      {isEating && (
        <group position={[0, 1.15, 0]}>
          <Cylinder args={[0.3, 0.2, 0.05, 16]}>
            <meshStandardMaterial color="#ffffff" />
          </Cylinder>
          <Box args={[0.15, 0.08, 0.08]} position={[0, 0.08, 0]}>
            <meshStandardMaterial color="#f97316" />
          </Box>
          <Box args={[0.18, 0.04, 0.1]} position={[0, 0.04, 0]}>
            <meshStandardMaterial color="#ffffff" />
          </Box>
        </group>
      )}

      <Text position={[0, 1.15, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#1c1917">
        {`T${index + 1}`}
      </Text>
    </group>
  );
};

const AnimatedDoor = ({ customers }: { customers: any[] }) => {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const isNear = customers.some(c => c.state === 'entering' || c.state === 'leaving');
    
    const targetZLeft = isNear ? -1.5 : -0.75;
    const targetZRight = isNear ? 1.5 : 0.75;

    if (leftDoorRef.current && rightDoorRef.current) {
      leftDoorRef.current.position.z = THREE.MathUtils.lerp(leftDoorRef.current.position.z, targetZLeft, delta * 5);
      rightDoorRef.current.position.z = THREE.MathUtils.lerp(rightDoorRef.current.position.z, targetZRight, delta * 5);
    }
  });

  return (
    <group position={[-14.8, 0, 5]}>
      {/* Door Frame */}
      <Box args={[0.6, 0.2, 3.4]} position={[0, 6.3, 0]}>
        <meshStandardMaterial color="#451a03" />
      </Box>
      <Box args={[0.6, 6.4, 0.1]} position={[0, 3.2, -1.65]}>
        <meshStandardMaterial color="#451a03" />
      </Box>
      <Box args={[0.6, 6.4, 0.1]} position={[0, 3.2, 1.65]}>
        <meshStandardMaterial color="#451a03" />
      </Box>
      
      {/* Left Door */}
      <group ref={leftDoorRef} position={[0, 3.1, -0.75]}>
        {/* Glass */}
        <Box args={[0.1, 6, 1.4]}>
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
        </Box>
        {/* Wooden Frame */}
        <Box args={[0.2, 6, 0.15]} position={[0, 0, 0.65]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 6, 0.15]} position={[0, 0, -0.65]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 0.15, 1.4]} position={[0, 2.9, 0]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 0.3, 1.4]} position={[0, -2.85, 0]}><meshStandardMaterial color="#78350f" /></Box>
        {/* Handle */}
        <Cylinder args={[0.03, 0.03, 0.8]} position={[0.15, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </Cylinder>
      </group>
      
      {/* Right Door */}
      <group ref={rightDoorRef} position={[0, 3.1, 0.75]}>
        {/* Glass */}
        <Box args={[0.1, 6, 1.4]}>
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
        </Box>
        {/* Wooden Frame */}
        <Box args={[0.2, 6, 0.15]} position={[0, 0, 0.65]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 6, 0.15]} position={[0, 0, -0.65]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 0.15, 1.4]} position={[0, 2.9, 0]}><meshStandardMaterial color="#78350f" /></Box>
        <Box args={[0.2, 0.3, 1.4]} position={[0, -2.85, 0]}><meshStandardMaterial color="#78350f" /></Box>
        {/* Handle */}
        <Cylinder args={[0.03, 0.03, 0.8]} position={[0.15, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </Cylinder>
      </group>
    </group>
  );
};

const Tree = ({ position, scale = 1, type = 'pine' }: { position: [number, number, number], scale?: number, type?: 'pine' | 'round' }) => (
  <group position={position} scale={scale}>
    {/* Trunk */}
    <Cylinder args={[0.3, 0.5, 3, 8]} position={[0, 1.5, 0]} castShadow>
      <meshStandardMaterial color="#4a3018" roughness={0.9} />
    </Cylinder>
    {type === 'pine' ? (
      <>
        {/* Pine Leaves Layers */}
        <Cone args={[2.5, 3, 8]} position={[0, 3, 0]} castShadow>
          <meshStandardMaterial color="#1e4d2b" roughness={0.8} />
        </Cone>
        <Cone args={[2, 2.5, 8]} position={[0, 4.5, 0]} castShadow>
          <meshStandardMaterial color="#235c33" roughness={0.8} />
        </Cone>
        <Cone args={[1.5, 2, 8]} position={[0, 6, 0]} castShadow>
          <meshStandardMaterial color="#296b3b" roughness={0.8} />
        </Cone>
      </>
    ) : (
      <>
        {/* Round Leaves */}
        <Sphere args={[2, 16, 16]} position={[0, 3.5, 0]} castShadow>
          <meshStandardMaterial color="#4ade80" roughness={0.8} />
        </Sphere>
        <Sphere args={[1.5, 16, 16]} position={[1, 3, 1]} castShadow>
          <meshStandardMaterial color="#22c55e" roughness={0.8} />
        </Sphere>
        <Sphere args={[1.5, 16, 16]} position={[-1, 3, -1]} castShadow>
          <meshStandardMaterial color="#22c55e" roughness={0.8} />
        </Sphere>
      </>
    )}
  </group>
);

const Car = ({ initialZ, speed, color, direction, xOffset }: { initialZ: number, speed: number, color: string, direction: 1 | -1, xOffset: number }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.position.z += speed * direction * delta;
      if (direction === 1 && ref.current.position.z > 150) ref.current.position.z = -150;
      if (direction === -1 && ref.current.position.z < -150) ref.current.position.z = 150;
    }
  });
  return (
    <group ref={ref} position={[xOffset, 0, initialZ]} rotation={[0, direction === 1 ? 0 : Math.PI, 0]}>
      {/* Chassis */}
      <Box args={[2.2, 0.4, 4.8]} position={[0, 0.6, 0]} castShadow><meshStandardMaterial color="#333" /></Box>
      {/* Main Body */}
      <Box args={[2.4, 1.0, 4.6]} position={[0, 1.1, 0]} castShadow><meshStandardMaterial color={color} metalness={0.6} roughness={0.2} /></Box>
      {/* Cabin */}
      <Box args={[2.0, 0.9, 2.4]} position={[0, 2.0, -0.2]} castShadow><meshStandardMaterial color={color} metalness={0.6} roughness={0.2} /></Box>
      {/* Windows */}
      <Box args={[1.8, 0.7, 2.5]} position={[0, 2.0, -0.2]}><meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} /></Box>
      {/* Wheels */}
      <Cylinder args={[0.5, 0.5, 2.6]} rotation={[0, 0, Math.PI/2]} position={[0, 0.5, 1.4]} castShadow><meshStandardMaterial color="#111" /></Cylinder>
      <Cylinder args={[0.5, 0.5, 2.6]} rotation={[0, 0, Math.PI/2]} position={[0, 0.5, -1.4]} castShadow><meshStandardMaterial color="#111" /></Cylinder>
      {/* Hubcaps */}
      <Cylinder args={[0.3, 0.3, 2.65]} rotation={[0, 0, Math.PI/2]} position={[0, 0.5, 1.4]}><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></Cylinder>
      <Cylinder args={[0.3, 0.3, 2.65]} rotation={[0, 0, Math.PI/2]} position={[0, 0.5, -1.4]}><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></Cylinder>
      {/* Headlights */}
      <Box args={[0.5, 0.3, 0.1]} position={[-0.8, 1.1, 2.3]}><meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} /></Box>
      <Box args={[0.5, 0.3, 0.1]} position={[0.8, 1.1, 2.3]}><meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} /></Box>
      {/* Taillights */}
      <Box args={[0.6, 0.3, 0.1]} position={[-0.7, 1.1, -2.3]}><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} /></Box>
      <Box args={[0.6, 0.3, 0.1]} position={[0.7, 1.1, -2.3]}><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} /></Box>
    </group>
  );
};

const CityBuilding = ({ position, size, color, roofColor, name, rotation = [0,0,0], hasAwning = false }: { position: [number, number, number], size: [number, number, number], color: string, roofColor: string, name: string, rotation?: [number, number, number], hasAwning?: boolean }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Main Building Base */}
      <Box args={size} position={[0, size[1]/2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.7} />
      </Box>
      
      {/* Sloped Roof */}
      <Cone args={[Math.max(size[0], size[2]) * 0.8, size[1] * 0.4, 4]} position={[0, size[1] + (size[1]*0.2), 0]} rotation={[0, Math.PI/4, 0]} castShadow>
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </Cone>

      {/* Windows */}
      <group position={[0, size[1]/2, size[2]/2 + 0.05]}>
        <Box args={[size[0]*0.2, size[1]*0.2, 0.1]} position={[-size[0]*0.25, size[1]*0.2, 0]}>
          <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" emissiveIntensity={0.2} />
        </Box>
        <Box args={[size[0]*0.2, size[1]*0.2, 0.1]} position={[size[0]*0.25, size[1]*0.2, 0]}>
          <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" emissiveIntensity={0.2} />
        </Box>
        <Box args={[size[0]*0.2, size[1]*0.2, 0.1]} position={[-size[0]*0.25, -size[1]*0.1, 0]}>
          <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" emissiveIntensity={0.2} />
        </Box>
        <Box args={[size[0]*0.2, size[1]*0.2, 0.1]} position={[size[0]*0.25, -size[1]*0.1, 0]}>
          <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" emissiveIntensity={0.2} />
        </Box>
      </group>

      {/* Door */}
      <Box args={[size[0]*0.25, size[1]*0.3, 0.1]} position={[0, size[1]*0.15, size[2]/2 + 0.05]}>
        <meshStandardMaterial color="#451a03" />
      </Box>

      {/* Awning */}
      {hasAwning && (
        <group position={[0, size[1]*0.35, size[2]/2 + 0.5]} rotation={[-Math.PI/6, 0, 0]}>
          <Box args={[size[0]*0.8, 0.2, 1.5]} castShadow>
            <meshStandardMaterial color="#ef4444" />
          </Box>
          {/* Stripes */}
          <Box args={[size[0]*0.8*0.8, 0.21, 1.5]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ffffff" />
          </Box>
          <Box args={[size[0]*0.8*0.4, 0.22, 1.5]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ef4444" />
          </Box>
        </group>
      )}

      {/* Sign */}
      <group position={[0, size[1] + 1, size[2]/2 + 0.2]}>
        <Box args={[size[0] * 0.6, 2, 0.5]}>
          <meshStandardMaterial color="#fef3c7" />
        </Box>
        <Text position={[0, 0, 0.26]} fontSize={1.2} color="#991b1b">
          {name}
        </Text>
      </group>
    </group>
  );
};

const Park = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {/* Park Grass Base */}
    <Plane args={[25, 25]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <meshStandardMaterial color="#86efac" />
    </Plane>
    {/* Park Paths */}
    <Plane args={[4, 25]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
      <meshStandardMaterial color="#fca5a5" />
    </Plane>
    <Plane args={[25, 4]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
      <meshStandardMaterial color="#fca5a5" />
    </Plane>
    
    {/* Center Statue/Fountain Base */}
    <Cylinder args={[2.5, 3, 1, 16]} position={[0, 0.5, 0]} castShadow>
      <meshStandardMaterial color="#cbd5e1" />
    </Cylinder>
    <Cylinder args={[1.5, 2, 1.5, 16]} position={[0, 1.5, 0]} castShadow>
      <meshStandardMaterial color="#94a3b8" />
    </Cylinder>
    {/* Statue Figure */}
    <Box args={[0.8, 3, 0.8]} position={[0, 3.5, 0]} castShadow>
      <meshStandardMaterial color="#64748b" />
    </Box>
    <Sphere args={[0.6, 16, 16]} position={[0, 5.2, 0]} castShadow>
      <meshStandardMaterial color="#64748b" />
    </Sphere>

    {/* Park Trees */}
    <Tree position={[-8, 0, -8]} scale={0.8} type="round" />
    <Tree position={[8, 0, -8]} scale={0.9} type="round" />
    <Tree position={[-8, 0, 8]} scale={0.7} type="round" />
    <Tree position={[8, 0, 8]} scale={0.85} type="round" />
  </group>
);

const OutdoorScenery = () => {
  return (
    <group>
      {/* Base Ground (Grass) */}
      <Plane args={[400, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <meshStandardMaterial color="#4ade80" />
      </Plane>
      
      {/* Sidewalk around restaurant (Brick/Terracotta) */}
      <Plane args={[40, 40]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial color="#fca5a5" />
      </Plane>
      
      {/* Main Road */}
      <Plane args={[20, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[-35, -0.15, 0]} receiveShadow>
        <meshStandardMaterial color="#3f3f46" />
      </Plane>
      {/* Road Lines */}
      {Array.from({length: 40}).map((_, i) => (
        <Plane key={i} args={[0.5, 4]} rotation={[-Math.PI / 2, 0, 0]} position={[-35, -0.14, -195 + i * 10]}>
          <meshStandardMaterial color="#facc15" />
        </Plane>
      ))}

      {/* Crosswalk */}
      {Array.from({length: 8}).map((_, i) => (
        <Plane key={`cw-${i}`} args={[2, 0.8]} rotation={[-Math.PI / 2, 0, 0]} position={[-35 + (i * 2.5) - 8.75, -0.14, 5]}>
          <meshStandardMaterial color="#ffffff" />
        </Plane>
      ))}

      {/* Path from restaurant to road */}
      <Plane args={[15, 6]} rotation={[-Math.PI / 2, 0, 0]} position={[-23, -0.1, 5]} receiveShadow>
        <meshStandardMaterial color="#fca5a5" />
      </Plane>

      {/* Traffic (Cars) */}
      <Car initialZ={-50} speed={25} color="#ef4444" direction={1} xOffset={-30} />
      <Car initialZ={20} speed={28} color="#3b82f6" direction={1} xOffset={-30} />
      <Car initialZ={100} speed={22} color="#10b981" direction={1} xOffset={-30} />
      
      <Car initialZ={50} speed={26} color="#f59e0b" direction={-1} xOffset={-40} />
      <Car initialZ={-10} speed={30} color="#8b5cf6" direction={-1} xOffset={-40} />
      <Car initialZ={-120} speed={24} color="#64748b" direction={-1} xOffset={-40} />

      {/* City Buildings across the street */}
      <CityBuilding position={[-60, 0, -30]} size={[15, 12, 15]} color="#fef08a" roofColor="#ef4444" name="PIZZA" rotation={[0, Math.PI/2, 0]} hasAwning />
      <CityBuilding position={[-60, 0, 0]} size={[18, 20, 18]} color="#bfdbfe" roofColor="#1e3a8a" name="HOTEL" rotation={[0, Math.PI/2, 0]} />
      <CityBuilding position={[-60, 0, 30]} size={[15, 10, 15]} color="#fecdd3" roofColor="#831843" name="CAFE" rotation={[0, Math.PI/2, 0]} hasAwning />
      <CityBuilding position={[-60, 0, -60]} size={[16, 15, 16]} color="#d9f99d" roofColor="#14532d" name="SHOP" rotation={[0, Math.PI/2, 0]} />
      <CityBuilding position={[-60, 0, 60]} size={[20, 18, 20]} color="#fed7aa" roofColor="#7c2d12" name="PUB" rotation={[0, Math.PI/2, 0]} hasAwning />
      
      {/* Buildings next to restaurant */}
      <CityBuilding position={[0, 0, -40]} size={[20, 16, 15]} color="#e9d5ff" roofColor="#581c87" name="ARCADE" rotation={[0, 0, 0]} />
      <CityBuilding position={[0, 0, 40]} size={[18, 14, 15]} color="#ffedd5" roofColor="#9a3412" name="BAKERY" rotation={[0, Math.PI, 0]} hasAwning />
      
      {/* Park Area */}
      <Park position={[35, 0, -35]} />

      {/* Trees scattered around */}
      <Tree position={[-20, 0, -15]} scale={1.2} type="round" />
      <Tree position={[-20, 0, 25]} scale={1} type="round" />
      <Tree position={[-48, 0, -15]} scale={1.5} type="pine" />
      <Tree position={[-48, 0, 15]} scale={1.3} type="pine" />
      <Tree position={[25, 0, 15]} scale={1.4} type="round" />
      <Tree position={[20, 0, -20]} scale={1.1} type="pine" />
      <Tree position={[20, 0, 25]} scale={1.2} type="pine" />
      <Tree position={[-20, 0, -35]} scale={1.3} type="round" />
    </group>
  );
};

const RestaurantFloor = () => {
  return (
    <group position={[0, 0, 0]}>
      <Plane args={[30, 30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#451a03" /> {/* Dark wood base */}
      </Plane>
      {/* Wooden planks */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Box key={i} args={[30, 0.02, 1.9]} position={[0, 0.01, -14 + i * 2]} receiveShadow>
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </Box>
      ))}
    </group>
  );
};

export const Scene3D = ({ state, actions }: { state: GameState, actions: any }) => {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-stone-800 shadow-inner bg-sky-200 relative">
      
      {/* HTML Overlay for Orders */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[80%] h-2 bg-gray-400 border-2 border-stone-800 rounded-full z-10 pointer-events-none">
        <div className="absolute top-2 left-0 right-0 flex gap-2 justify-center pointer-events-auto">
          {state.orders.map(order => (
            <div
              key={order.id}
              className={`w-20 rounded p-1 flex flex-col justify-between shadow-lg border-2 border-stone-800 relative ${
                order.state === 'ready' ? 'bg-green-100' :
                order.state === 'cooking' ? 'bg-orange-100' :
                'bg-white'
              }`}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-stone-300 border border-stone-800"></div>
              <div className="flex justify-between items-center mb-1 mt-1">
                <span className="text-lg">{getFoodEmoji(order.id)}</span>
                <span className="text-[8px] font-black text-stone-800">#{order.id.slice(-4)}</span>
              </div>
              <div className="w-full h-1 bg-stone-300 rounded-full overflow-hidden mb-1 border border-stone-800">
                <div 
                  className={`h-full transition-all duration-100 ease-linear ${order.state === 'ready' ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{ width: `${order.progress}%` }}
                />
              </div>
              {order.state !== 'ready' && state.staff.chefs === 0 && (
                <button onClick={() => actions.cookOrder(order.id)} className="w-full py-0.5 bg-orange-500 text-white rounded text-[8px] font-black border border-stone-800">COOK</button>
              )}
              {order.state === 'ready' && state.staff.waiters === 0 && (
                <button onClick={() => actions.serveFood(order.id)} className="w-full py-0.5 bg-green-500 text-white rounded text-[8px] font-black border border-stone-800">SERVE</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [0, 15, 15], fov: 50 }}>
        <ambientLight intensity={0.8} color="#fffbeb" />
        <directionalLight position={[10, 20, 10]} intensity={1.2} color="#fef3c7" castShadow />
        
        <OrbitControls 
          enablePan={true} 
          minPolarAngle={Math.PI / 6} 
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={100}
        />

        <Sky sunPosition={[10, 20, 10]} />
        <OutdoorScenery />

        {/* Floor */}
        <RestaurantFloor />

        {/* Walls */}
        <RestaurantWall position={[0, 0, -15]} rotation={[0, 0, 0]} width={30} height={10} />
        {/* Left Wall split for door */}
        <RestaurantWall position={[-15, 0, -5.8]} rotation={[0, Math.PI / 2, 0]} width={18.4} height={10} />
        <RestaurantWall position={[-15, 0, 10.8]} rotation={[0, Math.PI / 2, 0]} width={8.4} height={10} />
        <RestaurantWall position={[15, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={30} height={10} />

        {/* Lanterns */}
        <Lantern position={[-8, 8, -10]} />
        <Lantern position={[8, 8, -10]} />
        <Lantern position={[-10, 8, 0]} />
        <Lantern position={[10, 8, 0]} />

        {/* Animated Door */}
        <AnimatedDoor customers={state.customers} />

        {/* Sushi Counter */}
        <group position={[0, 0, -10]}>
          {/* Main Counter Base */}
          <Box args={[30, 2, 3]} position={[0, 1, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </Box>
          {/* Counter Trim */}
          <Box args={[30.2, 0.2, 3.2]} position={[0, 0.5, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#292524" />
          </Box>
          {/* Counter Top (Marble/White) */}
          <Box args={[30.2, 0.2, 3.2]} position={[0, 2.1, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
          </Box>
          {/* Glass Display Case */}
          <Box args={[28, 1, 1.5]} position={[0, 2.7, 0.5]} castShadow>
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} roughness={0.1} metalness={0.8} />
          </Box>
          {/* Display Case Frame */}
          <Box args={[28, 0.05, 1.5]} position={[0, 3.2, 0.5]}><meshStandardMaterial color="#94a3b8" /></Box>
          
          {/* Sushi on Belt/Display */}
          <group position={[-10, 2.3, 0.5]}>
            <Cylinder args={[0.3, 0.2, 0.05, 16]}><meshStandardMaterial color="#ffffff" /></Cylinder>
            <Box args={[0.2, 0.1, 0.1]} position={[0, 0.1, 0]}><meshStandardMaterial color="#ef4444" /></Box>
          </group>
          <group position={[-5, 2.3, 0.5]}>
            <Cylinder args={[0.3, 0.2, 0.05, 16]}><meshStandardMaterial color="#bae6fd" /></Cylinder>
            <Box args={[0.2, 0.1, 0.1]} position={[0, 0.1, 0]}><meshStandardMaterial color="#f97316" /></Box>
          </group>
          <group position={[0, 2.3, 0.5]}>
            <Cylinder args={[0.3, 0.2, 0.05, 16]}><meshStandardMaterial color="#ffffff" /></Cylinder>
            <Box args={[0.2, 0.1, 0.1]} position={[0, 0.1, 0]}><meshStandardMaterial color="#10b981" /></Box>
          </group>
          <group position={[5, 2.3, 0.5]}>
            <Cylinder args={[0.3, 0.2, 0.05, 16]}><meshStandardMaterial color="#bae6fd" /></Cylinder>
            <Box args={[0.2, 0.1, 0.1]} position={[0, 0.1, 0]}><meshStandardMaterial color="#ef4444" /></Box>
          </group>
          <group position={[10, 2.3, 0.5]}>
            <Cylinder args={[0.3, 0.2, 0.05, 16]}><meshStandardMaterial color="#ffffff" /></Cylinder>
            <Box args={[0.2, 0.1, 0.1]} position={[0, 0.1, 0]}><meshStandardMaterial color="#f97316" /></Box>
          </group>

          {/* Stools */}
          {Array.from({ length: 8 }).map((_, i) => (
            <group key={i} position={[-14 + i * 4, 0, 2.5]}>
              <Cylinder args={[0.1, 0.3, 1.2]} position={[0, 0.6, 0]}><meshStandardMaterial color="#94a3b8" metalness={0.8} /></Cylinder>
              <Cylinder args={[0.4, 0.4, 0.1]} position={[0, 1.2, 0]}><meshStandardMaterial color="#ef4444" /></Cylinder>
            </group>
          ))}
        </group>

        {/* Cats & Cat Tree */}
        <CatTree position={[12, 0, 10]} />
        <Cat position={[11.5, 2.3, 10]} rotation={[0, -Math.PI/4, 0]} color="#1c1917" /> {/* Black cat on tree */}
        <Cat position={[-8, 2.2, -9.5]} rotation={[0, Math.PI/2, 0]} color="#f97316" /> {/* Orange cat on counter */}

        {/* Cash Register */}
        <group position={[8, 2.2, -10]}>
          <Box args={[1, 0.8, 1]} position={[0, 0.4, 0]}>
            <meshStandardMaterial color="#475569" />
          </Box>
          <Box args={[0.8, 0.6, 0.1]} position={[0, 0.6, 0.5]} rotation={[-0.2, 0, 0]}>
            <meshStandardMaterial color="#1e293b" />
          </Box>
        </group>

        {/* Tables */}
        {state.tables.map((table, i) => (
          <Table3D key={table.id} table={table} index={i} state={state} />
        ))}

        {/* Customers */}
        {state.customers.map(customer => (
          <Customer3D 
            key={customer.id} 
            customer={customer} 
            table={state.tables.find(t => t.id === customer.tableId)} 
            actions={actions}
            staff={state.staff}
          />
        ))}

        {/* Chefs */}
        {Array.from({ length: state.staff.chefs }).map((_, i) => (
          <Chef3D key={`chef-${i}`} index={i} state={state} />
        ))}

        {/* Waiters */}
        {Array.from({ length: state.staff.waiters }).map((_, i) => (
          <Waiter3D key={`waiter-${i}`} index={i} state={state} />
        ))}

      </Canvas>
    </div>
  );
};
