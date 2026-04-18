import { useState, useEffect, useCallback, useRef } from 'react';
import { RECIPES, INGREDIENTS, Recipe, Ingredient } from '../data/recipes';

export type CustomerState = 'entering' | 'waiting_order' | 'waiting_food' | 'eating' | 'leaving';

export interface Customer {
  id: string;
  state: CustomerState;
  patience: number;
  maxPatience: number;
  tableId: string;
  actionTimer: number;
  currentBill: number; 
}

export interface Table {
  id: string;
  customerId: string | null;
  x: number;
  y: number;
}

export const TABLE_POSITIONS = [
  { x: 15, y: 70 }, { x: 35, y: 70 }, { x: 55, y: 70 }, { x: 75, y: 70 },
  { x: 25, y: 85 }, { x: 45, y: 85 }, { x: 65, y: 85 }, { x: 85, y: 85 },
  { x: 15, y: 95 }, { x: 35, y: 95 }, { x: 55, y: 95 }, { x: 75, y: 95 },
];

export const mapPos = (percent: number) => (percent / 100) * 20 - 10;

// ONLINE APPS CONFIGURATION
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
}

export interface WaiterEntity {
  id: string;
  state: 'idle' | 'walking_to_order' | 'taking_order' | 'walking_to_counter_with_order' | 'walking_to_serve' | 'walking_to_counter_empty';
  targetCustomerId: string | null;
  targetOrderId: string | null;
  targetTableId?: string | null;
  actionTimer?: number;
  x: number;
  y: number;
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
  unlockedApps: string[];
  staff: {
    waiters: number;
    chefs: number;
    hasManager: boolean;
  };
  waiterEntities: WaiterEntity[];
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
  };
  restaurantLayout: number;
  wallColor: string | null;
  frameColor: string | null;
  isRestaurantOpen: boolean;
}

const INITIAL_STATE: GameState = {
  money: 10000,
  day: 1,
  time: 0,
  tables: [
    { id: 't1', customerId: null, x: TABLE_POSITIONS[0].x, y: TABLE_POSITIONS[0].y },
    { id: 't2', customerId: null, x: TABLE_POSITIONS[1].x, y: TABLE_POSITIONS[1].y },
    { id: 't3', customerId: null, x: TABLE_POSITIONS[2].x, y: TABLE_POSITIONS[2].y },
    { id: 't4', customerId: null, x: TABLE_POSITIONS[3].x, y: TABLE_POSITIONS[3].y },
  ],
  customers: [],
  orders: [],
  recipes: RECIPES,
  inventory: {
    rice: 50, fish: 50, noodle: 50, egg: 50, chicken: 50, soy_sauce: 50,
  },
  unlockedApps: [],
  staff: {
    waiters: 0,
    chefs: 0,
    hasManager: false,
  },
  waiterEntities: [],
  upgrades: {
    mealPrice: 10,
    cookingSpeed: 1,
    spawnRate: 1,
  },
  stats: {
    customersServed: 0, customersLost: 0, totalEarned: 0, totalTips: 0,
    onlineEarned: 0, onlineFees: 0, appCosts: 0,
    totalExpenses: 0, inventoryCosts: 0, recipeCosts: 0, managerCosts: 0,
    salaryCosts: 0, upgradeCosts: 0, itemsSold: {}
  },
  restaurantLayout: 0,
  wallColor: null,
  frameColor: null,
  isRestaurantOpen: false,
};

export const UPGRADE_COSTS = {
  table: (count: number) => Math.floor(50 * Math.pow(1.5, count - 2)),
  waiter: (count: number) => 0, 
  chef: (count: number) => 0, 
  mealPrice: (level: number) => Math.floor(25 * Math.pow(1.4, level)),
  cookingSpeed: (level: number) => Math.floor(40 * Math.pow(1.6, level)),
  spawnRate: (level: number) => Math.floor(30 * Math.pow(1.5, level)),
};

export const SALARIES = {
  waiter: 50,
  chef: 75,
  manager: 200,
};

