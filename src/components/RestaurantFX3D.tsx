import React, { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Torus, Html, Text } from '@react-three/drei';
import * as THREE from 'three';

// 3D Animated Rising Steam Particles for Cooking Pots & Hot Dishes
export const SteamParticles3D = memo(({ position, count = 5, color = "#ffffff", spread = 0.3 }: {
  position: [number, number, number];
  count?: number;
  color?: string;
  spread?: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      initialY: (i / count) * 0.8,
      speed: 0.4 + (i % 3) * 0.15,
      offset: (i * 1.3) % (Math.PI * 2),
      radius: (i % 2 === 0 ? 1 : -1) * (spread * 0.5),
      scale: 0.04 + (i % 3) * 0.02
    }));
  }, [count, spread]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;

      const progress = ((time * p.speed + p.initialY) % 1.2);
      child.position.y = progress;
      child.position.x = Math.sin(time * 2 + p.offset) * (p.radius * progress);
      child.position.z = Math.cos(time * 2 + p.offset) * (p.radius * progress);

      const opacity = progress < 0.2 
        ? progress / 0.2 
        : progress > 0.8 
          ? (1.2 - progress) / 0.4 
          : 1;

      const mesh = child as THREE.Mesh;
      if (mesh.material && (mesh.material as any).opacity !== undefined) {
        (mesh.material as any).opacity = Math.max(0, opacity * 0.4);
      }
      child.scale.setScalar(p.scale * (1 + progress * 1.5));
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {particles.map((_, i) => (
        <Sphere key={i} args={[1, 8, 8]}>
          <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
        </Sphere>
      ))}
    </group>
  );
});

