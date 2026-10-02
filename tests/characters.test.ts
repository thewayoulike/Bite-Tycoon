import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { characterMaterial, createCharacterRig, getCharacterGeometry, getCharacterAppearance, CHARACTER_VARIANTS, JOINTS } from '../src/characters/characterModel';

test('all character variants have finite geometry and normalized, valid skin weights', () => {
  for (const role of ['customer', 'chef', 'waiter', 'cleaner'] as const) {
    for (let seed = 0; seed < 24; seed++) {
      const geometry = getCharacterGeometry(role, seed, seed % 2 === 0 && role === 'customer');
      const positions = geometry.getAttribute('position');
      const weights = geometry.getAttribute('skinWeight');
      const joints = geometry.getAttribute('skinIndex');
      assert.equal(weights.count, positions.count);
      assert.ok(geometry.index!.count / 3 < 16000, 'keep each person within the character triangle budget');
      for (const value of positions.array) assert.ok(Number.isFinite(value));
      for (let i = 0; i < weights.count; i++) {
        const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
        assert.ok(Math.abs(sum - 1) < .00001);
        assert.ok(joints.getX(i) < JOINTS.length && joints.getY(i) < JOINTS.length);
      }
      for (const index of geometry.index!.array) assert.ok(index < positions.count);
    }
  }
});

test('binding preserves the model and a seated leg deforms the shoe with the skeleton', () => {
  const geometry = getCharacterGeometry('customer', 7);
  const { bones, skeleton } = createCharacterRig();
  const mesh = new THREE.SkinnedMesh(geometry, characterMaterial);
  mesh.add(bones[0]); mesh.bind(skeleton); mesh.updateMatrixWorld(true); skeleton.update();
  const positions = geometry.getAttribute('position'), joints = geometry.getAttribute('skinIndex');
  const original = new THREE.Vector3(), transformed = new THREE.Vector3();
  let shoeIndex = -1;
  for (let i = 0; i < positions.count; i++) {
    original.fromBufferAttribute(positions, i);
    mesh.applyBoneTransform(i, transformed.copy(original));
    assert.ok(original.distanceTo(transformed) < .00001, 'binding must not distort rest pose');
    if (joints.getX(i) === 12) shoeIndex = i;
  }
  assert.ok(shoeIndex >= 0);
  original.fromBufferAttribute(positions, shoeIndex);
  bones[0].position.y = .63;
  bones[10].rotation.x = -Math.PI / 2;
  bones[11].rotation.x = Math.PI / 2;
  mesh.updateMatrixWorld(true); skeleton.update();
  mesh.applyBoneTransform(shoeIndex, transformed.copy(original));
  assert.ok(transformed.z - original.z > .4, 'shoe moves under the bent knee');
  assert.ok(transformed.y >= 0 && transformed.y < .3, 'seated feet stay near the floor');
  skeleton.dispose();
});

test('geometry is shared while every person retains independent joints', () => {
  assert.equal(getCharacterGeometry('customer', 7), getCharacterGeometry('customer', 7 + CHARACTER_VARIANTS * 100));
  assert.notEqual(getCharacterGeometry('customer', 7), getCharacterGeometry('chef', 7));
  const first = createCharacterRig(), second = createCharacterRig();
  first.bones[5].rotation.x = -1.2;
  assert.equal(second.bones[5].rotation.x, 0);
  first.skeleton.dispose(); second.skeleton.dispose();
});

test('the crowd has independent outfits, faces, builds and hair with a smaller mesh budget', () => {
  const appearances = Array.from({length: CHARACTER_VARIANTS},(_,i)=>getCharacterAppearance(i));
  assert.equal(new Set(appearances.map(a=>a.hairstyle)).size,6);
  assert.equal(new Set(appearances.map(a=>a.build)).size,3);
  assert.equal(new Set(appearances.map(a=>a.palette[0])).size,10);
  assert.equal(new Set(appearances.map(a=>a.skin)).size,6);
  for (let i=0;i<CHARACTER_VARIANTS;i++) {
    const crowd = getCharacterGeometry('customer',i,false,'crowd');
    assert.ok(crowd.index!.count / 3 < 7500);
    assert.ok(crowd.index!.count < getCharacterGeometry('customer',i).index!.count);
    assert.ok([...crowd.getAttribute('position').array].every(Number.isFinite));
  }
});
