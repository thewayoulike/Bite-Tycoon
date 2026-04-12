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

export interface Order {
  id: string;
  customerId: string;
  tableId: string;
  recipeId: string;
  state: 'pending' | 'cooking' | 'ready';
  progress: number;
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
  };
  upgrades: {
    mealPrice: number;
    cookingSpeed: number;
    spawnRate: number;
  };
  stats: {
    customersServed: number;
    customersLost: number;
    totalEarned: number;
  };
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
  },
  upgrades: {
    mealPrice: 10,
    cookingSpeed: 1,
    spawnRate: 1,
  },
  stats: {
    customersServed: 0,
    customersLost: 0,
    totalEarned: 0,
  },
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
          const totalSalaries = (staff.waiters * SALARIES.waiter * 7) + (staff.chefs * SALARIES.chef * 7);
          newState.money -= totalSalaries;
        }
      }

      // 2. Spawn Customers
      const emptyTables = tables.filter((t) => t.customerId === null);
      if (emptyTables.length > 0) {
        // Base spawn chance + upgrades
        const spawnChance = (0.05 + upgrades.spawnRate * 0.02) * delta;
        if (Math.random() < spawnChance) {
          const table = emptyTables[Math.floor(Math.random() * emptyTables.length)];
          const newCustomer: Customer = {
            id: `c_${Date.now()}_${Math.random()}`,
            state: 'entering',
            patience: 100,
            maxPatience: 100,
            tableId: table.id,
            actionTimer: 2,
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
            newC.actionTimer = 2;
            lostThisTick += 1;
          }
        } else if (newC.state === 'eating') {
          newC.patience -= 15 * delta;
          if (newC.patience <= 0) {
            newC.state = 'leaving';
            newC.actionTimer = 2;
            
            // Find the order to get the recipe price
            const order = orders.find(o => o.customerId === newC.id);
            const recipe = recipes.find(r => r.id === order?.recipeId) || recipes[0];
            const mealEarnings = recipe.price + upgrades.mealPrice;
            
            earnedThisTick += mealEarnings;
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
      // Waiters taking orders
      if (staff.waiters > 0) {
        const waitingForOrder = customers.filter((c) => c.state === 'waiting_order');
        // Simple automation: 1 waiter can take 1 order per second (scaled by delta)
        const ordersToTake = Math.min(waitingForOrder.length, Math.ceil(staff.waiters * delta * 2));
        
        for (let i = 0; i < ordersToTake; i++) {
          const c = waitingForOrder[i];
          
          const unlockedRecipes = recipes.filter(r => r.unlocked);
          const availableRecipes = unlockedRecipes.filter(r => {
            for (const [ing, qty] of Object.entries(r.ingredients)) {
              if ((newState.inventory[ing] || 0) < qty) return false;
            }
            return true;
          });
          
          if (availableRecipes.length > 0) {
            const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
            
            // Deduct ingredients
            for (const [ing, qty] of Object.entries(randomRecipe.ingredients)) {
              newState.inventory[ing] -= qty;
            }
            
            // Update customer state
            customers = customers.map(cust => cust.id === c.id ? { ...cust, state: 'waiting_food', patience: cust.maxPatience } : cust);
            
            // Create order
            orders.push({
              id: `o_${Date.now()}_${Math.random()}`,
              customerId: c.id,
              tableId: c.tableId,
              recipeId: randomRecipe.id,
              state: 'pending',
              progress: 0,
            });
          } else {
            // No food available! Customer gets angry and leaves.
            customers = customers.map(cust => cust.id === c.id ? { ...cust, state: 'leaving', actionTimer: 2 } : cust);
            lostThisTick += 1;
          }
        }
      }

      // Waiters serving food
      if (staff.waiters > 0) {
        const readyOrders = orders.filter((o) => o.state === 'ready');
        const ordersToServe = Math.min(readyOrders.length, Math.ceil(staff.waiters * delta * 2));

        for (let i = 0; i < ordersToServe; i++) {
          const o = readyOrders[i];
          // Update customer state
          customers = customers.map(cust => cust.id === o.customerId ? { ...cust, state: 'eating', patience: 100 } : cust);
          // Remove order
          orders = orders.filter(ord => ord.id !== o.id);
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

      newState.tables = tables;
      newState.customers = customers;
      newState.orders = orders;
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

  const unlockRecipe = (recipeId: string) => {
    setState(prev => {
      const recipe = prev.recipes.find(r => r.id === recipeId);
      if (!recipe || recipe.unlocked || prev.money < recipe.unlockCost) return prev;

      return {
        ...prev,
        money: prev.money - recipe.unlockCost,
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
          inventory: {
            ...prev.inventory,
            [ingredientId]: (prev.inventory[ingredientId] || 0) + amount
          }
        };
      }
      return prev;
    });
  };

  return {
    state,
    actions: {
      takeOrder,
      serveFood,
      cookOrder,
      buyUpgrade,
      buyLevelUpgrade,
      unlockRecipe,
      buyIngredient
    }
  };
}
