import React, { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Plane, Cone, Text, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { Neighborhood3D } from './Neighborhood3D';
import { getSurfaceMaterial, getSignTexture } from '../graphics/surfaceMaterials';
import { StreetDetails3D } from './StreetDetails3D';
import { LandmarkDetails3D } from './LandmarkDetails3D';
import { RoundedCarBody3D, StylizedTree3D } from './StreetAssets3D';

// Victorian Cast-Iron Street Lamp with glowing globe and warm illumination
export const StreetLamp3D = memo(({ position, isNight }: { position: [number, number, number]; isNight: boolean }) => {
  return (
    <group position={position}>
      {/* Heavy Fluted Base */}
      <Cylinder args={[0.25, 0.35, 0.6, 16]} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </Cylinder>
      {/* Tapered Main Pole */}
      <Cylinder args={[0.08, 0.12, 4.2, 16]} position={[0, 2.7, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </Cylinder>
      {/* Decorative Ladder Rest Crossbar */}
      <Cylinder args={[0.03, 0.03, 0.8, 12]} position={[0, 3.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>
      {/* Ornate Capital with Acanthus Leaves */}
      <Cylinder args={[0.2, 0.1, 0.25, 16]} position={[0, 4.9, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </Cylinder>
      {/* Dual Curved Sconces */}
      <group position={[-0.45, 5.2, 0]}>
        <Cylinder args={[0.03, 0.03, 0.6, 8]} rotation={[0, 0, Math.PI / 4]} position={[0.2, -0.2, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Cylinder>
        {/* Glass Lantern Housing */}
        <Cylinder args={[0.22, 0.15, 0.45, 6]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={isNight ? "#fef08a" : "#f1f5f9"} 
            emissive={isNight ? "#fde047" : "#000000"} 
            emissiveIntensity={isNight ? 1.5 : 0} 
            transparent 
            opacity={0.85}
          />
        </Cylinder>
        {/* Lantern Cap */}
        <Cone args={[0.26, 0.2, 6]} position={[0, 0.3, 0]}>
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </Cone>
      </group>
      <group position={[0.45, 5.2, 0]}>
        <Cylinder args={[0.03, 0.03, 0.6, 8]} rotation={[0, 0, -Math.PI / 4]} position={[-0.2, -0.2, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.22, 0.15, 0.45, 6]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={isNight ? "#fef08a" : "#f1f5f9"} 
            emissive={isNight ? "#fde047" : "#000000"} 
            emissiveIntensity={isNight ? 1.5 : 0} 
            transparent 
            opacity={0.85}
          />
        </Cylinder>
        <Cone args={[0.26, 0.2, 6]} position={[0, 0.3, 0]}>
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </Cone>
      </group>
    </group>
  );
});

// Classic Rooftop Cedar Water Tower
export const RooftopWaterTower3D = memo(({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {/* 4 Angle Iron Steel Legs */}
    <Cylinder args={[0.05, 0.05, 3.5, 8]} position={[-1.2, 1.75, -1.2]} rotation={[0.05, 0, -0.05]}>
      <meshStandardMaterial color="#334155" metalness={0.8} />
    </Cylinder>
    <Cylinder args={[0.05, 0.05, 3.5, 8]} position={[1.2, 1.75, -1.2]} rotation={[0.05, 0, 0.05]}>
      <meshStandardMaterial color="#334155" metalness={0.8} />
    </Cylinder>
    <Cylinder args={[0.05, 0.05, 3.5, 8]} position={[-1.2, 1.75, 1.2]} rotation={[-0.05, 0, -0.05]}>
      <meshStandardMaterial color="#334155" metalness={0.8} />
    </Cylinder>
    <Cylinder args={[0.05, 0.05, 3.5, 8]} position={[1.2, 1.75, 1.2]} rotation={[-0.05, 0, 0.05]}>
      <meshStandardMaterial color="#334155" metalness={0.8} />
    </Cylinder>
    {/* Cross Bracing */}
    <Box args={[2.5, 0.08, 0.08]} position={[0, 1.8, -1.2]}><meshStandardMaterial color="#475569" /></Box>
    <Box args={[2.5, 0.08, 0.08]} position={[0, 1.8, 1.2]}><meshStandardMaterial color="#475569" /></Box>
    {/* Wooden Water Barrel */}
    <Cylinder args={[1.5, 1.5, 2.8, 24]} position={[0, 4.9, 0]} castShadow>
      <primitive object={getSurfaceMaterial('wood','#8d7152',3,2)} attach="material" />
    </Cylinder>
    {/* Metal Hoops / Straps around barrel */}
    <Torus args={[1.52, 0.03, 8, 24]} position={[0, 4.0, 0]} rotation={[Math.PI / 2, 0, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Torus>
    <Torus args={[1.52, 0.03, 8, 24]} position={[0, 4.8, 0]} rotation={[Math.PI / 2, 0, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Torus>
    <Torus args={[1.52, 0.03, 8, 24]} position={[0, 5.6, 0]} rotation={[Math.PI / 2, 0, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Torus>
    {/* Conical Wooden Roof */}
    <Cone args={[1.7, 1.2, 24]} position={[0, 6.9, 0]} castShadow>
      <meshStandardMaterial color="#451a03" roughness={0.8} />
    </Cone>
  </group>
));

// Brick Brownstone Building with Fire Escapes and Shopfront
export const BrownstoneBuilding3D = memo(({
  position,
  rotation = [0, 0, 0],
  name,
  isNight
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  name: string;
  isNight: boolean;
}) => {
  const winColor = isNight ? "#d4b483" : "#4d666b";
  const winEmissive = isNight ? .3 : 0;

  return (
    <group position={position} rotation={rotation}>
      {/* Main Multi-Story Red Brick Mass */}
      <Box args={[18, 22, 14]} position={[0, 11, 0]} castShadow receiveShadow>
        <primitive object={getSurfaceMaterial('brick','#86604d',9,14)} attach="material" />
      </Box>

      {/* Decorative Roof Cornice Balustrade */}
      <Box args={[19, 1.2, 15]} position={[0, 22.6, 0]} castShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </Box>
      <Box args={[18.6, 0.6, 14.6]} position={[0, 23.3, 0]}>
        <primitive object={getSurfaceMaterial('concrete','#c7bfae',3,2)} attach="material" />
      </Box>

      {/* Rooftop Water Tower */}
      <RooftopWaterTower3D position={[3.5, 22, -2]} />

      {/* Ground Floor Boutique Shopfront with Forest Green Millwork */}
      <Box args={[18.4, 4.5, 14.4]} position={[0, 2.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#064e3b" roughness={0.6} />
      </Box>
      {/* Shop Large Display Windows */}
      <group position={[0, 2.2, 7.25]}>
        {/* Left Display Window */}
        <Box args={[5.5, 3, 0.1]} position={[-4.5, 0, 0]}>
          <meshStandardMaterial color={isNight ? "#fef08a" : "#bae6fd"} depthWrite={false} transparent opacity={0.6} roughness={0.1} />
        </Box>
        {/* Right Display Window */}
        <Box args={[5.5, 3, 0.1]} position={[4.5, 0, 0]}>
          <meshStandardMaterial color={isNight ? "#fef08a" : "#bae6fd"} depthWrite={false} transparent opacity={0.6} roughness={0.1} />
        </Box>
        {/* Boutique Scalloped Awning */}
        <group position={[0, 2.2, 0.8]} rotation={[-Math.PI / 6, 0, 0]}>
          <Box args={[16.5, 0.15, 2.2]} castShadow>
            <meshStandardMaterial color="#047857" />
          </Box>
          <Box args={[16.5, 0.16, 0.4]} position={[0, 0, 1.0]}>
            <meshStandardMaterial color="#f59e0b" />
          </Box>
        </group>
        {/* Backlit Store Sign */}
        <Box args={[9, 1.2, 0.3]} position={[0, 2.8, 0.5]}>
          <meshStandardMaterial color="#0f172a" />
        </Box>
        <Text position={[0, 2.8, 0.68]} fontSize={0.7} color="#f59e0b" anchorX="center" anchorY="middle">
          {name}
        </Text>
      </group>

      {/* Rows of Elegant Stone-Mullioned Windows on Upper Floors */}
      {[7, 12, 17].map((floorY, fIdx) => (
        <group key={`floor-${fIdx}`} position={[0, floorY, 7.05]}>
          {[-6, -2, 2, 6].map((wx, wIdx) => (
            <group key={`win-${wIdx}`} position={[wx, 0, 0]}>
              {/* Stone Sill and Lintel */}
              <Box args={[2.2, 0.3, 0.4]} position={[0, 1.6, 0]}><meshStandardMaterial color="#f1f5f9" /></Box>
              <Box args={[2.3, 0.25, 0.4]} position={[0, -1.6, 0]}><meshStandardMaterial color="#f1f5f9" /></Box>
              {/* Window Pane */}
              <Box args={[1.8, 2.8, 0.1]}>
                <meshStandardMaterial color={winColor} emissive={winColor} emissiveIntensity={winEmissive} />
              </Box>
              {/* Black mullions */}
              <Box args={[0.08, 2.8, 0.12]}><meshStandardMaterial color="#1e293b" /></Box>
              <Box args={[1.8, 0.08, 0.12]}><meshStandardMaterial color="#1e293b" /></Box>
            </group>
          ))}
        </group>
      ))}

      {/* Exterior Cast-Iron Fire Escape on Front Facade */}
      {[5, 10, 15].map((levelY, lIdx) => (
        <group key={`fe-${lIdx}`} position={[-2, levelY, 7.6]}>
          {/* Iron Mesh Platform */}
          <Box args={[4.2, 0.1, 1.2]} castShadow><meshStandardMaterial color="#1e293b" metalness={0.5}/></Box>
          {/* Railings */}
          <Box args={[4.2, 0.8, 0.05]} position={[0, 0.4, 0.55]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Box>
          <Box args={[0.05, 0.8, 1.2]} position={[-2.1, 0.4, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Box>
          {/* Slanted Connecting Ladder */}
          {lIdx < 2 && (
            <group position={[1.2, 2.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <Box args={[0.05, 5, 0.05]} position={[-0.2, 0, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Box>
              <Box args={[0.05, 5, 0.05]} position={[0.2, 0, 0]}><meshStandardMaterial color="#1e293b" metalness={0.5}/></Box>
            </group>
          )}
        </group>
      ))}
    </group>
  );
});

// Modern Glass High-Rise Tower with Rooftop Helipad & Illuminated Penthouse
export const ModernSkyscraper3D = memo(({
  position,
  rotation = [0, 0, 0],
  height = 36,
  isNight
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  isNight: boolean;
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Main Glass Curtain Wall Monolith */}
      <Box args={[16, height, 16]} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={isNight ? "#293f4a" : "#668990"}
          metalness={0.5}
          roughness={0.15} 
        />
      </Box>

      <LandmarkDetails3D height={height} isNight={isNight} />
      {[-7, -3.5, 0, 3.5, 7].map((fx, i) => (
        <Box key={`fin-${i}`} args={[0.3, height + 1, 16.6]} position={[fx, height / 2, 0]}>
          <meshStandardMaterial color="#94a3b8" metalness={0.5}roughness={0.1} />
        </Box>
      ))}

      {/* Night Floor Illumination Grid */}
      {isNight && (
        <group position={[0, height / 2, 8.05]}>
          {Array.from({ length: Math.floor(height / 4) }).map((_, floorIdx) => (
            <group key={`glow-${floorIdx}`} position={[0, -height / 2 + 3 + floorIdx * 4, 0]}>
              <Box args={[14, 1.2, 0.05]}>
                <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
              </Box>
            </group>
          ))}
        </group>
      )}

      {/* Penthouse Crown & Helipad */}
      <group position={[0, height, 0]}>
        <Box args={[14, 3, 14]} position={[0, 1.5, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Box>
        {/* Helipad Yellow Target */}
        <Cylinder args={[5, 5, 0.1, 24]} position={[0, 3.05, 0]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Torus args={[4.2, 0.1, 8, 24]} position={[0, 3.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#dac787" />
        </Torus>
        {/* Aviation Warning Beacon */}
        <Cylinder args={[0.15, 0.2, 4, 8]} position={[0, 5, 0]}>
          <meshStandardMaterial color="#ef4444" />
        </Cylinder>
        <Sphere args={[0.3, 12, 12]} position={[0, 7.1, 0]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isNight ? 3 : 0.8} />
        </Sphere>
      </group>
    </group>
  );
});

// Grand Parisian Hotel with Warm Sandstone, Arched Facade & Illuminated Neon Sign
export const GrandHotel3D = memo(({
  position,
  rotation = [0, 0, 0],
  isNight
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  isNight: boolean;
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Sandstone Grand Base */}
      <Box args={[24, 18, 16]} position={[0, 9, 0]} castShadow receiveShadow>
        <primitive object={getSurfaceMaterial('plaster','#c2b59c',12,9)} attach="material" />
      </Box>
      <LandmarkDetails3D height={18} hotel isNight={isNight} />
      <group position={[0, 18, 0]}>
        <Cone args={[14, 6, 4]} position={[0, 3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
        </Cone>
      </group>

      {/* Ground Floor Arched French Entrance */}
      <group position={[0, 2.5, 8.1]}>
        <Box args={[6, 4.5, 0.4]}><meshStandardMaterial color="#1c1917" /></Box>
        {/* Arched Entrance Portal */}
        <Cylinder args={[2, 2, 0.4, 24, 1, false, 0, Math.PI]} position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.8} />
        </Cylinder>
        {/* Warm Golden Hotel Doors */}
        <Box args={[3.2, 3.8, 0.2]} position={[0, -0.3, 0.1]}>
          <meshStandardMaterial color="#687f7b" metalness={.35} roughness={.24} />
        </Box>
        {/* Polished Brass Stanchions & Red Carpet leading to sidewalk */}
        <Plane args={[3, 4]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.45, 2]}>
          <meshStandardMaterial color="#991b1b" roughness={0.8} />
        </Plane>
      </group>

      {/* Rooftop Glowing Neon Sign */}
      <group position={[0, 24.5, 3]}>
        <Box args={[14, 2.2, 0.4]} position={[0, 0, 0]}><meshStandardMaterial color="#0f172a" /></Box>
        <mesh position={[0,0,.3]}><planeGeometry args={[12.5,1.55]}/><meshBasicMaterial map={getSignTexture('GRAND HOTEL')} transparent depthWrite={false}/></mesh>
      </group>
    </group>
  );
});

// Vibrant Dynamic Animated Vehicles with Glowing Headlights
export const RealisticCar3D = memo(({
  initialZ,
  speed,
  color,
  direction,
  xOffset,
  isHorizontal = false,
  isTaxi = false,
  gameSpeed = 1,
  isNight
}: any) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      if (isHorizontal) {
        ref.current.position.x += speed * 0.28 * direction * Math.min(delta, 0.1) * gameSpeed;
        if (direction === 1 && ref.current.position.x > 140) ref.current.position.x = -140;
        if (direction === -1 && ref.current.position.x < -140) ref.current.position.x = 140;
      } else {
        ref.current.position.z += speed * 0.28 * direction * Math.min(delta, 0.1) * gameSpeed;
        if (direction === 1 && ref.current.position.z > 140) ref.current.position.z = -140;
        if (direction === -1 && ref.current.position.z < -140) ref.current.position.z = 140;
      }
    }
  });

  return (
    <group
      ref={ref}
      position={isHorizontal ? [initialZ, 0, xOffset] : [xOffset, 0, initialZ]}
      rotation={[0, isHorizontal ? (direction === 1 ? Math.PI / 2 : -Math.PI / 2) : (direction === 1 ? 0 : Math.PI), 0]}
    >
      <RoundedCarBody3D color={color} isTaxi={isTaxi} isNight={isNight} speed={speed} gameSpeed={gameSpeed} />
    </group>
  );
});

// Central Park Fountain with Multi-tier Splashing Water
export const ParkFountain3D = memo(({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {/* Outer Basin */}
    <Cylinder args={[4.5, 4.8, 0.8, 32]} position={[0, 0.4, 0]} castShadow receiveShadow>
      <primitive object={getSurfaceMaterial('concrete','#c7bfae',3,2)} attach="material" />
    </Cylinder>
    {/* Water Pool in basin */}
    <Cylinder args={[4.2, 4.2, 0.2, 32]} position={[0, 0.7, 0]}>
      <meshStandardMaterial color="#769b93" roughness={.12} metalness={.35} transparent opacity={.87} />
    </Cylinder>
    {/* Middle Tier Pedestal */}
    <Cylinder args={[0.6, 0.8, 1.5, 16]} position={[0, 1.4, 0]} castShadow>
      <primitive object={getSurfaceMaterial('concrete','#b9b29f',2,2)} attach="material" />
    </Cylinder>
    {/* Middle Tier Basin */}
    <Cylinder args={[2.2, 2.4, 0.4, 24]} position={[0, 2.2, 0]} castShadow>
      <primitive object={getSurfaceMaterial('concrete','#c7bfae',3,2)} attach="material" />
    </Cylinder>
    <Cylinder args={[2.1, 2.1, 0.1, 24]} position={[0, 2.4, 0]}>
      <meshStandardMaterial color="#769b93" roughness={.12} metalness={.35} transparent opacity={.87} />
    </Cylinder>
    {/* Top Spire & Water Plume */}
    <Cylinder args={[0.3, 0.4, 1.2, 12]} position={[0, 3.0, 0]}>
      <meshStandardMaterial color="#cbd5e1" />
    </Cylinder>
    <Sphere args={[0.5, 16, 16]} position={[0, 3.8, 0]} scale={[0.8, 1.8, 0.8]}>
      <meshStandardMaterial color="#c7ded8" roughness={.1} metalness={.2} transparent opacity={.45} depthWrite={false} />
    </Sphere>
  </group>
));

// Upgraded Outdoor Scenery with Realistic Cityscape, Traffic, Sidewalks, and Park
export const AttractiveCityScenery3D = memo(({ isNight, gameSpeed = 1 }: { isNight: boolean; gameSpeed?: number }) => {
  return (
    <group>
      {/* Vast Ground Terrain */}
      <Plane args={[450, 450]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <primitive object={getSurfaceMaterial('grass','#7f866c',75,75)} attach="material" />
      </Plane>

      {/* ASPHALT CITY BOULEVARDS & AVENUES */}
      {/* West Road */}
      <Plane args={[12, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[-25, 0.02, 0]} receiveShadow>
        <primitive object={getSurfaceMaterial('asphalt','#555954',3,100)} attach="material" />
      </Plane>
      {/* East Road */}
      <Plane args={[12, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[25, 0.02, 0]} receiveShadow>
        <primitive object={getSurfaceMaterial('asphalt','#555954',3,100)} attach="material" />
      </Plane>
      {/* North Road */}
      <Plane args={[400, 12]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -25]} receiveShadow>
        <primitive object={getSurfaceMaterial('asphalt','#555954',3,100)} attach="material" />
      </Plane>
      {/* South Road (Restaurant Entrance Front) */}
      <Plane args={[400, 12]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 25]} receiveShadow>
        <primitive object={getSurfaceMaterial('asphalt','#555954',3,100)} attach="material" />
      </Plane>

      {/* DASHED YELLOW ROAD DIVIDERS */}
      {Array.from({ length: 36 }).map((_, i) => {
        const zPos = -180 + i * 10;
        if (Math.abs(zPos - (-25)) < 8 || Math.abs(zPos - 25) < 8) return null;
        return (
          <group key={`v-div-${i}`}>
            <Plane args={[0.4, 4.5]} rotation={[-Math.PI / 2, 0, 0]} position={[-25, 0.035, zPos]}>
              <meshStandardMaterial color="#dac787" />
            </Plane>
            <Plane args={[0.4, 4.5]} rotation={[-Math.PI / 2, 0, 0]} position={[25, 0.035, zPos]}>
              <meshStandardMaterial color="#dac787" />
            </Plane>
          </group>
        );
      })}
      {Array.from({ length: 36 }).map((_, i) => {
        const xPos = -180 + i * 10;
        if (Math.abs(xPos - (-25)) < 8 || Math.abs(xPos - 25) < 8) return null;
        return (
          <group key={`h-div-${i}`}>
            <Plane args={[4.5, 0.4]} rotation={[-Math.PI / 2, 0, 0]} position={[xPos, 0.035, -25]}>
              <meshStandardMaterial color="#dac787" />
            </Plane>
            <Plane args={[4.5, 0.4]} rotation={[-Math.PI / 2, 0, 0]} position={[xPos, 0.035, 25]}>
              <meshStandardMaterial color="#dac787" />
            </Plane>
          </group>
        );
      })}

      {/* WHITE PEDESTRIAN ZEBRA CROSSINGS */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Plane key={`cross-s-${i}`} args={[1.2, 11.5]} rotation={[-Math.PI / 2, 0, 0]} position={[-4 + i * 1.6, 0.035, 25]}>
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </Plane>
      ))}

      {/* RESTAURANT FRONT SIDEWALK PLAZA */}
      <Plane args={[28, 4]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 17]} receiveShadow>
        <meshStandardMaterial color={isNight ? "#475569" : "#cbd5e1"} roughness={0.7} />
      </Plane>
      {/* Stone Curb Edge */}
      <Box args={[28, 0.16, 0.3]} position={[0, 0.08, 19]} receiveShadow>
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </Box>

      {/* OUTDOOR PATIO BISTRO DINING TABLES (In front of restaurant) */}
      <group position={[-9, 0.1, 16.2]}>
        {/* Striped Patio Parasol Umbrella */}
        <Cylinder args={[0.04, 0.04, 3.2, 8]} position={[0, 1.6, 0]} castShadow><meshStandardMaterial color="#334155" metalness={0.8} /></Cylinder>
        <Cone args={[1.8, 0.8, 16]} position={[0, 3.2, 0]} castShadow><meshStandardMaterial color="#976555" /></Cone>
        {/* Table & 2 outdoor wire chairs */}
        <Cylinder args={[0.6, 0.6, 0.04, 16]} position={[0, 1.0, 0]}><meshStandardMaterial color="#f8fafc" /></Cylinder>
        <Cylinder args={[0.05, 0.05, 1.0, 8]} position={[0, 0.5, 0]}><meshStandardMaterial color="#1e293b" /></Cylinder>
      </group>
      <group position={[9, 0.1, 16.2]}>
        <Cylinder args={[0.04, 0.04, 3.2, 8]} position={[0, 1.6, 0]} castShadow><meshStandardMaterial color="#334155" metalness={0.8} /></Cylinder>
        <Cone args={[1.8, 0.8, 16]} position={[0, 3.2, 0]} castShadow><meshStandardMaterial color="#6a807d" /></Cone>
        <Cylinder args={[0.6, 0.6, 0.04, 16]} position={[0, 1.0, 0]}><meshStandardMaterial color="#f8fafc" /></Cylinder>
        <Cylinder args={[0.05, 0.05, 1.0, 8]} position={[0, 0.5, 0]}><meshStandardMaterial color="#1e293b" /></Cylinder>
      </group>

      {/* VICTORIAN STREET LAMPS ALONG SIDEWALK */}
      <StreetLamp3D position={[-14, 0, 18.5]} isNight={isNight} />
      <StreetLamp3D position={[14, 0, 18.5]} isNight={isNight} />
      <StreetLamp3D position={[-18, 0, -18.5]} isNight={isNight} />
      <StreetLamp3D position={[18, 0, -18.5]} isNight={isNight} />

      {/* DYNAMIC REALISTIC MOVING TRAFFIC (Cars, Taxis, Vans) */}
      <RealisticCar3D initialZ={-60} speed={28} color="#ef4444" direction={1} xOffset={-28} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={10} speed={25} color="#eab308" direction={1} xOffset={-28} isTaxi={true} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={70} speed={30} color="#3b82f6" direction={-1} xOffset={-22} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={-20} speed={26} color="#10b981" direction={-1} xOffset={-22} isNight={isNight} gameSpeed={gameSpeed} />

      <RealisticCar3D initialZ={-80} speed={27} color="#eab308" direction={1} xOffset={22} isTaxi={true} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={20} speed={24} color="#757e83" direction={1} xOffset={22} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={90} speed={31} color="#a33f39" direction={-1} xOffset={28} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={-40} speed={26} color="#e0e2d9" direction={-1} xOffset={28} isNight={isNight} gameSpeed={gameSpeed} />

      <RealisticCar3D initialZ={-50} speed={26} color="#eab308" direction={1} xOffset={28} isHorizontal isTaxi={true} isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={40} speed={29} color="#9c4947" direction={-1} xOffset={22} isHorizontal isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={-70} speed={25} color="#557a70" direction={1} xOffset={-22} isHorizontal isNight={isNight} gameSpeed={gameSpeed} />
      <RealisticCar3D initialZ={30} speed={28} color="#b58b64" direction={-1} xOffset={-28} isHorizontal isNight={isNight} gameSpeed={gameSpeed} />

      {/* SURROUNDING ARCHITECTURAL BUILDINGS & CITY DISTRICT */}
      <Neighborhood3D isNight={isNight} gameSpeed={gameSpeed} />
      <StreetDetails3D />
      <ModernSkyscraper3D position={[-60, 0, -74]} height={32} isNight={isNight} />
      <GrandHotel3D position={[0, 0, -70]} isNight={isNight} />
      <ModernSkyscraper3D position={[60, 0, -74]} height={38} isNight={isNight} />
      <ModernSkyscraper3D position={[-66, 0, 76]} height={26} isNight={isNight} />
      <BrownstoneBuilding3D position={[66, 0, 70]} rotation={[0, Math.PI, 0]} name="VINTAGE CINEMA" isNight={isNight} />

      {/* BEAUTIFUL MUNICIPAL PARK WITH FOUNTAIN & CHERRY BLOSSOMS */}
      <group position={[0, 0, 58]}>
        {/* Lush Green Lawn */}
        <Plane args={[36, 32]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
          <primitive object={getSurfaceMaterial('grass','#819364',12,10)} attach="material" />
        </Plane>
        {/* Tiered Splashing Fountain */}
        <ParkFountain3D position={[0, 0, 0]} />
        {/* Park Cobblestone Ring Path */}
        <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[6.8, 9.2, 48]} />
          <primitive object={getSurfaceMaterial('concrete','#c6bdab',10,6)} attach="material" />
        </mesh>
        <mesh position={[0, 0.06, -13.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.5, 13]} />
          <primitive object={getSurfaceMaterial('concrete','#c6bdab',10,6)} attach="material" />
        </mesh>
        {[-12, 12].map((x, i) => <StylizedTree3D key={x} position={[x, 0.04, 0]} seed={i + 2} blossom scale={1.4} gameSpeed={gameSpeed} />)}
      </group>
    </group>
  );
});
