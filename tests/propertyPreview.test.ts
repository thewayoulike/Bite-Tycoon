import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,transact,serve,order,hire,hireManager,toggleItem,upgrade,clean,transfer,repay,nextDay,financials,wages,PROPERTIES,type Demo,buyIngredient,unlockRecipe,toggleRecipe} from '../src/preview/model';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} must equal ${b}`);
function balanced(s:Demo){for(const p of PROPERTIES){const f=financials(s,p.id);close(f.assets,f.liabilities+f.equity);close(f.closingCash,s.businesses[p.id].cash);}}
test('restaurant preview keeps the full recipe collection and consumes real ingredients at FIFO purchase cost',()=>{
 let s=createDemo();assert.ok(s.businesses.diner.food!.recipes.length>100);
 s=transact(s,'diner',b=>buyIngredient(b,'water',100,.2));s=transact(s,'diner',b=>buyIngredient(b,'coffee_bean',50,.1));
 for(let i=0;i<31;i++)s=transact(s,'diner',b=>serve(b,'diner','coffee_black'));
 close(s.businesses.diner.cogs,30*1.1+.9+.08);assert.equal(s.businesses.diner.food!.inventory.coffee_bean,49);balanced(s);
 const recipe=s.businesses.diner.food!.recipes.find(r=>!r.unlocked)!;
 s=transact(s,'diner',b=>unlockRecipe(b,recipe.id));s=transact(s,'diner',b=>toggleRecipe(b,recipe.id));
 assert.ok(s.businesses.diner.food!.activeMenu.includes(recipe.id));assert.ok(!s.businesses.cafe.food!.activeMenu.includes(recipe.id));balanced(s);
});
test('all seven preview properties have isolated accounts and balanced books after trading, purchases and loans',()=>{
 let s=createDemo();assert.equal(Object.keys(s.businesses).length,7);balanced(s);
 const dinerBefore=s.businesses.diner.cash;
 s=transact(s,'shop',b=>serve(b,'shop','apples'));close(s.businesses.shop.cash,25003);close(s.businesses.diner.cash,dinerBefore);
 s=transact(s,'shop',b=>order(b,'coffee'));s=transact(s,'shop',b=>hire(b,0));s=transact(s,'shop',upgrade);s=transact(s,'shop',b=>clean(b));balanced(s);
 s=transfer(s,'diner','shop',1000);close(s.businesses.diner.cash,24000);close(financials(s,'shop').payable,1000);balanced(s);
 s=repay(s,0);close(s.businesses.diner.cash,25000);close(financials(s,'shop').payable,0);balanced(s);
 const original=structuredClone(s);s=transfer(s,'diner','diner',500);assert.deepEqual(s.businesses,original.businesses);
});
test('purchasing manager orders selected products within its own budget and reserve',()=>{
 let s=createDemo();s=transact(s,'shop',hireManager);s=transact(s,'shop',b=>toggleItem(b,'coffee'));
 assert.equal(s.businesses.shop.items.find(i=>i.id==='coffee')!.stock,24);
 assert.equal(s.businesses.shop.items.find(i=>i.id==='soap')!.stock,0);
 close(s.businesses.shop.spent,120);close(s.businesses.shop.cash,24630);close(s.businesses.cafe.cash,25000);
 s=transact(s,'shop',b=>toggleItem(b,'soap'));assert.ok(s.businesses.shop.spent<=150);balanced(s);
 s=transact(s,'shop',b=>{b.reserve=b.cash;return toggleItem(b,'flowers');});assert.equal(s.businesses.shop.items.find(i=>i.id==='flowers')!.stock,0);balanced(s);
});
test('occupied hotel rooms block arrivals until checkout and cleaning',()=>{
 let s=createDemo();for(let i=0;i<8;i++)s=transact(s,'hotel',b=>serve(b,'hotel',i%4===3?'suite':'standard'));
 assert.equal(s.businesses.hotel.units.filter(u=>u.occupied).length,8);const before=s.businesses.hotel.cash;
 s=transact(s,'hotel',b=>serve(b,'hotel'));close(s.businesses.hotel.cash,before);
 s=transact(s,'hotel',b=>{b.units[0].occupied=false;b.units[0].dirty=true;return 'Checkout';});
 s=transact(s,'hotel',b=>serve(b,'hotel'));close(s.businesses.hotel.cash,before);
 s=transact(s,'hotel',b=>clean(b,0));s=transact(s,'hotel',b=>serve(b,'hotel','standard'));close(s.businesses.hotel.cash,before-15+85);balanced(s);
});
test('weekly tenant rent and wages remain separate, with wages paid on the next week day four',()=>{
 let s=createDemo();s=transact(s,'apartments',b=>serve(b,'apartments','studio'));
 for(let i=0;i<7;i++)s=nextDay(s);assert.equal(s.week,2);assert.equal(s.day,1);
 close(s.businesses.apartments.revenue,360);close(s.businesses.diner.wages,wages(s.businesses.diner));close(s.businesses.diner.paidWages,0);balanced(s);
 s=nextDay(nextDay(s));assert.equal(s.day,3);close(s.businesses.diner.cash,25000);
 s=nextDay(s);assert.equal(s.day,4);close(s.businesses.diner.cash,24910);close(s.businesses.diner.paidWages,90);assert.equal(s.payroll.length,0);balanced(s);
});
