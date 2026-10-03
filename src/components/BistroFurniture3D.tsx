import React, { memo } from 'react';
import { Box, Cylinder, Sphere, Html, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { FoodPlate3D } from './FoodPlate3D';

import {mapPos} from '../restaurantLayout';

// Upgraded High-End Dining Chair with plush cushion, curved backrest & brass-tipped legs
export const BistroChair3D = memo(({ position, rotation = [0, 0, 0], cushionColor = "#991b1b",style='classic' }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  cushionColor?: string;
  style?:'classic'|'diner'|'booth'|'fastfood';
}) => {
  if(style!=='classic')return <group position={position} rotation={rotation}>
    {style==='booth'?<Box args={[.7,.49,.57]} position={[0,.245,0]} castShadow><meshStandardMaterial color="#653c30" roughness={.85}/></Box>:[-.23,.23].flatMap(x=>[-.22,.22].map(z=><Cylinder key={`${x}:${z}`} args={[.027,.027,.52,8]} position={[x,.26,z]} castShadow><meshStandardMaterial color={style==='diner'?'#aeb7b9':'#494b49'} metalness={style==='diner'?.8:.15} roughness={.35}/></Cylinder>))}
    <Box args={[style==='booth'?.7:.6,.1,.57]} position={[0,.535,0]} castShadow><meshStandardMaterial color={cushionColor} roughness={.7}/></Box>
    <Box args={[style==='booth'?.7:.58,style==='booth'?.72:.46,.12]} position={[0,style==='booth'?.87:.79,-.27]} castShadow><meshStandardMaterial color={cushionColor} roughness={.7}/></Box>
    {style==='booth'&&[-.22,0,.22].map(x=><Box key={x} args={[.015,.59,.02]} position={[x,.87,-.2]}><meshStandardMaterial color="#c48f78"/></Box>)}
  </group>;
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
export const BistroTable3D = memo(({ table, index, isEating, actions, servedRecipeIds = [],identity='diner',level=1 }: {
  table: any;
  index: number;
  isEating: boolean; servedRecipeIds?: string[];
  actions: any;
  identity?: 'diner'|'cafe'|'bistro'|'italian'|'fastfood';
  level?:number;
}) => {
  const x = mapPos(table.x);
  const z = mapPos(table.y);

  // Diverse cushion palette per table for a boutique bistro aesthetic
  const chairPalettes = ["#991b1b", "#1e3a8a", "#065f46", "#b45309", "#4c1d95", "#831843"];
  const chairColor = identity==='cafe'?'#668676':identity==='bistro'?'#526744':identity==='italian'?'#70523c':identity==='fastfood'?'#b88f46':'#a14e45';
  const chairStyle=identity==='diner'?(level>=4&&Math.abs(x)>12?'booth':'diner'):identity==='fastfood'?'fastfood':'classic';

  return (
    <group position={[x, 0, z]} scale={2}>
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
      <Cylinder args={[0.07, 0.09, 0.64, 24]} position={[0, 0.39, 0]} castShadow>
        <meshStandardMaterial color="#1c1917" metalness={0.6} roughness={0.4} />
      </Cylinder>
      {/* Turned Column Decorative Rings */}
      <Cylinder args={[0.11, 0.11, 0.04, 24]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>
      <Cylinder args={[0.11, 0.11, 0.04, 24]} position={[0, 0.62, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>

      {/* Under-table Support Spider Bracket */}
      <Cylinder args={[0.4, 0.15, 0.05, 16]} position={[0, 0.72, 0]}>
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </Cylinder>

      {/* TABLETOP: Carrera White Marble with Brass Bullnose Trim */}
      <group position={[0, 0.76, 0]}>
        {/* Brass Beveled Edge Rim */}
        <Cylinder args={[1.22, 1.22, 0.07, 48]} castShadow receiveShadow>
          <meshStandardMaterial color={identity==='diner'?'#a8b2b8':identity==='fastfood'?'#5d5e5a':'#ab8953'} metalness={0.75} roughness={0.25} />
        </Cylinder>
        {/* Polished Marble Surface */}
        <Cylinder args={[1.19, 1.19, 0.075, 48]} position={[0, 0.005, 0]} receiveShadow>
          <meshStandardMaterial
            color={table.isDirty ? "#d6d3d1" : identity==='cafe'?'#bb9870':identity==='bistro'?'#eee4cb':identity==='italian'?'#d5b28b':identity==='fastfood'?'#d9c8a8':'#fafafa'}
            roughness={table.isDirty ? 0.6 : 0.1}
            metalness={0.1}
          />
        </Cylinder>
      </group>

      {/* PERMANENT TABLETOP CENTERPIECE (Bistro Ambience) */}
      {!table.isDirty && (
        <group position={[0, 0.803, 0]}>
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

      {/* Served plates retain the actual order after tickets leave the queue. */}
      {isEating && servedRecipeIds.slice(0, 6).map((recipeId, i, dishes) => {
        const angle = i / dishes.length * Math.PI * 2;
        return <group key={`${recipeId}-${i}`} position={[Math.cos(angle) * .69, .805, Math.sin(angle) * .69]} rotation={[0, -angle, 0]}>
          <FoodPlate3D recipeId={recipeId} scale={.93} />
        </group>;
      })}
      {/* DIRTY TABLE DISHES & CRUMBS */}
      {table.isDirty && (
        <group position={[0, 0.803, 0]}>
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
      <BistroChair3D position={[-1.4, 0, 0]} rotation={[0, Math.PI / 2, 0]} cushionColor={chairColor} style={chairStyle}/>
      {/* East Chair (Facing West) */}
      <BistroChair3D position={[1.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]} cushionColor={chairColor} style={chairStyle}/>
      {/* North Chair (Facing South) */}
      <BistroChair3D position={[0, 0, -1.4]} rotation={[0, 0, 0]} cushionColor={chairColor} style={chairStyle}/>
      {/* South Chair (Facing North) */}
      <BistroChair3D position={[0, 0, 1.4]} rotation={[0, Math.PI, 0]} cushionColor={chairColor} style={chairStyle}/>
    </group>
  );
}, (prev, next) => (
  prev.level === next.level &&
  prev.identity === next.identity &&
  prev.isEating === next.isEating &&
  (prev.servedRecipeIds ?? []).join() === (next.servedRecipeIds ?? []).join() &&
  prev.table.isDirty === next.table.isDirty &&
  prev.table.x === next.table.x &&
  prev.table.y === next.table.y
));

