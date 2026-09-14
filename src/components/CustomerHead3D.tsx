import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Props = {
  skin: string; hair: string; eye: string; accent: string;
  style: number; seed: number; glasses: boolean; vip: boolean; earrings: boolean;
};

// Rounded silhouettes and a clear hairline keep faces readable from the game camera.
export const CustomerHead3D = memo(function CustomerHead3D({ skin, hair, eye, accent, style, seed, glasses, vip, earrings }: Props) {
  const eyes = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const phase = (clock.elapsedTime + (seed % 41) * 0.17) % 4.7;
    if (eyes.current) eyes.current.scale.y = phase < 0.16 ? Math.max(0.08, Math.abs(phase - 0.08) / 0.08) : 1;
  });

  const hairstyle = style % 6;
  return (
    <group scale={1.12}>
      <mesh scale={[1, 1.12, 0.92]} castShadow>
        <sphereGeometry args={[0.22, 24, 20]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.1, 0.045]} scale={[1, 0.64, 0.8]} castShadow>
        <sphereGeometry args={[0.155, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      {[-1, 1].map(side => (
        <group key={side}>
          <mesh position={[side * 0.215, -0.015, 0]} scale={[0.5, 0.85, 0.6]} castShadow>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color={skin} roughness={0.75} />
          </mesh>
          <mesh position={[side * 0.079, 0.084, 0.182]} rotation={[0, 0, side * 0.1]} scale={[1, 0.22, 0.28]}>
            <sphereGeometry args={[0.042, 12, 8]} />
            <meshStandardMaterial color={hair} roughness={0.9} />
          </mesh>
          {earrings && <mesh position={[side * 0.228, -0.066, 0.01]}>
            <torusGeometry args={[0.024, 0.005, 6, 14]} />
            <meshStandardMaterial color="#cba665" metalness={0.65} roughness={0.3} />
          </mesh>}
        </group>
      ))}
      <group position={[0, 0.026, 0.19]} ref={eyes}>
        {[-1, 1].map(side => (
          <group key={side} position={[side * 0.078, 0, 0]}>
            <mesh scale={[1, 0.85, 0.3]}>
              <sphereGeometry args={[0.036, 16, 12]} />
              <meshStandardMaterial color="#fff9ee" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0, 0.009]} scale={[1, 1.1, 0.35]}>
              <sphereGeometry args={[0.022, 12, 10]} />
              <meshStandardMaterial color={eye} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.016]} scale={[1, 1.1, 0.3]}>
              <sphereGeometry args={[0.012, 10, 8]} />
              <meshStandardMaterial color="#211b1b" />
            </mesh>
            <mesh position={[-0.006, 0.008, 0.021]}>
              <sphereGeometry args={[0.005, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, -0.015, 0.2]} scale={[0.75, 1, 0.9]}>
        <sphereGeometry args={[0.032, 12, 10]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.065, 0.184]} rotation={[0, 0, Math.PI * 1.1]}>
        <torusGeometry args={[0.035, 0.005, 6, 16, Math.PI * 0.8]} />
        <meshStandardMaterial color="#713f3b" roughness={0.85} />
      </mesh>

      {/* Hemisphere ends above the brows instead of covering the eyes. */}
      <mesh position={[0, 0.025, -0.018]} scale={[1.04, 1.1, 1]} castShadow>
        <sphereGeometry args={[0.225, 24, 16, 0, Math.PI * 2, 0, 1.28]} />
        <meshStandardMaterial color={hair} roughness={0.86} side={THREE.DoubleSide} />
      </mesh>
      {hairstyle === 0 && [0, 1, 2].map(i => (
        <mesh key={i} position={[-0.1 + i * 0.085, 0.208 + i * 0.006, 0.075]} rotation={[0, 0, -0.3]} scale={[1, 0.55, 0.75]} castShadow>
          <sphereGeometry args={[0.115, 16, 12]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
      ))}
      {hairstyle === 1 && Array.from({ length: 11 }, (_, i) => {
        const angle = i * 2.399;
        const radius = i < 7 ? 0.17 : 0.09;
        return <mesh key={i} position={[Math.cos(angle) * radius, i < 7 ? 0.17 : 0.26, Math.sin(angle) * radius - 0.025]} castShadow>
          <sphereGeometry args={[0.085, 12, 10]} />
          <meshStandardMaterial color={hair} roughness={0.95} />
        </mesh>;
      })}
      {(hairstyle === 2 || hairstyle === 3) && [-1, 1].map(side => (
        <mesh key={side} position={[side * 0.185, hairstyle === 2 ? -0.04 : 0.005, -0.07]} rotation={[0, 0, side * 0.09]} scale={[0.65, hairstyle === 2 ? 1.8 : 1.2, 1]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={hair} roughness={0.85} />
        </mesh>
      ))}
      {hairstyle === 3 && <mesh position={[0, 0.235, -0.16]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color={hair} roughness={0.9} />
      </mesh>}
      {hairstyle === 4 && <group>
        <mesh position={[0, 0.035, -0.02]} scale={[1.06, 1.2, 1.03]} castShadow>
          <sphereGeometry args={[0.23, 20, 14, 0, Math.PI * 2, 0, 1.25]} />
          <meshStandardMaterial color={accent} roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.125, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.024, 8, 24]} />
          <meshStandardMaterial color={accent} roughness={1} />
        </mesh>
      </group>}
      {hairstyle === 5 && <mesh position={[0.03, 0.14, 0.15]} rotation={[0, 0, 0.2]} scale={[1.65, 0.55, 0.55]} castShadow>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color={hair} roughness={0.85} />
      </mesh>}
      {glasses && <group position={[0, 0.03, 0.216]}>
        {[-1, 1].map(side => <group key={side} position={[side * 0.078, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.044, 0.005, 8, 20]} />
            <meshStandardMaterial color={vip ? '#cba665' : '#433c36'} metalness={0.4} roughness={0.35} />
          </mesh>
          {vip && <mesh><circleGeometry args={[0.04, 20]} /><meshStandardMaterial color="#252b34" roughness={0.2} /></mesh>}
        </group>)}
        <mesh><boxGeometry args={[0.066, 0.006, 0.006]} /><meshStandardMaterial color={vip ? '#cba665' : '#433c36'} /></mesh>
      </group>}
    </group>
  );
});
