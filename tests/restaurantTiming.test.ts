import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame,type GameState} from '../src/hooks/useGameLoop';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {createEmpire,advanceEmpire,setEmpireSpeed} from '../src/empire/empire';

import {basePreparationSeconds} from '../src/restaurantTiming';
import {RESTAURANT_TYPES,type RestaurantType} from '../src/data/restaurantCatalogs';
import {recipeStation} from '../src/career/restaurant';

const ticket = (type:RestaurantType='italian',count=4):GameState => {
 const r=chooseRestaurantType(structuredClone(INITIAL_STATE),type);
 r.phase='service';r.isRestaurantOpen=false;
 r.customers=[{id:'guest',tableId:'t1',state:'waiting_food',patience:300,maxPatience:100,actionTimer:0,currentBill:40,isVIP:false,vipBonus:0,partySize:2,tipModifier:0}];
 r.tables[0].customerId='guest';
 r.orders=Array.from({length:count},(_,i)=>({id:`o${i}`,customerId:'guest',tableId:'t1',recipeId:r.activeMenu[0],state:'pending',progress:0,isOnFire:false,price:10}));
 return r;
};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('every restaurant type prepares a normal four-dish ticket within one compressed day',()=>{
 for(const {id} of RESTAURANT_TYPES){
  let r=ticket(id);const recipe=r.recipes.find(p=>p.id===r.activeMenu[0])!;
  let seconds=0;while(r.orders.some(o=>o.state!=='ready')&&seconds<26){r=advanceGame(r,.1);seconds+=.1;}
  assert.ok(r.orders.every(o=>o.state==='ready'),`${id} exceeded a game day`);
  assert.ok(Math.abs(seconds-basePreparationSeconds(recipe)*4)<.11,`${id}: ${seconds}s`);
 }
});

test('1×, 2× and 5× advance cooking, waiter routes, patience and wages by the same service time',()=>{
 const run=(speed:number)=>{
  let r=ticket('italian');r.staff.waiters=1;
  r.waiterEntities=[{id:'waiter',state:'idle',x:0,y:-7,stamina:100,targetTableId:null,targetCustomerId:null,targetOrderId:null}];
  for(let frame=0;frame<120/speed;frame++)r=advanceGame(r,.1*speed);
  return r;
 };
 const normal=run(1);
 for(const speed of [2,5]){
  const fast=run(speed);
  near(fast.time,normal.time);near(fast.weekStats.wages,normal.weekStats.wages);
  assert.deepEqual(fast.orders,normal.orders);
  assert.deepEqual(fast.customers,normal.customers);
  assert.deepEqual(fast.waiterEntities,normal.waiterEntities);
 }
});

test('real elapsed preparation is five times shorter at 5× in both week-length modes',()=>{
 for(const weekMinutes of [3,14] as const){
  const finish=(speed:number)=>{
   let e=createEmpire(ticket('italian',2));e.settings={mode:'career',weekMinutes,guide:true};
   e=setEmpireSpeed(e,speed);let realSeconds=0;
   while(e.restaurants.diner.orders.some(o=>o.state!=='ready')&&realSeconds<150){e=advanceEmpire(e,.1*speed,advanceGame);realSeconds+=.1;}
   assert.ok(e.restaurants.diner.orders.every(o=>o.state==='ready'));
   return realSeconds;
  };
  assert.ok(Math.abs(finish(5)*5-finish(1))<.6);
 }
 const paused=setEmpireSpeed(createEmpire(ticket()),0);
 assert.equal(advanceEmpire(paused,1,advanceGame),paused);
 const planning=chooseRestaurantType(structuredClone(INITIAL_STATE),'diner');
 assert.equal(advanceGame(planning,5),planning);
});

test('faster preparation still shares finite chef capacity and respects damaged stations and fire',()=>{
 const r=ticket('bistro',2);r.advanced={schedules:[],stations:{grill:100,oven:100,cold:100,drinks:100},catering:[],terrace:false,lastDay:1,notice:''};
 const recipe=r.recipes.find(p=>p.id===r.activeMenu[0])!,station=recipeStation(recipe);
 const early=advanceGame(r,.1);
 assert.ok(early.orders[0].progress>0);assert.equal(early.orders[1].progress,0);
 const broken=structuredClone(r);broken.advanced!.stations[station]=0;
 assert.ok(advanceGame(broken,5).orders.every(o=>o.progress===0));
 const noChef={...r,chefEntities:[],staff:{...r.staff,chefs:0}};
 assert.ok(advanceGame(noChef,5).orders.every(o=>o.progress===0));
 const fire=structuredClone(r);fire.orders[0].isOnFire=true;
 assert.equal(advanceGame(fire,1).orders[0].progress,0);
 assert.equal(r.orders[0].progress,0,'previous state remains unchanged');
});
