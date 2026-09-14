import React, { memo } from 'react';
import { Box, Cylinder, Sphere, Torus, Plane, Text } from '@react-three/drei';
import { WoodFloorMaterial } from './WoodFloorMaterial';

// Indoor Potted Fiddle Leaf Fig / Monstera Plant
export const IndoorPlant3D = memo(({ position, type = 'fiddle' }: { position: [number, number, number]; type?: string }) => (
  <group position={position}>
    {/* Ceramic Fluted Planter Pot */}
    <Cylinder args={[0.6, 0.45, 1.1, 24]} position={[0, 0.55, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={type === 'palm' ? "#fef3c7" : "#f8fafc"} roughness={0.3} />
    </Cylinder>
    {/* Brass Top Rim */}
    <Torus args={[0.59, 0.03, 12, 24]} position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
    </Torus>
    {/* Dark Soil */}
    <Cylinder args={[0.56, 0.56, 0.1, 16]} position={[0, 1.05, 0]}>
      <meshStandardMaterial color="#291e17" roughness={0.9} />
    </Cylinder>
    {/* Slender Wood Trunk */}
    <Cylinder args={[0.04, 0.06, type === 'tall' ? 2.0 : 1.6, 12]} position={[0, type === 'tall' ? 2.0 : 1.8, 0]} rotation={[0.05, 0, 0.05]} castShadow>
      <meshStandardMaterial color="#5c3822" roughness={0.8} />
    </Cylinder>
    {/* Broad Vibrant Green Leaves */}
    {[
      { pos: [-0.3, 1.8, 0.2], rot: [0.3, 0.4, -0.4], scale: [0.45, 0.02, 0.6] },
      { pos: [0.35, 2.1, -0.1], rot: [-0.2, -0.5, 0.5], scale: [0.5, 0.02, 0.7] },
      { pos: [-0.1, 2.4, -0.3], rot: [-0.4, 0.2, -0.2], scale: [0.5, 0.02, 0.65] },
      { pos: [0.2, 2.6, 0.3], rot: [0.4, -0.3, 0.3], scale: [0.48, 0.02, 0.65] },
      { pos: [0, 2.9, 0], rot: [0.1, 0, 0], scale: [0.52, 0.02, 0.72] },
    ].map((leaf, idx) => (
      <Sphere key={`leaf-${idx}`} args={[1, 12, 8]} scale={[leaf.scale[0] * 0.65, 0.035, leaf.scale[2] * 0.65]} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]} castShadow>
        <meshStandardMaterial color={idx % 2 === 0 ? '#387342' : '#54864b'} roughness={0.55} />
      </Sphere>
    ))}
  </group>
));

// Hanging Brass Dome Pendant Light over Dining Tables
export const PendantLamp3D = memo(({ position, isNight }: { position: [number, number, number]; isNight?: boolean }) => (
  <group position={position}>
    {/* Brass Ceiling Rose Canopy */}
    <Cylinder args={[0.15, 0.15, 0.04, 16]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
    </Cylinder>
    {/* Black Twisted Cord */}
    <Cylinder args={[0.012, 0.012, 3.2, 8]} position={[0, -1.6, 0]}>
      <meshStandardMaterial color="#1e293b" />
    </Cylinder>
    {/* Polished Brass Lamp Shade Dome */}
    <group position={[0, -3.2, 0]}>
      <Sphere args={[0.45, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} castShadow>
        <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.15} />
      </Sphere>
      {/* Warm Glowing Bulb Inside */}
      <Sphere args={[0.12, 16, 16]} position={[0, -0.15, 0]}>
        <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.8} />
      </Sphere>
      {/* Downward Warm Pool of Light onto tables */}
      <pointLight position={[0, -0.3, 0]} intensity={isNight ? 32 : 14} distance={12} decay={2} color="#ffcf91" />
    </group>
  </group>
));

