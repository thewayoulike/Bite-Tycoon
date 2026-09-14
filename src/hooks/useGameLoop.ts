import { useState, useEffect, useCallback, useRef } from 'react';
import { RECIPES, INGREDIENTS, Recipe, Ingredient } from '../data/recipes';
import { sounds } from '../utils/audio';

export type CustomerState = 'entering' | 'waiting_order' | 'waiting_food' | 'eating' | 'leaving';

export interface FloatingEvent {
  id: string;
  x: number;
  z: number;
  text: string;
  subtext?: string;
  color?: string;
  createdAt: number;
  type?: 'tip' | 'vip' | 'event' | 'info';
}

export interface DaySummary {
  day: number;
  week: number;
  revenue: number;
  tips: number;
  served: number;
  lost: number;
  starRating: number;
  topDish?: string;
}

export interface Customer {
  id: string;
  state: CustomerState;
  patience: number;
  maxPatience: number;
  tableId: string;
  actionTimer: number;
  currentBill: number; 
  isVIP: boolean;
  vipBonus: number;
  partySize: number; 
  tipModifier?: number;
}

export interface Table {
  id: string;
  customerId: string | null;
  x: number;
  y: number;
  isDirty: boolean;
}

export const TABLE_POSITIONS = [
  { x: 15, y: 70 }, { x: 35, y: 70 }, { x: 55, y: 70 }, { x: 75, y: 70 },
  { x: 25, y: 85 }, { x: 45, y: 85 }, { x: 65, y: 85 }, { x: 85, y: 85 },
  { x: 15, y: 95 }, { x: 35, y: 95 }, { x: 55, y: 95 }, { x: 75, y: 95 },
];

export const mapPos = (percent: number) => (percent / 100) * 20 - 10;

export const ONLINE_APPS = {
  bitedash: { id: 'bitedash', name: 'BiteDash', cost: 100, fee: 0.20, spawnMultiplier: 1.0 },
  foodpanda: { id: 'foodpanda', name: 'FoodPanda', cost: 100, fee: 0.15, spawnMultiplier: 0.8 },
  ubereats: { id: 'ubereats', name: 'UberEats', cost: 100, fee: 0.25, spawnMultiplier: 1.5 },
};

export interface Order {
  id: string;
  customerId: string;
  tableId: string;
  recipeId: string;
  state: 'pending' | 'cooking' | 'ready';
  progress: number;
  isOnFire: boolean;
  price: number; 
}

export interface WaiterEntity {
  id: string;
  state: 'idle' | 'walking_to_order' | 'taking_order' | 'walking_to_counter_with_order' | 'walking_to_serve' | 'walking_to_counter_empty' | 'on_break';
  targetCustomerId: string | null;
  targetOrderId: string | null;
  targetTableId?: string | null;
  actionTimer?: number;
  x: number;
  y: number;
  stamina: number; 
}

export interface ChefEntity {
  id: string;
  state: 'idle' | 'on_break';
  stamina: number; 
}

export interface CleanerEntity {
  id: string;
  state: 'idle' | 'walking_to_table' | 'cleaning' | 'walking_to_counter' | 'on_break';
  targetTableId: string | null;
  actionTimer?: number;
  x: number;
  y: number;
  stamina: number; 
}

export interface GameState {
  money: number;
  day: number;
  time: number;
  tables: Table[];
  customers: Customer[];
  orders: Order[];
  recipes: Recipe[];
  inventory: Record<string, number>;
  inventoryBatches: Record<string, { qty: number; costPerUnit: number }[]>; // NEW: FIFO Batch Tracking
  unlockedApps: string[];
  staff: {
    waiters: number;
    chefs: number;
    cleaners: number;
    hasManager: boolean;
  };
  waiterEntities: WaiterEntity[];
  chefEntities: ChefEntity[];
  cleanerEntities: CleanerEntity[];
  upgrades: {
    mealPrice: number;
    cookingSpeed: number;
    spawnRate: number;
  };
  stats: {
    customersServed: number;
    customersLost: number;
    totalEarned: number;
    totalTips: number;
    onlineEarned: number;
    onlineFees: number;
    appCosts: number;
    totalExpenses: number;
    inventoryCosts: number;
    recipeCosts: number;
    managerCosts: number;
    salaryCosts: number;
    upgradeCosts: number;
    itemsSold: Record<string, number>;
    itemRevenues: Record<string, number>;
    vipBonus: number;
    spoilageCosts: number; 
  };
  restaurantLayout: number;
  wallColor: string | null;
  frameColor: string | null;
  isRestaurantOpen: boolean;
  gameSpeed: number;
  floatingEvents: FloatingEvent[];
  daySummary: DaySummary | null;
  dayStats: {
    revenue: number;
    tips: number;
    served: number;
    lost: number;
    itemsSold: Record<string, number>;
  };
}

const STARTING_INVENTORY = { water: 50, soda_syrup: 50, coffee_bean: 50, potato: 50, oil: 50, sugar: 50, spices: 50, fruit: 50, rice: 50, fish: 50 };
const INITIAL_BATCHES: Record<string, { qty: number; costPerUnit: number }[]> = {};
Object.entries(STARTING_INVENTORY).forEach(([ing, qty]) => {
  INITIAL_BATCHES[ing] = [{ qty, costPerUnit: INGREDIENTS[ing].cost }];
});

