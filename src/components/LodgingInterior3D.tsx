import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ModelParts,Vec3} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture} from '../graphics/surfaceMaterials';
import {Furnishing,LodgingLayout} from '../empire/lodgingLayout';

/** All solid details fit inside the same footprints used by the walking planner. */
export function lodgingFurnitureGeometry(layout:LodgingLayout){
  const m=new ModelParts();
  for(const item of layout.items){
    const {x,z,w,d,h,yaw,kind}=item,c=Math.cos(yaw),s=Math.sin(yaw),wood=item.color??'#8b7059',fabric=layout.kind==='hotel'?'#9a8b7c':'#818b98';
    const at=(a:number,b:number,k:number):Vec3=>[x+a*c+k*s,b,z-a*s+k*c];
    const box=(a:number,b:number,k:number,width:number,height:number,depth:number,color:string)=>m.box(at(a,b,k),[width,height,depth],color,[0,yaw,0]);
    const round=(a:number,b:number,k:number,width:number,height:number,depth:number,color:string,r=.05)=>m.add(new RoundedBoxGeometry(width,height,depth,1,Math.min(r,width/4,height/4,depth/4)),color,at(a,b,k),[1,1,1],[0,yaw,0]);
    const branch=(from:Vec3,to:Vec3,r:number,color:string)=>m.branch(at(...from),at(...to),r,r,color,8);
    const oval=(a:number,b:number,k:number,scale:Vec3,color:string)=>m.add(new THREE.SphereGeometry(1,12,8),color,at(a,b,k),scale,[0,yaw,0]);
    const legs=(height:number)=>{for(const a of [-w*.38,w*.38])for(const k of [-d*.36,d*.36])box(a,height/2,k,.065,height,.065,'#51463c');};
    if(kind==='wall'){
      box(0,h/2,0,w,h,d,'#e5e0d7');box(0,.07,0,w+.025,.14,d+.025,'#a99781');
      if(h<2)box(0,h+.025,0,w+.045,.05,d+.045,'#f2eee7');
    }else if(kind==='bed'&&layout.kind==='apartments'){
      // Domestic low bed, patterned duvet and a throw; hotels use tall matching
      // headboards, white linen and a coordinated runner below.
      legs(.2);box(0,.27,0,w,.25,d,'#b6a084');round(0,.47,.03,w-.04,.2,d-.1,'#eeeadf');
      round(0,.69,-d/2+.07,w,.95,.13,'#aa9276');
      round(0,.62,.35,w,.16,d*.72,item.color??'#829391');
      for(let k=-d*.18;k<d*.43;k+=.24)box(0,.708,k,w*.97,.012,.016,'#d7d4c8');
      for(const a of [-w*.24,w*.24])round(a,.67,-d*.33,w*.43,.19,.55,'#ddd8c9');
      round(w*.2,.75,d*.29,w*.35,.055,.55,'#d0ad78');
    }else if(kind==='bed'){
      legs(.24);round(0,.32,0,w-.06,.32,d-.08,'#66513f');round(0,.57,.04,w-.06,.22,d-.14,'#eeeae3');
      box(0,1.13,-d/2+.07,w,2.16,.14,'#64554c');box(0,1.84,-d/2+.16,w*.65,.49,.025,'#c9b999');box(0,1.84,-d/2+.18,w*.58,.42,.016,'#a8b4b2');
      for(const a of [-w*.25,w*.25]){round(a,.75,-d*.31,w*.43,.18,.6,'#fffdf8',.08);round(a,.94,-d*.4,w*.43,.32,.15,'#d6c9ba',.04);}
      round(0,.735,.42,w,.17,d*.68,'#f4f0e8',.07);box(0,.832,d*.31,w,.025,.55,layout.kind==='hotel'?'#6f7d83':'#b39070');
      for(const a of [-w*.4,w*.4])box(a,.835,.38,.012,.01,d*.55,'#ded8ce');
    }else if(kind==='sofa'){
      legs(.22);round(0,.35,0,w,.32,d,'#656463');round(0,.76,-d*.4,w,.72,d*.2,fabric);
      for(const a of [-w*.45,w*.45])round(a,.65,0,w*.1,.53,d,fabric);
      for(const a of [-w*.22,w*.22]){round(a,.57,.03,w*.41,.22,d*.73,layout.kind==='hotel'?'#a4a5a1':'#697f91');round(a,.82,-d*.25,w*.34,.43,.18,layout.kind==='hotel'?'#b6b0a6':'#8397a6');}
      round(-w*.3,.82,.07,.37,.3,.19,'#b99d7b');
    }else if(kind==='table'){
      legs(h-.1);round(0,h-.06,0,w,.12,d,'#ae9273',.03);
      if(h<.6){box(-w*.15,h+.025,0,w*.35,.055,d*.4,'#e7dfd2');box(-w*.13,h+.058,0,w*.32,.012,d*.36,'#747c7c');oval(w*.25,h+.13,0,[.1,.13,.1],'#c6b9a0');}
      else if(w>1.4){box(0,h+.15,-d*.24,.5,.3,.035,'#343d42');box(0,h+.02,.03,.47,.035,.19,'#565d60');}
    }else if(kind==='chair'){
      legs(.44);round(0,.48,0,w,.13,d*.9,fabric);round(0,.78,-d*.41,w,.47,.12,fabric);
    }else if(kind==='reception'){
      box(0,.56,0,w,1.1,d,'#8a725c');box(0,.09,0,w,.16,d+.02,'#564a3f');
      for(let a=-w/2+.15;a<w/2;a+=.22)box(a,.62,d/2+.01,.035,.95,.025,'#b39774');
      round(0,h,0,w,.13,d,'#e7e1d7');
      for(const a of [-w*.24,w*.22]){box(a,h+.28,-.15,.62,.4,.06,'#303a3e');box(a,h+.08,-.15,.08,.15,.07,'#9b9c98');box(a,h+.07,-.37,.55,.03,.22,'#3d4141');}
      oval(w*.42,h+.1,.1,[.09,.07,.09],'#b89953');
    }else if(kind==='minibar'){
      box(0,h/2,0,w,h,d,'#66584c');box(0,h,0,w,.07,d,'#c4b499');box(-w*.22,h*.45,d/2+.012,w*.4,h*.7,.02,'#343e42');
      box(0,h+.055,0,w*.8,.04,d*.8,'#4e4942');oval(-w*.2,h+.25,0,[.14,.2,.14],'#b6bdbb');
      for(const a of [w*.12,w*.32])m.add(new THREE.CylinderGeometry(.075,.06,.14,10),'#f0ece3',at(a,h+.14,0));
    }else if(kind==='media'){
      legs(.12);box(0,.32,0,w,.4,d,'#baa587');box(0,.32,d/2+.008,w-.12,.22,.025,'#5c554e');
      for(let i=0;i<5;i++)box(-w*.34+i*.105,.31,d*.3,.075,.19,.16,['#827263','#c0b29a','#788987'][i%3]);
      box(0,.64,0,.07,.25,.09,'#363c3e');box(0,.99,0,w*.88,.68,.065,'#30383c');box(0,.99,.04,w*.8,.59,.012,'#506777');
    }else if(kind==='mailboxes'||kind==='parcels'){
      box(0,h/2,0,w,h,d,'#aaa99f');
      const columns=kind==='mailboxes'?6:2,rows=kind==='mailboxes'?3:4;
      for(let i=0;i<columns;i++)for(let j=0;j<rows;j++){
        const a=-w/2+(i+.5)*w/columns,y=(j+.5)*h/rows;
        box(a,y,d/2+.012,w/columns-.035,h/rows-.035,.02,'#7c8589');box(a,y+.08,d/2+.026,w/columns*.5,.025,.012,'#39474b');box(a,y-.06,d/2+.026,.05,.05,.016,'#d8d4c8');
      }
    }else if(kind==='cabinet'||kind==='fridge'){
      box(0,h/2,0,w,h,d,kind==='fridge'?'#c4c7c7':wood);
      box(0,h*.48,d/2+.008,.012,h*.94,.01,'#564c43');
      for(const a of [-.075,.075])box(a,h*.55,d/2+.018,.025,Math.min(.28,h*.4),.025,'#c1b9aa');
      if(h<.7){box(0,h*.56,d/2+.013,w-.04,.013,.01,'#5f5246');branch([0,h,0],[0,h+.43,0],.025,'#978161');m.add(new THREE.ConeGeometry(.18,.25,12),'#e9dbc3',at(0,h+.48,0));}
      if(kind==='fridge')box(0,h*.72,d/2+.01,w,.018,.02,'#8f9697');
    }else if(kind==='kitchen'){
      box(0,.44,0,w,.86,d,'#9b9a90');box(0,h,0,w,.09,d,'#e8e4da');
      for(let a=-w/2+.6;a<w/2;a+=.7){box(a,.47,d/2+.012,.012,.78,.02,'#6e746f');box(a-.12,.72,d/2+.03,.18,.025,.025,'#d4d4cb');}
      box(-w*.27,h+.05,0,.72,.015,d*.7,'#bfc6c5');box(-w*.27,h+.059,0,.56,.02,d*.48,'#6c7f81');
      branch([-w*.27,h+.08,-d*.3],[-w*.27,h+.38,-d*.3],.025,'#c0c4c2');branch([-w*.27,h+.38,-d*.3],[-w*.27,h+.38,0],.025,'#c0c4c2');
      box(w*.23,h+.055,0,.8,.02,d*.8,'#343b3c');for(const a of [w*.23-.2,w*.23+.2])for(const k of [-.17,.17])m.add(new THREE.CylinderGeometry(.11,.11,.012,12),'#666d6e',at(a,h+.075,k));
      box(0,1.95,-d*.24,w,.65,d*.52,'#d3c9b9');
      if(layout.kind==='apartments'){
        // Washing machine integrated under the worktop, dishes and breakfast mugs.
        box(w*.4,.47,d/2+.015,w*.18,.78,.025,'#e2e3df');
        m.add(new THREE.CylinderGeometry(.22,.22,.025,18),'#788890',at(w*.4,.42,d/2+.045),[1,1,1],[Math.PI/2,yaw,0]);
        for(let i=0;i<3;i++)m.add(new THREE.CylinderGeometry(.15,.15,.025,16),'#ece4d5',at(0,h+.07+i*.027,0));
      }
    }else if(kind==='shower'){
      box(0,.08,0,w,.14,d,'#efeee8');box(0,.16,0,w-.16,.025,d-.16,'#bdc5c6');
      for(const a of [-w/2+.045,w/2-.045])branch([a,.15,-d/2+.045],[a,h,-d/2+.045],.025,'#7d8b8d');
      box(0,h*.55,-d/2+.045,w-.08,h-.2,.04,'#bacccc');branch([0,1.2,-d*.4],[0,h-.2,-d*.4],.02,'#647e82');branch([0,h-.2,-d*.4],[0,h-.2,-d*.2],.02,'#647e82');oval(0,h-.22,-d*.2,[.13,.035,.13],'#617a7d');
    }else if(kind==='toilet'){
      round(0,.57,-d*.3,w*.9,.51,d*.3,'#e5e8e6');oval(0,.34,d*.13,[w*.43,.26,d*.39],'#f4f4ef');oval(0,.55,d*.13,[w*.42,.065,d*.36],'#fffdf9');box(0,.84,-d*.3,.09,.015,.06,'#a2abaa');
    }else if(kind==='vanity'){
      box(0,h*.44,0,w,h*.8,d,'#aa9b84');box(0,h,0,w,.09,d,'#edece6');oval(0,h+.08,.01,[w*.38,.08,d*.37],'#f5f4ef');branch([0,h,-d*.3],[0,h+.28,-d*.3],.024,'#7f9194');box(0,h+.62,-d*.46,w*.9,.75,.05,'#8eabad');box(0,h+.62,-d*.44,w*.8,.65,.018,'#c5d4d4');
    }else if(kind==='elevator'){
      box(0,h/2,0,w,h,d,'#736b63');box(0,h/2,d/2+.008,w-.25,h-.16,.02,'#b2b8b8');box(0,h/2,d/2+.026,.025,h-.16,.012,'#515e60');box(w*.4,1.1,d/2+.03,.1,.22,.02,'#394449');box(0,h-.21,d/2+.03,.4,.12,.02,'#34454a');
    }else if(kind==='door'){
      box(0,h/2,0,w,h,d,'#917960');box(w/2+.018,1,d*.3,.04,.06,.16,'#bdad8b');
    }else if(kind==='plant'){
      m.add(new THREE.CylinderGeometry(w*.4,w*.3,h*.32,12),'#c3b6a3',at(0,h*.16,0));
      branch([0,.3,0],[0,h*.88,0],.025,'#807655');for(let i=0;i<6;i++){const a=Math.sin(i*2.4)*w*.23,k=Math.cos(i*2.4)*d*.23;oval(a,h*.48+i*.055,k,[w*.18,h*.19,d*.17],i%2?'#66785d':'#536c58');}
    }else if(kind==='luggage'||kind==='cart'){
      if(kind==='cart'){box(0,.18,0,w,.12,d,'#9c917d');for(const a of [-w*.4,w*.4]){branch([a,.15,-d*.4],[a,h,-d*.4],.03,'#b2a17c');branch([a,h,-d*.4],[a,h,d*.3],.03,'#b2a17c');}}
      round(0,kind==='cart'?.65:h/2,0,w*.8,kind==='cart'?.8:h*.8,d*.75,'#5f6c76');box(0,kind==='cart'?1.1:h*.94,0,w*.35,.07,.05,'#3f484d');
    }else if(kind==='treadmill'){
      box(0,.15,0,w,.27,d,'#717b7f');box(0,.29,0,w*.7,.02,d*.85,'#303a3e');for(const a of [-w*.42,w*.42])branch([a,.1,-d*.35],[a,h,-d*.35],.045,'#a5adae');box(0,h,-d*.35,w,.18,.36,'#4e5d63');
    }
  }
  return m.finish();
}