// Glowing Gas Stove Flame Burners (for kitchen kitchen stoves behind the counter)
export const GasBurners3D = memo(({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Heavy Steel Cooktop Surface */}
      <Box args={[7.5, 0.2, 1.8]} position={[0, 1.9, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </Box>

      {/* 4 Commercial High-BTU Gas Burner Wells */}
      {[-2.7, -0.9, 0.9, 2.7].map((bx, i) => (
        <group key={`burner-${i}`} position={[bx, 2.01, 0]}>
          {/* Cast Iron Trivet Grate */}
          <Cylinder args={[0.5, 0.52, 0.05, 16]} position={[0, 0.03, 0]}>
            <meshStandardMaterial color="#09090b" roughness={0.8} />
          </Cylinder>
          {/* Blue/Orange Gas Flame Core Ring */}
          <Torus args={[0.3, 0.035, 8, 16]} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3} />
          </Torus>
          <Torus args={[0.2, 0.025, 8, 16]} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={2.5} />
          </Torus>

          {/* Stainless Stockpot on stove with simmering steam */}
          <group position={[0, 0.25, 0]}>
            <Cylinder args={[0.38, 0.35, 0.45, 16]} position={[0, 0, 0]} castShadow>
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
            </Cylinder>
            {/* Handles */}
            <Torus args={[0.08, 0.02, 6, 12]} position={[-0.42, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </Torus>
            <Torus args={[0.08, 0.02, 6, 12]} position={[0.42, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </Torus>
            {/* Simmering hot soup */}
            <Cylinder args={[0.36, 0.36, 0.02, 16]} position={[0, 0.18, 0]}>
              <meshStandardMaterial color={i % 2 === 0 ? "#b45309" : "#e11d48"} roughness={0.2} />
            </Cylinder>
            {/* Steam rising from pot */}
            <SteamParticles3D position={[0, 0.35, 0]} count={6} spread={0.2} />
          </group>
        </group>
      ))}
    </group>
  );
});

// Grand 3D Neon Entrance Marquee Sign
export const EntranceMarquee3D = memo(({ position, isNight }: { position: [number, number, number]; isNight: boolean }) => {
  return (
    <group position={position}>
      {/* Decorative Brass Backing Plate */}
      <Box args={[9.5, 1.8, 0.35]} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color="#1e1b18" roughness={0.6} />
      </Box>
      {/* Brass Ornamental Frame Trim */}
      <Box args={[9.7, 2.0, 0.2]} position={[0, 0, -0.05]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>

      {/* Glowing Neon Display Panel */}
      <Box args={[9.1, 1.4, 0.1]} position={[0, 0, 0.18]}>
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </Box>

      {/* 3D Acrylic Lettering "BITE TYCOON" */}
      <group position={[0, 0.15, 0.25]}>
        <Text
          fontSize={0.85}
          color={isNight ? "#fde047" : "#fbbf24"}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          font="/fonts/Inter-Bold.woff" // fallback to built-in if absent
        >
          ★ BITE TYCOON ★
        </Text>
      </group>

      <group position={[0, -0.42, 0.25]}>
        <Text
          fontSize={0.32}
          color={isNight ? "#38bdf8" : "#0284c7"}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
        >
          PREMIER VOXEL BISTRO
        </Text>
      </group>

      {/* Warm Ambient Entrance Glow */}
      <pointLight 
        position={[0, -0.2, 0.8]} 
        color={isNight ? "#fde047" : "#fed7aa"} 
        intensity={isNight ? 2.5 : 1.2} 
        distance={12} 
      />
    </group>
  );
});

// Shiny Rotating Crown for VIP Guests
export const VIPCrown3D = memo(({ position }: { position: [number, number, number] }) => {
  const crownRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (crownRef.current) {
      crownRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group ref={crownRef} position={position}>
      {/* Gold Crown Circlet Ring */}
      <Cylinder args={[0.22, 0.18, 0.12, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
      </Cylinder>
      {/* 5 Crown Points */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const px = Math.sin(angle) * 0.2;
        const pz = Math.cos(angle) * 0.2;
        return (
          <group key={i} position={[px, 0.1, pz]}>
            <Cylinder args={[0.01, 0.05, 0.14, 8]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
            </Cylinder>
            {/* Ruby Gemstone on peak */}
            <Sphere args={[0.03, 8, 8]} position={[0, 0.08, 0]}>
              <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.1} emissive="#ef4444" emissiveIntensity={0.8} />
            </Sphere>
          </group>
        );
      })}
    </group>
  );
});

// Floating Currency & Notification Particle
export const FloatingParticle3D = memo(({ 
  text, 
  subtext,
  color = "#22c55e",
  position, 
  onComplete 
}: {
  text: string;
  subtext?: string;
  color?: string;
  position: [number, number, number];
  onComplete?: () => void;
}) => {
  const ref = useRef<THREE.Group>(null);
  const startY = position[1];

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.y += delta * 1.5;
    if (ref.current.position.y > startY + 3.2 && onComplete) {
      onComplete();
    }
  });

  return (
    <group ref={ref} position={position}>
      <Html center pointerEvents="none" zIndexRange={[200, 0]}>
        <div className="flex flex-col items-center animate-fade-in select-none">
          <div 
            className="px-2.5 py-1 rounded-full font-black text-sm md:text-base tracking-wider shadow-2xl border-2 border-stone-900 drop-shadow flex items-center gap-1.5"
            style={{ backgroundColor: color, color: '#ffffff' }}
          >
            <span>{text}</span>
          </div>
          {subtext && (
            <div className="mt-0.5 px-2 py-0.5 bg-yellow-400 text-yellow-950 font-black text-[10px] rounded-full border border-stone-800 shadow-md">
              {subtext}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
});

// Glowing Neon Marquee Sign over the Restaurant Entrance
export const NeonRestaurantMarquee3D = memo(({ position = [0, 7.8, 15.3], isNight = false }: { position?: [number, number, number]; isNight?: boolean }) => {
  return (
    <group position={position}>
      {/* Sign Backplate */}
      <Box args={[7.2, 1.6, 0.25]} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
      </Box>
      {/* Brass Edge Frame */}
      <Box args={[7.4, 1.8, 0.2]} position={[0, 0, -0.05]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
      </Box>
      {/* Neon Text */}
      <Text
        position={[0, 0.1, 0.16]}
        fontSize={0.65}
        color={isNight ? "#fbbf24" : "#fef08a"}
        anchorX="center"
        anchorY="middle"
      >
        LE BISTRO
      </Text>
      <Text
        position={[0, -0.42, 0.16]}
        fontSize={0.22}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        FINE CUISINE & CAFE
      </Text>
      {/* Glowing Neon Point Light */}
      <pointLight position={[0, 0, 0.6]} intensity={isNight ? 12 : 2} distance={8} color="#f59e0b" />
    </group>
  );
});

// Ambient Floating Light Dust Motes
export const AmbientDustMotes3D = memo(({ count = 24 }: { count?: number }) => {
  const pointsRef = useRef<THREE.Group>(null);
  const motes = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: (Math.random() - 0.5) * 26,
      y: 1.5 + Math.random() * 6.5,
      z: (Math.random() - 0.5) * 26,
      speedY: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      size: 0.04 + Math.random() * 0.03
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    pointsRef.current.children.forEach((child, i) => {
      const m = motes[i];
      if (!m) return;
      child.position.y = ((m.y + t * m.speedY) % 7) + 1.2;
      child.position.x = m.x + Math.sin(t * 0.5 + m.phase) * 0.3;
      child.position.z = m.z + Math.cos(t * 0.5 + m.phase) * 0.3;
    });
  });

  return (
    <group ref={pointsRef}>
      {motes.map((m, i) => (
        <Sphere key={i} args={[m.size, 6, 6]} position={[m.x, m.y, m.z]}>
          <meshBasicMaterial color="#fef3c7" transparent opacity={0.4} />
        </Sphere>
      ))}
    </group>
  );
});
