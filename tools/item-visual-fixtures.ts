import {writeFileSync,mkdirSync} from 'node:fs';
import {newGame} from '../src/empire/newGame';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {unityFrame} from '../src/unity/bridge';
import {dishVisual,retailVisual} from '../src/unity/itemVisuals';
import {restaurantCatalog,RESTAURANT_TYPES} from '../src/data/restaurantCatalogs';
import {RECIPES} from '../src/data/recipes';
import {RETAIL_PRODUCTS} from '../src/empire/retail';
const folder='artifacts/item-visuals';mkdirSync(folder,{recursive:true});
const meals=[...new Map([...RECIPES,...RESTAURANT_TYPES.flatMap(t=>restaurantCatalog(t.id).recipes)].map(r=>[r.id,dishVisual(r)])).values()];
writeFileSync(`${folder}/catalog.json`,JSON.stringify({meals,stock:RETAIL_PRODUCTS.map(p=>({id:p.id,category:p.category,...retailVisual(p),quantity:10,capacity:20,floor:0}))}));
const e=newGame('sandbox'),view={floor:0,detail:'room',area:'center',cutaway:true};
for(const focus of ['diner','shop','apartments','park']){
 const f=unityFrame({state:INITIAL_STATE,restaurants:e.restaurants,district:e.district,worldProgress:2,focus,selected:null},view);
 if(focus==='diner'){
  for(let n=0;n<f.tables.length;n++)f.tables[n].meals=[meals.find(m=>m.kind===['burger','pizza','sushi','pasta'][n%4])!];
 }
 writeFileSync(`${folder}/${focus}.json`,JSON.stringify(f));
}
