import * as THREE from 'three';
import { ModelParts, seededRandom, Vec3 } from './modelParts';

const trees = new Map<string, { bark: THREE.BufferGeometry; leaves: THREE.BufferGeometry }>();
export function getTreeModel(seed: number, blossom: boolean) {
  const variant = Math.abs(seed) % 8, key = `${variant}:${blossom}`;
  if (trees.has(key)) return trees.get(key)!;
  const random = seededRandom(variant * 101 + 9), bark = new ModelParts(), foliage = new ModelParts();
  const trunk: Vec3[] = [[0, 0, 0], [.06, .8, -.03], [-.045, 1.65, .015], [.1, 2.5, -.07], [.07, 3.8, -.1]];
  trunk.slice(1).forEach((end, i) => bark.branch(trunk[i], end, .23 - i * .043, .18 - i * .047, i % 2 ? '#74583e' : '#674c37', 9));
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    bark.branch([Math.cos(angle) * .39, .025, Math.sin(angle) * .39], [0, .47, 0], .085, .12, '#70513a');
  }
  const green = ['#365e39', '#467545', '#5b874b', '#769b54', '#8da760'];
  const pink = ['#a96c81', '#cb8e9e', '#e2a8b2', '#f1c4c8', '#e7b1be'];
  // Irregular branching and individually folded leaves give the canopy open edges.
  const clusters: { center: Vec3; radius: Vec3 }[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.399 + variant * .8, reach = 1.0 + random() * .45;
    const start: Vec3 = [.04, 1.7 + i * .19, -.04];
    const joint: Vec3 = [Math.cos(angle) * reach * .56, 2.5 + i * .16, Math.sin(angle) * reach * .56];
    const end: Vec3 = [Math.cos(angle) * reach, 2.9 + i * .14, Math.sin(angle) * reach];
    bark.branch(start, joint, .09 - i * .004, .042, '#755940');
    bark.branch(joint, end, .043, .012, '#876344');
    clusters.push({ center: end, radius: [.71 + random() * .2, .6 + random() * .25, .7] });
    const fork: Vec3 = [end[0] * .83, end[1] + .48, end[2] + .35];
    bark.branch(joint, fork, .027, .009, '#856345');
    clusters.push({ center: fork, radius: [.48, .58, .48] });
  }
  clusters.push({ center: [0, 4.28, -.05], radius: [.75, .72, .74] });
  const leaf = new THREE.BufferGeometry();
  // A central ridge gives a leaf thickness and changing highlights, without alpha textures.
  leaf.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -.36,.23,0, -.4,.62,0, 0,1,0, .4,.62,0, .36,.23,0, 0,.46,.08], 3));
  leaf.setIndex([0,1,6, 1,2,6, 2,3,6, 3,4,6, 4,5,6, 5,0,6]); leaf.computeVertexNormals();
  clusters.forEach(({ center, radius }, cluster) => {
    for (let i = 0; i < 64; i++) {
      const azimuth = random() * Math.PI * 2, vertical = random() * 2 - 1;
      const shell = Math.cbrt(.15 + random() * .85), planar = Math.sqrt(1 - vertical * vertical);
      const position: Vec3 = [center[0] + Math.cos(azimuth) * planar * shell * radius[0],
        center[1] + vertical * shell * radius[1] - 1.8, center[2] + Math.sin(azimuth) * planar * shell * radius[2]];
      const size = .19 + random() * .18;
      const palette = blossom && random() > .15 ? pink : green;
      const tone = Math.min(4, Math.floor(random() * 3 + (vertical + 1) * .8));
      foliage.add(leaf.clone(), palette[tone], position, [size * .9, size * 1.3, size],
        [random() * Math.PI, azimuth, random() * Math.PI]);
    }
  });
  leaf.dispose();
  const result = { bark: bark.finish(), leaves: foliage.finish() };
  trees.set(key, result); return result;
}

