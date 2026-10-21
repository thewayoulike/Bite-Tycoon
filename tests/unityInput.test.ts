import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelZoomAmount} from '../src/unity/input';

test('Unity wheel zoom normalizes mouse, trackpad, line and page deltas in both directions',()=>{
 assert.equal(wheelZoomAmount(100,0,800),1);
 assert.equal(wheelZoomAmount(-100,0,800),-1);
 assert.equal(wheelZoomAmount(2,0,800),.02);
 assert.equal(wheelZoomAmount(3,1,800),.48);
 assert.equal(wheelZoomAmount(1,2,800),3);
 assert.equal(wheelZoomAmount(-10000,0,800),-3);
 assert.equal(wheelZoomAmount(NaN,0,800),0);
 assert.equal(wheelZoomAmount(Infinity,0,800),0);
});
