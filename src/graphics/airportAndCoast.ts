import * as THREE from 'three';
import {ModelParts, seededRandom, type Vec3} from './modelParts';
import {RAIL_X} from './cityRailway';

// Public scenery lives outside all existing property parcels.
export const AIRPORT_OFFSET_X=800;
export const AIRPORT = {x: 415, z: -55, runwayX: 368, runwayStart: -194, runwayEnd: 94};
export const SCENIC_BOUNDS = {minX: -290, maxX: 560, minZ: -290, maxZ: 500};
export const coastEdge = (x: number) => 302 + Math.sin(x / 84) * 8 + Math.cos(x / 39) * 3;
export const FLIGHT_SECONDS = 150;
const airportRoute = new THREE.CatmullRomCurve3([
  [-432,1.9,-170],[-432,1.9,-90],[-432,10,40],[-432,42,160],
  [-520,82,235],[-610,100,95],[-605,95,-130],[-510,75,-330],
  [-432,33,-330],[-432,8,-235],[-432,1.9,-194]
].map(v => new THREE.Vector3(...v as Vec3)), true, 'centripetal');
const coastalRoute = new THREE.CatmullRomCurve3([
  [-340,86,195],[-90,94,270],[190,105,180],[240,100,-160],[-50,92,-240],[-330,90,-80]
].map(v => new THREE.Vector3(...v as Vec3)), true, 'centripetal');
export function flightPose(seconds: number, coastal = false) {
  const route = coastal ? coastalRoute : airportRoute;
  const duration = coastal ? 210 : FLIGHT_SECONDS;
  const t = ((seconds % duration) + duration) % duration / duration;
  const position = route.getPointAt(t), tangent = route.getTangentAt(t);
  position.y = Math.max(1.9, position.y);
  if(!coastal)position.x+=AIRPORT_OFFSET_X;
  return {position, heading: Math.atan2(tangent.x,tangent.z), pitch: -Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z)), bank: position.y < 20 ? 0 : Math.sin(t*Math.PI*2)*.12};
}
export function cityGroundGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-950,700); s.lineTo(950,700);
  for(let x=950;x>=-950;x-=10)s.lineTo(x,-coastEdge(x));
  s.closePath();
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI/2);
  const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+950)/1900,(uv.getY(i)+700)/1400);
  g.computeBoundingSphere();return g;
}
function horizontalPolygon(points:[number,number][],height:number) {
  const s=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],-p[1])));
  const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.translate(0,height,0);return g;
}
function taperedWing(points:[number,number][],thickness=.16) {
  const s=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],p[1])));
  const g=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});g.rotateX(Math.PI/2);return g;
}
function terminalRoofHeight(u:number,v:number){return 13.1+5.5*Math.cos(u*Math.PI/2)+1.2*Math.cos(v*Math.PI);}
function terminalRoofPatch(from:number,to:number) {
  const positions:number[]=[],indices:number[]=[],columns=16,rows=32;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=from+(to-from)*i/columns,v=j/rows*2-1;
    positions.push(-319+u*21,terminalRoofHeight(u,v),-48+v*53);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function glassPanel(a:[number,number],b:[number,number],bottom:number,topA:number,topB:number){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([a[0],bottom,a[1],b[0],bottom,b[1],a[0],topA,a[1],b[0],topB,b[1]],3));
  g.setIndex([0,1,2,2,1,3]);g.computeVertexNormals();return g;
}
function buildTerminal(solid:ModelParts,glass:ModelParts,lights:ModelParts){
  // Swept white roof wings surround a vaulted glass spine. The concourse's
  // shape stays recognizable at city scale, with fine framing at street level.
  solid.box([-319,.55,-48],[35,.8,98],'#e1ddcf');
  solid.box([-319,6.4,-48],[33,.35,95],'#d7dbd5');
  solid.box([-319,6.7,-48],[8,12,44],'#b2bfb9');
  glass.add(terminalRoofPatch(-.72,.72),'#89bdce');
  solid.add(terminalRoofPatch(-1.16,-.72),'#eef0e5');
  solid.add(terminalRoofPatch(.72,1.16),'#eef0e5');
  for(let j=0;j<=12;j++){
    const v=j/6-1,z=-48+v*53;
    for(let i=0;i<20;i++){
      const u=-1.16+i*2.32/20,next=u+2.32/20;
      solid.branch([-319+u*21,terminalRoofHeight(u,v)+.1,z],[-319+next*21,terminalRoofHeight(next,v)+.1,z],.18,.18,'#dfe8e5',5);
    }
  }
  for(const u of [-.72,0,.72])for(let j=0;j<32;j++){
    const v=j/16-1,next=v+1/16;
    solid.branch([-319+u*21,terminalRoofHeight(u,v)+.1,-48+v*53],[-319+u*21,terminalRoofHeight(u,next)+.1,-48+next*53],.15,.15,'#d4e3e1',5);
  }
  for(const x of [-336,-302]){
    for(let z=-96;z<0;z+=6){
      const u=(x+319)/21,top=terminalRoofHeight(u,(z+48)/53),next=terminalRoofHeight(u,(z+54)/53);
      glass.add(glassPanel([x,z],[x,z+6],.9,top,next),'#88b6c5');
      solid.branch([x,.9,z],[x,top,z],.105,.105,'#b4c8cc',5);
    }
    for(const y of [3.8,6.5,9.6])solid.box([x,y,-48],[.24,.14,96],'#b9cdcf');
  }
  for(const z of [-96,0])for(let x=-336;x<-302;x+=2){
    glass.add(glassPanel([x,z],[x+2,z],.9,terminalRoofHeight((x+319)/21,(z+48)/53),terminalRoofHeight((x+321)/21,(z+48)/53)),'#7baabd');
    solid.branch([x,.9,z],[x,terminalRoofHeight((x+319)/21,(z+48)/53),z],.07,.07,'#b8cdd0',5);
  }
  // A tall rounded arrival hall projects into the public forecourt.
  const atrium:[number,number][]=[[-306,-68]];
  for(let i=0;i<=24;i++){
    const a=-Math.PI/2+i*Math.PI/24,x=-302+11*Math.cos(a),z=-48+20*Math.sin(a),height=19-3*Math.sin(a)**2;
    atrium.push([x,z]);
    if(i<24){
      const b=a+Math.PI/24,nx=-302+11*Math.cos(b),nz=-48+20*Math.sin(b),nh=19-3*Math.sin(b)**2;
      const doorway=i===14||i===15;
      glass.add(glassPanel([x,z],[nx,nz],doorway?4.1:.9,height,nh),'#8dc3d2');
      solid.branch([x,height,z],[nx,nh,nz],.25,.25,'#f0eee1',6);
      const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([-306,20,-48,x,height,z,nx,nh,nz],3));roof.computeVertexNormals();glass.add(roof,'#aad4dc');
      if(i%3===0){solid.branch([x,i===15?4.1:.9,z],[x,height,z],.14,.14,'#d3dfdc',5);solid.branch([-306,20,-48],[x,height,z],.13,.13,'#e7ece3',5);}
      for(const y of [6.5,10,13.5])solid.branch([x,y,z],[nx,y,nz],.055,.055,'#bacdd0',5);
    }
  }
  atrium.push([-306,-28]);solid.add(horizontalPolygon(atrium,.95),'#d5ceba');
  for(let step=0;step<3;step++)solid.box([-289.8-step*.6,.65+step*.12,-40.7],[.7,.24,5.2],'#d5ceba');
  // V-shaped supports and upturned wings cover the arrivals drop-off.
  for(const z of [-82,-14]){
    const canopy=new THREE.BufferGeometry();
    canopy.setAttribute('position',new THREE.Float32BufferAttribute([-303,5.5,z-13,-284,7.6,z-11,-303,5.5,z+13,-284,7.6,z+11],3));canopy.setIndex([0,2,1,1,2,3]);canopy.computeVertexNormals();solid.add(canopy,'#eee9da');
    for(const dz of [-8,8]){
      solid.branch([-292,.5,z+dz],[-299,5.4,z+dz],.16,.12,'#b9cccd');
      solid.branch([-292,.5,z+dz],[-285,7.4,z+dz],.16,.12,'#b9cccd');
    }
    lights.box([-289,7.1,z],[.15,.12,20],'#ffe0ac');
  }
  for(let z=-85;z<-5;z+=12){
    for(const x of [-329,-309]){
      solid.box([x,1.1,z],[3,.8,4],'#3c6674');
      lights.box([x,12.8,z],[.18,.08,7],'#ffe5bb');
    }
    solid.box([-310,7.2,z],[2.2,1.2,5],'#c3b89e');
  }
}
/** Reusable regional airliner, +Z forward, modeled once for parked and moving aircraft. */
export function buildAirliner() {
  const shell=new ModelParts(),glass=new ModelParts(),metal=new ModelParts(),lights=new ModelParts();
  const profile=[[-10,.04],[-8.5,.5],[-6,1.05],[4.8,1.12],[7.1,.95],[8.5,.55],[9.2,.03]];
  shell.add(new THREE.LatheGeometry(profile.map(([z,r])=>new THREE.Vector2(r,z)),20),'#e8ecea',[0,0,0],[1,1,1],[Math.PI/2,0,0]);
  for(const side of [-1,1]){
    shell.add(taperedWing([[side*.5,2.4],[side*11,-3.8],[side*11,-5],[side*3,-3.2],[side*.5,-2]]),'#cdd7d9',[0,-.25,0]);
    shell.add(taperedWing([[side*.45,-6],[side*4.3,-8.1],[side*4.3,-8.9],[side*.4,-8.2]]),'#e6e8e1',[0,.1,0]);
    shell.box([side*10.85,.15,-4.4],[.12,1,.7],'#287479',[0,0,side*.2]);
    shell.add(new THREE.CylinderGeometry(.65,.55,2.75,16),'#dbe0df',[side*3.6,-.85,-.7],[1,1,1],[Math.PI/2,0,0]);
    metal.add(new THREE.CylinderGeometry(.5,.5,.08,16),'#283a43',[side*3.6,-.85,.72],[1,1,1],[Math.PI/2,0,0]);
    metal.add(new THREE.TorusGeometry(.56,.08,8,20),'#8d9da2',[side*3.6,-.85,.77]);
    for(let z=-5.3;z<6;z+=.72)glass.ellipsoid([side*1.073,.28,z],[.05,.16,.22],'#294552');
    shell.box([side*1.066,-.12,-.3],[.035,.17,13],'#39888d');
    metal.branch([side*1,-.8,-2],[side*1.5,-1.45,-2],.09,.09,'#7f9097');
    metal.add(new THREE.CylinderGeometry(.33,.33,.28,12),'#263039',[side*1.5,-1.48,-2],[1,1,1],[0,0,Math.PI/2]);
    lights.ellipsoid([side*11,.15,-4.5],[.12,.1,.15],side<0?'#ed5048':'#72d296');
  }
  const fin=new THREE.Shape([new THREE.Vector2(-8.8,.4),new THREE.Vector2(-8.3,4.1),new THREE.Vector2(-7.2,4.3),new THREE.Vector2(-5.1,.5)]);
  const fg=new THREE.ExtrudeGeometry(fin,{depth:.17,bevelEnabled:false});fg.rotateY(-Math.PI/2);
  shell.add(fg,'#287479');
  for(const side of [-1,1])glass.ellipsoid([side*.45,.64,7.8],[.4,.27,.32],'#203c50');
  metal.branch([0,-.9,6],[0,-1.45,6],.08,.07,'#7f9097');
  metal.add(new THREE.CylinderGeometry(.26,.26,.3,12),'#263039',[0,-1.5,6],[1,1,1],[0,0,Math.PI/2]);
  lights.ellipsoid([0,1.18,-1],[.12,.08,.12],'#ff4637');
  return {shell:shell.finish(),glass:glass.finish(),metal:metal.finish(),lights:lights.finish()};
}
export function buildAirport() {
  const base=new ModelParts(),solid=new ModelParts(),glass=new ModelParts(),markings=new ModelParts(),lights=new ModelParts();
  base.box([-383,.06,-55],[218,.1,330],'#758578');
  base.box([-432,.14,-50],[22,.16,288],'#3c4850');
  base.box([-396,.12,-50],[14,.12,288],'#68777a');
  base.box([-360,.14,-55],[58,.14,158],'#adb4ae');
  // Runway shoulder, thresholds, centreline, taxi links and gate stop lines.
  for(const side of [-1,1]){
    markings.box([-432+side*10,.235,-50],[.17,.025,284],'#e8e6d8');
    for(let z=-187;z<=87;z+=8)lights.box([-432+side*11.5,.3,z],[.2,.15,.2],'#d7e8fb');
    for(const z of [-182,82])for(let i=0;i<4;i++)markings.box([-432+side*(2+i*1.7),.24,z],[1,.03,9],'#f2f0df');
    for(let z=-195;z<=106;z+=9)solid.box([-487+side*2.5,1.05,z],[.06,2,.06],'#87918b');
    for(const z of [-138,-55,28]){
      base.box([-414,.14,z],[34,.16,10],'#69777a');
      markings.box([-414,.235,z],[33,.02,.16],'#e0bd65');
    }
  }
  for(let z=-155;z<=58;z+=14)markings.box([-432,.24,z],[.42,.03,7],'#efecdc');
  markings.box([-396,.225,-50],[.19,.03,284],'#d7b858');
  buildTerminal(solid,glass,lights);
  for(const z of [-73,-45,-17]){
    solid.box([-345,3.1,z],[17,2.2,3],'#d1d5ce');
    glass.box([-345,3.45,z+1.53],[15,1.05,.06],'#6a8f9c');
    for(const x of [-351,-344,-337])solid.box([x,1.5,z],[.28,3,.28],'#6b7980');
    markings.box([-367,.235,z],[.16,.03,22],'#d8b664');
    markings.box([-367,.235,z+11],[9,.03,.15],'#d8b664');
  }
  // Public arrival plaza, two planted islands and the connected drop-off lane.
  base.box([-291,.32,-48],[26,.5,110],'#c8c9bd');
  base.box([-288,.32,26],[4,.5,40],'#c8c9bd');
  base.box([-292,.32,43],[12,.5,3],'#c8c9bd');
  for(let z=-98;z<=2;z+=5)markings.box([-291,.585,z],[25,.02,.045],'#a8b1ac');
  for(const z of [-73,-23]){
    solid.add(new THREE.CylinderGeometry(3.6,3.9,.7,24),'#bbc6c1',[-283,.7,z]);
    base.add(new THREE.CylinderGeometry(3.3,3.3,.1,24),'#667d63',[-283,1.1,z]);
    for(const dx of [-1.5,1.5])solid.ellipsoid([-283+dx,1.5,z],[1.3,.7,1.7],'#6c8a69');
  }
  base.box([-278,.12,-50],[8,.13,382],'#4d5a61');
  for(let z=-228;z<=125;z+=10)markings.box([-278,.21,z],[.12,.025,4.5],'#e0dccb');
  for(const z of [-237.5,137.5]){
    base.box([-407.75,.12,z],[259.5,.15,6.5],'#4a5860');
    markings.box([-407.75,.22,z],[259,.025,.14],'#dad1ae');
  }
  base.box([-290,.12,54],[25,.15,7],'#707a7b');
  for(const z of [-100,4])for(let x=-281;x<=-275;x+=1.1)markings.box([x,.22,z],[.55,.025,3.6],'#e8e4d5');
  base.box([-317,.12,54],[48,.15,32],'#707a7b');
  for(let x=-337;x<=-298;x+=3.2)for(const z of [44,64])markings.box([x,.22,z],[.07,.02,5.8],'#e0ddc6');
  // Control tower and service hangars.
  solid.add(new THREE.CylinderGeometry(2.4,3.3,21,12),'#d6d5ca',[-307,10.7,-115]);
  solid.add(new THREE.CylinderGeometry(5,3,2.5,8),'#748b92',[-307,22,-115]);
  glass.add(new THREE.CylinderGeometry(5,4.6,3.6,8),'#436a7d',[-307,25,-115]);
  solid.add(new THREE.CylinderGeometry(5.4,5.4,.5,8),'#d0dbd8',[-307,27,-115]);
  solid.branch([-307,27,-115],[-307,34,-115],.12,.06,'#506b74');
  lights.ellipsoid([-307,34,-115],[.25,.3,.25],'#e56948');
  for(const x of [-358,-318]){
    solid.box([x,6.2,-172],[30,12,29],'#9caeb3');
    solid.box([x,12.5,-172],[32,.7,31],'#d4d7ca');
    glass.box([x,5.8,-157.4],[25,9.8,.12],'#526876');
    for(let dx=-12;dx<=12;dx+=2)solid.box([x+dx,5.8,-157.25],[.13,9.7,.12],'#a9babc');
    for(const dz of [-181,-163])solid.box([x,11.1,dz],[30,.2,.2],'#d8ddd6');
  }
  // Ground-service vehicles: luggage carts, electric tug and fuel bowser.
  for(const z of [-65,-36,-9]){
    solid.box([-342,.65,z],[2.2,.8,4.6],'#e6dfc6');
    solid.box([-342,1.4,z+1.5],[2,1,1.3],'#4f797c');
    for(const dx of [-1.1,1.1])for(const dz of [-1.5,1.5])solid.ellipsoid([-342+dx,.35,z+dz],[.18,.33,.33],'#2b3439');
    for(let n=0;n<2;n++){solid.box([-342,.75,z-4-n*2.5],[1.7,.55,2],'#898e83');solid.box([-342,1.3,z-4-n*2.5],[1.4,.6,1.5],'#bba27c');}
  }
  // Lights use emissive surfaces, avoiding dozens of expensive point lights.
  for(const z of [-110,-80,-50,-20,10,40,70]){
    solid.branch([-285,0,z],[-285,7,z],.11,.07,'#687b83');
    lights.box([-285,7.1,z],[1.3,.17,.6],'#ffe1a1');
  }
  const model={base:base.finish(),solid:solid.finish(),glass:glass.finish(),markings:markings.finish(),lights:lights.finish()};
  Object.values(model).forEach(g=>g.translate(AIRPORT_OFFSET_X,0,0));
  return model;
}
export function buildCoast() {
  const beach=new ModelParts(),stone=new ModelParts(),wood=new ModelParts(),details=new ModelParts(),glass=new ModelParts(),lights=new ModelParts();
  const beachPoints:[number,number][]=[];for(let x=-950;x<=950;x+=10)beachPoints.push([x,coastEdge(x)-27]);for(let x=950;x>=-950;x-=10)beachPoints.push([x,coastEdge(x)+5]);
  beach.add(horizontalPolygon(beachPoints,.04),'#d6c39c');
  // Boulevard along the southern edge connects all avenues to the seafront.
  stone.box([-110,.13,279],[750,.2,7],'#586973');
  stone.box([-110,.27,286],[750,.28,6],'#d8ceba');
  for(let x=-480;x<=260;x+=12)details.box([x,.25,279],[5,.025,.13],'#ede1b3');
  for(const x of [-462.5,-262.5,-62.5,62.5,262.5])stone.box([x,.13,270],[6.5,.2,18],'#586973');
  // Fishing pier with wider viewing deck and a cross dock.
  wood.box([-70,1.35,342],[7,.45,110],'#96765a');
  wood.box([-70,1.35,392],[34,.45,13],'#a5825d');
  for(let z=288;z<=397;z+=1.2)details.box([-70,1.59,z],[6.8,.025,.055],'#5c5345');
  for(const side of [-1,1])for(let z=290;z<=394;z+=5){
    wood.box([-70+side*3.5,.4,z],[.35,4,.35],'#705d4b');
    if(z<384){wood.box([-70+side*3.5,2.2,z],[.14,1.2,.14],'#d0bea0');details.branch([-70+side*3.5,2.55,z],[-70+side*3.5,2.55,z+5],.045,.045,'#d2c3a6');}
  }
  for(let x=-85;x<=-55;x+=5){wood.box([x,.2,392],[.4,4.4,.4],'#705d4b');wood.box([x,2.1,398],[.15,1.2,.15],'#cdb795');}
  // Marina piers, bollards and moorings.
  wood.box([38,.8,333],[86,.35,5],'#9d8263');
  wood.box([-4,.8,314],[5,.35,43],'#a28a6c');
  for(const x of [8,25,42,59,76]){
    wood.box([x,.8,349],[2,.35,33],'#9d8263');
    for(const z of [337,347,357]){wood.box([x,-.1,z],[.4,3,.4],'#706151');details.add(new THREE.CylinderGeometry(.16,.2,.5,8),'#576c70',[x,1.2,z]);}
  }
  // A continuous stone breakwater: a walkable crest, parapet and compact sea-side armour.
  const random=seededRandom(804),length=Math.hypot(54,74),angle=Math.atan2(54,74);
  stone.box([147,.45,337],[6,1.5,length+6],'#9f9b87',[0,angle,0]);
  stone.box([147,1.28,337],[4.6,.18,length+6],'#d3c9b1',[0,angle,0]);
  for(const side of [-1,1]){
    stone.box([147+side*2.35*Math.cos(angle),1.7,337-side*2.35*Math.sin(angle)],[.4,.8,length+6],'#b6af9a',[0,angle,0]);
    for(let i=0;i<80;i++){
      const t=i/79,x=120+t*54+side*3.8*Math.cos(angle),z=300+t*74-side*3.8*Math.sin(angle);
      stone.add(new THREE.DodecahedronGeometry(1,1),['#8b8d80','#a4a493','#767d75'][i%3],[x+(random()-.5),-.1+random()*.2,z+(random()-.5)],[.8+random()*.5,.6+random()*.3,.9+random()*.5]);
    }
  }
  for(let i=0;i<=18;i++){
    const t=i/18;details.box([120+t*54,1.39,300+t*74],[4.2,.025,.045],'#8b8878',[0,angle,0]);
  }
  stone.add(new THREE.CylinderGeometry(7,9,1.6,24),'#acaa92',[174,.7,374]);
  for(let n=0;n<4;n++)details.add(new THREE.CylinderGeometry(2.2-n*.14,2.4-n*.14,3.2,20),n%2?'#c75a47':'#eee5cf',[174,2.8+n*3.2,374]);
  details.add(new THREE.CylinderGeometry(3.1,2.1,.7,20),'#d7d7c5',[174,14.2,374]);
  glass.add(new THREE.CylinderGeometry(1.85,1.85,2.2,12),'#82b2ba',[174,15.5,374]);
  details.add(new THREE.ConeGeometry(2.7,1.7,20),'#426879',[174,17.4,374]);
  lights.ellipsoid([174,15.5,374],[.65,.8,.65],'#ffe6ac');
  stone.box([91,.35,306],[14,.7,13],'#b0aa91');
  // Boathouse, bait hut and a shelter on the public promenade.
  for(const [x,z,w,d] of [[-32,296,12,9],[91,306,11,9],[-147,294,16,8]]){
    wood.box([x,2.1,z],[w,4.2,d],'#bdc4ae');
    details.box([x,4.5,z],[w+1,.3,d+1],'#4f7880');
    glass.box([x,2,z+d/2+.06],[w*.7,2,.1],'#597e88');
    for(const dx of [-w/2+.3,w/2-.3])wood.box([x+dx,2.2,z+d/2+2],[.16,4.3,.16],'#e0dbbd');
    details.box([x,4.35,z+d/2+1.2],[w+1,.16,3.2],'#c8ad79',[.12,0,0]);
  }
  // Benches, lights, bike stands and bins use shared merged geometry.
  for(let x=-230;x<=230;x+=22){
    wood.box([x,.9,286],[2.6,.18,.65],'#9c7957');wood.box([x,1.25,286.3],[2.6,.65,.12],'#9c7957');
    for(const side of [-1,1])details.box([x+side*.9,.55,286],[.12,.8,.55],'#4b6164');
    details.branch([x+8,.3,286],[x+8,5,286],.08,.055,'#526b72');
    lights.ellipsoid([x+8,5.15,286],[.28,.35,.28],'#ffe1a1');
    details.box([x+4,.8,286],[.6,1,.6],'#4d746a');
  }
  // Fishing rods, stools, buckets and float lines at the rail.
  for(const z of [351,363,377]){
    wood.box([-72,1.9,z],[.8,.65,.8],'#7d9686');
    details.branch([-73,2.5,z],[-78,4.4,z+1],.035,.012,'#424f59');
    details.branch([-78,4.4,z+1],[-79,-.05,z+1],.008,.008,'#b9c9c5',3);
    details.add(new THREE.CylinderGeometry(.27,.22,.45,10),'#cfbea1',[-71,1.85,z+.7]);
    lights.ellipsoid([-79,.04,z+1],[.09,.13,.09],'#d4674a');
  }
  // Piers make the existing railway's coastal extension read as a viaduct.
  for(let z=310;z<=790;z+=24)stone.box([RAIL_X+3.5,-2.4,z],[12,4.5,2.2],'#9b9b8e');
  return {beach:beach.finish(),stone:stone.finish(),wood:wood.finish(),details:details.finish(),glass:glass.finish(),lights:lights.finish()};
}
export function buildFishingBoat() {
  const hull=new ModelParts(),details=new ModelParts(),glass=new ModelParts();
  hull.ellipsoid([0,.08,0],[1.35,.75,3.3],'#31747c');
  hull.box([0,.44,-.15],[2.35,.15,4.4],'#d6c7a5');
  details.box([0,1.15,.7],[1.8,1.35,1.7],'#ece5cc');
  glass.box([0,1.4,1.58],[1.45,.7,.04],'#436e84');
  for(const s of [-1,1])glass.box([s*.91,1.35,.7],[.04,.7,1.3],'#436e84');
  details.box([0,1.9,.7],[2.1,.18,2],'#e3dcca');
  details.branch([0,1.8,.7],[0,4,.7],.06,.035,'#b5c6c6');
  details.branch([0,3.1,.7],[0,3.6,-1.8],.045,.04,'#9baeb0');
  for(const z of [-2,-1.2])details.box([.55,.75,z],[.7,.45,.6],'#c4a474');
  details.add(new THREE.TorusGeometry(.35,.09,6,12),'#e9b16a',[1.17,.7,-.5],[1,1,1],[0,Math.PI/2,0]);
  return {hull:hull.finish(),details:details.finish(),glass:glass.finish()};
}


