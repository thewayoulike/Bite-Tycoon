import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoodPlate3D } from './FoodPlate3D';
import { LowDetailCharacter3D, LowDetailCharacterProps } from './LowDetailCharacter3D';
import { getCharacterAppearance } from '../characters/characterModel';
import { gameCastMember, GameCharacterRole } from '../characters/gameCast';
import { castAssets } from '../characters/castAssets';
import { createPreviewRig, PersonPose } from '../characters/castRig';

export const CharacterQualityContext = createContext(false);
export interface RealCharacterProps extends Omit<LowDetailCharacterProps, 'role'> {
  role?: GameCharacterRole;
  castId?: string;
  isSleeping?: boolean;
  seatHeight?: number;
}

function hierarchyVisible(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/** Shared GLB resources, independent skeletons, and live gameplay props. */
function DetailedCharacter({ source, fast, ...props }: RealCharacterProps & { source: THREE.Group; fast: boolean }) {
  const { role = 'customer', seed = 0, gameSpeed = 1, isWalking, isSitting, isEating, isSleeping, seatHeight,
    isWorking, hasTray, isTakingOrder, isWaitingOrder, isWaitingFood, trayRecipeId = 'burger_classic' } = props;
  const rig = useMemo(() => createPreviewRig(source, undefined, true), [source]);
  const root = useRef<THREE.Group>(null), left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null), hat = useRef<THREE.Group>(null);
  const clock = useRef(Math.abs(seed % 37) * .19), sincePose = useRef(Infinity), previous = useRef('');
  const scratch = useMemo(() => ({ inverse: new THREE.Matrix4(), point: new THREE.Vector3() }), []);
  const pose: PersonPose = isSleeping ? 'sleep' : isSitting ? isEating ? 'eat' : 'sit' : isWalking ? 'walk' : isWorking || isTakingOrder ? 'work' : 'idle';
  const signature = `${pose}:${hasTray}:${isTakingOrder}:${isWaitingOrder}:${isWaitingFood}:${seatHeight}`;
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame((state, delta) => {
    clock.current += Math.min(delta, .06) * gameSpeed;
    sincePose.current += delta;
    if (!root.current || !hierarchyVisible(root.current)) return;
    root.current.getWorldPosition(scratch.point);
    const distant = scratch.point.distanceToSquared(state.camera.position) > 35 * 35;
    if (signature === previous.current && (gameSpeed === 0 || sincePose.current < (fast || distant ? 1 / 15 : 1 / 30))) return;
    sincePose.current = 0; previous.current = signature;
    rig.pose(role === 'manager' ? 'receptionist' : role, pose, clock.current, {
      carryTray: !!hasTray, takingOrder: !!isTakingOrder, holdMenu: !!isWaitingOrder, holdPhone: !!isWaitingFood, seatHeight,
    });
    root.current.updateWorldMatrix(true, false);
    scratch.inverse.copy(root.current.matrixWorld).invert();
    for (const [prop, bone] of [[left.current, rig.bones.hand_l], [right.current, rig.bones.hand_r]] as const) {
      if (!prop || !bone) continue;
      if (prop === left.current && hasTray) {
        bone.getWorldPosition(scratch.point).applyMatrix4(scratch.inverse);
        prop.matrix.makeTranslation(scratch.point.x, scratch.point.y, scratch.point.z);
      } else {
        bone.updateWorldMatrix(true, false);
        prop.matrix.multiplyMatrices(scratch.inverse, bone.matrixWorld);
      }
      prop.matrixWorldNeedsUpdate = true;
    }
    if (hat.current) {
      rig.bones.head.getWorldPosition(scratch.point).applyMatrix4(scratch.inverse);
      hat.current.position.copy(scratch.point); hat.current.position.y += rig.headTopOffset - .035;
    }
  });
  return <group ref={root} name="approved-cast-model">
    <group rotation={[isSleeping ? -Math.PI / 2 : 0, 0, 0]}>
      <group position={[0, isSleeping ? -rig.hipHeight : rig.baseY, 0]} scale={rig.scale}><primitive object={rig.object} dispose={null} /></group>
    </group>
    <group ref={left} matrixAutoUpdate={false}>
      {hasTray && <group position={[0, .02, .02]}>
        <mesh castShadow><cylinderGeometry args={[.23, .23, .02, 20]} /><meshStandardMaterial color="#858e91" metalness={.6} roughness={.3} /></mesh>
        <group position={[0, .015, 0]}><FoodPlate3D recipeId={trayRecipeId} scale={.7} /></group>
      </group>}
      {isSitting && isWaitingOrder && <mesh position={[0, -.06, .045]}><boxGeometry args={[.18, .23, .016]} /><meshStandardMaterial color="#466665" /></mesh>}
      {(isSitting && isWaitingFood || isTakingOrder) && <group position={[0, -.045, .02]}>
        <mesh><boxGeometry args={[.09, .15, .012]} /><meshStandardMaterial color={isTakingOrder ? '#d7c9ac' : '#303a43'} /></mesh>
        <mesh position={[0, 0, .007]}><planeGeometry args={[.071, .12]} /><meshStandardMaterial color={isTakingOrder ? '#faf0d9' : '#94c5cf'} /></mesh>
      </group>}
    </group>
    <group ref={right} matrixAutoUpdate={false}>
      {isEating && <mesh position={[0, -.045, .075]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.006, .006, .2, 6]} /><meshStandardMaterial color="#b8c1c1" metalness={.7} roughness={.25} /></mesh>}
      {isTakingOrder && <mesh position={[0, -.055, .04]} rotation={[.7, 0, .3]}><cylinderGeometry args={[.005, .005, .12, 6]} /><meshStandardMaterial color="#303c4b" /></mesh>}
      {role === 'chef' && isWorking && <group position={[0, -.055, .05]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh><cylinderGeometry args={[.009, .009, .22, 8]} /><meshStandardMaterial color="#77553a" /></mesh>
        <mesh position={[0, .15, 0]}><boxGeometry args={[.065, .095, .012]} /><meshStandardMaterial color="#a0aaad" metalness={.7} roughness={.3} /></mesh>
      </group>}
      {role === 'cleaner' && isWorking && <mesh position={[0, -.08, .02]}><boxGeometry args={[.13, .02, .11]} /><meshStandardMaterial color="#dabb68" /></mesh>}
      {role === 'maintenance' && isWorking && <group position={[0, -.08, .04]}>
        <mesh><boxGeometry args={[.025, .2, .025]} /><meshStandardMaterial color="#697579" metalness={.7} /></mesh>
        <mesh position={[0, .11, 0]}><boxGeometry args={[.09, .035, .03]} /><meshStandardMaterial color="#697579" metalness={.7} /></mesh>
      </group>}
    </group>
    {role === 'chef' && <group ref={hat}>
      <mesh position={[0, .055, 0]} castShadow><cylinderGeometry args={[.115, .12, .12, 16]} /><meshStandardMaterial color="#f4eddf" /></mesh>
      <mesh position={[0, .13, 0]} scale={[1, .6, 1]} castShadow><sphereGeometry args={[.145, 16, 10]} /><meshStandardMaterial color="#f4eddf" /></mesh>
    </group>}
    {role === 'helper' && isWorking && <mesh position={[0, 1, .4]} castShadow><boxGeometry args={[.47, .32, .33]} /><meshStandardMaterial color="#af885b" /></mesh>}
    {role === 'gardener' && isWorking && <group position={[0, 0, .62]}>
      <mesh position={[0, .6, 0]}><cylinderGeometry args={[.015, .015, 1.2, 8]} /><meshStandardMaterial color="#a7b0aa" metalness={.5} /></mesh>
      <mesh position={[0, .03, 0]}><boxGeometry args={[.32, .06, .17]} /><meshStandardMaterial color="#657b6f" /></mesh>
    </group>}
  </group>;
}

