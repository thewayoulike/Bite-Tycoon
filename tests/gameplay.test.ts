import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceGame, INITIAL_STATE, takeCustomerOrder, GameState, Customer, Order } from '../src/hooks/useGameLoop';
import { activeRecipes, canHire, demandFor, hireStaff, payDueWages, purchasingPlan, serveReadyTable, startOrPauseArrivals, toggleMenuRecipe } from '../src/gameplay';

const fresh = (): GameState => structuredClone(INITIAL_STATE);
const customer = (changes: Partial<Customer> = {}): Customer => ({ id: 'guest', tableId: 't1', state: 'waiting_food', patience: 100, maxPatience: 100, actionTimer: 0, currentBill: 20, isVIP: false, vipBonus: 0, partySize: 2, ...changes });
const order = (changes: Partial<Order> = {}): Order => ({ id: 'order', customerId: 'guest', tableId: 't1', recipeId: 'coffee_black', state: 'pending', progress: 0, isOnFire: false, price: 10, ...changes });

test('start is small; staffing is earned and paid for', () => {
  const state = fresh();
  assert.equal(state.money, 1200);
  assert.equal(state.tables.length, 2);
  assert.equal(state.staff.chefs, 1);
  assert.equal(activeRecipes(state).length, 3);
  assert.equal(hireStaff(state, 'manager'), state);
  assert.equal(hireStaff(state, 'waiter'), state);
  state.stats.customersServed = 6;
  const hired = hireStaff(state, 'waiter');
  assert.equal(hired.staff.waiters, 1);
  assert.equal(hired.money, 1080);
  assert.equal(canHire(hired, 'cleaner'), false);
  assert.equal(state.staff.waiters, 0, 'does not mutate previous state');
});

test('planning is frozen; a completed week schedules wages without paying immediately', () => {
  let state = fresh();
  assert.equal(advanceGame(state, 20), state);
  state = { ...state, phase: 'service', time: 99.9, weekStats: { ...state.weekStats, wages: 34.965 } };
  const finished = advanceGame(state, 1);
  assert.equal(finished.phase, 'planning');
  assert.equal(finished.week, 2);
  assert.equal(finished.money, state.money);
  assert.ok(Math.abs(finished.weekSummary!.wages - 35) < 1e-8);
  assert.equal(finished.pendingPayroll[0].dueWeek, 2);
  assert.equal(advanceGame(finished, 1000), finished);
  assert.equal(startOrPauseArrivals(finished), finished, 'report must be dismissed first');
});

test('Week 1 wages are paid exactly once after three elapsed days of Week 2', () => {
  const state = { ...fresh(), week: 2, phase: 'service' as const, time: 300 / 7 - 0.01, pendingPayroll: [{ amount: 59, dueWeek: 2 }] };
  assert.equal(payDueWages(state), state);
  const paid = advanceGame(state, 0.1);
  assert.equal(paid.money, 1141);
  assert.equal(paid.pendingPayroll.length, 0);
  assert.equal(payDueWages(paid), paid);
  assert.equal(advanceGame(paid, 0.1).money, 1141);
});

test('midweek hires accrue proportional wages', () => {
  const state = fresh();
  state.stats.customersServed = 6;
  state.phase = 'service'; state.time = 50; state.weekStats.wages = 17.5;
  const finished = advanceGame(hireStaff(state, 'waiter'), 90);
  assert.equal(finished.weekSummary!.wages, 47, 'starter chef $35 plus half a waiter week $12');
});

test('active menu keeps at least one dish and premium prices reduce demand', () => {
  let state = fresh();
  state = toggleMenuRecipe(state, 'fries');
  state = toggleMenuRecipe(state, 'juice_fruit');
  assert.equal(toggleMenuRecipe(state, 'coffee_black'), state);
  const locked = state.recipes.find(r => !r.unlocked)!;
  assert.equal(toggleMenuRecipe(state, locked.id), state);
  const recipe = activeRecipes(state)[0];
  assert.equal(demandFor(recipe), 1);
  assert.ok(demandFor({ ...recipe, price: recipe.basePrice * 2 }) < 0.1);
  const waiting = customer({ state: 'waiting_order' });
  state.customers = [waiting];
  const ordered = takeCustomerOrder(state, waiting.id);
  assert.ok(ordered.orders.length > 0);
  assert.ok(ordered.orders.every(o => o.recipeId === 'coffee_black' && o.price === recipe.price));
  assert.ok(ordered.weekStats.foodCost > 0);
});

