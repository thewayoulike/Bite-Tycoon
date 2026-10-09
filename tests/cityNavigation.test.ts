import test from 'node:test';
import assert from 'node:assert/strict';
import {MOUSE,TOUCH,Vector3} from 'three';
import {CITY_VIEWS,MAP_MOUSE_BUTTONS,MAP_TOUCHES,constrainCityPan} from '../src/graphics/cityNavigation';
import {CITY_EDGE,OUTER_LOTS,isOuterPark,buildOuterCity,type OuterStreetModels} from '../src/graphics/outerCity';
import {addIndustrialLot,industrialStacks,industrialProfile} from '../src/graphics/industrialScenery';
import {ModelParts} from '../src/graphics/modelParts';
import {outerCityZone} from '../src/graphics/cityZoning';
import {buildRailCorridor,buildTrain,RAIL_X,TRAIN_WRAP,trainTravel} from '../src/graphics/cityRailway';

test('map dragging pans by default and reaches every district without changing viewing angle',()=>{
  assert.equal(MAP_MOUSE_BUTTONS.LEFT,MOUSE.PAN);assert.equal(MAP_MOUSE_BUTTONS.RIGHT,MOUSE.ROTATE);
  assert.equal(MAP_TOUCHES.ONE,TOUCH.PAN);assert.equal(MAP_TOUCHES.TWO,TOUCH.DOLLY_ROTATE);
  for(const view of Object.values(CITY_VIEWS)){
    const position=new Vector3(...view.position),target=new Vector3(...view.target),before=position.clone().sub(target);
    constrainCityPan(position,target);
    assert.deepEqual(target.toArray(),view.target,'district presets must be reachable');
    assert.ok(position.clone().sub(target).distanceTo(before)<1e-9);
    assert.ok(position.distanceTo(target)<580);
  }
  for(const sign of [-1,1]){
    const target=new Vector3(sign*190,3,sign*180),position=target.clone().add(new Vector3(25,40,50));
    constrainCityPan(position,target);assert.equal(target.x,sign*190,'panning must pass the previous 65-metre limit');
    const offset=position.clone().sub(target);target.x+=sign*500;position.x+=sign*500;target.z+=sign*500;position.z+=sign*500;
    constrainCityPan(position,target);
    assert.equal(target.x,sign<0?-CITY_EDGE:CITY_EDGE+30);assert.equal(target.z,sign*CITY_EDGE);
    assert.ok(position.clone().sub(target).distanceTo(offset)<1e-9);assert.equal(target.y,3);
  }
});
test('the expanded city separates homes, commerce and industry with a green buffer',()=>{
  assert.ok(Math.abs((CITY_EDGE/187.5)**2-1.96)<1e-9);
  for(const lot of OUTER_LOTS){
    if(lot.zone==='homes')assert.ok(lot.x<=-50);
    if(lot.zone==='industry'){assert.ok(lot.x>=75&&lot.z<=-100);assert.ok(!isOuterPark(lot.x,lot.z));}
  }
  assert.equal(outerCityZone(150,100),'commercial','eastern commercial streets must not turn back into houses');
  for(let x=50;x<=250;x+=25)assert.ok(isOuterPark(x,-75));
  for(let z=-100;z>=-250;z-=25)assert.ok(isOuterPark(50,z));
  assert.ok(OUTER_LOTS.filter(l=>l.zone==='industry').length>=50);
});
test('rail tracks stay outside city roads and train wrapping happens beyond the developed map',()=>{
  assert.ok(RAIL_X-1.75>CITY_EDGE+3.25);
  assert.ok(TRAIN_WRAP>CITY_EDGE+100);
  assert.equal(trainTravel(0,92,-1),92);
  assert.equal(trainTravel(1,92,-1),83);
  assert.equal(trainTravel(1,-170,1),-161);
  assert.equal(trainTravel(TRAIN_WRAP*2/9,92,-1),92);
  for(const model of [buildRailCorridor(),buildTrain(true),buildTrain(false)])for(const geometry of Object.values(model)){
    assert.ok(Number.isFinite(geometry.boundingSphere!.radius));
    assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
    assert.ok(geometry.getAttribute('position').count<150000);
    geometry.dispose();
  }
});

test('large factories and chimney smoke origins stay within their serviced plots',()=>{
  for(const x of [100,125,150]){
    const z=-150,solid=new ModelParts(),glass=new ModelParts(),land=new ModelParts();
    addIndustrialLot(solid,glass,land,x,z);
    const stacks=industrialStacks(x,z),profile=industrialProfile(x,z);
    assert.ok(profile.height>=10);assert.ok(stacks.length>=1);
    for(const parts of [solid,glass,land]){
      const g=parts.finish();g.computeBoundingBox();const b=g.boundingBox!;
      assert.ok(b.min.x>=x-9.25&&b.max.x<=x+9.25);
      assert.ok(b.min.z>=z-9.25&&b.max.z<=z+9.25,'factory equipment must not overlap roads');
      if(parts===solid){assert.ok(b.max.y>22);for(const stack of stacks)assert.ok(stack.top>=22&&stack.top<=b.max.y&&stack.base>profile.height);}
      g.dispose();
    }
  }
});

test('detailed street models replace placeholders without changing lot selection or other scenery',()=>{
  for(const q of [0,1,2,3]){
    const a:OuterStreetModels={trees:false,cars:false,placements:{trees:[],cars:[]}};
    const b:OuterStreetModels={trees:true,cars:true,placements:{trees:[],cars:[]}};
    const fallback=buildOuterCity(q,true,a),detailed=buildOuterCity(q,true,b);
    assert.deepEqual(a.placements,b.placements,'asset loading must preserve seeded scenery');
    assert.ok(b.placements.trees.length>25);
    if(q===0)assert.ok(b.placements.cars.length>40);
    assert.deepEqual(fallback.lit.getAttribute('position').array,detailed.lit.getAttribute('position').array);
    assert.ok(detailed.solid.getAttribute('position').count<fallback.solid.getAttribute('position').count);
    for(const lot of OUTER_LOTS.filter(l=>l.zone==='industry'&&(l.x<0?1:0)+(l.z<0?2:0)===q)){
      assert.ok(b.placements.cars.some(c=>c.x===lot.x-3.5&&c.z===lot.z+6.5&&c.style==='truck'),'each factory must have a delivery truck, not a passenger car');
    }
    for(const g of [...Object.values(fallback),...Object.values(detailed)])g.dispose();
  }
});