// Cross sections run rear to front. The lower edge rises over the wheel arches.
function carShell(sections: { z: number; points: [number, number][] }[]) {
  const p: number[] = [], index: number[] = [], n = sections[0].points.length;
  sections.forEach(section => section.points.forEach(([x, y]) => p.push(x, y, section.z)));
  for (let s = 0; s < sections.length - 1; s++) for (let i = 0; i < n; i++) {
    const a = s * n + i, b = s * n + (i + 1) % n;
    index.push(a, a + n, b, b, a + n, b + n);
  }
  for (const s of [0, sections.length - 1]) for (let i = 1; i < n - 1; i++) {
    const a = s * n;
    index.push(...(s === 0 ? [a, a + i, a + i + 1] : [a, a + i + 1, a + i]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geometry.setIndex(index);
  geometry.computeVertexNormals(); return geometry;
}

const cars = new Map<boolean, ReturnType<typeof buildCar>>();
export function getCarModel(wagon: boolean) {
  if (!cars.has(wagon)) cars.set(wagon, buildCar(wagon));
  return cars.get(wagon)!;
}
function buildCar(wagon: boolean) {
  const trim = new ModelParts(), wheels = new ModelParts(), lights = new ModelParts(), rear = new ModelParts();
  const body = carShell(Array.from({ length: 57 }, (_, i) => {
    const z = -2.24 + i * 4.48 / 56, end = Math.pow(Math.abs(z) / 2.24, 8);
    const width = .98 - end * .22, top = 1.21 - Math.pow(Math.abs(z) / 2.24, 3) * .16;
    const wheelDistance = Math.min(Math.abs(z - 1.36), Math.abs(z + 1.36));
    const bottom = wheelDistance < .49 ? .43 + Math.sqrt(.49 ** 2 - wheelDistance ** 2) : .48;
    return { z, points: [[0,top], [width*.76,top-.012], [width,top-.1], [width,bottom+.045],
      [width*.93,bottom], [-width*.93,bottom], [-width,bottom+.045], [-width,top-.1], [-width*.76,top-.012]] as [number, number][] };
  }));
  const backRoof = wagon ? -1.17 : -.79, backGlass = wagon ? -1.83 : -1.49;
  const cabin = carShell([
    { z: backGlass, points: [[-.85,1.15],[-.84,1.18],[.84,1.18],[.85,1.15]] },
    { z: backRoof, points: [[-.89,1.17],[-.74,1.86],[.74,1.86],[.89,1.17]] },
    { z: .24, points: [[-.89,1.17],[-.72,1.82],[.72,1.82],[.89,1.17]] },
    { z: 1.04, points: [[-.84,1.16],[-.83,1.18],[.83,1.18],[.84,1.16]] },
  ].map(s => ({...s, points:s.points as [number,number][]})));
  const roof = carShell([
    { z: backRoof-.05, points: [[-.75,1.845],[-.75,1.885],[.75,1.885],[.75,1.845]] },
    { z: .3, points: [[-.73,1.808],[-.73,1.855],[.73,1.855],[.73,1.808]] },
  ].map(s=>({...s,points:s.points as [number,number][]})));
  for (const side of [-1, 1]) {
    trim.branch([side*.846,1.18,1.045],[side*.735,1.845,.25],.027,.027,'#c8cbc5');
    trim.branch([side*.75,1.88,backRoof],[side*.855,1.18,backGlass],.032,.032,'#c8cbc5');
    trim.branch([side*.892,1.19,-.36],[side*.746,1.875,-.36],.038,.038,'#25373e');
    trim.branch([side*.898,1.18,backGlass],[side*.898,1.18,.99],.018,.018,'#c2c6c3');
    trim.branch([side*.984,.55,-.43],[side*.984,1.14,-.43],.009,.009,'#34454c',5);
    trim.branch([side*.984,.55,.81],[side*.984,1.13,.81],.008,.008,'#34454c',5);
    trim.box([side*.987,1.055,-.67],[.024,.035,.2],'#d9dcda');
    trim.box([side*.987,1.055,.42],[.024,.035,.2],'#d9dcda');
    trim.branch([side*.84,1.25,.77],[side*1.1,1.26,.7],.025,.025,'#29393d');
    trim.ellipsoid([side*1.105,1.285,.7],[.13,.073,.115],'#31474f');
    lights.box([side*.57,1.018,2.188],[.43,.13,.026],'#e6f2ed',[0,side*-.12,0]);
    rear.box([side*.61,1.029,-2.172],[.36,.095,.04],'#db5348',[0,side*.1,0]);
  }
  trim.box([0,.79,2.18],[.78,.18,.045],'#23363b');
  for (let i=0;i<5;i++) trim.box([0,.72+i*.032,2.211],[.7,.009,.012],'#798887');
  for (const end of [-1,1]) {
    trim.box([0,.59,end*2.18],[1.48,.065,.05],'#374549');
    trim.box([0,.76,end*2.236],[.32,.12,.018],'#e6e1cf');
  }
  wheels.add(new THREE.TorusGeometry(.32,.108,10,24),'#24292b',[0,0,0],[1,1,1],[0,Math.PI/2,0]);
  wheels.add(new THREE.CylinderGeometry(.254,.254,.17,24),'#465156',[0,0,0],[1,1,1],[0,0,Math.PI/2]);
  for (const side of [-1,1]) {
    wheels.add(new THREE.TorusGeometry(.239,.013,6,24),'#c1c7c8',[side*.09,0,0],[1,1,1],[0,Math.PI/2,0]);
    for (let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      wheels.branch([side*.098,Math.sin(a)*.045,Math.cos(a)*.045],
        [side*.098,Math.sin(a+.12)*.227,Math.cos(a+.12)*.227],.018,.024,'#c7cdcc',5);
    }
  }
  wheels.add(new THREE.CylinderGeometry(.065,.065,.21,12),'#d3d9d7',[0,0,0],[1,1,1],[0,0,Math.PI/2]);
  return { body, cabin, roof, trim:trim.finish(), wheel:wheels.finish(), headlights:lights.finish(), taillights:rear.finish() };
}