// Upgraded High-End Service Bar & Kitchen Counter with Espresso Machine, Pastry Case, Stools
export const AttractiveBarCounter3D = memo(({ isNight }: { isNight?: boolean }) => {
  return (
    <group position={[0, 0, -10]}>
      {/* Heavy Wood Base with Wainscot Fluted Panels */}
      <Box args={[30, 2.1, 3.2]} position={[0, 1.05, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#2c1810" roughness={0.7} />
      </Box>
      {/* Plinth Kickplate with Brass Accent */}
      <Box args={[30.2, 0.2, 3.3]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </Box>
      {/* Front Polished Brass Footrail with Brackets */}
      <Cylinder args={[0.04, 0.04, 28, 16]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.35, 1.8]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
      </Cylinder>
      {[-12, -6, 0, 6, 12].map((bx, i) => (
        <Box key={`brk-${i}`} args={[0.06, 0.06, 0.35]} position={[bx, 0.35, 1.65]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.9} />
        </Box>
      ))}

      {/* Polish Marble Countertop with Bullnose Edge */}
      <Box args={[30.6, 0.16, 3.5]} position={[0, 2.18, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#fafaf9" roughness={0.15} metalness={0.1} />
      </Box>

      {/* Sneeze Guard / Tempered Glass Partition with Chrome Clips */}
      <Box args={[28, 1.1, 0.08]} position={[0, 2.8, 0.8]} castShadow>
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.35} depthWrite={false} roughness={0.05} />
      </Box>
      <Box args={[28.2, 0.06, 0.14]} position={[0, 3.38, 0.8]}>
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </Box>

      {/* COMMERCIAL ITALIAN ESPRESSO MACHINE */}
      <group position={[-7, 2.26, -0.3]}>
        {/* Mirror Chrome Boiler Body */}
        <Box args={[1.6, 1.1, 1.1]} position={[0, 0.55, 0]} castShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.08} />
        </Box>
        {/* Top Cup Warming Tray with Miniature Cups */}
        <Box args={[1.5, 0.06, 1.0]} position={[0, 1.13, 0]}>
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </Box>
        {[-0.4, 0, 0.4].map((cx, i) => (
          <Cylinder key={`cup-${i}`} args={[0.06, 0.05, 0.08, 12]} position={[cx, 1.2, 0.1]}>
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </Cylinder>
        ))}
        {/* Dual Portafilter Group Heads */}
        <Cylinder args={[0.08, 0.08, 0.18, 12]} position={[-0.35, 0.35, 0.6]}>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.08, 0.08, 0.18, 12]} position={[0.35, 0.35, 0.6]}>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Cylinder>
        {/* Steam Wand */}
        <Cylinder args={[0.02, 0.02, 0.35, 8]} position={[0.7, 0.45, 0.5]} rotation={[0.4, 0, 0.3]}>
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
        </Cylinder>
      </group>

      {/* GLASS PASTRY DISPLAY SHOWCASE */}
      <group position={[0, 2.26, -0.2]}>
        <Box args={[4.2, 1.2, 1.4]} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#f0fdf4" transparent opacity={0.3} depthWrite={false} roughness={0.05} />
        </Box>
        {/* Wood Base & Frame */}
        <Box args={[4.3, 0.08, 1.5]} position={[0, 0.04, 0]}><meshStandardMaterial color="#451a03" /></Box>
        <Box args={[4.3, 0.06, 1.5]} position={[0, 1.22, 0]}><meshStandardMaterial color="#f59e0b" metalness={0.8} /></Box>
        {/* Glass Shelf inside */}
        <Box args={[4.0, 0.04, 1.2]} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} depthWrite={false} />
        </Box>
        {/* Delicious miniature pastries (Croissants, Donut, Tart) */}
        {[-1.4, -0.5, 0.5, 1.4].map((px, i) => (
          <group key={`pastry-${i}`} position={[px, 0.65, 0]}>
            <Cylinder args={[0.18, 0.15, 0.02, 16]} position={[0, 0, 0]}><meshStandardMaterial color="#ffffff" /></Cylinder>
            <Torus args={[0.1, 0.04, 8, 16]} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color={i % 2 === 0 ? "#b45309" : "#ec4899"} roughness={0.7} />
            </Torus>
          </group>
        ))}
      </group>

      {/* MODERN TOUCH POS CASH REGISTER */}
      <group position={[7, 2.26, 0.1]}>
        {/* Heavy Swivel Stand */}
        <Cylinder args={[0.12, 0.15, 0.25, 16]} position={[0, 0.12, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </Cylinder>
        {/* Tablet Display Screen */}
        <Box args={[0.9, 0.6, 0.05]} position={[0, 0.45, 0.08]} rotation={[-0.35, 0, 0]} castShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.5} />
        </Box>
        {/* Screen Display */}
        <Plane args={[0.82, 0.52]} position={[0, 0.45, 0.11]} rotation={[-0.35, 0, 0]}>
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.5} />
        </Plane>
        {/* Thermal Receipt Printer & Barcode Scanner */}
        <Box args={[0.4, 0.3, 0.45]} position={[0.7, 0.15, 0]}>
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </Box>
      </group>

      {/* ELEGANT LEATHER BAR STOOLS WITH CHROME FOOTREST RINGS */}
      {Array.from({ length: 7 }).map((_, i) => (
        <group key={`stool-${i}`} position={[-12 + i * 4, 0, 2.4]}>
          {/* Heavy Chrome Base */}
          <Cylinder args={[0.3, 0.35, 0.05, 24]} position={[0, 0.025, 0]} castShadow>
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
          </Cylinder>
          {/* Vertical Chrome Column */}
          <Cylinder args={[0.04, 0.04, 1.25, 16]} position={[0, 0.65, 0]} castShadow>
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
          </Cylinder>
          {/* Circular Chrome Footrest Ring */}
          <Torus args={[0.22, 0.02, 12, 24]} position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
          </Torus>
          {/* Thick Padded Leather Cushion */}
          <Cylinder args={[0.38, 0.36, 0.14, 24]} position={[0, 1.32, 0]} castShadow>
            <meshStandardMaterial color="#991b1b" roughness={0.7} />
          </Cylinder>
          <Torus args={[0.37, 0.02, 8, 24]} position={[0, 1.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#1e1b18" />
          </Torus>
        </group>
      ))}
    </group>
  );
});

// Upgraded Restaurant Flooring: Parquet Hardwood with Polished Borders & Runner Rug
export const AttractiveFloor3D = memo(() => {
  return (
    <group position={[0, 0.05, 0]}>
      {/* Warm Hardwood Parquet Planks Base */}
      <Plane args={[30, 30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <WoodFloorMaterial />
      </Plane>

      {/* Decorative Brass Inlay Border around dining room */}
      <Box args={[28, 0.015, 0.08]} position={[0, 0.01, -14]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>
      <Box args={[28, 0.015, 0.08]} position={[0, 0.01, 14]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>
      <Box args={[0.08, 0.015, 28]} position={[-14, 0.01, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>
      <Box args={[0.08, 0.015, 28]} position={[14, 0.01, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>

      {/* Warm Persian Entrance Runner Carpet at Doorway */}
      <group position={[0, 0.015, 11]}>
        <Plane args={[4, 7.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#881337" roughness={0.9} />
        </Plane>
        {/* Carpet Border Fringe */}
        {[-1.85, 1.85].map(x => (
          <Box key={x} args={[0.08, 0.008, 7.2]} position={[x, 0.005, 0]}>
            <meshStandardMaterial color="#d5ac73" roughness={1} />
          </Box>
        ))}
        {[-2.6, -1.3, 0, 1.3, 2.6].map(z => (
          <mesh key={z} position={[0, 0.008, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[0.55, 0.55]} />
            <meshStandardMaterial color="#c69966" roughness={1} />
          </mesh>
        ))}
        <Box args={[4.2, 0.02, 0.2]} position={[0, 0.01, 3.8]}>
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </Box>
        <Box args={[4.2, 0.02, 0.2]} position={[0, 0.01, -3.8]}>
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </Box>
      </group>

      {/* Perimeter Wall Baseboards */}
      <Box args={[30.5, 0.25, 0.5]} position={[0, 0.125, -15.25]} receiveShadow>
        <meshStandardMaterial color="#2c1810" />
      </Box>
      <Box args={[30.5, 0.25, 0.5]} position={[0, 0.125, 15.25]} receiveShadow>
        <meshStandardMaterial color="#2c1810" />
      </Box>
      <Box args={[0.5, 0.25, 31]} position={[-15.25, 0.125, 0]} receiveShadow>
        <meshStandardMaterial color="#2c1810" />
      </Box>
      <Box args={[0.5, 0.25, 31]} position={[15.25, 0.125, 0]} receiveShadow>
        <meshStandardMaterial color="#2c1810" />
      </Box>
    </group>
  );
});

// Exposed Ceiling Wooden Architectural Rafters & Beams
export const CeilingBeams3D = memo(() => (
  <group position={[0, 9.8, 0]}>
    {/* Transverse Heavy Timber Beams */}
    {[-10, -5, 0, 5, 10].map((bz, i) => (
      <Box key={`beam-${i}`} args={[30, 0.45, 0.55]} position={[0, 0, bz]} castShadow>
        <meshStandardMaterial color="#3b271d" roughness={0.75} />
      </Box>
    ))}
    {/* Longitudinal Spine Beam */}
    <Box args={[0.55, 0.55, 30]} position={[0, -0.05, 0]} castShadow>
      <meshStandardMaterial color="#2c1810" roughness={0.75} />
    </Box>
  </group>
));
