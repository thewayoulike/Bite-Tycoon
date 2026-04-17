import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export const TexturedPerson3D = ({ 
  position, 
  textureUrl, 
  isWalking, 
  isSitting 
}: { 
  position: [number, number, number], 
  textureUrl: string, 
  isWalking: boolean, 
  isSitting: boolean 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const texture = useTexture(textureUrl);
  
  const materials = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    
    const headTex = texture.clone();
    headTex.repeat.set(0.5, 0.5);
    headTex.offset.set(0, 0.5);
    headTex.needsUpdate = true;

    const torsoTex = texture.clone();
    torsoTex.repeat.set(0.5, 0.5);
    torsoTex.offset.set(0, 0);
    torsoTex.needsUpdate = true;

    const legsTex = texture.clone();
    legsTex.repeat.set(0.5, 0.5);
    legsTex.offset.set(0.5, 0);
    legsTex.needsUpdate = true;

    const armsTex = texture.clone();
    armsTex.repeat.set(0.5, 0.5);
    armsTex.offset.set(0.5, 0.5);
    armsTex.needsUpdate = true;

    return {
      head: new THREE.MeshStandardMaterial({ map: headTex, roughness: 0.8 }),
      torso: new THREE.MeshStandardMaterial({ map: torsoTex, roughness: 0.8 }),
      legs: new THREE.MeshStandardMaterial({ map: legsTex, roughness: 0.8 }),
      arms: new THREE.MeshStandardMaterial({ map: armsTex, roughness: 0.8 }),
    };
  }, [texture]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (isWalking) {
      const walkSpeed = 15;
      const walkAngle = Math.sin(time * walkSpeed) * 0.5;
      
      if (leftLegRef.current) leftLegRef.current.rotation.x = walkAngle;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -walkAngle;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -walkAngle;
      if (rightArmRef.current) rightArmRef.current.rotation.x = walkAngle;
      
      if (groupRef.current) {
        groupRef.current.position.y = Math.abs(Math.sin(time * walkSpeed)) * 0.1;
      }
    } else if (isSitting) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2 + 0.2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2 + 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0.2;
      
      if (groupRef.current) {
        groupRef.current.position.y = -0.5;
      }
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      
      if (groupRef.current) {
        groupRef.current.position.y = 0;
      }
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.4, 32]} />
        <primitive object={materials.head} attach="material" />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.75, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.7, 32]} />
        <primitive object={materials.torso} attach="material" />
      </mesh>

      {/* Arms */}
      <group ref={leftArmRef} position={[-0.28, 1.05, 0]}>
        <mesh position={[0, -0.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 16]} />
          <primitive object={materials.arms} attach="material" />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.28, 1.05, 0]}>
        <mesh position={[0, -0.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 16]} />
          <primitive object={materials.arms} attach="material" />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.12, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.7, 16]} />
          <primitive object={materials.legs} attach="material" />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.12, 0.7, 0]}>
        <mesh position={[0, -0.35, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.7, 16]} />
          <primitive object={materials.legs} attach="material" />
        </mesh>
      </group>
    </group>
  );
};
