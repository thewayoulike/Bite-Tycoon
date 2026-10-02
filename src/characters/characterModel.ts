import * as THREE from 'three';

export type CharacterRole = 'customer' | 'chef' | 'waiter' | 'cleaner';
export type CharacterDetail = 'full' | 'crowd';
type Vec = [number, number, number];
type Ring = [y: number, width: number, depth: number, x?: number, z?: number];
type Influence = [bone: number, next?: number, weight?: number];

// Bind positions are in model space. Geometry is authored once; every person has
// their own skeleton, so elbows and knees deform the surface instead of separating.
export const JOINTS = [
  ['hips', -1, 0, 1.02, 0], ['spine', 0, 0, 1.18, 0],
  ['chest', 1, 0, 1.43, 0], ['head', 2, 0, 1.67, 0],
  ['leftArm', 2, -.255, 1.46, 0], ['leftElbow', 4, -.29, 1.17, 0],
  ['leftHand', 5, -.3, .94, 0],
  ['rightArm', 2, .255, 1.46, 0], ['rightElbow', 7, .29, 1.17, 0],
  ['rightHand', 8, .3, .94, 0],
  ['leftThigh', 0, -.105, 1.02, 0], ['leftKnee', 10, -.105, .57, 0],
  ['leftFoot', 11, -.105, .14, 0],
  ['rightThigh', 0, .105, 1.02, 0], ['rightKnee', 13, .105, .57, 0],
  ['rightFoot', 14, .105, .14, 0],
  ['eyes', 3, 0, 1.842, .115],
] as const;

const SKIN = ['#ecc3a4', '#dca581', '#bf805b', '#965f43', '#674431', '#f0cdb5'];
const HAIR = ['#28211f', '#463027', '#885639', '#bd985f', '#483934', '#8a8176'];
const OUTFITS = [
  ['#486c77', '#202f3d', '#e8dfcc'], ['#a45843', '#303c4c', '#eee5d6'],
  ['#748166', '#3e3939', '#ded3bf'], ['#c29a54', '#263949', '#f4e9d7'],
  ['#766884', '#34333a', '#ede3d3'], ['#d4c5ad', '#485b66', '#a5734e'],
  ['#356b69', '#b6a289', '#eadfca'], ['#b8768a', '#393944', '#f1dcd2'],
  ['#495685', '#aaa18b', '#e6dcc4'], ['#8e5340', '#2a3e43', '#d3b282'],
];

export const CHARACTER_VARIANTS = 96;
export function getCharacterAppearance(seed: number) {
  const variant = Math.abs(Math.trunc(seed)) % CHARACTER_VARIANTS;
  const pick = (salt: number, count: number) => {
    let value = Math.imul(variant ^ salt, 0x45d9f3b);
    value = Math.imul(value ^ value >>> 16, 0x45d9f3b);
    return ((value ^ value >>> 16) >>> 0) % count;
  };
  return { variant, skin: SKIN[pick(11,SKIN.length)], hair: HAIR[pick(23,HAIR.length)],
    palette: OUTFITS[pick(37,OUTFITS.length)], hairstyle: pick(51,6), outfit: pick(67,5),
    build: pick(83,3), face: pick(101,3), glasses: pick(113,5) === 0,
    beard: pick(127,5) === 0, height: .96 + pick(139,7) * .015 };
}

class ModelBuilder {
  constructor(private detail: CharacterDetail) {}
  positions: number[] = []; colors: number[] = []; indices: number[] = [];
  joints: number[] = []; weights: number[] = [];
  private tint = new THREE.Color();

  vertex(x: number, y: number, z: number, color: string, influence: Influence) {
    this.positions.push(x, y, z);
    this.tint.set(color);
    this.colors.push(this.tint.r, this.tint.g, this.tint.b);
    const [bone, next = bone, weight = 0] = influence;
    this.joints.push(bone, next, 0, 0);
    this.weights.push(1 - weight, weight, 0, 0);
  }

