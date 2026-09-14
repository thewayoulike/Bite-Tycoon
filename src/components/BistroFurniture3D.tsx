import React, { memo } from 'react';
import { Box, Cylinder, Sphere, Html, Torus } from '@react-three/drei';
import * as THREE from 'three';

const mapPos = (percent: number) => (percent / 100) * 20 - 10;

// Upgraded High-End Dining Chair with plush cushion, curved backrest & brass-tipped legs
export const BistroChair3D = memo(({ position, rotation = [0, 0, 0], cushionColor = "#991b1b" }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  cushionColor?: string;
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* 4 Tapered Splayed Legs with Brass Ferrules */}
      {/* Front Left Leg */}
      <group position={[-0.22, 0.25, 0.22]} rotation={[0.08, 0, -0.08]}>
        <Cylinder args={[0.025, 0.018, 0.5, 12]} castShadow>
          <meshStandardMaterial color="#291e17" roughness={0.6} />
        </Cylinder>
        {/* Brass Cap Ferrule at bottom */}
        <Cylinder args={[0.02, 0.022, 0.08, 12]} position={[0, -0.22, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Cylinder>
      </group>

      {/* Front Right Leg */}
      <group position={[0.22, 0.25, 0.22]} rotation={[0.08, 0, 0.08]}>
        <Cylinder args={[0.025, 0.018, 0.5, 12]} castShadow>
          <meshStandardMaterial color="#291e17" roughness={0.6} />
        </Cylinder>
        <Cylinder args={[0.02, 0.022, 0.08, 12]} position={[0, -0.22, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Cylinder>
      </group>

      {/* Back Left Leg (slightly angled backwards) */}
      <group position={[-0.22, 0.25, -0.22]} rotation={[-0.1, 0, -0.08]}>
        <Cylinder args={[0.025, 0.018, 0.5, 12]} castShadow>
          <meshStandardMaterial color="#291e17" roughness={0.6} />
        </Cylinder>
        <Cylinder args={[0.02, 0.022, 0.08, 12]} position={[0, -0.22, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Cylinder>
      </group>

      {/* Back Right Leg */}
      <group position={[0.22, 0.25, -0.22]} rotation={[-0.1, 0, 0.08]}>
        <Cylinder args={[0.025, 0.018, 0.5, 12]} castShadow>
          <meshStandardMaterial color="#291e17" roughness={0.6} />
        </Cylinder>
        <Cylinder args={[0.02, 0.022, 0.08, 12]} position={[0, -0.22, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </Cylinder>
      </group>

      {/* Under-seat Wooden Rim / Frame */}
      <Box args={[0.54, 0.04, 0.54]} position={[0, 0.48, 0]} castShadow>
        <meshStandardMaterial color="#3b271d" roughness={0.7} />
      </Box>

      {/* Plush Padded Seat Cushion with Piping Trim */}
      <group position={[0, 0.53, 0]}>
        <Cylinder args={[0.3, 0.32, 0.07, 24]} castShadow>
          <meshStandardMaterial color={cushionColor} roughness={0.8} />
        </Cylinder>
        {/* Soft Piping Edge */}
        <Torus args={[0.31, 0.016, 12, 24]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <meshStandardMaterial color="#1f1813" roughness={0.5} />
        </Torus>
      </group>

      {/* Backrest Uprights (Carved Dark Walnut Wood) */}
      <Cylinder args={[0.02, 0.02, 0.52, 12]} position={[-0.22, 0.76, -0.24]} rotation={[-0.08, 0, 0]} castShadow>
        <meshStandardMaterial color="#291e17" roughness={0.6} />
      </Cylinder>
      <Cylinder args={[0.02, 0.02, 0.52, 12]} position={[0.22, 0.76, -0.24]} rotation={[-0.08, 0, 0]} castShadow>
        <meshStandardMaterial color="#291e17" roughness={0.6} />
      </Cylinder>
      <Cylinder args={[0.015, 0.015, 0.44, 12]} position={[-0.08, 0.74, -0.25]} rotation={[-0.08, 0, 0]}>
        <meshStandardMaterial color="#291e17" roughness={0.6} />
      </Cylinder>
      <Cylinder args={[0.015, 0.015, 0.44, 12]} position={[0.08, 0.74, -0.25]} rotation={[-0.08, 0, 0]}>
        <meshStandardMaterial color="#291e17" roughness={0.6} />
      </Cylinder>

      {/* Curved Ergonomic Upholstered Backrest Top Rest */}
      <group position={[0, 0.98, -0.26]} rotation={[-0.08, 0, 0]}>
        <Box args={[0.54, 0.16, 0.07]} castShadow>
          <meshStandardMaterial color={cushionColor} roughness={0.75} />
        </Box>
        {/* Top wood crown strip */}
        <Box args={[0.56, 0.03, 0.08]} position={[0, 0.09, 0]}>
          <meshStandardMaterial color="#3b271d" roughness={0.6} />
        </Box>
      </group>
    </group>
  );
});

// Upgraded High-End Dining Table with Marble/Wood top, Cast-Iron base, and Centerpiece
export const BistroTable3D = memo(({ table, index, isEating, actions }: {
  table: any;
  index: number;
  isEating: boolean;
  actions: any;
}) => {
  const x = mapPos(table.x);
  const z = mapPos(table.y);

  // Diverse cushion palette per table for a boutique bistro aesthetic
  const chairPalettes = ["#991b1b", "#1e3a8a", "#065f46", "#b45309", "#4c1d95", "#831843"];
  const chairColor = chairPalettes[index % chairPalettes.length];

  return (
    <group position={[x, 0, z]}>
      {/* Clean Table Action Banner */}
      {table.isDirty && (
        <Html position={[0, 2.7, 0]} center zIndexRange={[100, 0]}>
          <button 
            onClick={() => actions.cleanTable(table.id)}
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-900 border-2 border-amber-800 font-black text-[11px] rounded-lg shadow-2xl animate-pulse whitespace-nowrap pointer-events-auto flex items-center gap-1.5 transform hover:scale-105 active:scale-95 transition-all"
          >
            <span>🧽</span>
            <span>BUS & CLEAN TABLE</span>
          </button>
        </Html>
      )}

      {/* TABLE BASE: Cast-Iron Bistro Fluted Stand with Brass Trim */}
      {/* Heavy Ornate Stepped Pedestal Base */}
      <Cylinder args={[0.45, 0.52, 0.06, 32]} position={[0, 0.03, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#1c1917" metalness={0.7} roughness={0.4} />
      </Cylinder>
      {/* Brass Accent Ring */}
      <Torus args={[0.42, 0.02, 12, 32]} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Torus>
      {/* Fluted Central Cast Iron Column */}
      <Cylinder args={[0.07, 0.09, 0.94, 24]} position={[0, 0.54, 0]} castShadow>
        <meshStandardMaterial color="#1c1917" metalness={0.6} roughness={0.4} />
      </Cylinder>
      {/* Turned Column Decorative Rings */}
      <Cylinder args={[0.11, 0.11, 0.04, 24]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>
      <Cylinder args={[0.11, 0.11, 0.04, 24]} position={[0, 0.85, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>

      {/* Under-table Support Spider Bracket */}
      <Cylinder args={[0.4, 0.15, 0.05, 16]} position={[0, 1.02, 0]}>
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </Cylinder>

      {/* TABLETOP: Carrera White Marble with Brass Bullnose Trim */}
      <group position={[0, 1.06, 0]}>
        {/* Brass Beveled Edge Rim */}
        <Cylinder args={[1.22, 1.22, 0.07, 48]} castShadow receiveShadow>
          <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.25} />
        </Cylinder>
        {/* Polished Marble Surface */}
        <Cylinder args={[1.19, 1.19, 0.075, 48]} position={[0, 0.005, 0]} receiveShadow>
          <meshStandardMaterial 
            color={table.isDirty ? "#d6d3d1" : "#fafafa"} 
            roughness={table.isDirty ? 0.6 : 0.1} 
            metalness={0.1}
          />
        </Cylinder>
      </group>

      {/* PERMANENT TABLETOP CENTERPIECE (Bistro Ambience) */}
      {!table.isDirty && (
        <group position={[0, 1.1, 0]}>
          {/* Ceramic Flower Vase with blooming rose */}
          <group position={[-0.2, 0, -0.15]}>
            <Cylinder args={[0.04, 0.06, 0.14, 16]} position={[0, 0.07, 0]} castShadow>
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </Cylinder>
            {/* Green stems */}
            <Cylinder args={[0.008, 0.008, 0.12, 8]} position={[0, 0.18, 0]} rotation={[0, 0, 0.1]}>
              <meshStandardMaterial color="#15803d" />
            </Cylinder>
            {/* Flower Blossom */}
            <Sphere args={[0.04, 12, 12]} position={[0.02, 0.24, 0]} scale={[1, 0.8, 1]}>
              <meshStandardMaterial color="#e11d48" roughness={0.7} />
            </Sphere>
            <Sphere args={[0.025, 8, 8]} position={[0.04, 0.25, 0.02]}>
              <meshStandardMaterial color="#fb7185" roughness={0.7} />
            </Sphere>
          </group>

          {/* Glowing Glass Candle Votive */}
          <group position={[0.18, 0, -0.15]}>
            <Cylinder args={[0.045, 0.04, 0.09, 16]} position={[0, 0.045, 0]}>
              <meshStandardMaterial color="#fef3c7" transparent opacity={0.65} roughness={0.1} />
            </Cylinder>
            {/* Warm Candle Flame */}
            <Sphere args={[0.015, 8, 8]} position={[0, 0.07, 0]} scale={[0.8, 1.4, 0.8]}>
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
            </Sphere>
            {/* Micro subtle candle light */}
            <pointLight position={[0, 0.1, 0]} intensity={0.4} color="#fde68a" distance={3} />
          </group>

          {/* Stainless Salt & Pepper Shakers */}
          <group position={[0, 0, 0.22]}>
            {/* Salt */}
            <Cylinder args={[0.022, 0.025, 0.07, 12]} position={[-0.04, 0.035, 0]}>
              <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.2} />
            </Cylinder>
            <Sphere args={[0.022, 12, 12]} position={[-0.04, 0.07, 0]} scale={[1, 0.4, 1]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Sphere>
            {/* Pepper */}
            <Cylinder args={[0.022, 0.025, 0.07, 12]} position={[0.04, 0.035, 0]}>
              <meshStandardMaterial color="#334155" metalness={0.2} roughness={0.3} />
            </Cylinder>
            <Sphere args={[0.022, 12, 12]} position={[0.04, 0.07, 0]} scale={[1, 0.4, 1]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Sphere>
          </group>
        </group>
      )}

      {/* ACTIVE DINING DISHES (When guests are eating) */}
      {isEating && (
        <group position={[0, 1.1, 0]}>
          {/* Main Course Plate 1 */}
          <group position={[-0.35, 0, 0]}>
            <Cylinder args={[0.22, 0.16, 0.03, 24]} position={[0, 0.015, 0]} castShadow>
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </Cylinder>
            {/* Golden fries / pasta */}
            <Box args={[0.12, 0.05, 0.12]} position={[0, 0.04, 0]}>
              <meshStandardMaterial color="#f59e0b" roughness={0.8} />
            </Box>
            {/* Grilled steak / burger patty */}
            <Cylinder args={[0.09, 0.09, 0.04, 16]} position={[0.02, 0.06, 0]}>
              <meshStandardMaterial color="#78350f" roughness={0.7} />
            </Cylinder>
            {/* Fork & Knife */}
            <Box args={[0.02, 0.008, 0.24]} position={[-0.2, 0.01, 0]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Box>
            <Box args={[0.018, 0.008, 0.24]} position={[0.2, 0.01, 0]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Box>
            {/* Glass with drink */}
            <Cylinder args={[0.04, 0.035, 0.12, 16]} position={[0.18, 0.06, -0.2]}>
              <meshStandardMaterial color="#93c5fd" transparent opacity={0.65} roughness={0.1} />
            </Cylinder>
          </group>

          {/* Main Course Plate 2 */}
          <group position={[0.35, 0, 0]}>
            <Cylinder args={[0.22, 0.16, 0.03, 24]} position={[0, 0.015, 0]} castShadow>
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </Cylinder>
            <Sphere args={[0.08, 12, 12]} position={[0, 0.06, 0]} scale={[1, 0.5, 1]}>
              <meshStandardMaterial color="#ef4444" roughness={0.7} />
            </Sphere>
            {/* Fork & Knife */}
            <Box args={[0.02, 0.008, 0.24]} position={[-0.2, 0.01, 0]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Box>
            <Box args={[0.018, 0.008, 0.24]} position={[0.2, 0.01, 0]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </Box>
            {/* Glass with drink */}
            <Cylinder args={[0.04, 0.035, 0.12, 16]} position={[-0.18, 0.06, -0.2]}>
              <meshStandardMaterial color="#fbcfe8" transparent opacity={0.65} roughness={0.1} />
            </Cylinder>
          </group>
        </group>
      )}

      {/* DIRTY TABLE DISHES & CRUMBS */}
      {table.isDirty && (
        <group position={[0, 1.1, 0]}>
          {/* Stacked dirty plates */}
          <group position={[0.15, 0, 0.1]} rotation={[0, 0.2, 0]}>
            <Cylinder args={[0.22, 0.18, 0.03, 24]} position={[0, 0.015, 0]}>
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </Cylinder>
            <Cylinder args={[0.18, 0.14, 0.03, 24]} position={[0.02, 0.045, 0.01]} rotation={[0, 0.4, 0]}>
              <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
            </Cylinder>
            {/* Sauce smudges */}
            <Sphere args={[0.03, 8, 8]} position={[0.02, 0.07, 0]} scale={[1.5, 0.2, 1]}>
              <meshStandardMaterial color="#7f1d1d" roughness={0.9} />
            </Sphere>
          </group>

          {/* Empty tilted beverage glasses */}
          <group position={[-0.25, 0.05, -0.15]} rotation={[0, 0, 0.25]}>
            <Cylinder args={[0.04, 0.035, 0.11, 16]}>
              <meshStandardMaterial color="#cbd5e1" transparent opacity={0.5} roughness={0.2} />
            </Cylinder>
          </group>

          {/* Crumpled paper napkins and breadcrumbs */}
          <Box args={[0.1, 0.06, 0.09]} position={[-0.1, 0.03, 0.2]} rotation={[0.2, 0.6, -0.1]}>
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </Box>
          <Sphere args={[0.015, 6, 6]} position={[0.25, 0.015, -0.2]}>
            <meshStandardMaterial color="#d97706" />
          </Sphere>
          <Sphere args={[0.012, 6, 6]} position={[-0.05, 0.012, -0.1]}>
            <meshStandardMaterial color="#78350f" />
          </Sphere>
        </group>
      )}

      {/* 4 MATCHING BISTRO CHAIRS */}
      {/* West Chair (Facing East) */}
      <BistroChair3D position={[-1.4, 0, 0]} rotation={[0, Math.PI / 2, 0]} cushionColor={chairColor} />
      {/* East Chair (Facing West) */}
      <BistroChair3D position={[1.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]} cushionColor={chairColor} />
      {/* North Chair (Facing South) */}
      <BistroChair3D position={[0, 0, -1.4]} rotation={[0, 0, 0]} cushionColor={chairColor} />
      {/* South Chair (Facing North) */}
      <BistroChair3D position={[0, 0, 1.4]} rotation={[0, Math.PI, 0]} cushionColor={chairColor} />
    </group>
  );
}, (prev, next) => (
  prev.isEating === next.isEating &&
  prev.table.isDirty === next.table.isDirty &&
  prev.table.x === next.table.x &&
  prev.table.y === next.table.y
));