export function LodgingInterior3D({layout,name,isNight}:{layout:LodgingLayout;name:string;isNight:boolean}){
  const geometry=useMemo(()=>lodgingFurnitureGeometry(layout),[layout]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.72}/></mesh>
    {layout.finishes.map((f,i)=><mesh key={i} position={[f.x,.012+i*.0005,f.z]} rotation={[-Math.PI/2,0,0]} receiveShadow material={f.surface==='carpet'?undefined:getSurfaceMaterial(f.surface==='wood'?'wood':'concrete',f.color,f.w/2,f.d/2)}><planeGeometry args={[f.w,f.d]}/>{f.surface==='carpet'&&<meshStandardMaterial color={f.color} roughness={1}/>}</mesh>)}
    {(layout.floor===0?[-7.1,-2.3,2.3,7.1]:layout.kind==='hotel'?[-6,6]:[-7.15,-1.25,4.65]).map(x=><group key={x} position={[x,1.85,-9.84]}>
      <mesh><boxGeometry args={[2.4,1.85,.12]}/><meshStandardMaterial color="#7e7971"/></mesh>
      <mesh position={[0,0,.08]}><boxGeometry args={[2.24,1.7,.04]}/><meshStandardMaterial color={isNight?'#354355':'#b0c6ce'} roughness={.16} metalness={.28}/></mesh>
      {[-1,1].map(side=><group key={side}><mesh position={[side*.59,0,.12]}><boxGeometry args={[.025,1.75,.025]}/><meshStandardMaterial color="#e0dbd2"/></mesh><mesh position={[side*1.12,-.14,.24]}><boxGeometry args={[.35,2.35,.15]}/><meshStandardMaterial color="#c1b4a1" roughness={1}/></mesh></group>)}
    </group>)}
    {layout.floor===0&&<mesh position={[-3,2.5,-9.7]}><planeGeometry args={[4.5,.45]}/><meshBasicMaterial map={getSignTexture(name.toUpperCase())} transparent/></mesh>}
    {layout.rooms.map(room=><group key={room.index} position={[room.door.x,2.5,room.door.z]}>
      <mesh position={[0,.06,0]}><boxGeometry args={layout.kind==='hotel'?[.18,.12,1.82]:[1.82,.12,.18]}/><meshStandardMaterial color="#9c8870"/></mesh>
      {[-1,1].map(side=><mesh key={side} position={layout.kind==='hotel'?[0,-1.2,side*.91]:[side*.91,-1.2,0]}><boxGeometry args={[.1,2.45,.1]}/><meshStandardMaterial color="#a38c73"/></mesh>)}
    </group>)}
    {isNight&&<pointLight position={[0,3.8,1]} color="#ffe0b1" intensity={22} distance={19} decay={2}/>}
  </>;
}
