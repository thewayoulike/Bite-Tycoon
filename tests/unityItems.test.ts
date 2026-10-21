import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/empire/newGame';
import {unityFrame} from '../src/unity/bridge';
import {dishVisual,retailVisual} from '../src/unity/itemVisuals';
import {restaurantCatalog,RESTAURANT_TYPES} from '../src/data/restaurantCatalogs';
import {RETAIL_PRODUCTS} from '../src/empire/retail';
const view={floor:0,detail:'room',area:'center',cutaway:true};
test('served dish identities follow the delivered order, survive exterior viewing and clear on departure',()=>{
 const e=newGame('sandbox'),r=e.restaurants.diner,t=r.tables[0],recipe=r.recipes[0];
 r.customers=[{id:'test',tableId:t.id,state:'waiting_food',partySize:2,patience:80,maxPatience:100,actionTimer:0,currentBill:0,isVIP:false,vipBonus:0,servedRecipeIds:[]}];t.customerId='test';
 const input={state:r,restaurants:e.restaurants,district:e.district,focus:'diner',selected:null,worldProgress:0};
 assert.deepEqual(unityFrame(input,view).tables[0].meals,[]);
 r.customers[0].state='eating';r.customers[0].servedRecipeIds=[recipe.id,recipe.id];
 const before=structuredClone(e),frame=unityFrame(input,view);
 assert.deepEqual(frame.tables[0].meals,[dishVisual(recipe),dishVisual(recipe)]);
 assert.deepEqual(frame.frontages.find(f=>f.id==='diner')!.tables[0].meals,frame.tables[0].meals);
 assert.deepEqual(e,before);
 r.customers[0].state='leaving';assert.deepEqual(unityFrame(input,view).tables[0].meals,[]);
 r.customers[0].state='eating';t.isDirty=true;assert.deepEqual(unityFrame(input,view).tables[0].meals,[]);
});
test('all menu items and retail products carry usable visual identities',()=>{
 for(const type of RESTAURANT_TYPES)for(const r of restaurantCatalog(type.id).recipes){const v=dishVisual(r);assert.ok(v.kind);assert.equal(v.name,r.name);assert.deepEqual(v.ingredients,Object.keys(r.ingredients));}
 for(const p of RETAIL_PRODUCTS){const v=retailVisual(p);assert.ok(v.form);assert.equal(v.name,p.name);}
 const diner=restaurantCatalog('diner').recipes;
 assert.equal(dishVisual(diner.find(r=>r.name==='Diner cheeseburger')!).kind,'burger');
 assert.equal(dishVisual(diner.find(r=>r.name==='French fries basket')!).kind,'fries');
 assert.equal(dishVisual(diner.find(r=>r.name==='Vanilla diner milkshake')!).kind,'drink');
});
test('two-floor supermarkets send separate physical shell and open-floor counts',()=>{
 const e=newGame('sandbox'),r=e.restaurants.diner;
 const f=unityFrame({state:r,restaurants:e.restaurants,district:e.district,focus:null,selected:null,worldProgress:0},view);
 assert.equal(f.properties.find(p=>p.id==='shop')!.floors,2);
 assert.equal(f.properties.find(p=>p.id==='shop')!.exteriorFloors,1);
 assert.ok(f.frontages.find(p=>p.id==='shop')!.stock.every(s=>s.form&&s.name));
});
