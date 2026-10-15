import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAirport,buildAirliner,buildCoast,buildFishingBoat,buildLeisureBoat,cityGroundGeometry,flightPose,FLIGHT_SECONDS,coastEdge} from '../src/graphics/airportAndCoast';
import {OUTER_LOTS} from '../src/graphics/outerCity';
import {LAND_PLOTS} from '../src/empire/propertyMarket';
import {createWaterSurface,createWaterRippleMap} from '../src/graphics/coastalWater';

test('airport and waterfront remain outside existing neighbourhoods and market parcels',()=>{
  assert.ok(OUTER_LOTS.every(l=>l.x>-260&&l.x<270&&l.z<270));
  assert.ok(LAND_PLOTS.every(p=>p.position[0]>-260&&p.position[0]<270&&p.position[2]<270));
  for(let x=-500;x<=300;x+=10)assert.ok(coastEdge(x)>290);
  const airport=buildAirport();airport.solid.computeBoundingBox();
  assert.ok(airport.solid.boundingBox!.min.x>300);
  Object.values(airport).forEach(g=>g.dispose());
});

test('detailed water stays within one small surface and one reusable ripple texture',()=>{
  const water=createWaterSurface(),ripples=createWaterRippleMap();
  assert.ok(water.index!.count/3<40000);
  assert.ok(water.getAttribute('position').array.every(Number.isFinite));
  assert.ok(water.getAttribute('normal').array.every(Number.isFinite));
  const data=ripples.image.data as Uint8Array;
  assert.ok(data.byteLength<=256*256*4);
  assert.ok(new Set(data).size>64,'ripples need tonal detail, not a flat normal map');
  water.dispose();ripples.dispose();
});
test('new scenery uses finite merged geometry within a bounded triangle budget',()=>{
  let triangles=0;
  for(const model of [buildAirport(),buildAirliner(),buildCoast(),buildFishingBoat(),buildLeisureBoat(false),buildLeisureBoat(true),{ground:cityGroundGeometry()}]){
    for(const g of Object.values(model)){
      assert.ok(g.getAttribute('position').count>0);
      assert.ok(g.getAttribute('position').array.every(Number.isFinite));
      assert.ok(g.getAttribute('normal').array.every(Number.isFinite));
      triangles+=(g.index?.count??g.getAttribute('position').count)/3;
      g.dispose();
    }
  }
  assert.ok(triangles<75000,'scenery must stay batched and light enough for the browser: '+triangles);
});
test('aircraft move continuously through runway and flying routes without teleporting at the loop',()=>{
  for(const coastal of [false,true]){
    const duration=coastal?210:FLIGHT_SECONDS;
    assert.ok(flightPose(0,coastal).position.distanceTo(flightPose(3,coastal).position)>2);
    assert.ok(flightPose(duration-.01,coastal).position.distanceTo(flightPose(.01,coastal).position)<1);
    assert.ok(flightPose(duration,coastal).position.distanceTo(flightPose(0,coastal).position)<1e-8);
    for(let t=0;t<duration;t+=.5){
      const p=flightPose(t,coastal);
      assert.ok(p.position.y>=1.9);
      assert.ok([p.heading,p.pitch,p.bank,...p.position.toArray()].every(Number.isFinite));
      if(!coastal&&p.position.y<5)assert.ok(Math.abs(p.position.x-368)<2,'low aircraft must be aligned with the runway');
    }
  }
});

