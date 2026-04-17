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
  time: number; // 0 to 100 representing the day progress
  tables: Table[];
  customers: Customer[];
  orders: Order[];
  recipes: Recipe[];
  inventory: Record<string, number>;
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
    totalExpenses: number;
    inventoryCosts: number;
    recipeCosts: number;
    managerCosts: number;
    salaryCosts: number;
    upgradeCosts: number;
  };
  restaurantLayout: number;
  wallColor: string | null;
  frameColor: string | null;
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
    rice: 50,
    fish: 50,
    noodle: 50,
    egg: 50,
    chicken: 50,
    soy_sauce: 50,
  },
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
    customersServed: 0,
    customersLost: 0,
    totalEarned: 0,
    totalExpenses: 0,
    inventoryCosts: 0,
    recipeCosts: 0,
    managerCosts: 0,
    salaryCosts: 0,
    upgradeCosts: 0,
  },
  restaurantLayout: 0,
  wallColor: null,
  frameColor: null,
};

export const UPGRADE_COSTS = {
  table: (count: number) => Math.floor(50 * Math.pow(1.5, count - 2)),
  waiter: (count: number) => 0, // Free to hire, but costs salary
  chef: (count: number) => 0, // Free to hire, but costs salary
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

  // Keep ref in sync with state for the game loop
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const gameTick = useCallback(() => {
    const now = Date.now();
    const delta = (now - lastTickRef.current) / 1000; // seconds
    lastTickRef.current = now;

    setState((prevState) => {
      let newState = { ...prevState };
      let { tables, customers, orders, staff, upgrades, stats, recipes } = newState;

      // 1. Time progression
      newState.time += delta * 2; // Day goes by
      if (newState.time >= 100) {
        newState.time = 0;
        newState.day += 1;
        // Pay salaries weekly (every 7 days)
        if (newState.day % 7 === 0) {
          const totalSalaries = (staff.waiters * SALARIES.waiter * 7) + (staff.chefs * SALARIES.chef * 7) + (staff.hasManager ? SALARIES.manager * 7 : 0);
          newState.money -= totalSalaries;
          newState.stats.salaryCosts += totalSalaries;
          newState.stats.totalExpenses += totalSalaries;
        }
      }

      // 2. Spawn Customers
      const emptyTables = tables.filter((t) => t.customerId === null);
      if (emptyTables.length > 0) {
        // Base spawn chance + upgrades
        const spawnChance = (0.05 + upgrades.spawnRate * 0.02) * delta;
        if (Math.random() < spawnChance) {
          const table = emptyTables[Math.floor(Math.random() * emptyTables.length)];
          
          // Calculate realistic walk time based on distance
          const mapPos = (percent: number) => (percent / 100) * 20 - 10;
          const targetX = mapPos(table.x);
          const targetZ = mapPos(table.y);
          // Walk from 0, 25 to 0, 14 (door), then to 0, targetZ, then to targetX, targetZ
          const walkDist = 11 + Math.abs(targetZ - 14) + Math.abs(targetX);
          const walkTime = walkDist / 4; // Speed is 4 in Scene3D

          const newCustomer: Customer = {
            id: `c_${Date.now()}_${Math.random()}`,
            state: 'entering',
            patience: 100,
            maxPatience: 100,
            tableId: table.id,
            actionTimer: walkTime,
          };
          customers = [...customers, newCustomer];
          tables = tables.map((t) => (t.id === table.id ? { ...t, customerId: newCustomer.id } : t));
        }
      }

      // 3. Update Customers (Patience & Eating)
      let earnedThisTick = 0;
      let lostThisTick = 0;
      let servedThisTick = 0;

      customers = customers.map((c) => {
        let newC = { ...c };
        
        if (newC.state === 'entering') {
          newC.actionTimer -= delta;
          if (newC.actionTimer <= 0) {
            newC.state = 'waiting_order';
          }
        } else if (newC.state === 'leaving') {
          newC.actionTimer -= delta;
        } else if (newC.state === 'waiting_order' || newC.state === 'waiting_food') {
          newC.patience -= 5 * delta;
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            const targetX = table ? mapPos(table.x) : 0;
            const targetZ = table ? mapPos(table.y) : 0;
            const walkDist = 11 + Math.abs(targetZ - 14) + Math.abs(targetX);
            newC.actionTimer = walkDist / 4;
            lostThisTick += 1;
          }
        } else if (newC.state === 'eating') {
          newC.patience -= 15 * delta;
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            const table = tables.find(t => t.id === newC.tableId);
            const targetX = table ? mapPos(table.x) : 0;
            const targetZ = table ? mapPos(table.y) : 0;
            const walkDist = 11 + Math.abs(targetZ - 14) + Math.abs(targetX);
            newC.actionTimer = walkDist / 4;
            
            // Find the order to get the recipe price
            const order = orders.find(o => o.customerId === newC.id);
            const recipe = recipes.find(r => r.id === order?.recipeId) || recipes[0];
            const mealEarnings = recipe.price + upgrades.mealPrice;
            
            // Random tip (10-30% of meal price, 30% chance)
            const tip = Math.random() > 0.7 ? Math.floor(mealEarnings * (0.1 + Math.random() * 0.2)) : 0;
            
            earnedThisTick += mealEarnings + tip;
            servedThisTick += 1;
          }
        }

        return newC;
      });

      // Handle leaving customers
      const actuallyLeaving = customers.filter((c) => c.state === 'leaving' && c.actionTimer <= 0);
      customers = customers.filter((c) => !(c.state === 'leaving' && c.actionTimer <= 0));

      actuallyLeaving.forEach((c) => {
        // Free the table
        tables = tables.map((t) => (t.id === c.tableId ? { ...t, customerId: null } : t));
        
        // Remove their order if any
        orders = orders.filter((o) => o.customerId !== c.id);
      });

      // 4. Staff Automation
      let waiterEntities = prevState.waiterEntities.map(w => ({ ...w }));
      const WAITER_SPEED = 5;

      for (let i = 0; i < waiterEntities.length; i++) {
        let w = waiterEntities[i];
        
        if (w.state === 'idle') {
          // Look for food to serve first. Find a table where ALL its orders are ready.
          const tablesWithReadyOrders = [...new Set(orders.filter(o => o.state === 'ready').map(o => o.tableId))];
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
            // Look for customers waiting to order
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
            // Check if there are still customers waiting at this table
            const waitingAtTable = customers.some(c => c.tableId === table.id && c.state === 'waiting_order');
            if (!waitingAtTable) {
              w.state = 'idle';
              w.targetTableId = null;
            } else {
              const targetX = mapPos(table.x) - 1.2; // Offset so waiter stands next to table
              const targetY = mapPos(table.y);
              const dx = targetX - w.x;
              const dy = targetY - w.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const moveDist = WAITER_SPEED * delta;
              
              if (dist <= moveDist || dist < 0.5) {
                // Arrived at table, start taking order
                w.x = targetX;
                w.y = targetY;
                w.state = 'taking_order';
                w.actionTimer = 2; // Wait 2 seconds to take order
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
            // Take all orders for this table
            const tableCustomers = customers.filter(c => c.tableId === w.targetTableId && c.state === 'waiting_order');
            
            tableCustomers.forEach(targetCustomer => {
              const unlockedRecipes = recipes.filter(r => r.unlocked);
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
                customers = customers.map(cust => cust.id === targetCustomer.id ? { ...cust, state: 'waiting_food', patience: cust.maxPatience } : cust);
                orders.push({
                  id: `o_${Date.now()}_${Math.random()}`,
                  customerId: targetCustomer.id,
                  tableId: targetCustomer.tableId,
                  recipeId: randomRecipe.id,
                  state: 'pending',
                  progress: 0,
                });
              } else {
                const table = tables.find(t => t.id === targetCustomer.tableId);
                const targetX = table ? mapPos(table.x) : 0;
                const targetZ = table ? mapPos(table.y) : 0;
                const walkDist = 11 + Math.abs(targetZ - 14) + Math.abs(targetX);
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
              const targetX = mapPos(table.x) - 1.2; // Offset so waiter stands next to table
              const targetY = mapPos(table.y);
              const dx = targetX - w.x;
              const dy = targetY - w.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const moveDist = WAITER_SPEED * delta;
              
              if (dist <= moveDist || dist < 0.5) {
                w.x = targetX;
                w.y = targetY;
                // Serve food to all customers at this table
                tableOrders.forEach(targetOrder => {
                  customers = customers.map(cust => cust.id === targetOrder.customerId ? { ...cust, state: 'eating', patience: 100 } : cust);
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

      // Chefs cooking
      if (staff.chefs > 0) {
        let availableChefPower = staff.chefs * upgrades.cookingSpeed * delta * 20; // Progress per second
        
        // Start pending orders if we have chefs
        orders = orders.map(o => {
          if (o.state === 'pending' && availableChefPower > 0) {
            return { ...o, state: 'cooking' };
          }
          return o;
        });

        // Progress cooking orders
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

      // 5. Manager Automation
      if (staff.hasManager) {
        // Auto-buy inventory if below 20 for any unlocked recipe ingredients
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
            const amountToBuy = 20; // buy in bundles of 20
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
      newState.money += earnedThisTick;
      newState.stats.customersServed += servedThisTick;
      newState.stats.customersLost += lostThisTick;
      newState.stats.totalEarned += earnedThisTick;

      return newState;
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(gameTick, 100); // 10 ticks per second
    return () => clearInterval(intervalId);
  }, [gameTick]);

  // Manual Actions
  const takeOrder = (customerId: string) => {
    setState(prev => {
      const customer = prev.customers.find(c => c.id === customerId);
      if (!customer || customer.state !== 'waiting_order') return prev;

      const unlockedRecipes = prev.recipes.filter(r => r.unlocked);
      const randomRecipe = unlockedRecipes[Math.floor(Math.random() * unlockedRecipes.length)];

      return {
        ...prev,
        customers: prev.customers.map(c => c.id === customerId ? { ...c, state: 'waiting_food', patience: c.maxPatience } : c),
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

      return {
        ...prev,
        orders: prev.orders.filter(o => o.id !== orderId),
        customers: prev.customers.map(c => c.id === order.customerId ? { ...c, state: 'eating', patience: 100 } : c)
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
      let newState = { ...prev };

      switch (type) {
        case 'table':
          cost = UPGRADE_COSTS.table(prev.tables.length);
          if (prev.money >= cost && prev.tables.length < TABLE_POSITIONS.length) {
            newState.money -= cost;
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
              id: `w_${Date.now()}_${Math.random()}`,
              state: 'idle',
              targetCustomerId: null,
              targetOrderId: null,
              x: -5 + prev.staff.waiters * 2,
              y: -8
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
        case 'mealPrice':
          // We use a derived level based on current price for simplicity, or just store levels.
          // Let's store levels in a separate object or just calculate it.
          // Actually, let's just increment the value and calculate cost based on current value.
          // To be safe, let's add levels to state.
          break;
      }
      return newState;
    });
  };

  // Helper to buy upgrades that have levels
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
    setState(prev => {
      if (!prev.staff.hasManager) {
        return {
          ...prev,
          staff: { ...prev.staff, hasManager: true }
        };
      }
      return prev;
    });
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
      setFrameColor
    }
  };
}