export const RealCharacter3D = memo(function RealCharacter3D(props: RealCharacterProps) {
  const { role = 'customer', seed = 0, castId, position = [0, 0, 0], size = 1, name = 'diner-person' } = props;
  const member = gameCastMember(role, seed, castId), fast = useContext(CharacterQualityContext);
  const booster = member.group === 'children' && props.seatHeight === undefined ? Math.max(0, (1.42 - member.heightMetres) * .3) : 0;
  const seatHeight = props.seatHeight ?? (member.group === 'children' ? .63 + booster : .66);
  const root = useRef<THREE.Group>(null), tick = useRef(0), wanted = useRef(false);
  const [detailed, setDetailed] = useState(false), [loaded, setLoaded] = useState<{ id: string; source: THREE.Group } | null>(null);
  const scratch = useMemo(() => ({ point: new THREE.Vector3(), view: new THREE.Vector3(), worldScale: new THREE.Vector3() }), []);
  // Local loading never suspends the canvas or gameplay. Offscreen floors do not load.
  useEffect(() => {
    if (!detailed) { setLoaded(null); return; }
    let alive = true;
    const lease = castAssets.acquire(member.id);
    lease.promise.then(source => { if (alive && source) setLoaded({ id: member.id, source }); }, error => {
      if (alive) console.warn(`Could not load character ${member.id}; using lightweight model.`, error);
    });
    return () => { alive = false; lease.release(); };
  }, [member.id, detailed]);
  useFrame((state, delta) => {
    tick.current -= delta;
    if (tick.current > 0 || !root.current) return;
    tick.current = .3;
    const visible = hierarchyVisible(root.current);
    root.current.getWorldPosition(scratch.point);
    root.current.getWorldScale(scratch.worldScale);
    const depth = -scratch.view.copy(scratch.point).applyMatrix4(state.camera.matrixWorldInverse).z;
    const height = member.heightMetres * scratch.worldScale.y;
    const pixels = height * state.size.height * state.camera.projectionMatrix.elements[5] / (2 * Math.max(.1, depth));
    scratch.point.y += height / 2; scratch.point.project(state.camera);
    const onScreen = depth > 0 && Math.abs(scratch.point.x) < 1.25 && Math.abs(scratch.point.y) < 1.35;
    const next = visible && onScreen && pixels > (wanted.current ? fast ? 22 : 12 : fast ? 30 : 18);
    if (next !== wanted.current) { wanted.current = next; setDetailed(next); }
  });
  const fallbackRole = role === 'customer' || role === 'chef' || role === 'waiter' || role === 'cleaner' ? role : role === 'gardener' || role === 'maintenance' ? 'cleaner' : 'waiter';
  const fallbackHeight = member.heightMetres / (1.9 * getCharacterAppearance(seed).height);
  return <group ref={root} name={name} position={position} scale={size} userData={{ castId: member.id, castGroup: member.group, ageYears: member.ageYears, role }}>
    {props.isSitting && booster > 0 && <mesh position={[0, .565 + booster / 2, 0]} castShadow><cylinderGeometry args={[.245, .26, booster, 20]} /><meshStandardMaterial color="#718c8f" roughness={.9} /></mesh>}
    {detailed && loaded?.id === member.id ? <DetailedCharacter {...props} seatHeight={seatHeight} source={loaded.source} fast={fast} /> :
      <group rotation={[props.isSleeping ? -Math.PI / 2 : 0, 0, 0]}>
      <group scale={[member.group === 'children' ? .8 : 1, fallbackHeight, member.group === 'children' ? .8 : 1]} position={[0, props.isSleeping ? -member.heightMetres * .53 : props.isSitting ? seatHeight - .63 * fallbackHeight : 0, 0]}>
        <LowDetailCharacter3D {...props} size={1} position={[0, 0, 0]} role={fallbackRole} detail="crowd" name="distant-person" />
      </group></group>}
  </group>;
});