  // Elliptical contour rings form tailored garments and anatomical surfaces.
  loft(rings: Ring[], color: string | ((x: number, y: number, z: number) => string), influence: number | ((y: number) => Influence), segments = 20) {
    if (this.detail === 'crowd') segments = Math.min(segments, 14);
    const start = this.positions.length / 3;
    for (const [y, width, depth, x = 0, z = 0] of rings) {
      for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2;
        const px = x + Math.cos(a) * width, pz = z + Math.sin(a) * depth;
        this.vertex(px, y, pz, typeof color === 'string' ? color : color(px, y, pz),
          typeof influence === 'number' ? [influence] : influence(y));
      }
    }
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < segments; i++) {
        const a = start + r * segments + i;
        const b = start + r * segments + (i + 1) % segments;
        this.indices.push(a, a + segments, b, b, a + segments, b + segments);
      }
    }
    // Center fans close cuffs, soles and garment hems.
    for (const r of [0, rings.length - 1]) {
      const [y, , , x = 0, z = 0] = rings[r];
      const center = this.positions.length / 3;
      this.vertex(x, y, z, typeof color === 'string' ? color : color(x, y, z), typeof influence === 'number' ? [influence] : influence(y));
      for (let i = 0; i < segments; i++) {
        const a = start + r * segments + i, b = start + r * segments + (i + 1) % segments;
        this.indices.push(...(r === 0 ? [center, a, b] : [center, b, a]));
      }
    }
  }

  surface(geometry: THREE.BufferGeometry, color: string, bone: number, pos: Vec, scale: Vec = [1, 1, 1], rotation: Vec = [0, 0, 0]) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    const start = this.positions.length / 3;
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) this.vertex(p.getX(i), p.getY(i), p.getZ(i), color, [bone]);
    if (geometry.index) for (const i of geometry.index.array) this.indices.push(start + i);
    else for (let i = 0; i < p.count; i++) this.indices.push(start + i);
    geometry.dispose();
  }

  oval(pos: Vec, size: Vec, color: string, bone: number, rotation: Vec = [0, 0, 0]) {
    this.surface(new THREE.SphereGeometry(1, this.detail === 'crowd' ? 8 : 12, this.detail === 'crowd' ? 6 : 8), color, bone, pos, size, rotation);
  }

  patch(points: Vec[], color: string, bone: number) {
    const start = this.positions.length / 3;
    points.forEach(p => this.vertex(...p, color, [bone]));
    const area = points.reduce((sum, p, i) => {
      const next = points[(i + 1) % points.length];
      return sum + p[0] * next[1] - next[0] * p[1];
    }, 0);
    for (let i = 1; i < points.length - 1; i++) this.indices.push(...(area > 0 ?
      [start, start + i, start + i + 1] : [start, start + i + 1, start + i]));
  }

  finish() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.joints, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.weights, 4));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const blend = (y: number, bottom: number, top: number, lowerBone: number, upperBone: number): Influence =>
  [lowerBone, upperBone, THREE.MathUtils.smoothstep(y, bottom, top)];

// A bounded set of shared meshes keeps GPU memory stable across many game weeks.
const models = new Map<string, THREE.BufferGeometry>();
export const characterMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });

export function getCharacterGeometry(role: CharacterRole, seed: number, vip = false, detail: CharacterDetail = 'full') {
  const appearance = getCharacterAppearance(seed);
  const { variant, skin, hair, palette, outfit, hairstyle } = appearance;
  const key = `${role}:${variant}:${vip}:${detail}`;
  const cached = models.get(key);
  if (cached) return cached;
  const m = new ModelBuilder(detail);
  const shirt = role === 'chef' ? '#eee8dc' : role === 'waiter' ? '#eee5d6' : role === 'cleaner' ? '#4b7f7c' : vip ? '#263644' : palette[0];
  const pants = role !== 'customer' ? '#303740' : vip ? '#263644' : palette[1];
  const accent = role === 'chef' ? '#a74433' : role === 'waiter' ? '#86503a' : role === 'cleaner' ? '#d4aa64' : palette[2];
  const shoes = role === 'customer' && !vip ? '#e5dfd3' : '#26292b';
  const torsoWeight = (y: number): Influence => y < 1.24 ? blend(y, 1.06, 1.25, 0, 1) : blend(y, 1.29, 1.46, 1, 2);
  const shoulder = [.228,.251,.271][appearance.build];
  const waist = [.14,.165,.196][appearance.build];
  const tailored = role === 'waiter' || (role === 'customer' && (outfit === 1 || vip));
  const torsoColor = (x: number, y: number, z: number) => {
    const base = role === 'waiter' ? '#323e42' : shirt;
    const opening = .017 + THREE.MathUtils.smoothstep(y, 1.3, 1.55) * .07;
    if (role === 'customer' && !vip && outfit === 4 && y > 1.13 && y < 1.46 && Math.floor(y * 42) % 3 === 0) return accent;
    return tailored && z > .045 && Math.abs(x) < opening ?
      (role === 'waiter' ? shirt : accent) : tailored ? base : shirt;
  };

  m.loft([[.9, .145, .117], [.95, .179, .13], [1.04, .18, .125], [1.095, .166, .118]], pants, 0);
  m.loft([[1.05, .171, .123], [1.08, .173, .126], [1.17, waist, .117],
    [1.29, waist + .025, .13], [1.4, shoulder - .025, .139], [1.46, shoulder, .125],
    [1.49, shoulder * .94, .115], [1.535, .103, .078], [1.55, .075, .065]], torsoColor, torsoWeight, 40);
  m.loft([[1.525, .063, .056], [1.65, .062, .057], [1.69, .076, .066]], skin, y => blend(y, 1.56, 1.66, 2, 3));

  // A shaped jaw, cheeks, temples, and cranium; the face is not a sphere.
  const faceWidth = [.126,.138,.15][appearance.face];
  m.loft([[1.653, .052, .062, 0, .015], [1.68, .089, .086, 0, .014],
    [1.73, faceWidth * .87, .098, 0, .006], [1.79, faceWidth, .113, 0, .002],
    [1.85, faceWidth, .117, 0, -.005], [1.91, faceWidth * .98, .12, 0, -.013],
    [1.96, faceWidth * .81, .105, 0, -.018], [2, .059, .065, 0, -.021],
    [2.011, .012, .015, 0, -.02]], (x,y,z) => appearance.beard && hairstyle !== 1 && hairstyle !== 3 && y < 1.755 && z > -.015 ? hair : skin, 3, 28);
  // Nose bridge and tip blend into the facial profile.
  m.loft([[1.767, .022, .012, 0, .103], [1.783, .026, .024, 0, .12],
    [1.8, .019, .032, 0, .12], [1.837, .012, .012, 0, .114], [1.86, .011, .005, 0, .108]], skin, 3, 12);
  const lip = new THREE.Color(skin).multiplyScalar(.65).lerp(new THREE.Color('#975c52'), .22).getStyle();
  m.oval([0, 1.738, .102], [.033, .007, .008], lip, 3);
  m.oval([0, 1.731, .099], [.029, .005, .008], skin, 3);
  for (const side of [-1, 1]) {
    m.oval([side * (faceWidth + .003), 1.799, -.009], [.024, .043, .029], skin, 3);
    m.oval([side * (faceWidth + .014), 1.799, .008], [.009, .025, .01], lip, 3);
    m.oval([side * .058, 1.842, .104], [.034, .023, .014], lip, 3);
    m.oval([side * .058, 1.842, .112], [.03, .014, .012], '#faf4e8', 16);
    m.oval([side * .058, 1.842, .123], [.012, .013, .005], variant % 3 ? '#49392d' : '#607c75', 16);
    m.oval([side * .058, 1.842, .127], [.006, .009, .003], '#191e20', 16);
    m.oval([side * .058 - .004, 1.846, .13], [.003, .003, .002], '#fff9e8', 16);
    m.oval([side * .059, 1.872, .111], [.035, .007, .009], hair, 3, [0, 0, side * .08]);
  }

  // Sculpted hair cap: rear and temples extend lower than the open hairline.
  const cap = new THREE.SphereGeometry(1, detail === 'crowd' ? 14 : 24, detail === 'crowd' ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const hp = cap.getAttribute('position');
  for (let i = 0; i < hp.count; i++) {
    const front = Math.max(0, hp.getZ(i));
    hp.setY(i, hp.getY(i) - (1 - hp.getY(i)) * (1 - front) * .36);
  }
  m.surface(cap, hair, 3, [0, 1.894, -.018], [faceWidth + .01, .132, .136]);
  if (hairstyle === 0) {
    m.oval([-.035, 1.976, .035], [.117, .055, .1], hair, 3, [0, 0, -.25]);
    m.oval([.06, 1.949, .091], [.062, .035, .047], hair, 3, [0, 0, .3]);
  } else if (hairstyle === 1) {
    // Rolled hair silhouette, with a tied bun behind the head.
    m.oval([0, 1.908, -.127], [.12, .116, .065], hair, 3);
    m.oval([0, 1.925, -.183], [.074, .074, .066], hair, 3);
  } else if (hairstyle === 2) {
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399;
      m.oval([Math.cos(angle) * .093, 1.986 + (i % 3) * .012, Math.sin(angle) * .081 - .02], [.054, .049, .054], hair, 3);
    }
  } else if (hairstyle === 3) {
    for (const side of [-1, 1]) m.oval([side * .118, 1.787, -.069], [.048, .145, .09], hair, 3, [0, 0, side * .08]);
    m.oval([0, 1.822, -.126], [.128, .13, .049], hair, 3);
  } else if (hairstyle === 4) {
    m.oval([0,1.905,-.158],[.07,.08,.07],hair,3);
    m.oval([0,1.769,-.19],[.056,.16,.06],hair,3,[-.2,0,0]);
  }
  if (appearance.glasses || vip) {
    for (const side of [-1, 1]) {
      m.surface(new THREE.TorusGeometry(.035, .004, 6, 18), vip ? '#c8a25b' : '#343a3d', 3,
        [side * .058, 1.843, .136], [1, .77, 1]);
    }
    m.oval([0, 1.845, .14], [.024, .003, .003], '#343a3d', 3);
  }

  for (const side of [-1, 1]) {
    const arm = side === -1 ? 4 : 7, elbow = arm + 1, hand = arm + 2;
    const thigh = side === -1 ? 10 : 13, knee = thigh + 1, foot = thigh + 2;
    const armWeight = (y: number) => blend(y, 1.12, 1.22, elbow, arm);
    // Continuous elbow skin and sleeve contours, with rounded shoulder seams.
    const longSleeve = role !== 'customer' || outfit !== 0;
    m.loft([[.94, .034, .038, side * .3], [1.025, .043, .046, side * .298],
      [1.1, .05, .052, side * .294], [1.165, .045, .049, side * .29],
      [1.22, .052, .053, side * .284], [1.33, .062, .062, side * .272],
      [1.445, .071, .074, side * .251], [1.483, .047, .052, side * .232]],
    longSleeve ? shirt : skin, armWeight, 16);
    if (!longSleeve) m.loft([[1.29, .067, .067, side * .278], [1.31, .068, .069, side * .277],
      [1.44, .075, .078, side * .251], [1.486, .052, .058, side * .232]], shirt, arm, 16);
    else m.loft([[.949, .036, .041, side * .3], [.987, .04, .044, side * .299]], accent, elbow, 16);
    // Palm, thumb and four short fingers remain attached to the wrist joint.
    m.loft([[.84, .025, .022, side * .303, .008], [.884, .034, .026, side * .303, .003],
      [.924, .032, .024, side * .301], [.958, .025, .024, side * .3]], skin, hand, 12);
    for (let f = 0; f < 4; f++) m.oval([side * (.28 + f * .015), .827 + Math.abs(f - 1.5) * .007, .009], [.009, .031, .012], skin, hand);
    m.oval([side * .27, .887, .023], [.014, .034, .016], skin, hand, [0, 0, side * -.4]);

    m.loft([[.145, .055, .06, side * .105], [.19, .059, .067, side * .105],
      [.3, .061, .072, side * .105], [.42, .072, .077, side * .105, -.01],
      [.53, .061, .068, side * .105], [.585, .063, .074, side * .105],
      [.68, .077, .085, side * .105], [.81, .087, .098, side * .105],
      [.92, .091, .107, side * .101], [1.022, .082, .113, side * .097]], pants,
    y => blend(y, .51, .635, knee, thigh), 18);
    m.loft([[.026, .069, .125, side * .105, .047], [.045, .074, .137, side * .105, .057],
      [.073, .075, .139, side * .105, .058], [.106, .071, .129, side * .105, .05],
      [.152, .058, .073, side * .105, -.003], [.18, .05, .055, side * .105, -.013]], shoes, foot, 18);
    m.loft([[.025, .071, .128, side * .105, .05], [.048, .076, .14, side * .105, .056]],
      role === 'customer' ? '#c2b9a8' : '#171e22', foot, 18);
    for (let i = 0; i < 3; i++) m.oval([side * .105, .123 - i * .009, .058 + i * .023], [.043, .003, .004], accent, foot);
  }

  // Collars sit along the modeled neckline; clothing colors are on the surface.
  if (role === 'customer' && outfit === 3 && !vip) {
    m.oval([0,1.49,-.1],[.129,.07,.085],shirt,2);
    for (const side of [-1,1]) m.oval([side*.035,1.426,.138],[.006,.064,.008],accent,2);
  }
  m.loft([[1.525, .081, .074], [1.548, .077, .07], [1.56, .069, .063]],
    role === 'customer' ? accent : '#f5eddd', 2, 20);
  if (role === 'chef') {
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) m.oval([side * .053, 1.4 - i * .07, .137], [.01, .01, .007], '#41474b', 2);
    m.loft([[1.972, .143, .127, 0, -.018], [2.017, .145, .13, 0, -.018],
      [2.036, .171, .151, 0, -.018], [2.1, .184, .16, 0, -.018],
      [2.15, .151, .137, 0, -.018], [2.167, .063, .056, 0, -.018]], '#f5f0e5', 3, 24);
  }
  if (role === 'chef' || role === 'waiter') {
    m.patch([[-.145, .85, .14], [.145, .85, .14], [.157, 1.12, .123], [-.157, 1.12, .123]],
      role === 'chef' ? '#d9ceba' : '#82543f', 0);
    m.patch([[-.085, .94, .145], [.085, .94, .145], [.08, 1.02, .144], [-.08, 1.02, .144]], accent, 0);
    m.oval([0, 1.507, .09], [.059, .016, .027], accent, 2);
    m.patch([[-.025, 1.501, .117], [0, 1.396, .148], [.038, 1.49, .116]], accent, 2);
  }
  if (role === 'cleaner') {
    m.loft([[1.063, .177, .13], [1.097, .176, .129]], '#c49d58', 0);
    m.patch([[-.155, 1.315, .107], [-.07, 1.315, .141], [-.07, 1.386, .144], [-.155, 1.386, .107]], '#d0aa68', 2);
  }
  const geometry = m.finish();
  models.set(key, geometry);
  return geometry;
}

export function createCharacterRig() {
  const bones = JOINTS.map(([name, parent, x, y, z]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    const origin = parent < 0 ? [0, 0, 0] : JOINTS[parent as number].slice(2) as number[];
    bone.position.set(x - origin[0], y - origin[1], z - origin[2]);
    return bone;
  });
  JOINTS.forEach(([, parent], i) => { if (parent >= 0) bones[parent as number].add(bones[i]); });
  bones[0].updateMatrixWorld(true);
  return { bones, skeleton: new THREE.Skeleton(bones) };
}