test('manager obeys budget, cash reserve, menu and pause', () => {
  const state = fresh();
  state.phase = 'service'; state.staff.hasManager = true;
  state.inventory = {}; state.money = 160;
  state.manager = { enabled: true, target: 30, budget: 75, spent: 70, reserve: 150 };
  const plan = purchasingPlan(state);
  assert.ok(plan.length > 0);
  assert.ok(plan.reduce((sum, p) => sum + p.cost, 0) <= 5 + 1e-8);
  const ingredients = new Set(activeRecipes(state).flatMap(r => Object.keys(r.ingredients)));
  assert.ok(plan.every(p => ingredients.has(p.id) && p.qty <= 30));
  assert.deepEqual(purchasingPlan({ ...state, money: 150 }), []);
  assert.deepEqual(purchasingPlan({ ...state, manager: { ...state.manager, enabled: false } }), []);
  assert.deepEqual(purchasingPlan({ ...state, phase: 'planning' }), []);
});

test('food walkouts cancel outstanding tickets and record the loss', () => {
  const state = fresh(); state.phase = 'service';
  state.customers = [customer({ patience: 0.05 })]; state.orders = [order()];
  const next = advanceGame(state, 0.1);
  assert.equal(next.customers[0].state, 'leaving');
  assert.equal(next.orders.length, 0);
  assert.equal(next.weekStats.lost, 2);
  assert.equal(next.money, state.money);
});

test('serving waits for the complete table and counts all dishes once', () => {
  const state = fresh(); state.customers = [customer()];
  state.orders = [order({ state: 'ready' }), order({ id: 'second' })];
  assert.equal(serveReadyTable(state, 'order'), state);
  state.orders[1].state = 'ready';
  const served = serveReadyTable(state, 'order');
  assert.equal(served.orders.length, 0);
  assert.equal(served.weekStats.itemsSold.coffee_black, 2);
  assert.equal(served.customers[0].state, 'eating');
  assert.equal(serveReadyTable(served, 'second'), served);
});

test('kitchen prioritization changes which ticket receives limited cooking capacity', () => {
  const state = fresh(); state.phase = 'service';
  state.orders = [order(), order({ id: 'vip', tableId: 't2' })];
  state.priorityTableId = 't2';
  const next = advanceGame(state, 0.1);
  assert.ok(next.orders.find(o => o.id === 'vip')!.progress > 0);
  assert.equal(next.orders.find(o => o.id === 'order')!.progress, 0);
});

test('an attentive first-week playthrough reaches the first hire and a paused report', () => {
  const originalRandom = Math.random;
  let seed = 1234;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  try {
    let state = startOrPauseArrivals(fresh());
    for (let step = 0; step < 3500 && !state.weekSummary; step++) {
      state = advanceGame(state, 0.1);
      for (const guest of state.customers.filter(c => c.state === 'waiting_order')) state = takeCustomerOrder(state, guest.id);
      for (const ticket of state.orders.filter(o => o.state === 'ready')) state = serveReadyTable(state, ticket.id);
      state = { ...state, tables: state.tables.map(t => !t.customerId && t.isDirty ? { ...t, isDirty: false } : t) };
      if (!state.staff.waiters && canHire(state, 'waiter')) state = hireStaff(state, 'waiter');
    }
    assert.ok(state.weekSummary, 'closing finishes without trapping orders');
    assert.ok(state.weekSummary.served >= 6);
    assert.equal(state.staff.waiters, 1);
    assert.ok(state.weekSummary.profit > 0);
    assert.equal(state.week, 2);
    assert.equal(state.pendingPayroll.length, 1);
    console.log('First week:', { served: state.weekSummary.served, lost: state.weekSummary.lost, profit: Math.round(state.weekSummary.profit), wagesDue: Math.round(state.weekSummary.wages) });
  } finally { Math.random = originalRandom; }
});