export function useGameLoop() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const lastTickRef = useRef<number>(Date.now());
  const stateRef = useRef<GameState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const gameTick = useCallback(() => {
    const now = Date.now();
    const delta = Math.min((now - lastTickRef.current) / 1000, 0.5); 
    lastTickRef.current = now;

    setState((prevState) => {
      // FIX: Deep copy itemsSold dictionary so Strict Mode doesn't double-count!
      let newState = { 
        ...prevState,
        stats: { 
          ...prevState.stats,
          itemsSold: { ...(prevState.stats.itemsSold || {}) }
        },
        inventory: { ...prevState.inventory }
      };
      
      let { tables, customers, orders, staff, upgrades, stats, recipes, unlockedApps } = newState;

      if (newState.isRestaurantOpen) {
        newState.time += delta * 2;
        if (newState.time >= 100) {
          newState.time = 0;
          newState.day += 1;
          if (newState.day % 7 === 0) {
            const totalSalaries = (staff.waiters * SALARIES.waiter * 7) + (staff.chefs * SALARIES.chef * 7) + (staff.hasManager ? SALARIES.manager * 7 : 0);
            newState.money -= totalSalaries;
            newState.stats.salaryCosts += totalSalaries;
            newState.stats.totalExpenses += totalSalaries;
          }
        }
      }

      // --- SPAWN DINE-IN CUSTOMERS ---
      const emptyTables = tables.filter((t) => t.customerId === null);
      if (newState.isRestaurantOpen && emptyTables.length > 0) {
        const spawnChance = (0.05 + upgrades.spawnRate * 0.02) * delta;
        if (Math.random() < spawnChance) {
          const table = emptyTables[Math.floor(Math.random() * emptyTables.length)];
          const targetX = mapPos(table.x);
          const targetZ = mapPos(table.y);
          const walkDist = 11 + Math.abs(targetZ - 14) + Math.abs(targetX);
          const walkTime = walkDist / 4;

          const newCustomer: Customer = {
            id: `c_${Date.now()}_${Math.random()}`,
            state: 'entering', patience: 100, maxPatience: 100,
            tableId: table.id, actionTimer: walkTime, currentBill: 0,
          };
          customers = [...customers, newCustomer];
          tables = tables.map((t) => (t.id === table.id ? { ...t, customerId: newCustomer.id } : t));
        }
      }

      // --- SPAWN ONLINE ORDERS ---
      if (newState.isRestaurantOpen && unlockedApps.length > 0) {
        const appToRoll = unlockedApps[Math.floor(Math.random() * unlockedApps.length)];
        const appData = ONLINE_APPS[appToRoll as keyof typeof ONLINE_APPS];
        
        const onlineSpawnChance = (0.03 * appData.spawnMultiplier) * delta;
        if (Math.random() < onlineSpawnChance) {
          const pseudoTableId = `online_${appToRoll}_${Date.now()}`;
          const vcId = `vc_${Date.now()}`;
          
          const unlockedRecipes = recipes.filter(r => r.unlocked);
          if (unlockedRecipes.length > 0) {
             let itemsToOrder = 1;
             if (Math.random() > 0.4) itemsToOrder++; 
             if (Math.random() > 0.8) itemsToOrder++; 

             let bill = 0;
             let orderedCount = 0;

             for (let j = 0; j < itemsToOrder; j++) {
                const availableRecipes = unlockedRecipes.filter(r => {
                  for (const [ing, qty] of Object.entries(r.ingredients)) {
                    if ((newState.inventory[ing] || 0) < qty) return false;
                  }
                  return true;
                });
                
                if (availableRecipes.length > 0) {
                  const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
                  for (const [ing, qty] of Object.entries(randomRecipe.ingredients)) {
                    newState.inventory[ing] -= qty;
                  }
                  orders.push({
                    id: `o_${Date.now()}_${Math.random()}`,
                    customerId: vcId, tableId: pseudoTableId,
                    recipeId: randomRecipe.id, state: 'pending', progress: 0,
                  });
                  bill += (randomRecipe.price + upgrades.mealPrice);
                  orderedCount++;
                }
             }
             
             if (orderedCount > 0) {
               customers.push({
                  id: vcId, state: 'waiting_food', patience: 9999, maxPatience: 9999,
                  tableId: pseudoTableId, actionTimer: 0, currentBill: bill
               });
             }
          }
        }
      }

      let earnedThisTick = 0;
      let feesThisTick = 0;
      let lostThisTick = 0;
      let servedThisTick = 0;
      let tipsThisTick = 0;

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
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            const walkDist = 11 + Math.abs((table ? mapPos(table.y) : 0) - 14) + Math.abs((table ? mapPos(table.x) : 0));
            newC.actionTimer = walkDist / 4;
            lostThisTick += 1;
          }
        } else if (newC.state === 'eating' && !newC.tableId.startsWith('online_')) {
          newC.patience -= 15 * delta;
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            const walkDist = 11 + Math.abs((table ? mapPos(table.y) : 0) - 14) + Math.abs((table ? mapPos(table.x) : 0));
            newC.actionTimer = walkDist / 4;
            
            const mealEarnings = newC.currentBill || 0;
            const tip = Math.random() > 0.5 ? Math.floor(mealEarnings * (0.1 + Math.random() * 0.2)) : 0;
            
            tipsThisTick += tip;
            earnedThisTick += mealEarnings + tip;
            servedThisTick += 1;
          }
        } else if (newC.state === 'eating' && newC.tableId.startsWith('online_')) {
          // ONLINE DRIVER DISPATCH DELAY LOGIC (Waits 2.5 seconds then clears)
          newC.actionTimer -= delta;
          if (newC.actionTimer <= 0) {
             newC.state = 'leaving';
             newC.actionTimer = 0; 
             
             // Process safe online payment
             const appName = newC.tableId.split('_')[1];
             const appConfig = ONLINE_APPS[appName as keyof typeof ONLINE_APPS] || ONLINE_APPS.bitedash;
             const feePercent = appConfig.fee;
             
             const gross = newC.currentBill || 0;
             const fee = gross * feePercent;

             earnedThisTick += gross;
             feesThisTick += fee;
             
             newState.stats.onlineEarned = (newState.stats.onlineEarned || 0) + gross;
             newState.stats.onlineFees = (newState.stats.onlineFees || 0) + fee;
             
             const tOrders = orders.filter(o => o.tableId === newC.tableId);
             tOrders.forEach(o => {
                newState.stats.itemsSold[o.recipeId] = (newState.stats.itemsSold[o.recipeId] || 0) + 1;
             });
          }
        }

        return newC;
      });

      // Clear out customers who have left (including completed online drivers)
      const actuallyLeaving = customers.filter((c) => c.state === 'leaving' && c.actionTimer <= 0);
      customers = customers.filter((c) => !(c.state === 'leaving' && c.actionTimer <= 0));

      actuallyLeaving.forEach((c) => {
        tables = tables.map((t) => (t.id === c.tableId ? { ...t, customerId: null } : t));
        orders = orders.filter((o) => o.customerId !== c.id);
      });

      // --- AUTO-DISPATCH ONLINE ORDERS ---
      const readyOnlineTables = [...new Set(orders.filter(o => o.state === 'ready' && o.tableId.startsWith('online_')).map(o => o.tableId))];
      for (const tId of readyOnlineTables) {
         const tOrders = orders.filter(o => o.tableId === tId);
         const allReady = tOrders.every(o => o.state === 'ready');
         
         if (allReady) {
            const customerIndex = customers.findIndex(c => c.tableId === tId);
            if (customerIndex !== -1 && customers[customerIndex].state === 'waiting_food') {
               // Put them in "eating" state to trigger the Driver 2.5 second delay!
               customers[customerIndex] = {
                  ...customers[customerIndex],
                  state: 'eating',
                  actionTimer: 2.5
               };
            }
         }
      }

      // --- WAITER AUTOMATION ---
      let waiterEntities = prevState.waiterEntities.map(w => ({ ...w }));
      const WAITER_SPEED = 5;

      for (let i = 0; i < waiterEntities.length; i++) {
        let w = waiterEntities[i];
        
        if (w.state === 'idle') {
          // Waiters DO NOT serve online tables!
          const tablesWithReadyOrders = [...new Set(orders.filter(o => o.state === 'ready' && !o.tableId.startsWith('online_')).map(o => o.tableId))];
          let tableToServe = null;
          for (const tId of tablesWithReadyOrders) {
            const tOrders = orders.filter(o => o.tableId === tId);
            const allReady = tOrders.every(o => o.state === 'ready');
            const beingServed = waiterEntities.some(other => other.targetTableId === tId && (other.state === 'walking_to_counter_with_order' || other.state === 'walking_to_serve'));
            if (allReady && !beingServed) {
              tableToServe = tId;
              break;
            }
          }

          if (tableToServe) {
            w.state = 'walking_to_counter_with_order';
            w.targetTableId = tableToServe;
          } else {
            const waitingCustomer = customers.find(c => c.state === 'waiting_order' && !waiterEntities.some(other => other.targetTableId === c.tableId));
            if (waitingCustomer) {
              w.state = 'walking_to_order';
              w.targetTableId = waitingCustomer.tableId;
            }
          }
        }

        if (w.state === 'walking_to_order') {
          const table = tables.find(t => t.id === w.targetTableId);
          if (!table) {
            w.state = 'idle';
            w.targetTableId = null;
          } else {
            const waitingAtTable = customers.some(c => c.tableId === table.id && c.state === 'waiting_order');
            if (!waitingAtTable) {
              w.state = 'idle';
              w.targetTableId = null;
            } else {
              const targetX = mapPos(table.x) - 1.2;
              const targetY = mapPos(table.y);
              const dx = targetX - w.x;
              const dy = targetY - w.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const moveDist = WAITER_SPEED * delta;
              
              if (dist <= moveDist || dist < 0.5) {
                w.x = targetX;
                w.y = targetY;
                w.state = 'taking_order';
                w.actionTimer = 2;
              } else {
                w.x += (dx / dist) * moveDist;
                w.y += (dy / dist) * moveDist;
              }
            }
          }
        }

        if (w.state === 'taking_order') {
          w.actionTimer = (w.actionTimer || 0) - delta;
          if (w.actionTimer <= 0) {
            const tableCustomers = customers.filter(c => c.tableId === w.targetTableId && c.state === 'waiting_order');
            
            tableCustomers.forEach(targetCustomer => {
              const unlockedRecipes = recipes.filter(r => r.unlocked);
              
              let itemsToOrder = 1;
              if (Math.random() > 0.4) itemsToOrder++; 
              if (Math.random() > 0.8) itemsToOrder++; 

              let billForThisCustomer = 0;
              let orderedCount = 0;

              for (let j = 0; j < itemsToOrder; j++) {
                const availableRecipes = unlockedRecipes.filter(r => {
                  for (const [ing, qty] of Object.entries(r.ingredients)) {
                    if ((newState.inventory[ing] || 0) < qty) return false;
                  }
                  return true;
                });
                
                if (availableRecipes.length > 0) {
                  const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
                  
                  for (const [ing, qty] of Object.entries(randomRecipe.ingredients)) {
                    newState.inventory[ing] -= qty;
                  }
                  
                  orders.push({
                    id: `o_${Date.now()}_${Math.random()}`,
                    customerId: targetCustomer.id,
                    tableId: targetCustomer.tableId,
                    recipeId: randomRecipe.id,
                    state: 'pending',
                    progress: 0,
                  });
                  
                  billForThisCustomer += (randomRecipe.price + upgrades.mealPrice);
                  orderedCount++;
                }
              }

              if (orderedCount > 0) {
                customers = customers.map(cust => cust.id === targetCustomer.id ? { 
                  ...cust, 
                  state: 'waiting_food', 
                  patience: cust.maxPatience,
                  currentBill: billForThisCustomer 
                } : cust);
              } else {
                const table = tables.find(t => t.id === targetCustomer.tableId);
                const walkDist = 11 + Math.abs((table ? mapPos(table.y) : 0) - 14) + Math.abs((table ? mapPos(table.x) : 0));
                customers = customers.map(cust => cust.id === targetCustomer.id ? { ...cust, state: 'leaving', actionTimer: (walkDist / 4) + 5 } : cust);
                lostThisTick += 1;
              }
            });

            w.state = 'walking_to_counter_empty';
            w.targetTableId = null;
          }
        }

        if (w.state === 'walking_to_counter_empty') {
          const counterX = -5;
          const counterY = -8;
          const dx = counterX - w.x;
          const dy = counterY - w.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const moveDist = WAITER_SPEED * delta;
          
          if (dist <= moveDist || dist < 0.5) {
            w.x = counterX;
            w.y = counterY;
            w.state = 'idle';
          } else {
            w.x += (dx / dist) * moveDist;
            w.y += (dy / dist) * moveDist;
          }
        }

        if (w.state === 'walking_to_counter_with_order') {
          const tableOrders = orders.filter(o => o.tableId === w.targetTableId && o.state === 'ready');
          if (tableOrders.length === 0) {
            w.state = 'idle';
            w.targetTableId = null;
          } else {
            const counterX = -5;
            const counterY = -8;
            const dx = counterX - w.x;
            const dy = counterY - w.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveDist = WAITER_SPEED * delta;
            
            if (dist <= moveDist || dist < 0.5) {
              w.x = counterX;
              w.y = counterY;
              w.state = 'walking_to_serve';
            } else {
              w.x += (dx / dist) * moveDist;
              w.y += (dy / dist) * moveDist;
            }
          }
        }

        if (w.state === 'walking_to_serve') {
          const tableOrders = orders.filter(o => o.tableId === w.targetTableId && o.state === 'ready');
          if (tableOrders.length === 0) {
            w.state = 'idle';
            w.targetTableId = null;
          } else {
            const table = tables.find(t => t.id === w.targetTableId);
            if (table) {
              const targetX = mapPos(table.x) - 1.2;
              const targetY = mapPos(table.y);
              const dx = targetX - w.x;
              const dy = targetY - w.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const moveDist = WAITER_SPEED * delta;
              
              if (dist <= moveDist || dist < 0.5) {
                w.x = targetX;
                w.y = targetY;
                
                // When Waiter serves food to dine-in
                tableOrders.forEach(targetOrder => {
                  customers = customers.map(cust => cust.id === targetOrder.customerId ? { ...cust, state: 'eating', patience: 100 } : cust);
                  newState.stats.itemsSold[targetOrder.recipeId] = (newState.stats.itemsSold[targetOrder.recipeId] || 0) + 1;
                });
                
                orders = orders.filter(ord => ord.tableId !== w.targetTableId);
                w.state = 'walking_to_counter_empty';
                w.targetTableId = null;
              } else {
                w.x += (dx / dist) * moveDist;
                w.y += (dy / dist) * moveDist;
              }
            } else {
              w.state = 'idle';
              w.targetTableId = null;
            }
          }
        }
      }

      // --- CHEFS COOKING ---
      if (staff.chefs > 0) {
        let availableChefPower = staff.chefs * upgrades.cookingSpeed * delta * 20; 
        
        orders = orders.map(o => {
          if (o.state === 'pending' && availableChefPower > 0) {
            return { ...o, state: 'cooking' };
          }
          return o;
        });

        orders = orders.map(o => {
          if (o.state === 'cooking') {
            const recipe = recipes.find(r => r.id === o.recipeId) || recipes[0];
            const progressToAdd = Math.min(100 - o.progress, availableChefPower / recipe.cookingTime);
            availableChefPower -= progressToAdd * recipe.cookingTime;
            const newProgress = o.progress + progressToAdd;
            return {
              ...o,
              progress: newProgress,
              state: newProgress >= 100 ? 'ready' : 'cooking'
            };
          }
          return o;
        });
      }

      // --- MANAGER INVENTORY ---
      if (staff.hasManager) {
        const neededIngredients = new Set<string>();
        newState.recipes.forEach(r => {
          if (r.unlocked) {
            Object.keys(r.ingredients).forEach(ingId => neededIngredients.add(ingId));
          }
        });
        
        neededIngredients.forEach(ingId => {
          const qty = newState.inventory[ingId] || 0;
          if (qty < 20) {
            const ingredient = INGREDIENTS[ingId];
            const amountToBuy = 20; 
            if (ingredient && newState.money >= ingredient.cost * amountToBuy) {
              const cost = ingredient.cost * amountToBuy;
              newState.money -= cost;
              newState.inventory[ingId] = qty + amountToBuy;
              newState.stats.inventoryCosts += cost;
              newState.stats.totalExpenses += cost;
            }
          }
        });
      }

      newState.tables = tables;
      newState.customers = customers;
      newState.orders = orders;
      newState.waiterEntities = waiterEntities;
      
      // Update money correctly (+ Revenue, - Fees)
      newState.money += earnedThisTick;
      newState.money -= feesThisTick;
      
      newState.stats.customersServed += servedThisTick;
      newState.stats.customersLost += lostThisTick;
      newState.stats.totalEarned += earnedThisTick;
      newState.stats.totalTips = (prevState.stats.totalTips || 0) + tipsThisTick;
      newState.stats.totalExpenses += feesThisTick;

      return newState;
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(gameTick, 100);
    return () => clearInterval(intervalId);
  }, [gameTick]);

  // Actions
  const takeOrder = (customerId: string) => {
    setState(prev => {
      const customer = prev.customers.find(c => c.id === customerId);
      if (!customer || customer.state !== 'waiting_order') return prev;

      const unlockedRecipes = prev.recipes.filter(r => r.unlocked);
      if (unlockedRecipes.length === 0) return prev;
      
      const randomRecipe = unlockedRecipes[Math.floor(Math.random() * unlockedRecipes.length)];
      const bill = randomRecipe.price + prev.upgrades.mealPrice;

      return {
        ...prev,
        customers: prev.customers.map(c => c.id === customerId ? { ...c, state: 'waiting_food', patience: c.maxPatience, currentBill: bill } : c),
        orders: [...prev.orders, {
          id: `o_${Date.now()}`,
          customerId: customer.id,
          tableId: customer.tableId,
          recipeId: randomRecipe.id,
          state: 'pending',
          progress: 0
        }]
      };
    });
  };

  const serveFood = (orderId: string) => {
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order || order.state !== 'ready') return prev;

      let newStats = { 
        ...prev.stats,
        itemsSold: { ...(prev.stats.itemsSold || {}) }
      };
      
      newStats.itemsSold[order.recipeId] = (newStats.itemsSold[order.recipeId] || 0) + 1;

      return {
        ...prev,
        orders: prev.orders.filter(o => o.id !== orderId),
        customers: prev.customers.map(c => c.id === order.customerId ? { ...c, state: 'eating', patience: 100 } : c),
        stats: newStats
      };
    });
  };

  const cookOrder = (orderId: string) => {
     setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order || order.state === 'ready') return prev;

      const recipe = prev.recipes.find(r => r.id === order.recipeId) || prev.recipes[0];
      const newProgress = Math.min(100, order.progress + (prev.upgrades.cookingSpeed * 15) / recipe.cookingTime);
      
      return {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? {
          ...o,
          state: newProgress >= 100 ? 'ready' : 'cooking',
          progress: newProgress
        } : o)
      };
    });
  };

  const buyUpgrade = (type: 'table' | 'waiter' | 'chef' | 'mealPrice' | 'cookingSpeed' | 'spawnRate') => {
    setState(prev => {
      let cost = 0;
      let newState = { 
        ...prev,
        staff: { ...prev.staff },
        stats: { ...prev.stats }
      };

      switch (type) {
        case 'table':
          cost = UPGRADE_COSTS.table(prev.tables.length);
          if (prev.money >= cost && prev.tables.length < TABLE_POSITIONS.length) {
            newState.money -= cost;
            newState.stats.upgradeCosts += cost;
            const pos = TABLE_POSITIONS[prev.tables.length];
            newState.tables = [...prev.tables, { id: `t_${Date.now()}`, customerId: null, x: pos.x, y: pos.y }];
          }
          break;
        case 'waiter':
          cost = UPGRADE_COSTS.waiter(prev.staff.waiters);
          if (prev.money >= cost) {
            newState.money -= cost;
            newState.staff.waiters += 1;
            newState.waiterEntities = [...prev.waiterEntities, {
              id: `w_${Date.now()}_${Math.random()}`, state: 'idle',
              targetCustomerId: null, targetOrderId: null,
              x: -5 + newState.staff.waiters * 2, y: -8
            }];
          }
          break;
        case 'chef':
          cost = UPGRADE_COSTS.chef(prev.staff.chefs);
          if (prev.money >= cost) {
            newState.money -= cost;
            newState.staff.chefs += 1;
          }
          break;
      }
      return newState;
    });
  };

  const unlockApp = (appId: string) => {
    setState(prev => {
       if (prev.unlockedApps.includes(appId)) return prev;
       const app = ONLINE_APPS[appId as keyof typeof ONLINE_APPS];
       if (prev.money >= app.cost) {
          return {
             ...prev,
             money: prev.money - app.cost,
             unlockedApps: [...prev.unlockedApps, appId],
             stats: {
                ...prev.stats,
                appCosts: (prev.stats.appCosts || 0) + app.cost,
                totalExpenses: prev.stats.totalExpenses + app.cost
             }
          };
       }
       return prev;
    });
  };

  const buyLevelUpgrade = (type: 'mealPrice' | 'cookingSpeed' | 'spawnRate', currentLevel: number) => {
     setState(prev => {
      let cost = UPGRADE_COSTS[type](currentLevel);
      if (prev.money >= cost) {
        return {
          ...prev,
          money: prev.money - cost,
          stats: {
            ...prev.stats,
            upgradeCosts: prev.stats.upgradeCosts + cost,
            totalExpenses: prev.stats.totalExpenses + cost,
          },
          upgrades: {
            ...prev.upgrades,
            [type]: type === 'mealPrice' ? prev.upgrades.mealPrice + 5 : 
                    type === 'cookingSpeed' ? prev.upgrades.cookingSpeed + 0.5 :
                    prev.upgrades.spawnRate + 0.5
          }
        };
      }
      return prev;
     });
  };

  const hireManager = () => {
    setState(prev => ({ ...prev, staff: { ...prev.staff, hasManager: true } }));
  };

  const unlockRecipe = (recipeId: string) => {
    setState(prev => {
      const recipe = prev.recipes.find(r => r.id === recipeId);
      if (!recipe || recipe.unlocked || prev.money < recipe.unlockCost) return prev;

      return {
        ...prev,
        money: prev.money - recipe.unlockCost,
        stats: {
          ...prev.stats,
          recipeCosts: prev.stats.recipeCosts + recipe.unlockCost,
          totalExpenses: prev.stats.totalExpenses + recipe.unlockCost,
        },
        recipes: prev.recipes.map(r => r.id === recipeId ? { ...r, unlocked: true } : r)
      };
    });
  };

  const buyIngredient = (ingredientId: string, amount: number) => {
    setState(prev => {
      const ingredient = INGREDIENTS[ingredientId];
      if (!ingredient) return prev;
      
      const cost = ingredient.cost * amount;
      if (prev.money >= cost) {
        return {
          ...prev,
          money: prev.money - cost,
          stats: {
            ...prev.stats,
            inventoryCosts: prev.stats.inventoryCosts + cost,
            totalExpenses: prev.stats.totalExpenses + cost,
          },
          inventory: {
            ...prev.inventory,
            [ingredientId]: (prev.inventory[ingredientId] || 0) + amount
          }
        };
      }
      return prev;
    });
  };

  const setRestaurantLayout = (layoutIndex: number) => {
    setState(prev => ({ ...prev, restaurantLayout: layoutIndex }));
  };

  const setWallColor = (color: string | null) => {
    setState(prev => ({ ...prev, wallColor: color }));
  };

  const setFrameColor = (color: string | null) => {
    setState(prev => ({ ...prev, frameColor: color }));
  };

  const toggleRestaurantState = () => {
    setState(prev => ({ ...prev, isRestaurantOpen: !prev.isRestaurantOpen }));
  };

  return {
    state,
    actions: {
      takeOrder, serveFood, cookOrder, buyUpgrade, buyLevelUpgrade,
      hireManager, unlockRecipe, buyIngredient, setRestaurantLayout,
      setWallColor, setFrameColor, toggleRestaurantState, unlockApp
    }
  };
}