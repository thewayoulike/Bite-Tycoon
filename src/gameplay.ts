import type { GameState, WeekSummary } from './hooks/useGameLoop';
import { INGREDIENTS, Recipe } from './data/recipes';

export const SHIFT_SECONDS = 180;
export const MENU_LIMIT = 6;
export const STARTING_MONEY = 1200;
export const STAFF_LIMITS = { waiter: 4, chef: 4, cleaner: 3, manager: 1 };
export const STAFF_UNLOCKS = { waiter: 6, chef: 6, cleaner: 16, manager: 40 };
export const MANAGER_COST = 300;
export const SALARIES = { waiter: 24, chef: 35, cleaner: 15, manager: 45 };
export const STARTING_INVENTORY = { water: 60, coffee_bean: 30, potato: 50, oil: 25, spices: 25, fruit: 40, sugar: 30 };
export const INITIAL_INVENTORY_VALUE = Object.entries(STARTING_INVENTORY).reduce((sum, [id, qty]) => sum + INGREDIENTS[id].cost * qty, 0);
export const UPGRADE_COSTS = {
  table: (count: number) => Math.round(250 * 1.5 ** (count - 2)),
  waiter: (count: number) => 120 + count * 60,
  chef: (count: number) => 180 + Math.max(0, count - 1) * 90,
  cleaner: (count: number) => 90 + count * 45,
  mealPrice: (_level: number) => Infinity,
  cookingSpeed: (level: number) => Math.round(180 * 1.7 ** level),
  spawnRate: (level: number) => Math.round(140 * 1.7 ** level),
};

export function activeRecipes(state: Pick<GameState, 'recipes' | 'activeMenu'>) {
  return state.recipes.filter(r => r.unlocked && state.activeMenu.includes(r.id));
}

export function demandFor(recipe: Recipe) {
  return Math.exp(-2.5 * Math.max(0, recipe.price / Math.max(1, recipe.basePrice) - 1));
}

export function menuDemand(state: Pick<GameState, 'recipes' | 'activeMenu'>) {
  const menu = activeRecipes(state);
  return menu.length ? menu.reduce((sum, r) => sum + demandFor(r), 0) / menu.length : 0;
}

export function chooseRecipe(recipes: Recipe[], random = Math.random) {
  let roll = random() * recipes.reduce((sum, r) => sum + demandFor(r), 0);
  return recipes.find(r => (roll -= demandFor(r)) <= 0) ?? recipes[recipes.length - 1];
}

export function weeklyWages(staff: GameState['staff']) {
  return staff.chefs * SALARIES.chef + staff.waiters * SALARIES.waiter + staff.cleaners * SALARIES.cleaner + (staff.hasManager ? SALARIES.manager : 0);
}

export function canHire(state: GameState, type: keyof typeof STAFF_UNLOCKS) {
  const count = type === 'manager' ? Number(state.staff.hasManager) : state.staff[`${type}s`];
  return state.stats.customersServed >= STAFF_UNLOCKS[type] && count < STAFF_LIMITS[type];
}

export function shiftLabel(state: Pick<GameState, 'phase' | 'time' | 'isRestaurantOpen'>) {
  if (state.phase === 'planning') return 'Plan your shift';
  if (state.phase === 'closing') return 'Finishing last orders';
  if (!state.isRestaurantOpen) return 'Arrivals paused · shift continues';
  if (state.time < 40) return 'Lunch rush starts at 40%';
  if (state.time < 70) return 'Lunch rush · extra guests';
  return 'Final service';
}

export function nextMilestone(state: GameState) {
  const served = state.stats.customersServed;
  if (!state.staff.waiters) return { text: served < 6 ? 'Serve 6 guests to unlock a waiter' : 'First waiter unlocked — visit Staff & Shop', current: Math.min(served, 6), target: 6 };
  if (!state.staff.cleaners) return { text: served < 16 ? 'Serve 16 guests to unlock a cleaner' : 'Cleaner unlocked — visit Staff & Shop', current: Math.min(served, 16), target: 16 };
  if (served < 40) return { text: 'Serve 40 guests to unlock purchasing help', current: served, target: 40 };
  return { text: 'Build a profitable shift · keep walkouts below 10%', current: state.weekStats.served, target: Math.max(20, state.weekStats.served + state.weekStats.lost) };
}

