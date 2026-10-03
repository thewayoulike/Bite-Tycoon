import * as THREE from 'three';
import { RECIPES } from '../data/recipes';
import {restaurantCatalog,RESTAURANT_TYPES} from '../data/restaurantCatalogs';
import { ModelParts } from './modelParts';

export type FoodKind = 'burger'|'pizza'|'fries'|'hotdog'|'sushi'|'salad'|'steak'|'chicken'|'sandwich'|'bowl'|'coffee'|'drink';
const recipes = new Map([...RECIPES,...RESTAURANT_TYPES.flatMap(t=>restaurantCatalog(t.id).recipes)].map(recipe=>[recipe.id,recipe]));
export function getFoodKind(recipeId: string): FoodKind {
  const name = `${recipeId} ${recipes.get(recipeId)?.name ?? ''}`.toLowerCase();
  if (/burger/.test(name)) return 'burger';
  if (/pizza/.test(name)) return 'pizza';
  if (/fries/.test(name)) return 'fries';
  if (/hotdog|hot dog/.test(name)) return 'hotdog';
  if (/sushi/.test(name)) return 'sushi';
  if (/coffee|espresso|cappuccino|latte|flat white|mocha|affogato/.test(name)) return 'coffee';
  if (/juice|soda|milkshake|lemonade|cola|cooler|slush|spritzer|\btea\b/.test(name)) return 'drink';
  if (/salad/.test(name)) return 'salad';
  if (/sandwich|wrap|bread/.test(name)) return 'sandwich';
  if (/bucket|chicken bites|tempura/.test(name)) return 'chicken';
  if (/wagyu|steak|surf.turf/.test(name) && !/pasta|bowl/.test(name)) return 'steak';
  return 'bowl';
}
const models = new Map<FoodKind,THREE.BufferGeometry>();
export const foodMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68});
export function getFoodModel(kind: FoodKind) {
  if (models.has(kind)) return models.get(kind)!;
  const m = new ModelParts();
  const disk = (radius:number,height:number,y:number,color:string,x=0,z=0) =>
    m.add(new THREE.CylinderGeometry(radius,radius*.96,height,24),color,[x,y,z]);
  m.add(new THREE.LatheGeometry([[0,.012],[.19,.012],[.26,.03],[.295,.051],[.29,.065],[.25,.047],[0,.033]].map(([x,y])=>new THREE.Vector2(x,y)),28),'#eee9db');
  if (kind === 'burger') {
    disk(.174,.043,.065,'#c5863d'); disk(.166,.032,.107,'#573225');
    for (let i=0;i<7;i++) {const a=i*6.28/7;m.ellipsoid([Math.cos(a)*.1,.129,Math.sin(a)*.1],[.1,.012,.062],i%2?'#83a946':'#638b3f');}
    disk(.158,.018,.148,'#bb4b35');
    m.box([0,.161,0],[.252,.012,.252],'#ecc350',[0,.3,0]);
    m.add(new THREE.SphereGeometry(.176,20,12,0,Math.PI*2,0,Math.PI/2),'#d8a14e',[0,.178,0],[1,.7,1]);
    for(let i=0;i<12;i++){const a=i*2.399,r=.04+(i%3)*.045;m.ellipsoid([Math.cos(a)*r,.178+Math.sqrt(.176**2-r**2)*.71,Math.sin(a)*r],[.007,.003,.017],'#f5dc9b');}
  } else if (kind === 'fries') {
    for(let i=0;i<15;i++)m.box([((i%5)-2)*.054,.066+Math.floor(i/5)*.034,Math.sin(i*8)*.07],[.034,.033,.21+(i%3)*.025],i%3?'#e8bc58':'#c99639',[0,Math.sin(i)*.28,0]);
    disk(.047,.025,.058,'#ddd6c5',.19,.15);disk(.039,.008,.075,'#a83c28',.19,.15);
  } else if(kind === 'pizza') {
    disk(.248,.033,.065,'#bf8548');disk(.224,.009,.086,'#b74832');disk(.213,.012,.097,'#edc55e');
    for(let i=0;i<8;i++){const a=i*2.399,r=.06+(i%2)*.092;disk(.031,.007,.109,'#c45b3d',Math.cos(a)*r,Math.sin(a)*r);m.ellipsoid([Math.cos(a+.8)*r,.115,Math.sin(a+.8)*r],[.014,.005,.032],'#588747');}
  } else if(kind === 'hotdog' || kind === 'sandwich') {
    if(kind==='hotdog') {
      for(const side of [-1,1])m.ellipsoid([side*.055,.107,0],[.079,.065,.219],'#d4a058');
      m.ellipsoid([0,.147,0],[.052,.052,.206],'#a75034');
      for(let i=0;i<8;i++)m.ellipsoid([Math.sin(i*2)*.021,.193,-.15+i*.042],[.026,.005,.018],'#ecc350');
    } else {
      m.box([0,.079,0],[.32,.04,.26],'#ca9858');m.box([0,.108,0],[.315,.014,.25],'#6e9545');
      m.box([0,.128,0],[.3,.02,.245],'#b5573d');m.box([0,.148,0],[.312,.01,.255],'#e7bf59');
      m.box([0,.181,0],[.32,.045,.26],'#e0bc7c');
    }
  } else if(kind === 'sushi') {
    for(let i=0;i<4;i++){const x=(i%2-.5)*.19,z=(Math.floor(i/2)-.5)*.19;disk(.076,.1,.101,'#304235',x,z);disk(.066,.01,.159,'#f1e7c8',x,z);disk(.028,.012,.166,'#d98a66',x,z);m.box([x+.025,.172,z],[.022,.01,.027],'#7f9d50');}
  } else if(kind === 'coffee' || kind === 'drink') {
    m.add(new THREE.CylinderGeometry(.103,.077,.23,20),kind==='coffee'?'#e2d6b8':'#ddab56',[0,.163,0]);
    disk(.095,.012,.285,kind==='coffee'?'#533726':'#f0c368');
    if(kind==='coffee')m.add(new THREE.TorusGeometry(.055,.014,6,16),'#e2d6b8',[.106,.174,0]);
    else m.branch([.036,.28,-.016],[.08,.43,-.04],.009,.009,'#f0e9cf');
  } else if(kind==='steak' || kind==='chicken') {
    m.ellipsoid([-.04,.09,0],[.162,.051,.115],kind==='steak'?'#89503b':'#bb843c');
    for(let i=0;i<4;i++)m.box([-.12+i*.05,.139,0],[.012,.004,.145],'#523c2d',[0,.3,0]);
    for(let i=0;i<5;i++)m.ellipsoid([.13+Math.sin(i)*.038,.087,.12-i*.055],[.039,.024,.045],i%2?'#7f9d4d':'#d6b369');
  } else {
    m.add(new THREE.LatheGeometry([[0,.045],[.12,.045],[.2,.12],[.24,.2],[.23,.211],[.19,.138],[0,.09]].map(([x,y])=>new THREE.Vector2(x,y)),24),'#d9e4da');
    disk(.197,.015,.152,kind==='salad'?'#779955':'#be8c4b');
    for(let i=0;i<14;i++){const a=i*2.399,r=.03+(i%4)*.042;m.ellipsoid([Math.cos(a)*r,.174+(i%3)*.014,Math.sin(a)*r],[.047,.016,.033],kind==='salad'?(i%4===0?'#b9563c':i%2?'#639547':'#8fae59'):'#e5c674');}
    if(kind==='bowl'){m.ellipsoid([.09,.198,.04],[.065,.018,.081],'#eee6cc');m.ellipsoid([.09,.217,.04],[.031,.009,.035],'#dca334');}
  }
  const geometry=m.finish();models.set(kind,geometry);return geometry;
}