/** A cabin cruiser or a sloop, shared across the harbour fleet. */
export function buildLeisureBoat(sail:boolean){
  const hull=new ModelParts(),details=new ModelParts(),glass=new ModelParts();
  const length=sail?5.4:7.8,width=sail?1.45:2;
  hull.ellipsoid([0,.15,0],[width,.8,length],sail?'#dce5dc':'#eee9dd');
  hull.box([0,.7,-.5],[width*1.65,.15,length*1.3],'#bfa17a');
  hull.box([0,.1,-.3],[width*1.96,.18,length*1.3],sail?'#547c86':'#426372');
  if(sail){
    details.branch([0,.7,.8],[0,10,.8],.07,.035,'#b4c3c6');
    details.branch([0,1.7,.8],[0,1.7,-3.8],.05,.05,'#7d9097');
    const canvas=new THREE.Shape([new THREE.Vector2(0,9.5),new THREE.Vector2(0,2),new THREE.Vector2(-4.2,2)]);
    const g=new THREE.ExtrudeGeometry(canvas,{depth:.035,bevelEnabled:false});g.rotateY(-Math.PI/2);
    details.add(g,'#f3ead5',[.05,0,.8]);
    const jib=new THREE.Shape([new THREE.Vector2(0,9),new THREE.Vector2(.2,2),new THREE.Vector2(3.8,1.5)]);
    const jg=new THREE.ExtrudeGeometry(jib,{depth:.03,bevelEnabled:false});jg.rotateY(-Math.PI/2);
    details.add(jg,'#dddac8',[-.06,0,.8]);
    glass.box([0,1.1,-.4],[1.2,.5,1.9],'#617e89');
  }else{
    details.box([0,1.4,.4],[3.1,1.4,5.4],'#e4e9e3');
    glass.box([0,1.7,3.15],[2.65,.8,.09],'#315d73',[.2,0,0]);
    for(const s of [-1,1]){
      glass.box([s*1.57,1.65,.5],[.06,.75,4.5],'#426c7d');
      details.branch([s*1.65,1,3],[s*1.3,1.35,5.5],.035,.035,'#b8c5c4');
    }
    details.box([0,2.25,.2],[3.5,.22,6.2],'#edf0df');
    details.box([0,2.6,-.5],[2,.55,2.3],'#b7c9c6');
    details.branch([0,2.8,-1],[0,4.3,-1],.07,.04,'#a6b9bf');
    details.box([0,4.3,-1],[1.4,.15,.3],'#e8ebdf');
  }
  for(const side of [-1,1])for(let z=-length*.65;z<length*.65;z+=1.4)details.branch([side*width*.92,.6,z],[side*width*.92,1.2,z],.025,.025,'#b7c4c3');
  return {hull:hull.finish(),details:details.finish(),glass:glass.finish()};
}