export function toggleMenuRecipe(state: GameState, id: string): GameState {
  const selected = state.activeMenu.includes(id);
  if (!state.recipes.some(r => r.id === id && r.unlocked)) return state;
  if (selected ? state.activeMenu.length <= 1 : state.activeMenu.length >= MENU_LIMIT) return state;
  return { ...state, activeMenu: selected ? state.activeMenu.filter(item => item !== id) : [...state.activeMenu, id] };
}

export function purchasingPlan(state: GameState) {
  if (!state.staff.hasManager || !state.manager.enabled || state.phase === 'planning') return [];
  let budget = Math.max(0, Math.min(state.manager.budget - state.manager.spent, state.money - state.manager.reserve));
  const needed = [...new Set(activeRecipes(state).flatMap(r => Object.keys(r.ingredients)))];
  // Most depleted ingredients get first access to a limited purchasing budget.
  return needed.sort((a, b) => (state.inventory[a] || 0) - (state.inventory[b] || 0)).flatMap(id => {
    const stock = state.inventory[id] || 0;
    if (stock >= state.manager.target / 2) return [];
    const unitCost = INGREDIENTS[id].cost;
    const qty = Math.min(state.manager.target - stock, Math.floor((budget + 1e-8) / unitCost));
    if (qty <= 0) return [];
    budget -= qty * unitCost;
    return [{ id, qty, cost: qty * unitCost, unitCost }];
  });
}

export function finishShift(state: GameState): GameState {
  let spoiledCost = 0;
  const inventory = { ...state.inventory };
  const inventoryBatches = { ...state.inventoryBatches };
  for (const id of Object.keys(inventory)) {
    let remaining = inventory[id] > 5 ? Math.floor(inventory[id] * 0.05) : 0;
    inventory[id] -= remaining;
    inventoryBatches[id] = (inventoryBatches[id] || []).flatMap(batch => {
      const used = Math.min(remaining, batch.qty);
      remaining -= used;
      spoiledCost += used * batch.costPerUnit;
      return batch.qty > used ? [{ ...batch, qty: batch.qty - used }] : [];
    });
  }
  const { served, lost, revenue, tips, foodCost, wages: accruedWages, fees } = state.weekStats;
  const wages = Math.round(accruedWages * 100) / 100;
  const profit = revenue - foodCost - wages - fees - spoiledCost;
  const topId = Object.entries(state.weekStats.itemsSold).sort((a, b) => b[1] - a[1])[0]?.[0];
  const summary: WeekSummary = {
    week: state.week, served, lost, revenue, tips,
    foodCost, wages, fees, spoilage: spoiledCost, profit, payrollDueWeek: state.week + 1,
    starRating: served + lost ? Math.round(50 * served / (served + lost)) / 10 : 0,
    topDish: state.recipes.find(r => r.id === topId)?.name,
    feedback: lost > served * 0.2 ? 'Too many guests left. Prioritize waiting tables, simplify the menu, or add kitchen help.'
      : menuDemand(state) < 0.6 ? 'High menu prices reduced demand. Try lowering a popular dish next shift.'
      : spoiledCost > revenue * 0.15 ? 'Unused stock ate into your profit. Buy smaller batches or lower the manager’s stock target.'
      : profit < 0 ? 'Costs exceeded sales. Review wages and food margins before expanding.'
      : 'Service is working. Try a new dish or more tables when your team has spare capacity.',
  };
  return {
    ...state, inventory, inventoryBatches,
    pendingPayroll: [...state.pendingPayroll, { amount: wages, dueWeek: state.week + 1 }], phase: 'planning', isRestaurantOpen: false,
    week: state.week + 1, time: 0, weekSummary: summary, priorityTableId: null,
    stats: { ...state.stats, salaryCosts: state.stats.salaryCosts + wages, spoilageCosts: state.stats.spoilageCosts + spoiledCost, totalExpenses: state.stats.totalExpenses + wages + spoiledCost },
    weekStats: { revenue: 0, tips: 0, served: 0, lost: 0, itemsSold: {}, foodCost: 0, wages: 0, fees: 0 },
    manager: { ...state.manager, spent: 0 },
    tables: state.tables.map(t => ({ ...t, customerId: null, isDirty: false })),
    waiterEntities: state.waiterEntities.map(w => ({ ...w, state: 'idle', stamina: 100, targetTableId: null })),
    chefEntities: state.chefEntities.map(c => ({ ...c, state: 'idle', stamina: 100 })),
    cleanerEntities: state.cleanerEntities.map(c => ({ ...c, state: 'idle', stamina: 100, targetTableId: null })),
  };
}