const INITIAL_STATE: GameState = {
  money: 10000,
  day: 1,
  time: 0,
  tables: [
    { id: 't1', customerId: null, x: TABLE_POSITIONS[0].x, y: TABLE_POSITIONS[0].y, isDirty: false },
    { id: 't2', customerId: null, x: TABLE_POSITIONS[1].x, y: TABLE_POSITIONS[1].y, isDirty: false },
    { id: 't3', customerId: null, x: TABLE_POSITIONS[2].x, y: TABLE_POSITIONS[2].y, isDirty: false },
    { id: 't4', customerId: null, x: TABLE_POSITIONS[3].x, y: TABLE_POSITIONS[3].y, isDirty: false },
  ],
  customers: [],
  orders: [],
  recipes: RECIPES,
  inventory: STARTING_INVENTORY,
  inventoryBatches: INITIAL_BATCHES, // Pre-loads the FIFO queues!
  unlockedApps: [],
  staff: { waiters: 0, chefs: 0, cleaners: 0, hasManager: false },
  waiterEntities: [],
  chefEntities: [],
  cleanerEntities: [],
  upgrades: { mealPrice: 10, cookingSpeed: 1, spawnRate: 1 },
  stats: {
    customersServed: 0, customersLost: 0, totalEarned: 0, totalTips: 0,
    onlineEarned: 0, onlineFees: 0, appCosts: 0,
    totalExpenses: 0, inventoryCosts: 0, recipeCosts: 0, managerCosts: 0,
    salaryCosts: 0, upgradeCosts: 0, itemsSold: {}, itemRevenues: {}, vipBonus: 0, spoilageCosts: 0
  },
  restaurantLayout: 0, wallColor: null, frameColor: null, isRestaurantOpen: false,
  gameSpeed: 1,
  floatingEvents: [],
  daySummary: null,
  dayStats: {
    revenue: 0,
    tips: 0,
    served: 0,
    lost: 0,
    itemsSold: {}
  }
};

export const UPGRADE_COSTS = {
  table: (count: number) => Math.floor(50 * Math.pow(1.5, count - 2)),
  waiter: (count: number) => 0, 
  chef: (count: number) => 0, 
  cleaner: (count: number) => 0,
  mealPrice: (level: number) => Math.floor(25 * Math.pow(1.4, level)),
  cookingSpeed: (level: number) => Math.floor(40 * Math.pow(1.6, level)),
  spawnRate: (level: number) => Math.floor(30 * Math.pow(1.5, level)),
};

export const SALARIES = { waiter: 50, chef: 75, cleaner: 30, manager: 200 };

// 🧠 CORE FIFO ENGINE
// Deducts items from the oldest batches first and returns the EXACT cost consumed!
export function consumeFIFO(batches: {qty: number, costPerUnit: number}[], amount: number) {
  let costConsumed = 0;
  let remaining = amount;
  let newBatches = [...(batches || [])].map(b => ({...b}));

  while (remaining > 0 && newBatches.length > 0) {
    let oldestBatch = newBatches[0];
    if (oldestBatch.qty <= remaining) {
      costConsumed += oldestBatch.qty * oldestBatch.costPerUnit;
      remaining -= oldestBatch.qty;
      newBatches.shift(); // Batch is fully used, remove it!
    } else {
      costConsumed += remaining * oldestBatch.costPerUnit;
      oldestBatch.qty -= remaining; // Partial batch used
      remaining = 0;
    }
  }
  return { remainingBatches: newBatches, costConsumed };
}

