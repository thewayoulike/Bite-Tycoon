import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,parseEmpireSave} from '../src/empire/empire';
import {advanceVenue} from '../src/empire/venueSimulation';
import {propertyById,finishWeek} from '../src/prototype/expansionModel';
import {manageLodging} from '../src/empire/lodging';
import {departureTip} from '../src/empire/customerDepartures';
import {advancePlaza,managePlaza} from '../src/empire/plaza';
const fresh=()=>startEmpireWeek(unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE));
test('restaurant walkouts retain their real cause, party count and advice without duplicate losses',()=>{
 for(const stage of ['waiting_order','waiting_food'] as const){
  const s=structuredClone(INITIAL_STATE);s.phase='service';s.isRestaurantOpen=false;s.chefEntities=[];s.waiterEntities=[];
  s.customers=[{id:'test',tableId:s.tables[0].id,state:stage,patience:.001,maxPatience:100,actionTimer:0,currentBill:0,isVIP:false,vipBonus:0,partySize:3}];
  const out=advanceGame(s,.2);assert.equal(out.weekStats.lost,3);assert.equal(out.customerDepartures?.length,1);assert.equal(out.customerDepartures![0].count,3);
  assert.match(out.customerDepartures![0].reason,stage==='waiting_order'?/order was taken/:/waiting for food/);assert.ok(departureTip(out.customerDepartures![0].reason).length>20);
  if(stage==='waiting_order')assert.match(departureTip(out.customerDepartures![0].reason),/waiters/);
  assert.equal(advanceGame(out,.2).customerDepartures?.length,1);
 }
});

test('mall applications retain declined and expired reasons without duplicate history',()=>{
 const e=fresh(),s=e.district,p=propertyById('park')!,b=s.businesses.park;
 b.plaza!.applications=[{id:501,unit:0,name:'Test bakery',rate:220,expiresAt:20}];
 const declined=managePlaza(s,'park',{type:'decline',id:501});
 assert.match(declined.businesses.park.customerDepartures!.at(-1)!.reason,/declined by the owner/);
 assert.equal(managePlaza(declined,'park',{type:'decline',id:501}),declined);
 b.plaza!.applications[0].expiresAt=0;b.plaza!.autoLease=false;
 const expired=advancePlaza(p,b,1,s.week,s.day);
 assert.equal(expired.customerDepartures?.filter(x=>x.subject==='Test bakery').length,1);
 assert.match(expired.customerDepartures!.find(x=>x.subject==='Test bakery')!.reason,/expired/);
 const again=advancePlaza(p,expired,1,s.week,s.day);
 assert.equal(again.customerDepartures?.filter(x=>x.subject==='Test bakery').length,1);
});
test('hotel and apartment cancellation records explain blocked rooms and survive saves',()=>{
 for(const id of ['hotel','apartments']){
  const e=fresh(),old=e.district.businesses[id],b=structuredClone(old),p=propertyById(id)!;
  b.venue!.arrivalTimer=100;b.venue!.serviceTimer=0;b.venue!.units=b.venue!.units.map(u=>({...u,dirty:true}));
  b.lodging!.lastBookingDay=0;b.lodging!.lastIssueDay=0;
  b.lodging!.bookings=[{id:99,name:'Test guest',type:b.venue!.units[0].type!,rate:80,nights:1,arrival:0,status:'waiting',kind:'booking',unit:0}];
  b.venue!.visitors=[{id:99,seed:1,state:'waiting',patience:.001,remaining:0,unit:null,bookingId:99,offerId:b.venue!.units[0].type}];
  const out=advanceVenue(p,b,.2,1,1);assert.equal(out.lodging!.bookings[0].status,'cancelled');assert.match(out.lodging!.bookings[0].cancellationReason!,/ready unit/);assert.equal(out.customerDepartures?.length,1);assert.equal(out.venue!.week.lost,b.venue!.week.lost+1);
  e.district.businesses[id]=out;const saved=parseEmpireSave(JSON.stringify(e));assert.ok(saved);assert.equal(saved!.district.businesses[id].customerDepartures![0].reason,out.customerDepartures![0].reason);
  const district={...e.district,businesses:{...e.district.businesses,[id]:b}};
  const manual=manageLodging(district,id,{type:'cancel',id:99});assert.match(manual.businesses[id].lodging!.bookings[0].cancellationReason!,/owner/);
 }
});
test('closing records waiting cancellations without inventing reasons for older history',()=>{
 const e=fresh(),b=e.district.businesses.hotel;b.lodging!.bookings=[{id:8,name:'Closing guest',type:'standard',rate:80,nights:1,arrival:179,status:'waiting',kind:'booking'}];b.venue!.visitors=[{id:8,seed:3,state:'waiting',patience:20,remaining:0,unit:null,bookingId:8}];
 const s=finishWeek(e.district,false);assert.match(s.businesses.hotel.lodging!.bookings[0].cancellationReason!,/closed/);assert.match(s.businesses.hotel.customerDepartures!.at(-1)!.reason,/closed/);
});

test('pickup and delivery timeouts retain the correct customer channel',()=>{
 for(const channel of ['pickup','bitedash']){
  const s=structuredClone(INITIAL_STATE);s.phase='service';s.isRestaurantOpen=false;s.chefEntities=[];s.waiterEntities=[];
  s.customers=[{id:'late',tableId:`online_${channel}_test`,state:'waiting_food',patience:.001,maxPatience:100,actionTimer:0,currentBill:0,isVIP:false,vipBonus:0,partySize:1}];
  const out=advanceGame(s,.2);assert.equal(out.customerDepartures![0].subject,channel==='pickup'?'Pickup order':'Delivery order');assert.equal(out.weekStats.lost,1);
 }
});
