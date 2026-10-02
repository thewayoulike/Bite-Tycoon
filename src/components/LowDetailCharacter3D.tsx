import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoodPlate3D } from './FoodPlate3D';
import { characterMaterial, CharacterDetail, CharacterRole, createCharacterRig, getCharacterGeometry, getCharacterAppearance } from '../characters/characterModel';

export interface LowDetailCharacterProps {
  role?: CharacterRole;
  color?: string;
  seed?: number;
  isWalking?: boolean;
  isSitting?: boolean;
  isWaitingOrder?: boolean;
  isWaitingFood?: boolean;
  isEating?: boolean;
  isVIP?: boolean;
  hasTray?: boolean;
  trayRecipeId?: string;
  isTakingOrder?: boolean;
  isWorking?: boolean;
  gameSpeed?: number;
  detail?: CharacterDetail;
  name?: string;
  position?: [number, number, number];
  size?:number;
}

/** One shared, vertex-colored skinned mesh per person, with an independent rig. */
export const LowDetailCharacter3D = memo(function LowDetailCharacter3D({
  role = 'customer', seed = 0, isWalking = false, isSitting = false,
  isWaitingOrder = false, isWaitingFood = false, isEating = false, isVIP = false,
  hasTray = false, isTakingOrder = false, isWorking = false, gameSpeed = 1, position = [0, 0, 0],
  detail = 'full', name = 'diner-person', trayRecipeId = 'burger_classic',size=1,
}: LowDetailCharacterProps) {
  const rig = useMemo(() => {
    const { bones, skeleton } = createCharacterRig();
    const mesh = new THREE.SkinnedMesh(getCharacterGeometry(role, seed, isVIP, detail), characterMaterial);
    mesh.add(bones[0]);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // The bind-pose bounds do not contain a sitting or outstretched arm pose.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.05, 0), 1.65);
    return { mesh, bones, skeleton };
  }, [role, seed, isVIP, detail]);
  const time = useRef(Math.abs(seed % 37) * .19);
  const gait = useRef(0);
  const posed = useRef(false);
  const walking = useRef(0);
  const leftProp = useRef<THREE.Group>(null);
  const rightProp = useRef<THREE.Group>(null);
  const attachment = useMemo(() => ({ inverse: new THREE.Matrix4(), transform: new THREE.Matrix4() }), []);

  useEffect(() => () => rig.skeleton.dispose(), [rig]);

  useFrame((_, delta) => {
    const dt = posed.current ? Math.min(delta, .06) * gameSpeed : 1;
    if (dt <= 0) return;
    posed.current = true;
    time.current += dt;
    walking.current = THREE.MathUtils.damp(walking.current, isWalking && !isSitting ? 1 : 0, 9, dt);
    gait.current += dt * 6.8 * walking.current;
    const t = time.current, walk = walking.current, stride = Math.sin(gait.current);
    const b = rig.bones;
    const pose = (i: number, x = 0, y = 0, z = 0) => {
      b[i].rotation.x = THREE.MathUtils.damp(b[i].rotation.x, x, 12, dt);
      b[i].rotation.y = THREE.MathUtils.damp(b[i].rotation.y, y, 12, dt);
      b[i].rotation.z = THREE.MathUtils.damp(b[i].rotation.z, z, 12, dt);
    };
    b[0].position.y = THREE.MathUtils.damp(b[0].position.y,
      isSitting ? .63 : 1.02 + Math.cos(gait.current * 2) * .014 * walk, 10, dt);
    pose(0, 0, stride * .025 * walk, stride * .018 * walk);
    pose(1, isSitting ? .065 : .018 * walk, -stride * .04 * walk);
    pose(2, Math.sin(t * 1.8) * .007, -stride * .045 * walk);
    pose(3, isWaitingFood && isSitting ? .12 : isEating ? Math.sin(t * 2.7) * .045 : -.025,
      Math.sin(t * .65) * .07 * (1 - walk), Math.sin(t * .8) * .018 * (1 - walk));

    for (const side of [-1, 1]) {
      const thigh = side === -1 ? 10 : 13;
      const swing = stride * side;
      pose(thigh, isSitting ? -Math.PI / 2 : swing * .43 * walk, 0, isSitting ? side * .055 : side * .015);
      pose(thigh + 1, isSitting ? Math.PI / 2 : Math.max(0, -swing) * .65 * walk + .025);
      pose(thigh + 2, isSitting ? 0 : -Math.max(0, swing) * .14 * walk);
    }

    let leftArm = stride * .34 * walk, rightArm = -stride * .34 * walk;
    let leftElbow = -.075, rightElbow = -.075, leftYaw = 0, rightYaw = 0;
    if (isSitting) {
      leftArm = -1.13; rightArm = -1.13; leftElbow = -.95; rightElbow = -.95;
      if (isWaitingOrder || isWaitingFood) {
        leftArm = -1.02; rightArm = -1.02; leftElbow = -1.25; rightElbow = -1.25;
        leftYaw = .5; rightYaw = -.5;
      }
      if (isEating) {
        const bite = (Math.sin(t * 2.7) + 1) * .5;
        rightArm = -1.05 - bite * .36; rightElbow = -.9 - bite * .55; rightYaw = -.5;
      }
    } else if (hasTray) {
      leftArm = -.35; leftElbow = -1.25;
    } else if (isTakingOrder) {
      leftArm = -.5; rightArm = -.58; leftElbow = -1.13; rightElbow = -1.2 + Math.sin(t * 10) * .05;
      leftYaw = .2; rightYaw = -.3;
    } else if (isWorking && role === 'chef') {
      leftArm = -.5; leftElbow = -.8; rightArm = -.68 + Math.sin(t * 5) * .12; rightElbow = -.6;
    } else if (isWorking && role === 'cleaner') {
      rightArm = -.52 + Math.sin(t * 3) * .18; rightElbow = -.5;
    }
    pose(4, leftArm, leftYaw, -.065); pose(5, leftElbow); pose(6);
    pose(7, rightArm, rightYaw, .065); pose(8, rightElbow); pose(9);
    const blink = t % 4.3;
    b[16].scale.y = blink < .14 ? Math.max(.08, Math.abs(blink - .07) / .07) : 1;

    // Walking crowds have no props, so skip the extra world-matrix traversal.
    if (!leftProp.current?.children.length && !rightProp.current?.children.length) return;
    // Props follow wrist matrices and remain attached throughout every pose.
    rig.mesh.updateMatrixWorld(true);
    attachment.inverse.copy(rig.mesh.matrixWorld).invert();
    for (const [prop, hand] of [[leftProp.current, b[6]], [rightProp.current, b[9]]] as const) {
      if (prop) {
        attachment.transform.multiplyMatrices(attachment.inverse, hand.matrixWorld);
        prop.matrix.copy(attachment.transform);
        prop.matrixWorldNeedsUpdate = true;
      }
    }
  });

  return <group position={position} name={name} scale={[size,size*getCharacterAppearance(seed).height,size]}>
    <primitive object={rig.mesh} dispose={null} />
    <group ref={leftProp} matrixAutoUpdate={false}>
      {hasTray && <group position={[0, -.065, .06]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh><cylinderGeometry args={[.23, .23, .018, 24]} /><meshStandardMaterial color="#858e91" metalness={.6} roughness={.3} /></mesh>
        <group position={[0,.012,0]}><FoodPlate3D recipeId={trayRecipeId} scale={.7} /></group>
      </group>}
      {isSitting && isWaitingOrder && <mesh position={[.035, -.09, .018]} rotation={[-.15, 0, -.16]}>
        <boxGeometry args={[.18, .23, .016]} /><meshStandardMaterial color="#466665" />
      </mesh>}
      {(isSitting && isWaitingFood || isTakingOrder) && <group position={[0, -.045, .02]}>
        <mesh><boxGeometry args={[.09, .15, .012]} /><meshStandardMaterial color={isTakingOrder ? '#d7c9ac' : '#303a43'} /></mesh>
        <mesh position={[0, 0, .007]}><planeGeometry args={[.071, .12]} /><meshStandardMaterial color={isTakingOrder ? '#faf0d9' : '#94c5cf'} /></mesh>
      </group>}
    </group>
    <group ref={rightProp} matrixAutoUpdate={false}>
      {isEating && <mesh position={[0, -.045, .075]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.006, .006, .2, 6]} /><meshStandardMaterial color="#b8c1c1" metalness={.7} roughness={.25} /></mesh>}
      {isTakingOrder && <mesh position={[0, -.055, .04]} rotation={[.7, 0, .3]}><cylinderGeometry args={[.005, .005, .12, 6]} /><meshStandardMaterial color="#303c4b" /></mesh>}
      {role === 'chef' && isWorking && <group position={[0, -.055, .05]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh><cylinderGeometry args={[.009, .009, .22, 8]} /><meshStandardMaterial color="#77553a" /></mesh>
        <mesh position={[0, .15, 0]}><boxGeometry args={[.065, .095, .012]} /><meshStandardMaterial color="#a0aaad" metalness={.7} roughness={.3} /></mesh>
      </group>}
      {role === 'cleaner' && isWorking && <mesh position={[0, -.08, .02]}><boxGeometry args={[.13, .02, .11]} /><meshStandardMaterial color="#dabb68" /></mesh>}
    </group>
  </group>;
});