export function useGameLoop() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const lastTickRef = useRef<number>(Date.now());
  const stateRef = useRef<GameState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const gameTick = useCallback(() => {
    const now = Date.now();
    const currentSpeed = stateRef.current.gameSpeed ?? 1;
    if (currentSpeed === 0) {
      lastTickRef.current = now;
      return; // Paused!
    }
    const delta = Math.min((now - lastTickRef.current) / 1000, 0.5) * currentSpeed; 
    lastTickRef.current = now;

    setState((prevState) => {
      let newState = { 
        ...prevState,
        tables: [...prevState.tables], customers: [...prevState.customers], orders: [...prevState.orders],
        stats: { ...prevState.stats, itemsSold: { ...(prevState.stats.itemsSold || {}) }, itemRevenues: { ...(prevState.stats.itemRevenues || {}) } },
        inventory: { ...prevState.inventory },
        inventoryBatches: { ...prevState.inventoryBatches },
        dayStats: { ...prevState.dayStats, itemsSold: { ...(prevState.dayStats?.itemsSold || {}) } },
        floatingEvents: [...(prevState.floatingEvents || [])]
      };
      
      let { tables, customers, orders, staff, upgrades, stats, recipes, unlockedApps } = newState;
      let newFloatingEvents: FloatingEvent[] = [];

      let waiterEntities = (prevState.waiterEntities || []).map(w => ({ ...w, stamina: w.stamina ?? 100 }));
      let chefEntities = (prevState.chefEntities || []).map(c => ({ ...c, stamina: c.stamina ?? 100 }));
      let cleanerEntities = (prevState.cleanerEntities || []).map(c => ({ ...c, stamina: c.stamina ?? 100 }));

      if (newState.isRestaurantOpen) {
        newState.time += delta * 2;
        if (newState.time >= 100) {
          newState.time = 0;
          newState.day += 1;
          
          // Calculate End-of-Day Summary
          const dayServed = newState.dayStats.served || 0;
          const dayLost = newState.dayStats.lost || 0;
          const totalCustomers = dayServed + dayLost;
          const starRating = totalCustomers > 0 
            ? Math.min(5, Math.max(1, Math.round((dayServed / totalCustomers) * 5 * 10) / 10))
            : 5;

          let topDish: string | undefined = undefined;
          let maxSold = 0;
          for (const [recId, qty] of Object.entries(newState.dayStats.itemsSold || {})) {
            if (qty > maxSold) {
              maxSold = qty;
              const rec = recipes.find(r => r.id === recId);
              topDish = rec ? rec.name : recId;
            }
          }

          newState.daySummary = {
            day: newState.day - 1,
            week: Math.floor((newState.day - 2) / 7) + 1,
            revenue: newState.dayStats.revenue || 0,
            tips: newState.dayStats.tips || 0,
            served: dayServed,
            lost: dayLost,
            starRating,
            topDish
          };

          // Reset day stats for fresh morning shift
          newState.dayStats = {
            revenue: 0,
            tips: 0,
            served: 0,
            lost: 0,
            itemsSold: {}
          };
          
          if (newState.day % 7 === 3 && newState.day > 7) {
            const totalSalaries = (staff.waiters * SALARIES.waiter * 7) + (staff.chefs * SALARIES.chef * 7) + ((staff.cleaners || 0) * SALARIES.cleaner * 7) + (staff.hasManager ? SALARIES.manager * 7 : 0);
            newState.money -= totalSalaries;
            newState.stats.salaryCosts += totalSalaries;
            newState.stats.totalExpenses += totalSalaries;
          }

          let spoiledCost = 0;
          for (const ing in newState.inventory) {
            const qty = newState.inventory[ing] || 0;
            if (qty > 5) {
                const spoiledQty = Math.floor(qty * 0.1); 
                newState.inventory[ing] -= spoiledQty;
                
                // Spoilage uses exact FIFO math to find the cost of the rotten items!
                const res = consumeFIFO(newState.inventoryBatches[ing] || [], spoiledQty);
                newState.inventoryBatches[ing] = res.remainingBatches;
                spoiledCost += res.costConsumed;
            }
          }
          newState.stats.spoilageCosts = (newState.stats.spoilageCosts || 0) + spoiledCost;
          newState.stats.totalExpenses += spoiledCost;
        }
      }

      // --- SPAWN DINE-IN CUSTOMERS ---
      const emptyTables = tables.filter((t) => t.customerId === null && !t.isDirty);
      if (newState.isRestaurantOpen && emptyTables.length > 0) {
        const spawnChance = (0.05 + upgrades.spawnRate * 0.02) * delta;
        if (Math.random() < spawnChance) {
          const table = emptyTables[Math.floor(Math.random() * emptyTables.length)];
          const targetX = mapPos(table.x);
          const targetZ = mapPos(table.y);
          const walkTime = (11 + Math.abs(targetZ - 14) + Math.abs(targetX)) / 4;
          const isVIP = Math.random() < 0.10;

          const newCustomer: Customer = {
            id: `c_${Date.now()}_${Math.random()}`, state: 'entering', 
            patience: isVIP ? 50 : 100, maxPatience: isVIP ? 50 : 100,
            tableId: table.id, actionTimer: walkTime, currentBill: 0, isVIP, vipBonus: 0,
            partySize: Math.floor(Math.random() * 4) + 1,
            tipModifier: 1
          };
          customers.push(newCustomer);
          tables = tables.map((t) => (t.id === table.id ? { ...t, customerId: newCustomer.id } : t));
          sounds.playDoorChime();
        }
      }

      // --- SPAWN ONLINE ORDERS ---
      if (newState.isRestaurantOpen && unlockedApps.length > 0) {
        const appToRoll = unlockedApps[Math.floor(Math.random() * unlockedApps.length)];
        const appData = ONLINE_APPS[appToRoll as keyof typeof ONLINE_APPS];
        if (Math.random() < (0.03 * appData.spawnMultiplier) * delta) {
          const pseudoTableId = `online_${appToRoll}_${Date.now()}`;
          const vcId = `vc_${Date.now()}`;
          const unlockedRecipes = recipes.filter(r => r.unlocked);
          
          if (unlockedRecipes.length > 0) {
             let itemsToOrder = 1 + (Math.random() > 0.4 ? 1 : 0) + (Math.random() > 0.8 ? 1 : 0);
             let bill = 0, orderedCount = 0;

             for (let j = 0; j < itemsToOrder; j++) {
                const availableRecipes = unlockedRecipes.filter(r => Object.entries(r.ingredients).every(([ing, qty]) => (newState.inventory[ing] || 0) >= qty));
                if (availableRecipes.length > 0) {
                  const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
                  
                  // FIX: Online Orders use FIFO math to consume ingredients!
                  Object.entries(randomRecipe.ingredients).forEach(([ing, qty]) => {
                    newState.inventory[ing] -= qty;
                    const res = consumeFIFO(newState.inventoryBatches[ing] || [], qty);
                    newState.inventoryBatches[ing] = res.remainingBatches;
                  });
                  
                  const finalPrice = randomRecipe.price + upgrades.mealPrice;
                  orders.push({
                    id: `o_${Date.now()}_${Math.random()}`, customerId: vcId, tableId: pseudoTableId,
                    recipeId: randomRecipe.id, state: 'pending', progress: 0, isOnFire: false, price: finalPrice
                  });
                  bill += finalPrice;
                  orderedCount++;
                }
             }
             if (orderedCount > 0) customers.push({ id: vcId, state: 'waiting_food', patience: 9999, maxPatience: 9999, tableId: pseudoTableId, actionTimer: 0, currentBill: bill, isVIP: false, vipBonus: 0, partySize: 1 });
          }
        }
      }

      let earnedThisTick = 0, feesThisTick = 0, lostThisTick = 0, servedThisTick = 0, tipsThisTick = 0, vipBonusThisTick = 0;

      // --- CUSTOMER LOGIC & EATING ---
      customers = customers.map((c) => {
        let newC = { ...c };
        if (newC.state === 'entering') {
          newC.actionTimer -= delta;
          if (newC.actionTimer <= 0) newC.state = 'waiting_order';
        } else if (newC.state === 'leaving') {
          newC.actionTimer -= delta;
        } else if ((newC.state === 'waiting_order' || newC.state === 'waiting_food') && !newC.tableId.startsWith('online_')) {
          newC.patience -= 5 * delta;
          if (newC.state === 'waiting_order' && newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            newC.actionTimer = (11 + Math.abs((table ? mapPos(table.y) : 0) - 14) + Math.abs((table ? mapPos(table.x) : 0))) / 4;
            lostThisTick += (newC.partySize || 1);
            tables = tables.map(t => t.id === newC.tableId ? { ...t, isDirty: true } : t);
          }
        } else if (newC.state === 'eating' && !newC.tableId.startsWith('online_')) {
          newC.patience -= 15 * delta;
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            newC.actionTimer = (11 + Math.abs((table ? mapPos(table.y) : 0) - 14) + Math.abs((table ? mapPos(table.x) : 0))) / 4;
            tables = tables.map(t => t.id === newC.tableId ? { ...t, isDirty: true } : t);
            
            const mealEarnings = newC.currentBill || 0;
            const vipEarnings = newC.vipBonus || 0;
            
            const tipMod = newC.tipModifier !== undefined ? newC.tipModifier : 1;
            let tip = 0;
            if (tipMod > 0) {
              if (Math.random() < (0.5 * tipMod)) {
                tip = Math.floor((mealEarnings + vipEarnings) * (0.1 + Math.random() * 0.2) * tipMod);
              }
            }
            
            tipsThisTick += tip; vipBonusThisTick += vipEarnings; earnedThisTick += mealEarnings + vipEarnings + tip; 
            servedThisTick += (newC.partySize || 1); 

            if (table) {
              newFloatingEvents.push({
                id: `ev_${Date.now()}_${Math.random()}`,
                x: mapPos(table.x),
                z: mapPos(table.y),
                text: `+$${mealEarnings + vipEarnings}`,
                subtext: tip > 0 ? `+Tip $${tip} 💖` : (newC.isVIP ? 'VIP ⭐' : undefined),
                color: '#22c55e',
                createdAt: Date.now()
              });
            }
          }
        } else if (newC.state === 'eating' && newC.tableId.startsWith('online_')) {
          newC.actionTimer -= delta;
          if (newC.actionTimer <= 0) {
             newC.state = 'leaving'; newC.actionTimer = 0; 
             const appName = newC.tableId.split('_')[1];
             const feePercent = (ONLINE_APPS[appName as keyof typeof ONLINE_APPS] || ONLINE_APPS.bitedash).fee;
             const gross = newC.currentBill || 0;
             const fee = gross * feePercent;
             earnedThisTick += gross; feesThisTick += fee;
             newState.stats.onlineEarned = (newState.stats.onlineEarned || 0) + gross;
             newState.stats.onlineFees = (newState.stats.onlineFees || 0) + fee;
             
             orders.filter(o => o.tableId === newC.tableId).forEach(o => {
                newState.stats.itemsSold[o.recipeId] = (newState.stats.itemsSold[o.recipeId] || 0) + 1;
                newState.stats.itemRevenues[o.recipeId] = (newState.stats.itemRevenues[o.recipeId] || 0) + o.price;
             });
          }
        }
        return newC;
      });

      const actuallyLeaving = customers.filter((c) => c.state === 'leaving' && c.actionTimer <= 0);
      customers = customers.filter((c) => !(c.state === 'leaving' && c.actionTimer <= 0));
      actuallyLeaving.forEach((c) => {
        tables = tables.map((t) => (t.id === c.tableId ? { ...t, customerId: null } : t));
        orders = orders.filter((o) => o.customerId !== c.id);
      });

      // --- AUTO-DISPATCH ONLINE ORDERS ---
      const readyOnlineTables = [...new Set(orders.filter(o => o.state === 'ready' && o.tableId.startsWith('online_')).map(o => o.tableId))];
      for (const tId of readyOnlineTables) {
         if (orders.filter(o => o.tableId === tId).every(o => o.state === 'ready')) {
            const customerIndex = customers.findIndex(c => c.tableId === tId);
            if (customerIndex !== -1 && customers[customerIndex].state === 'waiting_food') {
               customers[customerIndex] = { ...customers[customerIndex], state: 'eating', actionTimer: 2.5 };
            }
         }
      }

      // --- WAITER AUTOMATION & STAMINA ---
      for (let i = 0; i < waiterEntities.length; i++) {
        let w = waiterEntities[i];
        if (w.state === 'on_break') {
          w.stamina = Math.min(100, w.stamina + 20 * delta);
          if (w.stamina >= 100) w.state = 'idle';
          continue;
        }

        const WAITER_SPEED = 5 * (w.stamina <= 20 ? 0.4 : 1);
        let moving = false;
        
        if (w.state === 'idle') {
          const tablesWithReadyOrders = [...new Set(orders.filter(o => o.state === 'ready' && !o.tableId.startsWith('online_')).map(o => o.tableId))];
          let tableToServe = null;
          for (const tId of tablesWithReadyOrders) {
            if (orders.filter(o => o.tableId === tId).every(o => o.state === 'ready') && !waiterEntities.some(other => other.targetTableId === tId && (other.state === 'walking_to_counter_with_order' || other.state === 'walking_to_serve'))) {
              tableToServe = tId; break;
            }
          }
          if (tableToServe) { w.state = 'walking_to_counter_with_order'; w.targetTableId = tableToServe; } 
          else {
            const waitingCustomer = customers.find(c => c.state === 'waiting_order' && !waiterEntities.some(other => other.targetTableId === c.tableId));
            if (waitingCustomer) { w.state = 'walking_to_order'; w.targetTableId = waitingCustomer.tableId; }
          }
        }

        if (w.state === 'walking_to_order' || w.state === 'walking_to_serve') {
          if (w.state === 'walking_to_order') {
            const stillWaiting = customers.some(c => c.tableId === w.targetTableId && c.state === 'waiting_order');
            if (!stillWaiting) { w.state = 'idle'; w.targetTableId = null; continue; }
          }

          const table = tables.find(t => t.id === w.targetTableId);
          if (!table) { w.state = 'idle'; w.targetTableId = null; } 
          else {
            const targetTableX = mapPos(table.x) - 1.4;
            const targetTableY = mapPos(table.y);
            const dist = Math.sqrt(Math.pow(targetTableX - w.x, 2) + Math.pow(targetTableY - w.y, 2));
            if (dist < 0.45) {
              if (w.state === 'walking_to_order') { w.state = 'taking_order'; w.actionTimer = 2; }
              else {
                orders.filter(o => o.tableId === w.targetTableId && o.state === 'ready').forEach(targetOrder => {
                  customers = customers.map(cust => {
                    if (cust.id === targetOrder.customerId) {
                      let tipMod = 1;
                      if (cust.patience < -30) tipMod = 0; 
                      else if (cust.patience <= 0) tipMod = 0.5; 
                      return { ...cust, state: 'eating', patience: cust.maxPatience, tipModifier: tipMod };
                    }
                    return cust;
                  });
                  newState.stats.itemsSold[targetOrder.recipeId] = (newState.stats.itemsSold[targetOrder.recipeId] || 0) + 1;
                  newState.stats.itemRevenues[targetOrder.recipeId] = (newState.stats.itemRevenues[targetOrder.recipeId] || 0) + targetOrder.price;
                });
                orders = orders.filter(ord => ord.tableId !== w.targetTableId);
                w.state = 'walking_to_counter_empty'; w.targetTableId = null;
              }
            } else {
              w.x += ((targetTableX - w.x) / dist) * WAITER_SPEED * delta;
              w.y += ((targetTableY - w.y) / dist) * WAITER_SPEED * delta;
              moving = true;
            }
          }
        }

        if (w.state === 'taking_order') {
          w.actionTimer = (w.actionTimer || 0) - delta;
          if (w.actionTimer <= 0) {
            const tableCustomers = customers.filter(c => c.tableId === w.targetTableId && c.state === 'waiting_order');
            
            if (tableCustomers.length === 0) {
              w.state = 'idle'; w.targetTableId = null; continue; 
            }

            tableCustomers.forEach(targetCustomer => {
              const unlockedRecipes = recipes.filter(r => r.unlocked);
              
              let itemsToOrder = targetCustomer.partySize || 1;
              for (let p = 0; p < (targetCustomer.partySize || 1); p++) {
                if (Math.random() > 0.5) itemsToOrder++;
              }

              let bill = 0, bonus = 0, orderedCount = 0;

              for (let j = 0; j < itemsToOrder; j++) {
                const availableRecipes = unlockedRecipes.filter(r => Object.entries(r.ingredients).every(([ing, qty]) => (newState.inventory[ing] || 0) >= qty));
                if (availableRecipes.length > 0) {
                  const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
                  
                  // FIX: Waiters use FIFO math to consume ingredients!
                  Object.entries(randomRecipe.ingredients).forEach(([ing, qty]) => {
                    newState.inventory[ing] -= qty;
                    const res = consumeFIFO(newState.inventoryBatches[ing] || [], qty);
                    newState.inventoryBatches[ing] = res.remainingBatches;
                  });
                  
                  const basePrice = randomRecipe.price + upgrades.mealPrice;
                  const itemBonus = targetCustomer.isVIP ? basePrice * 2 : 0; 
                  orders.push({ id: `o_${Date.now()}_${Math.random()}`, customerId: targetCustomer.id, tableId: targetCustomer.tableId, recipeId: randomRecipe.id, state: 'pending', progress: 0, isOnFire: false, price: basePrice });
                  bill += basePrice; bonus += itemBonus; orderedCount++;
                }
              }
              if (orderedCount > 0) { 
                customers = customers.map(cust => cust.id === targetCustomer.id ? { 
                  ...cust, state: 'waiting_food', patience: cust.maxPatience * 1.5, currentBill: bill, vipBonus: bonus 
                } : cust); 
              } else {
                customers = customers.map(cust => cust.id === targetCustomer.id ? { ...cust, state: 'leaving', actionTimer: 5 } : cust); 
                lostThisTick += (targetCustomer.partySize || 1);
              }
            });
            w.state = 'walking_to_counter_empty'; w.targetTableId = null;
          }
        }

        if (w.state === 'walking_to_counter_empty' || w.state === 'walking_to_counter_with_order') {
          const counterStationX = -6 + (i * 2.2);
          const counterStationY = -8;
          const dist = Math.sqrt(Math.pow(counterStationX - w.x, 2) + Math.pow(counterStationY - w.y, 2));
          if (dist < 0.5) {
            if (w.state === 'walking_to_counter_empty') w.state = 'idle';
            else if (orders.some(o => o.tableId === w.targetTableId && o.state === 'ready')) w.state = 'walking_to_serve';
            else { w.state = 'idle'; w.targetTableId = null; }
          } else {
            w.x += ((counterStationX - w.x) / dist) * WAITER_SPEED * delta;
            w.y += ((counterStationY - w.y) / dist) * WAITER_SPEED * delta;
            moving = true;
          }
        }
        if (moving) w.stamina = Math.max(0, w.stamina - 1 * delta);
      }

      // --- CLEANERS AUTOMATION & STAMINA ---
      for (let i = 0; i < cleanerEntities.length; i++) {
        let c = cleanerEntities[i];
        if (c.state === 'on_break') {
            c.stamina = Math.min(100, c.stamina + 20 * delta);
            if (c.stamina >= 100) c.state = 'idle';
            continue;
        }
        const CLEANER_SPEED = 4 * (c.stamina <= 20 ? 0.4 : 1);
        let moving = false;

        if (c.state === 'idle') {
            const dirtyTable = tables.find(t => t.isDirty && !cleanerEntities.some(oc => oc.targetTableId === t.id));
            if (dirtyTable) { c.targetTableId = dirtyTable.id; c.state = 'walking_to_table'; } 
            else {
                const tx = -8, ty = -2 + i * 2;
                if (Math.abs(c.x - tx) > 0.1 || Math.abs(c.y - ty) > 0.1) c.state = 'walking_to_counter';
            }
        }

        if (c.state === 'walking_to_table') {
            const table = tables.find(t => t.id === c.targetTableId);
            if (!table || !table.isDirty) { c.state = 'idle'; c.targetTableId = null; } 
            else {
                const targetX = mapPos(table.x) + 1.2, targetY = mapPos(table.y);
                const dist = Math.sqrt(Math.pow(targetX - c.x, 2) + Math.pow(targetY - c.y, 2));
                if (dist < 0.5) { c.state = 'cleaning'; c.actionTimer = 2; } 
                else { c.x += ((targetX - c.x)/dist) * CLEANER_SPEED * delta; c.y += ((targetY - c.y)/dist) * CLEANER_SPEED * delta; moving = true; }
            }
        }

        if (c.state === 'cleaning') {
            c.actionTimer = (c.actionTimer || 0) - delta;
            c.stamina = Math.max(0, c.stamina - 2 * delta); 
            if (c.actionTimer <= 0) {
                tables = tables.map(t => t.id === c.targetTableId ? { ...t, isDirty: false } : t);
                c.state = 'idle'; c.targetTableId = null;
            }
        }

        if (c.state === 'walking_to_counter') {
            const tx = -8, ty = -2 + i * 2;
            const dist = Math.sqrt(Math.pow(tx - c.x, 2) + Math.pow(ty - c.y, 2));
            if (dist < 0.5) { c.x = tx; c.y = ty; c.state = 'idle'; } 
            else { c.x += ((tx - c.x)/dist) * CLEANER_SPEED * delta; c.y += ((ty - c.y)/dist) * CLEANER_SPEED * delta; moving = true; }
        }
        if (moving) c.stamina = Math.max(0, c.stamina - 1 * delta);
      }

      // --- CHEFS COOKING & STAMINA ---
      let availableChefPower = 0;
      let activelyCooking = orders.some(o => o.state === 'cooking' || o.state === 'pending');

      for (let i = 0; i < chefEntities.length; i++) {
        let chef = chefEntities[i];
        if (chef.state === 'on_break') {
            chef.stamina = Math.min(100, chef.stamina + 20 * delta);
            if (chef.stamina >= 100) chef.state = 'idle';
        } else {
            const power = chef.stamina <= 20 ? 0.4 : 1;
            availableChefPower += power * upgrades.cookingSpeed * delta * 20;
            if (activelyCooking) chef.stamina = Math.max(0, chef.stamina - 1 * delta);
        }
      }

      if (availableChefPower > 0) {
        orders = orders.map(o => (o.state === 'pending' ? { ...o, state: 'cooking' as const } : o)).map(o => {
          if (o.state === 'cooking') {
            if (o.isOnFire) return o;
            if (Math.random() < 0.0005) return { ...o, isOnFire: true };
            const recipe = recipes.find(r => r.id === o.recipeId) || recipes[0];
            const progressToAdd = Math.min(100 - o.progress, availableChefPower / recipe.cookingTime);
            availableChefPower -= progressToAdd * recipe.cookingTime;
            const newProgress = o.progress + progressToAdd;
            const newState: 'ready' | 'cooking' = newProgress >= 100 ? 'ready' : 'cooking';
            return { ...o, progress: newProgress, state: newState };
          }
          return o;
        });
      }

      // --- MANAGER INVENTORY AUTO-BUY ---
      if (staff.hasManager) {
        const neededIngredients = new Set<string>();
        recipes.filter(r => r.unlocked).forEach(r => Object.keys(r.ingredients).forEach(ingId => neededIngredients.add(ingId)));
        neededIngredients.forEach(ingId => {
          const qty = newState.inventory[ingId] || 0;
          if (qty < 20) {
            const actualCost = (INGREDIENTS[ingId]?.cost || 0) * 20; 
            if (newState.money >= actualCost) {
              newState.money -= actualCost; 
              
              // FIX: Manager auto-buys add a new batch to the FIFO queue (at base cost since managers don't get discounts)
              const unitCost = INGREDIENTS[ingId]?.cost || 0;
              newState.inventory[ingId] = qty + 20;
              newState.inventoryBatches[ingId] = [...(newState.inventoryBatches[ingId] || []), { qty: 20, costPerUnit: unitCost }];
              
              newState.stats.inventoryCosts += actualCost; 
              newState.stats.totalExpenses += actualCost;
            }
          }
        });
      }

      newState.tables = tables; newState.customers = customers; newState.orders = orders;
      newState.waiterEntities = waiterEntities; newState.chefEntities = chefEntities; newState.cleanerEntities = cleanerEntities;
      
      newState.money += earnedThisTick; newState.money -= feesThisTick;
      newState.stats.customersServed += servedThisTick; newState.stats.customersLost += lostThisTick;
      newState.stats.totalEarned += earnedThisTick; newState.stats.totalTips += tipsThisTick;
      newState.stats.vipBonus += vipBonusThisTick; newState.stats.totalExpenses += feesThisTick;

      if (newState.dayStats) {
        newState.dayStats.revenue = (newState.dayStats.revenue || 0) + earnedThisTick;
        newState.dayStats.tips = (newState.dayStats.tips || 0) + tipsThisTick;
        newState.dayStats.served = (newState.dayStats.served || 0) + servedThisTick;
        newState.dayStats.lost = (newState.dayStats.lost || 0) + lostThisTick;
      }

      if (earnedThisTick > 0) {
        sounds.playCashRegister();
      }

      const nowTime = Date.now();
      newState.floatingEvents = [
        ...(newState.floatingEvents || []).filter(e => nowTime - e.createdAt < 3000),
        ...newFloatingEvents
      ];

      return newState;
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(gameTick, 100);
    return () => clearInterval(intervalId);
  }, [gameTick]);

  const takeOrder = (customerId: string) => {
    setState(prev => {
      const customer = prev.customers.find(c => c.id === customerId);
      if (!customer || customer.state !== 'waiting_order') return prev;
      const unlockedRecipes = prev.recipes.filter(r => r.unlocked);
      if (unlockedRecipes.length === 0) return prev;

      let itemsToOrder = customer.partySize || 1;
      for (let p = 0; p < (customer.partySize || 1); p++) {
        if (Math.random() > 0.5) itemsToOrder++;
      }

      let bill = 0;
      let bonus = 0;
      const newOrders: Order[] = [];
      const tempInv = { ...prev.inventory };
      const tempBatches = { ...prev.inventoryBatches };

      for (let j = 0; j < itemsToOrder; j++) {
        const availableRecipes = unlockedRecipes.filter(r => Object.entries(r.ingredients).every(([ing, qty]) => (tempInv[ing] || 0) >= qty));
        if (availableRecipes.length > 0) {
          const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
          
          // FIX: Manual Orders use FIFO math!
          Object.entries(randomRecipe.ingredients).forEach(([ing, qty]) => {
            tempInv[ing] -= qty;
            const res = consumeFIFO(tempBatches[ing] || [], qty);
            tempBatches[ing] = res.remainingBatches;
          });

          const basePrice = randomRecipe.price + prev.upgrades.mealPrice;
          const itemBonus = customer.isVIP ? basePrice * 2 : 0; 
          newOrders.push({ id: `o_${Date.now()}_${Math.random()}`, customerId: customer.id, tableId: customer.tableId, recipeId: randomRecipe.id, state: 'pending', progress: 0, isOnFire: false, price: basePrice });
          bill += basePrice;
          bonus += itemBonus;
        }
      }

      if (newOrders.length === 0) {
         return {
           ...prev,
           customers: prev.customers.map(c => c.id === customerId ? { ...c, state: 'leaving', actionTimer: 5 } : c)
         };
      }

      return {
        ...prev,
        inventory: tempInv,
        inventoryBatches: tempBatches, // Save the updated FIFO queues!
        customers: prev.customers.map(c => c.id === customerId ? { ...c, state: 'waiting_food', patience: c.maxPatience * 1.5, currentBill: bill, vipBonus: bonus } : c),
        orders: [...prev.orders, ...newOrders]
      };
    });
  };

  const serveFood = (orderId: string) => {
    sounds.playCashRegister();
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order || order.state !== 'ready') return prev;
      let newStats = { ...prev.stats, itemsSold: { ...(prev.stats.itemsSold || {}) }, itemRevenues: { ...(prev.stats.itemRevenues || {}) } };
      newStats.itemsSold[order.recipeId] = (newStats.itemsSold[order.recipeId] || 0) + 1;
      newStats.itemRevenues[order.recipeId] = (newStats.itemRevenues[order.recipeId] || 0) + order.price;
      return {
        ...prev, orders: prev.orders.filter(o => o.id !== orderId),
        customers: prev.customers.map(c => {
          if (c.id === order.customerId) {
            let tipMod = 1;
            if (c.patience < -30) tipMod = 0;
            else if (c.patience <= 0) tipMod = 0.5;
            return { ...c, state: 'eating', patience: c.maxPatience, tipModifier: tipMod };
          }
          return c;
        }), stats: newStats
      };
    });
  };

  const cookOrder = (orderId: string) => {
     sounds.playCooking();
     setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order || order.state === 'ready') return prev;
      const recipe = prev.recipes.find(r => r.id === order.recipeId) || prev.recipes[0];
      const newProgress = Math.min(100, order.progress + (prev.upgrades.cookingSpeed * 15) / recipe.cookingTime);
      if (newProgress >= 100) {
        sounds.playOrderReady();
      }
      return { ...prev, orders: prev.orders.map(o => o.id === orderId ? { ...o, state: newProgress >= 100 ? 'ready' : 'cooking', progress: newProgress } : o) };
    });
  };

  const buyUpgrade = (type: 'table' | 'waiter' | 'chef' | 'cleaner') => {
    sounds.playUpgrade();
    setState(prev => {
      let cost = 0, newState = { ...prev, staff: { ...prev.staff }, stats: { ...prev.stats } };
      switch (type) {
        case 'table':
          cost = UPGRADE_COSTS.table(prev.tables.length);
          if (prev.money >= cost && prev.tables.length < TABLE_POSITIONS.length) {
            newState.money -= cost; newState.stats.upgradeCosts += cost;
            const pos = TABLE_POSITIONS[prev.tables.length];
            newState.tables = [...prev.tables, { id: `t_${Date.now()}`, customerId: null, x: pos.x, y: pos.y, isDirty: false }];
          }
          break;
        case 'waiter':
          if (prev.money >= cost) {
            newState.staff.waiters += 1;
            newState.waiterEntities = [...(prev.waiterEntities||[]), { id: `w_${Date.now()}`, state: 'idle', targetCustomerId: null, targetOrderId: null, x: -5 + newState.staff.waiters * 2, y: -8, stamina: 100 }];
          }
          break;
        case 'chef':
          if (prev.money >= cost) {
            newState.staff.chefs += 1;
            newState.chefEntities = [...(prev.chefEntities||[]), { id: `chef_${Date.now()}`, state: 'idle', stamina: 100 }];
          }
          break;
        case 'cleaner':
          if (prev.money >= cost && (prev.staff.cleaners || 0) < 3) {
            newState.staff.cleaners = (newState.staff.cleaners || 0) + 1;
            newState.cleanerEntities = [...(prev.cleanerEntities||[]), { id: `cln_${Date.now()}`, state: 'idle', targetTableId: null, actionTimer: 0, x: -8, y: -2 + newState.staff.cleaners * 2, stamina: 100 }];
          }
          break;
      }
      return newState;
    });
  };

  const buyLevelUpgrade = (type: 'mealPrice' | 'cookingSpeed' | 'spawnRate', currentLevel: number) => {
     sounds.playUpgrade();
     setState(prev => {
      let cost = UPGRADE_COSTS[type](currentLevel);
      if (prev.money >= cost) {
        return {
          ...prev, money: prev.money - cost,
          stats: { ...prev.stats, upgradeCosts: prev.stats.upgradeCosts + cost, totalExpenses: prev.stats.totalExpenses + cost },
          upgrades: { ...prev.upgrades, [type]: type === 'mealPrice' ? prev.upgrades.mealPrice + 5 : type === 'cookingSpeed' ? prev.upgrades.cookingSpeed + 0.5 : prev.upgrades.spawnRate + 0.5 }
        };
      }
      return prev;
     });
  };

  const sendOnBreak = (entityId: string, type: 'waiter' | 'chef' | 'cleaner') => {
      setState(prev => {
          if (type === 'waiter') return { ...prev, waiterEntities: prev.waiterEntities.map(e => e.id === entityId ? { ...e, state: 'on_break' } : e) };
          if (type === 'chef') return { ...prev, chefEntities: prev.chefEntities.map(e => e.id === entityId ? { ...e, state: 'on_break' } : e) };
          if (type === 'cleaner') return { ...prev, cleanerEntities: prev.cleanerEntities.map(e => e.id === entityId ? { ...e, state: 'on_break' } : e) };
          return prev;
      });
  };

  const hireManager = () => {
    sounds.playUpgrade();
    setState(prev => ({ ...prev, staff: { ...prev.staff, hasManager: true } }));
  };

  const setRestaurantLayout = (layoutIndex: number) => setState(prev => ({ ...prev, restaurantLayout: layoutIndex }));
  const setWallColor = (color: string | null) => setState(prev => ({ ...prev, wallColor: color }));
  const setFrameColor = (color: string | null) => setState(prev => ({ ...prev, frameColor: color }));
  const toggleRestaurantState = () => {
    sounds.playClick();
    setState(prev => ({ ...prev, isRestaurantOpen: !prev.isRestaurantOpen }));
  };

  const cleanTable = (tableId: string) => {
    sounds.playCleanSparkle();
    setState(prev => {
      const table = prev.tables.find(t => t.id === tableId);
      const newFloating = [...(prev.floatingEvents || [])];
      if (table) {
        newFloating.push({
          id: `clean_${Date.now()}_${Math.random()}`,
          x: mapPos(table.x),
          z: mapPos(table.y),
          text: '✨ Sparkle Clean!',
          color: '#38bdf8',
          createdAt: Date.now()
        });
      }
      return {
        ...prev,
        floatingEvents: newFloating,
        tables: prev.tables.map(t => t.id === tableId ? { ...t, isDirty: false } : t)
      };
    });
  };

  const extinguishFire = (orderId: string) => {
    sounds.playExtinguish();
    setState(prev => ({ ...prev, orders: prev.orders.map(o => o.id === orderId ? { ...o, isOnFire: false } : o) }));
  };

  const unlockRecipe = (recipeId: string) => {
    sounds.playUpgrade();
    setState(prev => {
      const recipe = prev.recipes.find(r => r.id === recipeId);
      if (!recipe || recipe.unlocked || prev.money < recipe.unlockCost) return prev;
      return { ...prev, money: prev.money - recipe.unlockCost, stats: { ...prev.stats, recipeCosts: prev.stats.recipeCosts + recipe.unlockCost, totalExpenses: prev.stats.totalExpenses + recipe.unlockCost }, recipes: prev.recipes.map(r => r.id === recipeId ? { ...r, unlocked: true } : r) };
    });
  };

  const buyIngredient = (ingredientId: string, amount: number, discount: number = 0) => {
    sounds.playClick();
    setState(prev => {
      const ingredient = INGREDIENTS[ingredientId];
      if (!ingredient) return prev;
      
      const actualCost = (ingredient.cost * amount) * (1 - discount);
      const unitCost = actualCost / amount; // Exact price per unit for this specific batch
      
      if (prev.money >= actualCost) {
        const oldQty = prev.inventory[ingredientId] || 0;
        const newQty = oldQty + amount;
        
        // Push the new exact-cost batch to the back of the queue!
        const updatedBatches = [...(prev.inventoryBatches[ingredientId] || []), { qty: amount, costPerUnit: unitCost }];

        return { 
          ...prev, 
          money: prev.money - actualCost, 
          stats: { 
            ...prev.stats, 
            inventoryCosts: prev.stats.inventoryCosts + actualCost, 
            totalExpenses: prev.stats.totalExpenses + actualCost 
          }, 
          inventory: { 
            ...prev.inventory, 
            [ingredientId]: newQty 
          },
          inventoryBatches: {
            ...prev.inventoryBatches,
            [ingredientId]: updatedBatches
          }
        };
      }
      return prev;
    });
  };

  const unlockApp = (appId: string) => {
    sounds.playUpgrade();
    setState(prev => {
       if (prev.unlockedApps.includes(appId)) return prev;
       const app = ONLINE_APPS[appId as keyof typeof ONLINE_APPS];
       if (prev.money >= app.cost) {
          return { ...prev, money: prev.money - app.cost, unlockedApps: [...prev.unlockedApps, appId], stats: { ...prev.stats, appCosts: (prev.stats.appCosts || 0) + app.cost, totalExpenses: prev.stats.totalExpenses + app.cost } };
       }
       return prev;
    });
  };

  const changeRecipePrice = (recipeId: string, newPrice: number) => {
    setState(prev => ({
      ...prev,
      recipes: prev.recipes.map(r => 
        r.id === recipeId ? { ...r, price: Math.max((r as any).basePrice || r.price, newPrice) } : r
      )
    }));
  };

  const payResearchCost = (cost: number) => {
    setState(prev => ({
      ...prev,
      money: prev.money - cost,
      stats: {
        ...prev.stats,
        recipeCosts: prev.stats.recipeCosts + cost,
        totalExpenses: prev.stats.totalExpenses + cost
      }
    }));
  };

  const addCustomRecipe = (recipe: Recipe) => {
    setState(prev => ({
      ...prev,
      recipes: [...prev.recipes, recipe].sort((a, b) => (a as any).basePrice - (b as any).basePrice)
    }));
  };

  const setGameSpeed = (speed: number) => {
    sounds.playClick();
    setState(prev => ({ ...prev, gameSpeed: speed }));
  };

  const dismissDaySummary = () => {
    sounds.playClick();
    setState(prev => ({ ...prev, daySummary: null }));
  };

  const removeFloatingEvent = (id: string) => {
    setState(prev => ({ ...prev, floatingEvents: (prev.floatingEvents || []).filter(e => e.id !== id) }));
  };

  return { 
    state, 
    actions: { 
      takeOrder, 
      serveFood, 
      cookOrder, 
      buyUpgrade, 
      buyLevelUpgrade, 
      hireManager, 
      unlockRecipe, 
      buyIngredient, 
      setRestaurantLayout, 
      setWallColor, 
      setFrameColor, 
      toggleRestaurantState, 
      unlockApp, 
      cleanTable, 
      extinguishFire, 
      sendOnBreak, 
      changeRecipePrice, 
      payResearchCost, 
      addCustomRecipe,
      setGameSpeed,
      dismissDaySummary,
      removeFloatingEvent
    } 
  };
}