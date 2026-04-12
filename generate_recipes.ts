import * as fs from 'fs';

const INGREDIENTS = {
  rice: { id: 'rice', name: 'Rice', cost: 2 },
  noodle: { id: 'noodle', name: 'Noodles', cost: 2 },
  beef: { id: 'beef', name: 'Beef', cost: 8 },
  chicken: { id: 'chicken', name: 'Chicken', cost: 5 },
  fish: { id: 'fish', name: 'Fish', cost: 6 },
  shrimp: { id: 'shrimp', name: 'Shrimp', cost: 7 },
  vegetable: { id: 'vegetable', name: 'Vegetables', cost: 2 },
  egg: { id: 'egg', name: 'Egg', cost: 1 },
  flour: { id: 'flour', name: 'Flour', cost: 1 },
  sugar: { id: 'sugar', name: 'Sugar', cost: 1 },
  milk: { id: 'milk', name: 'Milk', cost: 2 },
  cheese: { id: 'cheese', name: 'Cheese', cost: 4 },
  potato: { id: 'potato', name: 'Potato', cost: 2 },
  tomato: { id: 'tomato', name: 'Tomato', cost: 2 },
  onion: { id: 'onion', name: 'Onion', cost: 1 },
  garlic: { id: 'garlic', name: 'Garlic', cost: 1 },
  spices: { id: 'spices', name: 'Spices', cost: 3 },
  soy_sauce: { id: 'soy_sauce', name: 'Soy Sauce', cost: 2 },
  oil: { id: 'oil', name: 'Cooking Oil', cost: 2 },
  bread: { id: 'bread', name: 'Bread', cost: 3 }
};

const prefixes = ["Spicy", "Sweet", "Savory", "Crispy", "Grilled", "Fried", "Steamed", "Roasted", "Baked", "Classic", "Zesty", "Smoky", "Garlic", "Honey", "Teriyaki"];
const bases = ["Rice", "Noodle", "Beef", "Chicken", "Fish", "Shrimp", "Vegetable", "Potato", "Tomato", "Bread", "Egg", "Cheese", "Tofu", "Pork", "Duck"];
const suffixes = ["Bowl", "Plate", "Soup", "Curry", "Stir-fry", "Salad", "Sandwich", "Wrap", "Stew", "Special", "Delight", "Feast", "Medley", "Platter", "Bites"];

let recipes = [];
let idCounter = 1;

recipes.push({
  id: 'sushi', name: 'Basic Sushi', price: 25, cookingTime: 1, unlockCost: 0, unlocked: true,
  ingredients: { rice: 1, fish: 1 }
});
recipes.push({
  id: 'ramen', name: 'Ramen Bowl', price: 40, cookingTime: 1.5, unlockCost: 500, unlocked: false,
  ingredients: { noodle: 1, egg: 1, chicken: 1, soy_sauce: 1 }
});
recipes.push({
  id: 'tempura', name: 'Shrimp Tempura', price: 65, cookingTime: 2, unlockCost: 1500, unlocked: false,
  ingredients: { shrimp: 2, flour: 1, oil: 1 }
});
recipes.push({
  id: 'wagyu', name: 'Wagyu Beef', price: 150, cookingTime: 3, unlockCost: 4000, unlocked: false,
  ingredients: { beef: 3, spices: 2, garlic: 1 }
});

const usedNames = new Set(recipes.map(r => r.name));

while(recipes.length < 100) {
  const pref = prefixes[Math.floor(Math.random()*prefixes.length)];
  const base = bases[Math.floor(Math.random()*bases.length)];
  const suff = suffixes[Math.floor(Math.random()*suffixes.length)];
  const name = `${pref} ${base} ${suff}`;
  
  if (!usedNames.has(name)) {
     usedNames.add(name);
     const ingCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 ingredients
     const ings = {};
     const keys = Object.keys(INGREDIENTS);
     
     let cost = 0;
     for(let i=0; i<ingCount; i++) {
       const key = keys[Math.floor(Math.random()*keys.length)];
       const qty = Math.floor(Math.random() * 2) + 1;
       ings[key] = (ings[key] || 0) + qty;
     }
     
     for (const [k, v] of Object.entries(ings)) {
       cost += INGREDIENTS[k].cost * v;
     }
     
     recipes.push({
       id: `recipe_${idCounter++}`,
       name,
       price: Math.floor(cost * (Math.random() * 2 + 2)), // 2x to 4x markup
       cookingTime: Math.floor(Math.random() * 3) + 1,
       unlockCost: Math.floor(Math.random() * 5000) + 500,
       unlocked: false,
       ingredients: ings
     });
  }
}

const fileContent = `
export interface Ingredient {
  id: string;
  name: string;
  cost: number;
}

export interface Recipe {
  id: string;
  name: string;
  price: number;
  cookingTime: number;
  unlockCost: number;
  unlocked: boolean;
  ingredients: Record<string, number>;
}

export const INGREDIENTS: Record<string, Ingredient> = ${JSON.stringify(INGREDIENTS, null, 2)};

export const RECIPES: Recipe[] = ${JSON.stringify(recipes, null, 2)};
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/recipes.ts', fileContent);