export function startOrPauseArrivals(state: GameState): GameState {
  if (state.weekSummary || state.phase === 'closing' || !activeRecipes(state).length) return state;
  return { ...state, phase: 'service', isRestaurantOpen: !state.isRestaurantOpen };
}

export function hireStaff(state: GameState, type: keyof typeof STAFF_UNLOCKS): GameState {
  if (!canHire(state, type)) return state;
  const count = type === 'manager' ? Number(state.staff.hasManager) : state.staff[`${type}s`];
  const cost = type === 'manager' ? MANAGER_COST : UPGRADE_COSTS[type](count);
  if (state.money < cost) return state;
  const next = { ...state, money: state.money - cost, staff: { ...state.staff },
    stats: { ...state.stats, managerCosts: state.stats.managerCosts + cost, totalExpenses: state.stats.totalExpenses + cost } };
  const id = `${type}_${Date.now()}_${count}`;
  if (type === 'manager') next.staff.hasManager = true;
  if (type === 'chef') {
    next.staff.chefs++;
    next.chefEntities = [...state.chefEntities, { id, state: 'idle', stamina: 100 }];
  }
  if (type === 'waiter') {
    next.staff.waiters++;
    next.waiterEntities = [...state.waiterEntities, { id, state: 'idle', targetCustomerId: null, targetOrderId: null, targetTableId: null, x: -5 + count * 2, y: -8, stamina: 100 }];
  }
  if (type === 'cleaner') {
    next.staff.cleaners++;
    next.cleanerEntities = [...state.cleanerEntities, { id, state: 'idle', targetTableId: null, x: -8, y: -2 + count * 2, stamina: 100 }];
  }
  return next;
}

export function changeManagerSettings(state: GameState, changes: Partial<GameState['manager']>): GameState {
  return { ...state, manager: {
    ...state.manager,
    enabled: typeof changes.enabled === 'boolean' ? changes.enabled : state.manager.enabled,
    target: [20, 30, 50].includes(changes.target) ? changes.target : state.manager.target,
    budget: [0, 75, 150, 300, 600].includes(changes.budget) ? changes.budget : state.manager.budget,
    reserve: [100, 150, 300, 500].includes(changes.reserve) ? changes.reserve : state.manager.reserve,
  } };
}

export function payDueWages(state: GameState): GameState {
  const due = state.pendingPayroll.filter(p => state.week > p.dueWeek || (state.week === p.dueWeek && state.time >= 300 / 7));
  if (!due.length) return state;
  const amount = due.reduce((sum, p) => sum + p.amount, 0);
  return { ...state, money: state.money - amount, pendingPayroll: state.pendingPayroll.filter(p => !due.includes(p)),
    floatingEvents: [...state.floatingEvents, { id: `payroll_${state.week}`, x: 0, z: 0, text: `Weekly wages paid: $${amount.toFixed(2)}`, type: 'info', createdAt: Date.now() }] };
}

export function serveReadyTable(state: GameState, orderId: string): GameState {
  const order = state.orders.find(o => o.id === orderId);
  if (!order || order.tableId.startsWith('online_')) return state;
  const customer = state.customers.find(c => c.id === order.customerId && c.state === 'waiting_food');
  const tableOrders = state.orders.filter(o => o.tableId === order.tableId);
  if (!customer || tableOrders.some(o => o.state !== 'ready')) return state;
  const itemsSold = { ...state.stats.itemsSold };
  const itemRevenues = { ...state.stats.itemRevenues };
  const weeklyItems = { ...state.weekStats.itemsSold };
  for (const item of tableOrders) {
    itemsSold[item.recipeId] = (itemsSold[item.recipeId] || 0) + 1;
    weeklyItems[item.recipeId] = (weeklyItems[item.recipeId] || 0) + 1;
    itemRevenues[item.recipeId] = (itemRevenues[item.recipeId] || 0) + item.price;
  }
  return { ...state, orders: state.orders.filter(o => o.tableId !== order.tableId),
    customers: state.customers.map(c => c.id === customer.id ? { ...c, state: 'eating', patience: c.maxPatience, tipModifier: Math.max(0.25, c.patience / (c.maxPatience * 1.5)) } : c),
    stats: { ...state.stats, itemsSold, itemRevenues }, weekStats: { ...state.weekStats, itemsSold: weeklyItems } };
}
