import React, { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { CustomerHead3D } from './CustomerHead3D';

export interface RealCharacterProps {
  role?: 'customer' | 'waiter' | 'chef' | 'cleaner';
  color?: string;
  seed?: number;
  isWalking?: boolean;
  isSitting?: boolean;
  isWaitingOrder?: boolean;
  isWaitingFood?: boolean;
  isEating?: boolean;
  isVIP?: boolean;
  hasTray?: boolean;
  isTakingOrder?: boolean;
  position?: [number, number, number];
}

// Diverse realistic skin tones
const SKIN_TONES = [
  '#fce0d4', // Fair peach
  '#f5d0be', // Warm porcelain
  '#eac096', // Warm beige
  '#dfa375', // Golden honey
  '#b8784d', // Rich caramel
  '#8d532b', // Deep bronze
  '#59351e', // Rich espresso
];

// Natural hair colors
const HAIR_COLORS = [
  '#18181b', // Jet black
  '#291e17', // Dark espresso brown
  '#451a03', // Chestnut brunette
  '#78350f', // Warm auburn
  '#b45309', // Caramel brown
  '#d97706', // Honey golden
  '#fbbf24', // Sun-kissed blonde
  '#991b1b', // Deep ruby / red
  '#52525b', // Slate silver
];

// Diverse eye iris colors
const EYE_COLORS = [
  '#1e3a8a', // Ocean blue
  '#0d9488', // Teal green
  '#15803d', // Forest emerald
  '#78350f', // Warm hazel
  '#451a03', // Dark chocolate
  '#312e81', // Deep indigo
];

// Outfit color pairings for stylish clothing
const CASUAL_OUTFITS = [
  { top: '#e11d48', accent: '#ffe4e6', pants: '#1e3a8a', shoes: '#ffffff' }, // Crimson hoodie & denim
  { top: '#2563eb', accent: '#dbeafe', pants: '#1e293b', shoes: '#f1f5f9' }, // Royal blue bomber & navy
  { top: '#059669', accent: '#d1fae5', pants: '#334155', shoes: '#ffffff' }, // Emerald sweater & slate
  { top: '#d97706', accent: '#fef3c7', pants: '#172554', shoes: '#3b82f6' }, // Amber knit & dark jeans
  { top: '#7c3aed', accent: '#ede9fe', pants: '#0f172a', shoes: '#ffffff' }, // Purple jacket & black pants
  { top: '#0891b2', accent: '#cffafe', pants: '#475569', shoes: '#f8fafc' }, // Cyan windbreaker & grey
  { top: '#ea580c', accent: '#ffedd5', pants: '#1e293b', shoes: '#ffffff' }, // Orange casual tee & dark pants
  { top: '#475569', accent: '#f1f5f9', pants: '#0284c7', shoes: '#ffffff' }, // Slate polo & blue jeans
];

export const RealCharacter3D = memo(({
  role = 'customer',
  color,
  seed = 0,
  isWalking = false,
  isSitting = false,
  isWaitingOrder = false,
  isWaitingFood = false,
  isEating = false,
  isVIP = false,
  hasTray = false,
  isTakingOrder = false,
  position = [0, 0, 0],
}: RealCharacterProps) => {
  const rootRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const leftShinRef = useRef<THREE.Group>(null);
  const rightShinRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Group>(null);
  const rightFootRef = useRef<THREE.Group>(null);
  const eatingItemRef = useRef<THREE.Group>(null);
  const walkWeightRef = useRef(0);
  const walkPhaseRef = useRef(0);
  const legsRef = useRef<THREE.Group>(null);

  // Deterministic styling based on seed
  const charConfig = useMemo(() => {
    const s = Math.abs(seed || 0);
    const pick = (salt: number, count: number) => {
      let hash = Math.imul(s ^ salt, 0x45d9f3b);
      hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
      return ((hash ^ (hash >>> 16)) >>> 0) % count;
    };
    const skin = SKIN_TONES[pick(11, SKIN_TONES.length)];
    const hair = HAIR_COLORS[pick(23, HAIR_COLORS.length)];
    const eye = EYE_COLORS[pick(37, EYE_COLORS.length)];
    const hairStyle = pick(51, role === 'customer' ? 6 : 8);
    const outfitStyle = pick(67, 8);
    const palette = CASUAL_OUTFITS[pick(83, CASUAL_OUTFITS.length)];
    const hasGlasses = (s % 5 === 0) || isVIP;
    const glassesStyle = isVIP ? 'sunglasses' : (s % 2 === 0 ? 'round' : 'square');
    const hasBackpack = role === 'customer' && !isSitting && (s % 3 === 0);
    const hasEarrings = s % 4 === 0;

    let shirtColor = role === 'customer' ? palette.top : color || palette.top;
    let pantsColor = palette.pants;
    let shoeColor = palette.shoes;

    if (role === 'waiter') {
      shirtColor = '#ffffff';
      pantsColor = '#0f172a';
      shoeColor = '#18181b';
    } else if (role === 'chef') {
      shirtColor = '#f8fafc';
      pantsColor = '#334155';
      shoeColor = '#1e293b';
    } else if (role === 'cleaner') {
      shirtColor = '#0284c7';
      pantsColor = '#1e293b';
      shoeColor = '#0f172a';
    } else if (isVIP) {
      shirtColor = '#09090b'; // Luxury velvet black
      pantsColor = '#18181b';
      shoeColor = '#eab308'; // Gold accent dress shoes
    }

    return {
      skin,
      hair,
      eye,
      hairStyle,
      outfitStyle,
      palette,
      hasGlasses,
      glassesStyle,
      hasBackpack,
      hasEarrings,
      shirtColor,
      pantsColor,
      shoeColor,
    };
  }, [seed, color, role, isVIP, isSitting]);

  // Articulated skeletal procedural animation
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (legsRef.current) {
      legsRef.current.position.y = THREE.MathUtils.damp(legsRef.current.position.y, isSitting ? -0.38 : 0, 8, delta);
    }
    const targetWalkWeight = (isWalking && !isSitting) ? 1 : 0;
    walkWeightRef.current = THREE.MathUtils.damp(walkWeightRef.current, targetWalkWeight, 10, delta);
    const weight = walkWeightRef.current;
    const walkSpeed = role === 'waiter' ? 5.8 : 6.0;
    
    // Advance phase smoothly only when in motion
    if (weight > 0.02) {
      walkPhaseRef.current += delta * walkSpeed;
    }
    const walkCycle = walkPhaseRef.current;

    if (isSitting) {
      // SITTING POSTURE:
      // Pelvis drops to chair height
      if (torsoGroupRef.current) {
        torsoGroupRef.current.position.x = THREE.MathUtils.damp(torsoGroupRef.current.position.x, 0, 8, delta);
        torsoGroupRef.current.position.y = THREE.MathUtils.damp(torsoGroupRef.current.position.y, 0.72, 8, delta);
        torsoGroupRef.current.position.z = THREE.MathUtils.damp(torsoGroupRef.current.position.z, 0, 8, delta);
        torsoGroupRef.current.rotation.x = THREE.MathUtils.damp(torsoGroupRef.current.rotation.x, 0.05, 8, delta);
        torsoGroupRef.current.rotation.y = THREE.MathUtils.damp(torsoGroupRef.current.rotation.y, 0, 8, delta);
        torsoGroupRef.current.rotation.z = THREE.MathUtils.damp(torsoGroupRef.current.rotation.z, 0, 8, delta);
      }

      // THIGHS: rotate horizontally forward
      if (leftThighRef.current && rightThighRef.current) {
        leftThighRef.current.rotation.x = THREE.MathUtils.damp(leftThighRef.current.rotation.x, -Math.PI / 2, 8, delta);
        rightThighRef.current.rotation.x = THREE.MathUtils.damp(rightThighRef.current.rotation.x, -Math.PI / 2, 8, delta);
        leftThighRef.current.rotation.z = THREE.MathUtils.damp(leftThighRef.current.rotation.z, -0.06, 8, delta);
        rightThighRef.current.rotation.z = THREE.MathUtils.damp(rightThighRef.current.rotation.z, 0.06, 8, delta);
      }

      // SHINS (KNEES): bend 90 degrees down toward floor!
      if (leftShinRef.current && rightShinRef.current) {
        leftShinRef.current.rotation.x = THREE.MathUtils.damp(leftShinRef.current.rotation.x, Math.PI / 2, 8, delta);
        rightShinRef.current.rotation.x = THREE.MathUtils.damp(rightShinRef.current.rotation.x, Math.PI / 2, 8, delta);
      }

      // FEET: resting flat on floor under chair
      if (leftFootRef.current) leftFootRef.current.rotation.x = THREE.MathUtils.damp(leftFootRef.current.rotation.x, 0.08, 8, delta);
      if (rightFootRef.current) rightFootRef.current.rotation.x = THREE.MathUtils.damp(rightFootRef.current.rotation.x, 0.08, 8, delta);

      // ARMS & ACTIVITIES AT TABLE:
      if (isWaitingOrder) {
        // Holding restaurant menu booklet with both hands
        if (leftUpperArmRef.current && rightUpperArmRef.current) {
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, -Math.PI / 3, 8, delta);
          leftUpperArmRef.current.rotation.y = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.y, 0.3, 8, delta);
          leftUpperArmRef.current.rotation.z = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.z, -0.2, 8, delta);

          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, -Math.PI / 3, 8, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, -0.3, 8, delta);
          rightUpperArmRef.current.rotation.z = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.z, 0.2, 8, delta);
        }
        if (leftForearmRef.current && rightForearmRef.current) {
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, -0.5, 8, delta);
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, -0.5, 8, delta);
        }
      } else if (isEating) {
        // Active eating animation loop!
        const eatCycle = Math.sin(time * 3);
        if (rightUpperArmRef.current) {
          const eatArmAngle = -Math.PI / 2.8 + eatCycle * 0.25;
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, eatArmAngle, 8, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, -0.35, 8, delta);
        }
        if (rightForearmRef.current) {
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, -0.7 + eatCycle * 0.3, 8, delta);
        }
        if (leftUpperArmRef.current) {
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, -Math.PI / 4, 8, delta);
        }
        // Happy head nod while tasting delicious food
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = THREE.MathUtils.damp(headGroupRef.current.rotation.x, Math.sin(time * 6) * 0.08, 8, delta);
        }
      } else if (isWaitingFood) {
        // Checking illuminated smartphone
        if (leftUpperArmRef.current && rightUpperArmRef.current) {
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, -Math.PI / 3.2, 8, delta);
          leftUpperArmRef.current.rotation.y = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.y, 0.4, 8, delta);
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, -Math.PI / 3.2, 8, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, -0.4, 8, delta);
        }
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = THREE.MathUtils.damp(headGroupRef.current.rotation.x, 0.25, 8, delta);
        }
      } else {
        // Resting hands gently on table surface
        if (leftUpperArmRef.current && rightUpperArmRef.current) {
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, -Math.PI / 4, 8, delta);
          leftUpperArmRef.current.rotation.y = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.y, 0, 8, delta);
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, -Math.PI / 4, 8, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, 0, 8, delta);
        }
        if (leftForearmRef.current && rightForearmRef.current) {
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, -0.4, 8, delta);
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, -0.4, 8, delta);
        }
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = THREE.MathUtils.damp(headGroupRef.current.rotation.x, 0, 8, delta);
        }
      }
    } else {
      // NATURAL UPRIGHT BIOMECHANICAL MOTION (Seamlessly blending walking and standing)
      const strideAmp = 0.48;
      const leftStride = Math.sin(walkCycle);
      const rightStride = Math.sin(walkCycle + Math.PI);

      // Pelvis bobbing & lateral weight transfer
      const pelvisBob = Math.cos(walkCycle * 2) * 0.022;
      const lateralShift = Math.sin(walkCycle) * 0.014;
      const torsoTwist = -Math.sin(walkCycle) * 0.055;
      const breath = Math.sin(time * 2) * 0.012;

      if (torsoGroupRef.current) {
        torsoGroupRef.current.position.y = THREE.MathUtils.damp(torsoGroupRef.current.position.y, 1.1 + (pelvisBob * weight) + (breath * (1 - weight)), 10, delta);
        torsoGroupRef.current.position.x = THREE.MathUtils.damp(torsoGroupRef.current.position.x, lateralShift * weight, 10, delta);
        torsoGroupRef.current.position.z = THREE.MathUtils.damp(torsoGroupRef.current.position.z, 0, 10, delta);
        torsoGroupRef.current.rotation.y = THREE.MathUtils.damp(torsoGroupRef.current.rotation.y, torsoTwist * weight, 10, delta);
        torsoGroupRef.current.rotation.z = THREE.MathUtils.damp(torsoGroupRef.current.rotation.z, Math.sin(walkCycle) * 0.014 * weight, 10, delta);
        torsoGroupRef.current.rotation.x = THREE.MathUtils.damp(torsoGroupRef.current.rotation.x, 0.028 * weight, 10, delta);
      }

      // THIGHS (Hips): natural forward/back stride
      if (leftThighRef.current && rightThighRef.current) {
        leftThighRef.current.rotation.x = THREE.MathUtils.damp(leftThighRef.current.rotation.x, -leftStride * strideAmp * weight, 12, delta);
        rightThighRef.current.rotation.x = THREE.MathUtils.damp(rightThighRef.current.rotation.x, -rightStride * strideAmp * weight, 12, delta);
        leftThighRef.current.rotation.z = THREE.MathUtils.damp(leftThighRef.current.rotation.z, 0, 12, delta);
        rightThighRef.current.rotation.z = THREE.MathUtils.damp(rightThighRef.current.rotation.z, 0, 12, delta);
      }

      // KNEES (Shins): smooth forward-swing clearance and stable stance support
      if (leftShinRef.current && rightShinRef.current) {
        const leftKneeAngle = leftStride > 0 
          ? (0.04 + Math.pow(leftStride, 1.3) * 0.65) 
          : (0.04 + (-leftStride) * 0.06);
        const rightKneeAngle = rightStride > 0 
          ? (0.04 + Math.pow(rightStride, 1.3) * 0.65) 
          : (0.04 + (-rightStride) * 0.06);

        leftShinRef.current.rotation.x = THREE.MathUtils.damp(leftShinRef.current.rotation.x, leftKneeAngle * weight, 12, delta);
        rightShinRef.current.rotation.x = THREE.MathUtils.damp(rightShinRef.current.rotation.x, rightKneeAngle * weight, 12, delta);
      }

      // ANKLES & FEET: dorsiflexion on heel contact, plantarflexion on push-off
      const leftAnkle = Math.sin(walkCycle - 0.35) * 0.18;
      const rightAnkle = Math.sin(walkCycle + Math.PI - 0.35) * 0.18;
      if (leftFootRef.current) leftFootRef.current.rotation.x = THREE.MathUtils.damp(leftFootRef.current.rotation.x, leftAnkle * weight, 12, delta);
      if (rightFootRef.current) rightFootRef.current.rotation.x = THREE.MathUtils.damp(rightFootRef.current.rotation.x, rightAnkle * weight, 12, delta);

      // HEAD STABILIZATION (Cancels torso twist so gaze remains steady forward)
      if (headGroupRef.current) {
        headGroupRef.current.rotation.x = THREE.MathUtils.damp(headGroupRef.current.rotation.x, -0.01 * weight, 8, delta);
        headGroupRef.current.rotation.y = THREE.MathUtils.damp(headGroupRef.current.rotation.y, (-torsoTwist * 0.75) * weight, 8, delta);
        headGroupRef.current.rotation.z = THREE.MathUtils.damp(headGroupRef.current.rotation.z, -Math.sin(walkCycle) * 0.012 * weight, 8, delta);
      }

      // UPPER BODY AND ARMS
      if (role === 'waiter' && isTakingOrder) {
        // WAITER ACTIVELY WRITING ON ORDER NOTEPAD:
        const writeWiggle = Math.sin(time * 9) * 0.025;
        if (leftUpperArmRef.current) {
          leftUpperArmRef.current.position.y = 0.32;
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, -Math.PI / 3, 8, delta);
          leftUpperArmRef.current.rotation.y = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.y, 0.25, 8, delta);
        }
        if (leftForearmRef.current) {
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, -0.45, 8, delta);
        }
        if (rightUpperArmRef.current) {
          rightUpperArmRef.current.position.y = 0.32;
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, -Math.PI / 2.9, 8, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, -0.32, 8, delta);
        }
        if (rightForearmRef.current) {
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, -0.6 + writeWiggle, 8, delta);
        }
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = THREE.MathUtils.damp(headGroupRef.current.rotation.x, 0.22, 8, delta);
        }
      } else if (role === 'waiter' && hasTray) {
        // WAITER BALANCING SILVER TRAY:
        // Right arm held level and stabilized
        if (rightUpperArmRef.current) {
          rightUpperArmRef.current.position.y = THREE.MathUtils.damp(rightUpperArmRef.current.position.y, 0.32 - (pelvisBob * 0.8 * weight), 10, delta);
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, -Math.PI / 2.25, 10, delta);
          rightUpperArmRef.current.rotation.y = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.y, -0.15, 10, delta);
          rightUpperArmRef.current.rotation.z = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.z, 0.08, 10, delta);
        }
        if (rightForearmRef.current) {
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, -0.38, 10, delta);
          rightForearmRef.current.rotation.z = THREE.MathUtils.damp(rightForearmRef.current.rotation.z, 0.08, 10, delta);
        }
        // Left arm restrained fine-dining counter-swing
        if (leftUpperArmRef.current) {
          leftUpperArmRef.current.position.y = 0.32;
          const leftSwing = -0.12 + Math.sin(walkCycle) * 0.12 * weight;
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, leftSwing, 10, delta);
          leftUpperArmRef.current.rotation.y = 0.04;
          leftUpperArmRef.current.rotation.z = -0.08;
        }
        if (leftForearmRef.current) {
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, -0.38, 10, delta);
        }
      } else if (role === 'waiter') {
        // WAITER UNENCUMBERED (Draped service napkin posture)
        const targetLeftArmX = (Math.sin(walkCycle) * 0.28 * weight) + (-0.15 * (1 - weight));
        const targetRightArmX = (-Math.sin(walkCycle) * 0.28 * weight) + (-0.15 * (1 - weight));
        if (leftUpperArmRef.current && rightUpperArmRef.current) {
          leftUpperArmRef.current.position.y = 0.32;
          rightUpperArmRef.current.position.y = 0.32;
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, targetLeftArmX, 10, delta);
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, targetRightArmX, 10, delta);
          leftUpperArmRef.current.rotation.y = 0.05;
          rightUpperArmRef.current.rotation.y = -0.05;
          leftUpperArmRef.current.rotation.z = -0.06;
          rightUpperArmRef.current.rotation.z = 0.06;
        }
        if (leftForearmRef.current && rightForearmRef.current) {
          const leftFore = (-0.24 + Math.abs(Math.sin(walkCycle)) * 0.08) * weight + (-0.35 * (1 - weight));
          const rightFore = (-0.24 + Math.abs(Math.cos(walkCycle)) * 0.08) * weight + (-0.35 * (1 - weight));
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, leftFore, 10, delta);
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, rightFore, 10, delta);
        }
      } else {
        // GENERAL WALKING / STANDING ARMS
        const targetLeftArmX = (Math.sin(walkCycle) * 0.36 * weight);
        const targetRightArmX = (-Math.sin(walkCycle) * 0.36 * weight);
        if (leftUpperArmRef.current && rightUpperArmRef.current) {
          leftUpperArmRef.current.position.y = 0.32;
          rightUpperArmRef.current.position.y = 0.32;
          leftUpperArmRef.current.rotation.x = THREE.MathUtils.damp(leftUpperArmRef.current.rotation.x, targetLeftArmX, 10, delta);
          rightUpperArmRef.current.rotation.x = THREE.MathUtils.damp(rightUpperArmRef.current.rotation.x, targetRightArmX, 10, delta);
          leftUpperArmRef.current.rotation.y = 0;
          rightUpperArmRef.current.rotation.y = 0;
        }
        if (leftForearmRef.current && rightForearmRef.current) {
          const leftFore = (-0.18 + Math.abs(Math.sin(walkCycle)) * 0.08) * weight;
          const rightFore = (-0.18 + Math.abs(Math.cos(walkCycle)) * 0.08) * weight;
          leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, leftFore, 10, delta);
          rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, rightFore, 10, delta);
        }
      }
    }
  });

  return (
    <group ref={rootRef} position={position}>
      {/* TORSO & UPPER BODY HIERARCHY */}
      <group ref={torsoGroupRef} position={[0, 1.1, 0]}>
        {/* Hips / Pelvis */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.18, 0.16, 0.18, 20]} />
          <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
        </mesh>

        {/* Waist Belt (for sharp detail) */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.04, 20]} />
          <meshStandardMaterial color="#27272a" roughness={0.5} />
        </mesh>
        {/* Belt buckle */}
        <mesh position={[0, -0.06, 0.185]}>
          <boxGeometry args={[0.06, 0.04, 0.015]} />
          <meshStandardMaterial color={isVIP ? '#facc15' : '#e2e8f0'} metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Sculpted Torso / Chest / Upper Outfit */}
        <mesh position={[0, 0.16, 0]}>
          {role === 'customer' ? <capsuleGeometry args={[0.19, 0.12, 6, 16]} /> : <cylinderGeometry args={[0.22, 0.18, 0.42, 20]} />}
          <meshStandardMaterial color={charConfig.shirtColor} roughness={0.8} />
        </mesh>

        {/* CLOTHING STYLING DETAILS */}
        {role === 'customer' && !isVIP && charConfig.outfitStyle >= 3 && (
          <group>
            <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.105, 0.018, 6, 20]} />
              <meshStandardMaterial color={charConfig.palette.accent} roughness={0.95} />
            </mesh>
            {charConfig.outfitStyle % 2 === 0 ? [0.05, 0.12, 0.19].map(y => (
              <mesh key={y} position={[0, y, 0.183]}>
                <boxGeometry args={[0.24, 0.025, 0.014]} />
                <meshStandardMaterial color={charConfig.palette.accent} roughness={0.95} />
              </mesh>
            )) : <mesh position={[-0.09, 0.2, 0.177]}>
              <boxGeometry args={[0.075, 0.085, 0.018]} />
              <meshStandardMaterial color={charConfig.palette.accent} roughness={0.95} />
            </mesh>}
          </group>
        )}
        {role === 'customer' && !isVIP && charConfig.outfitStyle === 0 && (
          // HOODIE POCKET & HOOD
          <group position={[0, 0.05, 0]}>
            <mesh position={[0, -0.02, 0.16]} rotation={[-0.1, 0, 0]}>
              <boxGeometry args={[0.22, 0.12, 0.04]} />
              <meshStandardMaterial color={charConfig.shirtColor} roughness={0.85} />
            </mesh>
            {/* Hanging Drawstrings */}
            <mesh position={[-0.04, 0.18, 0.19]}>
              <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.04, 0.18, 0.19]}>
              <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Hood bunched behind neck */}
            <mesh position={[0, 0.32, -0.12]} rotation={[0.3, 0, 0]}>
              <sphereGeometry args={[0.14, 16, 16]} />
              <meshStandardMaterial color={charConfig.shirtColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {role === 'customer' && !isVIP && charConfig.outfitStyle === 1 && (
          // BOMBER JACKET OVER INNER TEE
          <group position={[0, 0.16, 0]}>
            <mesh position={[0, 0.02, 0.18]}>
              <boxGeometry args={[0.08, 0.36, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            {/* Collar ribbing */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 0.04, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
          </group>
        )}

        {role === 'customer' && !isVIP && charConfig.outfitStyle === 2 && (
          // BLAZER / JACKET WITH LAPELS
          <group position={[0, 0.18, 0.17]}>
            <mesh position={[-0.07, 0.04, 0]} rotation={[0, 0, -0.2]}>
              <boxGeometry args={[0.06, 0.2, 0.02]} />
              <meshStandardMaterial color={charConfig.shirtColor} roughness={0.6} />
            </mesh>
            <mesh position={[0.07, 0.04, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.06, 0.2, 0.02]} />
              <meshStandardMaterial color={charConfig.shirtColor} roughness={0.6} />
            </mesh>
            {/* Folded Pocket Square */}
            <mesh position={[-0.1, 0.08, 0.015]}>
              <boxGeometry args={[0.04, 0.02, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )}

        {role === 'customer' && isVIP && (
          // VIP LUXURY DETAIL: Gold Chain & Satin Peak Lapels
          <group position={[0, 0.2, 0.18]}>
            {/* Golden Pendant / Necklace */}
            <mesh position={[0, 0.06, 0]}>
              <torusGeometry args={[0.07, 0.01, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, -0.01, 0.01]}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        )}

        {/* WAITER UNIFORM VEST & BOWTIE */}
        {role === 'waiter' && (
          <group position={[0, 0.16, 0.15]}>
            {/* Black Tuxedo Vest Cut */}
            <mesh position={[-0.09, -0.02, 0]}>
              <boxGeometry args={[0.08, 0.34, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
            <mesh position={[0.09, -0.02, 0]}>
              <boxGeometry args={[0.08, 0.34, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
            {/* Vest buttons */}
            <mesh position={[0, -0.06, 0.03]}><sphereGeometry args={[0.01, 8, 8]} /><meshStandardMaterial color="#f8fafc" /></mesh>
            <mesh position={[0, -0.12, 0.03]}><sphereGeometry args={[0.01, 8, 8]} /><meshStandardMaterial color="#f8fafc" /></mesh>
            {/* Silk Red Bowtie */}
            <group position={[0, 0.18, 0.04]}>
              <mesh position={[-0.03, 0, 0]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.03, 0.05, 12]} /><meshStandardMaterial color="#dc2626" /></mesh>
              <mesh position={[0.03, 0, 0]} rotation={[0, 0, -0.3]}><coneGeometry args={[0.03, 0.05, 12]} /><meshStandardMaterial color="#dc2626" /></mesh>
              <mesh position={[0, 0, 0]}><sphereGeometry args={[0.015, 12, 12]} /><meshStandardMaterial color="#dc2626" /></mesh>
            </group>
          </group>
        )}

        {/* CHEF DOUBLE-BREASTED JACKET BUTTONS */}
        {role === 'chef' && (
          <group position={[0, 0.16, 0.17]}>
            {/* Red neckerchief scarf */}
            <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.12, 0.04, 0.04]} /><meshStandardMaterial color="#dc2626" /></mesh>
            {/* 2 rows of black chef buttons */}
            {[-0.05, 0.05].map((x, xi) => (
              <group key={xi}>
                {[0.12, 0.04, -0.04, -0.12].map((y, yi) => (
                  <mesh key={yi} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
                    <meshStandardMaterial color="#0f172a" />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        )}

        {/* CLEANER UTILITY HARNESS & BADGE */}
        {role === 'cleaner' && (
          <group position={[0, 0.16, 0.16]}>
            <mesh position={[-0.09, 0.08, 0.02]}><boxGeometry args={[0.04, 0.03, 0.01]} /><meshStandardMaterial color="#facc15" /></mesh>
            {/* Reflective safety strip */}
            <mesh position={[0, -0.04, 0.02]}><boxGeometry args={[0.34, 0.03, 0.02]} /><meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.2} /></mesh>
          </group>
        )}

        {/* NECK */}
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.16, 16]} />
          <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
        </mesh>

        {/* HEAD & FACIAL FEATURES HIERARCHY */}
        <group ref={headGroupRef} position={[0, 0.68, 0]}>
          {role === 'customer' ? <CustomerHead3D skin={charConfig.skin} hair={charConfig.hair} eye={charConfig.eye} accent={charConfig.palette.accent} style={charConfig.hairStyle} seed={seed} glasses={charConfig.hasGlasses} vip={isVIP} earrings={charConfig.hasEarrings} /> : <>
          {/* Stylized Sculpted Head / Cranium */}
          <mesh position={[0, 0, 0]} scale={[1.05, 1.08, 1.02]}>
            <sphereGeometry args={[0.22, 32, 32]} />
            <meshStandardMaterial color={charConfig.skin} roughness={0.55} />
          </mesh>

          {/* Cute Sculpted Ears */}
          <group position={[-0.23, 0, 0.01]} rotation={[0, -0.2, 0]}>
            <mesh scale={[0.4, 0.8, 0.7]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={charConfig.skin} roughness={0.6} /></mesh>
            <mesh position={[0.01, 0, 0]} scale={[0.2, 0.6, 0.5]}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color="#d97706" opacity={0.2} transparent /></mesh>
          </group>
          <group position={[0.23, 0, 0.01]} rotation={[0, 0.2, 0]}>
            <mesh scale={[0.4, 0.8, 0.7]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color={charConfig.skin} roughness={0.6} /></mesh>
            <mesh position={[-0.01, 0, 0]} scale={[0.2, 0.6, 0.5]}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color="#d97706" opacity={0.2} transparent /></mesh>
          </group>

          {/* Optional Golden Hoop Earrings */}
          {charConfig.hasEarrings && (
            <>
              <mesh position={[-0.23, -0.04, 0.01]}>
                <torusGeometry args={[0.022, 0.004, 8, 16]} />
                <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0.23, -0.04, 0.01]}>
                <torusGeometry args={[0.022, 0.004, 8, 16]} />
                <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} />
              </mesh>
            </>
          )}

          {/* FACIAL EXPRESSION LAYER (Eyes, Brows, Nose, Smile, Blush) */}
          <group position={[0, -0.02, 0.2]}>
            {/* LEFT EYE COMPLEX */}
            <group position={[-0.075, 0.04, 0]}>
              {/* White sclera base */}
              <mesh scale={[1, 1.2, 0.3]}>
                <sphereGeometry args={[0.038, 16, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
              {/* Colorful vibrant iris */}
              <mesh position={[0.005, 0, 0.015]} scale={[1, 1.15, 0.2]}>
                <sphereGeometry args={[0.024, 16, 16]} />
                <meshStandardMaterial color={charConfig.eye} roughness={0.3} />
              </mesh>
              {/* Dark pupil */}
              <mesh position={[0.005, 0, 0.022]} scale={[1, 1.1, 0.2]}>
                <sphereGeometry args={[0.013, 12, 12]} />
                <meshStandardMaterial color="#09090b" roughness={0.1} />
              </mesh>
              {/* White specular catchlight spark (gives soul & life!) */}
              <mesh position={[0.012, 0.012, 0.026]}>
                <sphereGeometry args={[0.006, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
              </mesh>
              {/* Upper eyeliner / lash contour */}
              <mesh position={[0, 0.038, 0.01]} rotation={[0, 0, -0.1]}>
                <boxGeometry args={[0.065, 0.01, 0.02]} />
                <meshStandardMaterial color="#18181b" roughness={0.4} />
              </mesh>
            </group>

            {/* RIGHT EYE COMPLEX */}
            <group position={[0.075, 0.04, 0]}>
              {/* White sclera base */}
              <mesh scale={[1, 1.2, 0.3]}>
                <sphereGeometry args={[0.038, 16, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
              {/* Colorful vibrant iris */}
              <mesh position={[-0.005, 0, 0.015]} scale={[1, 1.15, 0.2]}>
                <sphereGeometry args={[0.024, 16, 16]} />
                <meshStandardMaterial color={charConfig.eye} roughness={0.3} />
              </mesh>
              {/* Dark pupil */}
              <mesh position={[-0.005, 0, 0.022]} scale={[1, 1.1, 0.2]}>
                <sphereGeometry args={[0.013, 12, 12]} />
                <meshStandardMaterial color="#09090b" roughness={0.1} />
              </mesh>
              {/* White specular catchlight spark */}
              <mesh position={[-0.002, 0.012, 0.026]}>
                <sphereGeometry args={[0.006, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
              </mesh>
              {/* Upper eyeliner / lash contour */}
              <mesh position={[0, 0.038, 0.01]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.065, 0.01, 0.02]} />
                <meshStandardMaterial color="#18181b" roughness={0.4} />
              </mesh>
            </group>

            {/* EYEBROWS (Shaped & angled with character hair tone) */}
            <mesh position={[-0.08, 0.11, 0.01]} rotation={[0, 0, -0.08]}>
              <boxGeometry args={[0.065, 0.012, 0.02]} />
              <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
            </mesh>
            <mesh position={[0.08, 0.11, 0.01]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.065, 0.012, 0.02]} />
              <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
            </mesh>

            {/* CUTE NOSE BUTTON */}
            <mesh position={[0, 0.005, 0.03]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshStandardMaterial color={charConfig.skin} roughness={0.5} />
            </mesh>

            {/* SOFT PEACH / ROSY CHEEK BLUSH */}
            <mesh position={[-0.12, -0.01, 0.01]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fb7185" roughness={0.9} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0.12, -0.01, 0.01]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fb7185" roughness={0.9} transparent opacity={0.4} />
            </mesh>

            {/* FRIENDLY SMILING MOUTH & TEETH GLEAM */}
            <group position={[0, -0.05, 0.02]}>
              {/* Smiling lip curve */}
              <mesh rotation={[0.2, 0, Math.PI]}>
                <torusGeometry args={[0.025, 0.006, 12, 24, Math.PI * 0.8]} />
                <meshStandardMaterial color="#991b1b" roughness={0.6} />
              </mesh>
              {/* Tiny white teeth smile accent */}
              <mesh position={[0, 0.003, -0.005]}>
                <boxGeometry args={[0.026, 0.008, 0.01]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
              </mesh>
            </group>

            {/* OPTIONAL GLASSES / DESIGNER SUNGLASSES */}
            {charConfig.hasGlasses && (
              <group position={[0, 0.04, 0.03]}>
                {charConfig.glassesStyle === 'sunglasses' ? (
                  // VIP Luxury Dark Aviator Sunglasses
                  <>
                    <mesh position={[-0.075, 0, 0]}>
                      <boxGeometry args={[0.075, 0.05, 0.015]} />
                      <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.9} />
                    </mesh>
                    <mesh position={[0.075, 0, 0]}>
                      <boxGeometry args={[0.075, 0.05, 0.015]} />
                      <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.9} />
                    </mesh>
                    {/* Gold bridge */}
                    <mesh position={[0, 0.01, 0]}>
                      <boxGeometry args={[0.04, 0.006, 0.015]} />
                      <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.1} />
                    </mesh>
                  </>
                ) : (
                  // Stylish Round Wire-frame Glasses
                  <>
                    <mesh position={[-0.075, 0, 0]}>
                      <torusGeometry args={[0.038, 0.004, 8, 24]} />
                      <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.075, 0, 0]}>
                      <torusGeometry args={[0.038, 0.004, 8, 24]} />
                      <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.3} />
                    </mesh>
                    {/* Bridge */}
                    <mesh position={[0, 0.01, 0]}>
                      <boxGeometry args={[0.04, 0.004, 0.004]} />
                      <meshStandardMaterial color="#1c1917" metalness={0.8} />
                    </mesh>
                  </>
                )}
              </group>
            )}
          </group>

          {/* HAIRSTYLES & HEADWEAR */}
          {role !== 'chef' && (
            <group position={[0, 0.02, 0]}>
              {/* Hair Base Volume */}
              <mesh position={[0, 0.1, -0.04]} scale={[1.08, 0.95, 1.08]}>
                <sphereGeometry args={[0.22, 24, 24]} />
                <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
              </mesh>

              {/* Hairstyle 0: Pompadour / Modern Quiff */}
              {charConfig.hairStyle === 0 && (
                <group position={[0, 0.22, 0.06]}>
                  <mesh rotation={[-0.2, 0, 0]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[0, -0.04, 0.08]} rotation={[-0.4, 0, 0]}>
                    <coneGeometry args={[0.1, 0.16, 12]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 1: Long Cascading Waves past Shoulders */}
              {charConfig.hairStyle === 1 && (
                <group>
                  <mesh position={[-0.18, -0.15, 0.04]} rotation={[0, 0, -0.15]}>
                    <cylinderGeometry args={[0.07, 0.09, 0.45, 16]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.18, -0.15, 0.04]} rotation={[0, 0, 0.15]}>
                    <cylinderGeometry args={[0.07, 0.09, 0.45, 16]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[0, -0.18, -0.12]}>
                    <boxGeometry args={[0.34, 0.45, 0.1]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 2: High Ponytail with Scrunchie */}
              {charConfig.hairStyle === 2 && (
                <group position={[0, 0.18, -0.2]}>
                  {/* Scrunchie band */}
                  <mesh rotation={[Math.PI / 4, 0, 0]}>
                    <torusGeometry args={[0.05, 0.02, 12, 20]} />
                    <meshStandardMaterial color="#ec4899" roughness={0.5} />
                  </mesh>
                  {/* Arching Ponytail */}
                  <mesh position={[0, -0.12, -0.08]} rotation={[0.4, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.08, 0.35, 16]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 3: Cozy Knit Beanie */}
              {charConfig.hairStyle === 3 && (
                <group position={[0, 0.14, -0.02]}>
                  <mesh rotation={[-0.2, 0, 0]}>
                    <sphereGeometry args={[0.24, 20, 20]} />
                    <meshStandardMaterial color="#0284c7" roughness={0.9} />
                  </mesh>
                  {/* Beanie fold cuff */}
                  <mesh position={[0, -0.08, 0.04]} rotation={[-0.2, 0, 0]}>
                    <torusGeometry args={[0.22, 0.03, 12, 24]} />
                    <meshStandardMaterial color="#0369a1" roughness={0.9} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 4: Textured Short Crop with Side Bangs */}
              {charConfig.hairStyle === 4 && (
                <group position={[0, 0.16, 0.1]}>
                  <mesh position={[-0.06, 0, 0]} rotation={[0.2, 0, -0.2]}>
                    <coneGeometry args={[0.08, 0.14, 8]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.06, 0, 0]} rotation={[0.2, 0, 0.2]}>
                    <coneGeometry args={[0.08, 0.14, 8]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 5: Chic Bob with Fringe */}
              {charConfig.hairStyle === 5 && (
                <group>
                  <mesh position={[0, 0.16, 0.12]}>
                    <boxGeometry args={[0.26, 0.08, 0.06]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[-0.2, -0.05, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.28, 12]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.2, -0.05, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.28, 12]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 6: Baseball Cap */}
              {charConfig.hairStyle === 6 && (
                <group position={[0, 0.14, -0.02]}>
                  <mesh>
                    <sphereGeometry args={[0.23, 20, 20]} />
                    <meshStandardMaterial color="#dc2626" roughness={0.8} />
                  </mesh>
                  {/* Visor Brim */}
                  <mesh position={[0, -0.04, 0.22]} rotation={[0.15, 0, 0]}>
                    <boxGeometry args={[0.24, 0.02, 0.16]} />
                    <meshStandardMaterial color="#dc2626" roughness={0.8} />
                  </mesh>
                  {/* Crown Button */}
                  <mesh position={[0, 0.23, 0]}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshStandardMaterial color="#ffffff" />
                  </mesh>
                </group>
              )}

              {/* Hairstyle 7: Top Knot Bun */}
              {charConfig.hairStyle === 7 && (
                <group position={[0, 0.28, -0.05]}>
                  <mesh>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial color={charConfig.hair} roughness={0.8} />
                  </mesh>
                </group>
              )}
            </group>
          )}

          {/* CHEF'S ICONIC TALL TOQUE BLANCHE HAT */}
          {role === 'chef' && (
            <group position={[0, 0.22, 0]}>
              {/* Base headband */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.17, 0.17, 0.1, 24]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              {/* Tall Pleated Crown */}
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.22, 0.17, 0.32, 24]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              {/* Fluffy mushroom cap top */}
              <mesh position={[0, 0.38, 0]} scale={[1.1, 0.5, 1.1]}>
                <sphereGeometry args={[0.22, 24, 24]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
            </group>
          )}
          </>}
        </group>

        {/* LEFT ARM SKELETAL ASSEMBLY */}
        <group ref={leftUpperArmRef} position={[-0.26, 0.32, 0]}>
          {/* Shoulder Cap */}
          <mesh>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial color={charConfig.shirtColor} roughness={0.7} />
          </mesh>
          {/* Upper Arm Segment */}
          <mesh position={[-0.015, -0.14, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.26, 16]} />
            <meshStandardMaterial color={charConfig.shirtColor} roughness={0.7} />
          </mesh>

          {/* Forearm & Hand */}
          <group ref={leftForearmRef} position={[-0.015, -0.27, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.045, 0.04, 0.24, 16]} />
              <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
            </mesh>
            {/* Sculpted Hand with Thumb */}
            <group position={[0, -0.25, 0]}>
              <mesh scale={[1, 1.2, 0.7]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
              </mesh>
              <mesh position={[-0.02, 0.01, 0.01]} rotation={[0, 0, 0.5]}>
                <boxGeometry args={[0.02, 0.04, 0.02]} />
                <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
              </mesh>
            </group>

            {/* WAITER ORDER PAD */}
            {role === 'waiter' && isTakingOrder && (
              <group position={[0, -0.26, 0.06]} rotation={[0.4, 0, 0]}>
                {/* Spiral Notepad */}
                <mesh>
                  <boxGeometry args={[0.14, 0.2, 0.02]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.8} />
                </mesh>
                {/* Spiral binding */}
                <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.14, 8]} />
                  <meshStandardMaterial color="#475569" metalness={0.8} />
                </mesh>
              </group>
            )}

            {/* WAITER DRAPED SERVICE TOWEL / LITEAU OVER LEFT FOREARM */}
            {role === 'waiter' && !hasTray && !isTakingOrder && (
              <group position={[0, -0.1, 0.06]} rotation={[0.1, 0, 0]}>
                {/* Crisp Folded White Linen Napkin */}
                <mesh>
                  <boxGeometry args={[0.1, 0.22, 0.025]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.85} />
                </mesh>
                {/* Gold Embroidered Border */}
                <mesh position={[0, -0.09, 0.014]}>
                  <boxGeometry args={[0.09, 0.012, 0.005]} />
                  <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
                </mesh>
              </group>
            )}

            {/* CUSTOMER HOLDING MENU WHILE WAITING TO ORDER */}
            {role === 'customer' && isWaitingOrder && isSitting && (
              <group position={[0.15, -0.18, 0.16]} rotation={[0.6, 0, -0.3]}>
                {/* Diner Menu Booklet */}
                <mesh>
                  <boxGeometry args={[0.28, 0.38, 0.015]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.5} />
                </mesh>
                {/* Menu cover stripe */}
                <mesh position={[0, 0.12, 0.01]}>
                  <boxGeometry args={[0.24, 0.04, 0.01]} />
                  <meshStandardMaterial color="#b45309" />
                </mesh>
                <mesh position={[0, 0.02, 0.01]}>
                  <boxGeometry args={[0.2, 0.015, 0.01]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                <mesh position={[0, -0.04, 0.01]}>
                  <boxGeometry args={[0.2, 0.015, 0.01]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
              </group>
            )}

            {/* CUSTOMER HOLDING SMARTPHONE WHILE WAITING FOR FOOD */}
            {role === 'customer' && isWaitingFood && isSitting && (
              <group position={[0.1, -0.22, 0.14]} rotation={[0.5, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.08, 0.15, 0.01]} />
                  <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* Illuminated smartphone screen */}
                <mesh position={[0, 0, 0.006]}>
                  <boxGeometry args={[0.07, 0.13, 0.005]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* RIGHT ARM SKELETAL ASSEMBLY */}
        <group ref={rightUpperArmRef} position={[0.26, 0.32, 0]}>
          {/* Shoulder Cap */}
          <mesh>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial color={charConfig.shirtColor} roughness={0.7} />
          </mesh>
          {/* Upper Arm Segment */}
          <mesh position={[0.015, -0.14, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.26, 16]} />
            <meshStandardMaterial color={charConfig.shirtColor} roughness={0.7} />
          </mesh>

          {/* Forearm & Hand */}
          <group ref={rightForearmRef} position={[0.015, -0.27, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.045, 0.04, 0.24, 16]} />
              <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
            </mesh>
            {/* Sculpted Hand */}
            <group position={[0, -0.25, 0]}>
              <mesh scale={[1, 1.2, 0.7]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
              </mesh>
              <mesh position={[0.02, 0.01, 0.01]} rotation={[0, 0, -0.5]}>
                <boxGeometry args={[0.02, 0.04, 0.02]} />
                <meshStandardMaterial color={charConfig.skin} roughness={0.6} />
              </mesh>
            </group>

            {/* WAITER SILVER SERVING TRAY WITH CLOCHE (ONLY when carrying food/order) */}
            {role === 'waiter' && hasTray && (
              <group position={[0, -0.24, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Silver Platter */}
                <mesh>
                  <cylinderGeometry args={[0.26, 0.26, 0.02, 24]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* White Service Napkin under dome */}
                <mesh position={[0, 0.012, 0]}>
                  <cylinderGeometry args={[0.22, 0.22, 0.005, 24]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.8} />
                </mesh>
                {/* Food Cloche Dome */}
                <mesh position={[0, 0.06, 0]}>
                  <sphereGeometry args={[0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.15} />
                </mesh>
                <mesh position={[0, 0.18, 0]}>
                  <sphereGeometry args={[0.02, 8, 8]} />
                  <meshStandardMaterial color="#facc15" metalness={0.9} />
                </mesh>
              </group>
            )}

            {/* WAITER BALLPOINT PEN FOR TAKING ORDER */}
            {role === 'waiter' && isTakingOrder && (
              <group position={[0, -0.24, 0.08]} rotation={[0.6, 0, 0.2]}>
                <mesh>
                  <cylinderGeometry args={[0.007, 0.007, 0.16, 8]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.025, 8]} />
                  <meshStandardMaterial color="#facc15" metalness={0.9} />
                </mesh>
              </group>
            )}

            {/* CHEF COOKING SPATULA */}
            {role === 'chef' && (
              <group position={[0, -0.26, 0.12]} rotation={[Math.PI / 3, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.01, 0.01, 0.32, 8]} />
                  <meshStandardMaterial color="#78350f" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.17, 0]}>
                  <boxGeometry args={[0.08, 0.1, 0.01]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                </mesh>
              </group>
            )}

            {/* CLEANER MOP */}
            {role === 'cleaner' && (
              <group position={[0, -0.2, 0.1]} rotation={[Math.PI / 6, 0, 0]}>
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.9, 12]} />
                  <meshStandardMaterial color="#0284c7" roughness={0.4} />
                </mesh>
                <mesh position={[0, -0.28, 0]}>
                  <boxGeometry args={[0.18, 0.08, 0.08]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.9} />
                </mesh>
              </group>
            )}

            {/* CUSTOMER EATING: FORK WITH FOOD BITE */}
            {role === 'customer' && isEating && isSitting && (
              <group ref={eatingItemRef} position={[0, -0.26, 0.1]} rotation={[0.4, 0, 0]}>
                {/* Silver Fork */}
                <mesh>
                  <cylinderGeometry args={[0.006, 0.006, 0.18, 8]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Delicious Food Bite */}
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.035, 12, 12]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.6} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>

      {/* LEFT LEG SKELETAL ASSEMBLY */}
      <group ref={legsRef}>
      <group position={[-0.12, 0.95, 0]}>
        {/* Left Thigh (Pivots at hip) */}
        <group ref={leftThighRef}>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.075, 0.065, 0.4, 16]} />
            <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
          </mesh>

          {/* Left Shin & Foot (Pivots at knee) */}
          <group ref={leftShinRef} position={[0, -0.4, 0]}>
            {/* Knee Joint */}
            <mesh>
              <sphereGeometry args={[0.065, 16, 16]} />
              <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
            </mesh>
            {/* Lower Leg Calf */}
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.4, 16]} />
              <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
            </mesh>

            {/* REALISTIC SHOE (Sole, Toe Cap, Upper, Laces) */}
            <group ref={leftFootRef} position={[0, -0.42, 0.05]}>
              {/* White Rubber Sole / Foxing */}
              <mesh position={[0, -0.03, 0]}>
                <boxGeometry args={[0.11, 0.035, 0.22]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              {/* Shoe Upper */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.105, 0.065, 0.2]} />
                <meshStandardMaterial color={charConfig.shoeColor} roughness={0.6} />
              </mesh>
              {/* Rounded Toe Cap */}
              <mesh position={[0, 0.01, 0.09]} scale={[1, 0.8, 1]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* RIGHT LEG SKELETAL ASSEMBLY */}
      <group position={[0.12, 0.95, 0]}>
        {/* Right Thigh (Pivots at hip) */}
        <group ref={rightThighRef}>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.075, 0.065, 0.4, 16]} />
            <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
          </mesh>

          {/* Right Shin & Foot (Pivots at knee) */}
          <group ref={rightShinRef} position={[0, -0.4, 0]}>
            {/* Knee Joint */}
            <mesh>
              <sphereGeometry args={[0.065, 16, 16]} />
              <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
            </mesh>
            {/* Lower Leg Calf */}
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.4, 16]} />
              <meshStandardMaterial color={charConfig.pantsColor} roughness={0.7} />
            </mesh>

            {/* REALISTIC SHOE */}
            <group ref={rightFootRef} position={[0, -0.42, 0.05]}>
              {/* White Rubber Sole */}
              <mesh position={[0, -0.03, 0]}>
                <boxGeometry args={[0.11, 0.035, 0.22]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              {/* Shoe Upper */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.105, 0.065, 0.2]} />
                <meshStandardMaterial color={charConfig.shoeColor} roughness={0.6} />
              </mesh>
              {/* Rounded Toe Cap */}
              <mesh position={[0, 0.01, 0.09]} scale={[1, 0.8, 1]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      </group>
    </group>
  );
});
