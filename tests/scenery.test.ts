import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getCarModel, getTreeModel } from '../src/graphics/streetModels';
import { FoodKind, getFoodKind, getFoodModel } from '../src/graphics/foodModels';

function validMesh(geometry: THREE.BufferGeometry, budget: number) {
  const position = geometry.getAttribute('position');
  assert.ok(position.count > 0);
  assert.ok((geometry.index?.count ?? position.count) / 3 <= budget);
  for (const value of position.array) assert.ok(Number.isFinite(value));
  for (const value of geometry.getAttribute('normal').array) assert.ok(Number.isFinite(value));
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox!.getSize(new THREE.Vector3()).length() < 12);
}

test('street geometry is shared, finite and stays within the scenery budget', () => {
  for (const wagon of [false, true]) {
    const car = getCarModel(wagon);
    assert.equal(getCarModel(wagon), car);
    for (const geometry of Object.values(car)) validMesh(geometry, 7000);
    // Exterior hood normals must face up; reversed winding makes the body disappear.
    assert.ok(car.body.getAttribute('normal').getY(9 * 28) > 0);
  }
  for (let i = 0; i < 8; i++) for (const blossom of [false, true]) {
    const tree = getTreeModel(i, blossom);
    assert.equal(getTreeModel(i + 8, blossom), tree);
    validMesh(tree.bark, 4000); validMesh(tree.leaves, 8000);
  }
});

test('served food uses recognizable dish families and compact shared plate models', () => {
  assert.equal(getFoodKind('steak'), 'steak');
  assert.equal(getFoodKind('steamed_rice'), 'bowl');
  assert.equal(getFoodKind('coffee_black'), 'coffee');
  assert.equal(getFoodKind('juice_fruit'), 'drink');
  const kinds: FoodKind[] = ['burger','pizza','fries','hotdog','sushi','salad','steak','chicken','sandwich','bowl','coffee','drink'];
  for (const kind of kinds) {
    const food = getFoodModel(kind);
    assert.equal(getFoodModel(kind), food);
    validMesh(food, 6500);
    const box = food.boundingBox!;
    assert.ok(box.min.y >= 0 && box.max.y < .5, 'meal sits on the table');
    assert.ok(box.max.x - box.min.x < .65, 'dish fits on a place setting');
  }
});
