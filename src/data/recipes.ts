export interface Ingredient {
  id: string;
  name: string;
  cost: number;
}

export interface Recipe {
  id: string;
  name: string;
  basePrice: number; // NEW: The absolute minimum price
  price: number;     // The current player-set price
  cookingTime: number;
  ingredients: Record<string, number>;
  unlocked: boolean;
  unlockCost: number;
  requiredLevel?: number;
}

// 🛒 All Available Ingredients and their base cost per unit
export const INGREDIENTS: Record<string, Ingredient> = {
  // Liquids & Drinks
  water: { id: 'water', name: 'Water', cost: 0.1 },
  soda_syrup: { id: 'soda_syrup', name: 'Soda Syrup', cost: 0.5 },
  coffee_bean: { id: 'coffee_bean', name: 'Coffee Beans', cost: 1 },
  
  // Basics & Carbs
  potato: { id: 'potato', name: 'Potato', cost: 1 },
  oil: { id: 'oil', name: 'Oil', cost: 1 },
  bun: { id: 'bun', name: 'Burger Bun', cost: 1 },
  bread: { id: 'bread', name: 'Bread', cost: 1 },
  flour: { id: 'flour', name: 'Flour', cost: 1 },
  noodle: { id: 'noodle', name: 'Noodles', cost: 2 },
  rice: { id: 'rice', name: 'Rice', cost: 1 },
  pasta: { id: 'pasta', name: 'Pasta', cost: 2 },
  tortilla: { id: 'tortilla', name: 'Tortilla', cost: 1 },

  // Meats & Proteins
  beef: { id: 'beef', name: 'Ground Beef', cost: 4 },
  chicken: { id: 'chicken', name: 'Chicken', cost: 3 },
  sausage: { id: 'sausage', name: 'Sausage', cost: 2 },
  pork: { id: 'pork', name: 'Pork', cost: 3 },
  bacon: { id: 'bacon', name: 'Bacon', cost: 4 },
  lamb: { id: 'lamb', name: 'Lamb', cost: 6 },
  duck: { id: 'duck', name: 'Duck', cost: 5 },
  wagyu: { id: 'wagyu', name: 'Wagyu Beef', cost: 25 },
  egg: { id: 'egg', name: 'Egg', cost: 1 },
  tofu: { id: 'tofu', name: 'Tofu', cost: 2 },

  // Seafood
  shrimp: { id: 'shrimp', name: 'Shrimp', cost: 6 },
  fish: { id: 'fish', name: 'Fresh Fish', cost: 8 },
  crab: { id: 'crab', name: 'Crab', cost: 7 },
  lobster: { id: 'lobster', name: 'Lobster', cost: 15 },

  // Dairy & Sweets
  milk: { id: 'milk', name: 'Milk', cost: 2 },
  cheese: { id: 'cheese', name: 'Cheese', cost: 3 },
  sugar: { id: 'sugar', name: 'Sugar', cost: 1 },
  butter: { id: 'butter', name: 'Butter', cost: 2 },
  cream: { id: 'cream', name: 'Heavy Cream', cost: 2 },
  ice_cream: { id: 'ice_cream', name: 'Ice Cream', cost: 3 },
  chocolate: { id: 'chocolate', name: 'Chocolate', cost: 2 },
  honey: { id: 'honey', name: 'Honey', cost: 2 },

  // Produce
  lettuce: { id: 'lettuce', name: 'Lettuce', cost: 1 },
  tomato: { id: 'tomato', name: 'Tomato', cost: 1 },
  vegetable: { id: 'vegetable', name: 'Mixed Veggies', cost: 1 },
  onion: { id: 'onion', name: 'Onion', cost: 1 },
  garlic: { id: 'garlic', name: 'Garlic', cost: 1 },
  fruit: { id: 'fruit', name: 'Fresh Fruit', cost: 2 },
  mushroom: { id: 'mushroom', name: 'Mushroom', cost: 2 },
  carrot: { id: 'carrot', name: 'Carrot', cost: 1 },
  corn: { id: 'corn', name: 'Corn', cost: 1 },
  broccoli: { id: 'broccoli', name: 'Broccoli', cost: 2 },
  avocado: { id: 'avocado', name: 'Avocado', cost: 3 },
  apple: { id: 'apple', name: 'Apple', cost: 1 },
  lemon: { id: 'lemon', name: 'Lemon', cost: 1 },

  // Sauces & Herbs
  soy_sauce: { id: 'soy_sauce', name: 'Soy Sauce', cost: 1 },
  spices: { id: 'spices', name: 'Spices', cost: 2 },
  ketchup: { id: 'ketchup', name: 'Ketchup', cost: 1 },
  mayo: { id: 'mayo', name: 'Mayo', cost: 1 },
  hot_sauce: { id: 'hot_sauce', name: 'Hot Sauce', cost: 1 },
  mint: { id: 'mint', name: 'Mint', cost: 1 },
  ginger: { id: 'ginger', name: 'Ginger', cost: 1 }
};

// 🍔 RAW RECIPES (Cleaned up! No manual prices or unlock costs anymore)
const RAW_RECIPES: Omit<Recipe, 'price' | 'basePrice' | 'unlockCost'>[] = [
  // Unlocked by Default:
  { id: "soda", name: "Fountain Soda", cookingTime: 0.5, unlocked: true, ingredients: { soda_syrup: 1, water: 1, sugar: 1 } },
  { id: "coffee_black", name: "Black Coffee", cookingTime: 1, unlocked: true, ingredients: { coffee_bean: 1, water: 1 } },
  { id: "fries", name: "French Fries", cookingTime: 1, unlocked: true, ingredients: { potato: 2, oil: 1, spices: 1 } },
  { id: "juice_fruit", name: "Fresh Fruit Juice", cookingTime: 0.5, unlocked: true, ingredients: { fruit: 2, water: 1, sugar: 1 } },
  { id: "sushi", name: "Basic Sushi", cookingTime: 1, unlocked: true, ingredients: { rice: 1, fish: 1 } },
  
  // Standard Menu
  { id: "recipe_41", name: "Sweet Tomato Stir-fry", cookingTime: 3, unlocked: false, ingredients: { tomato: 2, sugar: 1, oil: 1 } },
  { id: "recipe_92", name: "Steamed Chicken Plate", cookingTime: 1, unlocked: false, ingredients: { chicken: 2, rice: 1, vegetable: 1 } },
  { id: "recipe_96", name: "Grilled Rice Platter", cookingTime: 1, unlocked: false, ingredients: { rice: 2, oil: 1, vegetable: 1 } },
  { id: "recipe_11", name: "Classic Beef Salad", cookingTime: 1, unlocked: false, ingredients: { beef: 1, lettuce: 2, tomato: 1 } },
  { id: "recipe_65", name: "Classic Cheese Sandwich", cookingTime: 1, unlocked: false, ingredients: { bread: 2, cheese: 2 } },
  { id: "hotdog", name: "Classic Hot Dog", cookingTime: 1, unlocked: false, ingredients: { bun: 1, sausage: 1 } },
  { id: "recipe_60", name: "Zesty Beef Stew", cookingTime: 3, unlocked: false, ingredients: { beef: 2, water: 1, spices: 1, potato: 1 } },
  { id: "recipe_46", name: "Roasted Egg Stir-fry", cookingTime: 1, unlocked: false, ingredients: { egg: 2, vegetable: 1, oil: 1 } },
  { id: "recipe_69", name: "Zesty Shrimp Feast", cookingTime: 1, unlocked: false, ingredients: { shrimp: 3, spices: 1, rice: 1 } },
  { id: "recipe_15", name: "Roasted Beef Platter", cookingTime: 2, unlocked: false, ingredients: { beef: 2, potato: 1, onion: 1 } },
  { id: "recipe_48", name: "Fried Tomato Salad", cookingTime: 2, unlocked: false, ingredients: { tomato: 2, lettuce: 1, oil: 1 } },
  { id: "recipe_45", name: "Roasted Cheese Special", cookingTime: 1, unlocked: false, ingredients: { cheese: 2, bread: 1, garlic: 1 } },
  { id: "recipe_34", name: "Savory Beef Bowl", cookingTime: 2, unlocked: false, ingredients: { beef: 2, rice: 1, soy_sauce: 1 } },
  { id: "recipe_95", name: "Teriyaki Fish Bowl", cookingTime: 1, unlocked: false, ingredients: { fish: 2, soy_sauce: 1, sugar: 1, rice: 1 } },
  { id: "recipe_57", name: "Teriyaki Veggie Plate", cookingTime: 3, unlocked: false, ingredients: { vegetable: 2, soy_sauce: 1, rice: 1 } },
  { id: "recipe_25", name: "Smoky Rice Feast", cookingTime: 1, unlocked: false, ingredients: { rice: 2, spices: 1, onion: 1 } },
  { id: "recipe_85", name: "Classic Rice Curry", cookingTime: 1, unlocked: false, ingredients: { rice: 2, spices: 2, vegetable: 1 } },
  { id: "recipe_40", name: "Classic Rice Platter", cookingTime: 2, unlocked: false, ingredients: { rice: 3, vegetable: 1, egg: 1 } },
  { id: "recipe_19", name: "Smoky Potato Wrap", cookingTime: 3, unlocked: false, ingredients: { potato: 1, bread: 1, spices: 1 } },
  { id: "recipe_91", name: "Garlic Veggie Soup", cookingTime: 1, unlocked: false, ingredients: { vegetable: 2, garlic: 2, water: 1 } },
  { id: "recipe_8", name: "Fried Shrimp Sandwich", cookingTime: 1, unlocked: false, ingredients: { shrimp: 1, bread: 2, lettuce: 1 } },
  { id: "recipe_9", name: "Fried Veggie Sandwich", cookingTime: 1, unlocked: false, ingredients: { vegetable: 1, bread: 2, oil: 1 } },
  { id: "recipe_2", name: "Honey Fish Bites", cookingTime: 3, unlocked: false, ingredients: { fish: 1, sugar: 1, flour: 1 } },
  { id: "milkshake", name: "Fruit Milkshake", cookingTime: 1, unlocked: false, ingredients: { milk: 2, fruit: 1, sugar: 1 } },
  { id: "recipe_68", name: "Sweet Potato Bowl", cookingTime: 1, unlocked: false, ingredients: { potato: 2, sugar: 1, rice: 1 } },
  { id: "recipe_35", name: "Grilled Potato Platter", cookingTime: 3, unlocked: false, ingredients: { potato: 3, oil: 1, spices: 1 } },
  { id: "recipe_47", name: "Roasted Bread Curry", cookingTime: 2, unlocked: false, ingredients: { bread: 2, spices: 2, vegetable: 1 } },
  { id: "recipe_14", name: "Sweet Egg Bites", cookingTime: 2, unlocked: false, ingredients: { egg: 2, sugar: 1, flour: 1 } },
  { id: "recipe_36", name: "Crispy Veggie Bites", cookingTime: 2, unlocked: false, ingredients: { vegetable: 2, flour: 1, oil: 1 } },
  { id: "recipe_12", name: "Spicy Potato Special", cookingTime: 1, unlocked: false, ingredients: { potato: 2, spices: 2, oil: 1 } },
  { id: "recipe_37", name: "Roasted Sausage Sandwich", cookingTime: 1, unlocked: false, ingredients: { sausage: 2, bread: 2, onion: 1 } },
  { id: "recipe_84", name: "Honey Vegetable Curry", cookingTime: 2, unlocked: false, ingredients: { vegetable: 2, sugar: 1, spices: 1, rice: 1 } },
  { id: "recipe_66", name: "Savory Cheese Plate", cookingTime: 2, unlocked: false, ingredients: { cheese: 3, bread: 1 } },
  { id: "recipe_87", name: "Spicy Veggie Platter", cookingTime: 1, unlocked: false, ingredients: { vegetable: 2, spices: 2, rice: 1 } },
  { id: "recipe_53", name: "Teriyaki Shrimp Bowl", cookingTime: 3, unlocked: false, ingredients: { shrimp: 2, soy_sauce: 1, rice: 1, sugar: 1 } },
  { id: "recipe_10", name: "Roasted Chicken Wrap", cookingTime: 2, unlocked: false, ingredients: { chicken: 2, bread: 1, lettuce: 1 } },
  { id: "recipe_52", name: "Smoky Vegetable Bowl", cookingTime: 2, unlocked: false, ingredients: { vegetable: 3, spices: 1, rice: 1 } },
  { id: "recipe_89", name: "Classic Egg Stew", cookingTime: 1, unlocked: false, ingredients: { egg: 3, water: 1, potato: 1 } },
  { id: "recipe_31", name: "Spicy Shrimp Special", cookingTime: 1, unlocked: false, ingredients: { shrimp: 2, spices: 2, oil: 1 } },
  { id: "recipe_77", name: "Fried Rice Feast", cookingTime: 3, unlocked: false, ingredients: { rice: 3, egg: 1, vegetable: 1, soy_sauce: 1 } },
  { id: "recipe_71", name: "Classic Chicken Stir-fry", cookingTime: 2, unlocked: false, ingredients: { chicken: 2, vegetable: 2, soy_sauce: 1 } },
  { id: "recipe_80", name: "Sweet Beef Feast", cookingTime: 2, unlocked: false, ingredients: { beef: 2, sugar: 1, rice: 1, soy_sauce: 1 } },
  { id: "recipe_32", name: "Sweet Chicken Medley", cookingTime: 1, unlocked: false, ingredients: { chicken: 2, sugar: 1, fruit: 1 } },
  { id: "recipe_70", name: "Classic Tomato Plate", cookingTime: 1, unlocked: false, ingredients: { tomato: 3, cheese: 1, bread: 1 } },
  { id: "burger_classic", name: "Classic Burger", cookingTime: 2, unlocked: false, ingredients: { bun: 1, beef: 1, lettuce: 1, cheese: 1 } },
  { id: "recipe_6", name: "Spicy Vegetable Bites", cookingTime: 1, unlocked: false, ingredients: { vegetable: 2, spices: 2, flour: 1 } },
  { id: "recipe_21", name: "Honey Tomato Soup", cookingTime: 1, unlocked: false, ingredients: { tomato: 2, water: 1, sugar: 1 } },
  { id: "recipe_44", name: "Sweet Beef Plate", cookingTime: 2, unlocked: false, ingredients: { beef: 2, sugar: 1, soy_sauce: 1 } },
  { id: "recipe_23", name: "Sweet Rice Bites", cookingTime: 1, unlocked: false, ingredients: { rice: 2, sugar: 1, milk: 1 } },
  { id: "recipe_1", name: "Roasted Potato Soup", cookingTime: 1, unlocked: false, ingredients: { potato: 2, onion: 1, water: 1 } },
  { id: "recipe_83", name: "Honey Fish Feast", cookingTime: 2, unlocked: false, ingredients: { fish: 2, sugar: 1, rice: 1 } },
  { id: "pizza_cheese", name: "Cheese Pizza", cookingTime: 2.5, unlocked: false, ingredients: { flour: 2, tomato: 1, cheese: 2 } },
  { id: "recipe_55", name: "Spicy Noodle Platter", cookingTime: 3, unlocked: false, ingredients: { noodle: 3, spices: 2, garlic: 1 } },
  { id: "recipe_17", name: "Spicy Bread Feast", cookingTime: 2, unlocked: false, ingredients: { bread: 3, spices: 2, garlic: 1 } },
  { id: "recipe_50", name: "Crispy Bread Bowl", cookingTime: 1, unlocked: false, ingredients: { bread: 2, flour: 1, oil: 1 } },
  { id: "recipe_27", name: "Roasted Potato Salad", cookingTime: 3, unlocked: false, ingredients: { potato: 2, lettuce: 1, onion: 1 } },
  { id: "recipe_72", name: "Teriyaki Rice Medley", cookingTime: 1, unlocked: false, ingredients: { rice: 2, soy_sauce: 1, sugar: 1, vegetable: 1 } },
  { id: "recipe_93", name: "Baked Beef Bowl", cookingTime: 2, unlocked: false, ingredients: { beef: 2, rice: 1, onion: 1 } },
  { id: "recipe_79", name: "Steamed Chicken Salad", cookingTime: 1, unlocked: false, ingredients: { chicken: 2, lettuce: 2, onion: 1 } },
  { id: "recipe_75", name: "Smoky Vegetable Medley", cookingTime: 2, unlocked: false, ingredients: { vegetable: 3, spices: 2, oil: 1 } },
  { id: "recipe_3", name: "Smoky Shrimp Curry", cookingTime: 2, unlocked: false, ingredients: { shrimp: 2, spices: 1, vegetable: 1, rice: 1 } },
  { id: "recipe_88", name: "Roasted Shrimp Wrap", cookingTime: 2, unlocked: false, ingredients: { shrimp: 2, bread: 1, lettuce: 1 } },
  { id: "chicken_bucket", name: "Fried Chicken Bucket", cookingTime: 3, unlocked: false, ingredients: { chicken: 2, flour: 2, oil: 1 } },
  { id: "recipe_33", name: "Garlic Noodle Medley", cookingTime: 2, unlocked: false, ingredients: { noodle: 2, garlic: 2, oil: 1 } },
  { id: "recipe_20", name: "Zesty Vegetable Stew", cookingTime: 3, unlocked: false, ingredients: { vegetable: 2, water: 1, spices: 1 } },
  { id: "recipe_13", name: "Zesty Potato Sandwich", cookingTime: 2, unlocked: false, ingredients: { potato: 1, bread: 2, spices: 1 } },
  { id: "recipe_62", name: "Spicy Sausage Special", cookingTime: 1, unlocked: false, ingredients: { sausage: 2, spices: 2, onion: 1 } },
  { id: "recipe_54", name: "Smoky Potato Sandwich", cookingTime: 1, unlocked: false, ingredients: { potato: 1, bread: 2, spices: 1 } },
  { id: "recipe_4", name: "Classic Egg Medley", cookingTime: 3, unlocked: false, ingredients: { egg: 3, milk: 1, spices: 1 } },
  { id: "recipe_26", name: "Classic Bread Bites", cookingTime: 1, unlocked: false, ingredients: { bread: 2, oil: 1, garlic: 1 } },
  { id: "recipe_58", name: "Zesty Chicken Platter", cookingTime: 2, unlocked: false, ingredients: { chicken: 2, spices: 1, potato: 1 } },
  { id: "recipe_29", name: "Fried Beef Curry", cookingTime: 3, unlocked: false, ingredients: { beef: 2, spices: 2, rice: 1 } },
  { id: "recipe_30", name: "Garlic Rice Medley", cookingTime: 2, unlocked: false, ingredients: { rice: 2, garlic: 2, oil: 1 } },
  { id: "recipe_78", name: "Grilled Cheese Salad", cookingTime: 3, unlocked: false, ingredients: { cheese: 2, lettuce: 2, tomato: 1 } },
  { id: "recipe_28", name: "Spicy Bread Salad", cookingTime: 3, unlocked: false, ingredients: { bread: 2, lettuce: 1, spices: 1 } },
  { id: "recipe_22", name: "Crispy Egg Delight", cookingTime: 2, unlocked: false, ingredients: { egg: 2, flour: 1, oil: 1 } },
  { id: "recipe_81", name: "Garlic Vegetable Bites", cookingTime: 3, unlocked: false, ingredients: { vegetable: 2, garlic: 2, flour: 1 } },
  { id: "recipe_16", name: "Crispy Cheese Plate", cookingTime: 1, unlocked: false, ingredients: { cheese: 2, flour: 1, oil: 1 } },
  { id: "recipe_42", name: "Sweet Cheese Wrap", cookingTime: 2, unlocked: false, ingredients: { cheese: 2, sugar: 1, bread: 1 } },
  { id: "recipe_86", name: "Spicy Cheese Bites", cookingTime: 2, unlocked: false, ingredients: { cheese: 2, spices: 2, flour: 1 } },
  { id: "recipe_76", name: "Savory Beef Stew", cookingTime: 1, unlocked: false, ingredients: { beef: 2, potato: 2, onion: 1, water: 1 } },
  { id: "tempura", name: "Shrimp Tempura", cookingTime: 2, unlocked: false, ingredients: { shrimp: 2, flour: 1, oil: 1 } },
  { id: "recipe_63", name: "Fried Chicken Bites", cookingTime: 2, unlocked: false, ingredients: { chicken: 2, flour: 1, oil: 1 } },
  { id: "recipe_43", name: "Crispy Egg Plate", cookingTime: 2, unlocked: false, ingredients: { egg: 3, flour: 1, oil: 1 } },
  { id: "recipe_39", name: "Zesty Fish Platter", cookingTime: 2, unlocked: false, ingredients: { fish: 2, spices: 1, vegetable: 1 } },
  { id: "recipe_67", name: "Sweet Rice Delight", cookingTime: 1, unlocked: false, ingredients: { rice: 2, sugar: 2, milk: 1 } },
  { id: "pizza_meat", name: "Meat Lover Pizza", cookingTime: 3, unlocked: false, ingredients: { flour: 2, tomato: 1, cheese: 2, sausage: 2, beef: 1 } },
  { id: "recipe_94", name: "Garlic Chicken Special", cookingTime: 3, unlocked: false, ingredients: { chicken: 2, garlic: 2, rice: 1 } },
  { id: "recipe_38", name: "Spicy Bread Platter", cookingTime: 3, unlocked: false, ingredients: { bread: 3, spices: 2, garlic: 1 } },
  { id: "recipe_82", name: "Classic Potato Bowl", cookingTime: 3, unlocked: false, ingredients: { potato: 3, onion: 1, oil: 1 } },
  { id: "recipe_59", name: "Garlic Bread Platter", cookingTime: 2, unlocked: false, ingredients: { bread: 3, garlic: 2, oil: 1 } },
  { id: "recipe_90", name: "Savory Rice Delight", cookingTime: 3, unlocked: false, ingredients: { rice: 3, soy_sauce: 1, egg: 1 } },
  { id: "recipe_49", name: "Baked Vegetable Bowl", cookingTime: 1, unlocked: false, ingredients: { vegetable: 3, rice: 1, soy_sauce: 1 } },
  { id: "recipe_24", name: "Honey Potato Bites", cookingTime: 1, unlocked: false, ingredients: { potato: 2, sugar: 1, oil: 1 } },
  { id: "recipe_5", name: "Steamed Tomato Medley", cookingTime: 3, unlocked: false, ingredients: { tomato: 3, garlic: 1, oil: 1 } },
  { id: "recipe_18", name: "Steamed Noodle Soup", cookingTime: 2, unlocked: false, ingredients: { noodle: 2, water: 1, vegetable: 1 } },
  { id: "recipe_51", name: "Roasted Cheese Stir-fry", cookingTime: 1, unlocked: false, ingredients: { cheese: 2, vegetable: 1, oil: 1 } },
  { id: "recipe_74", name: "Steamed Bread Bites", cookingTime: 2, unlocked: false, ingredients: { bread: 2, water: 1 } },
  { id: "recipe_56", name: "Spicy Noodle Sandwich", cookingTime: 1, unlocked: false, ingredients: { noodle: 1, bread: 2, spices: 1 } },
  { id: "recipe_7", name: "Classic Chicken Bites", cookingTime: 1, unlocked: false, ingredients: { chicken: 2, flour: 1, oil: 1 } },
  { id: "ramen", name: "Ramen Bowl", cookingTime: 1.5, unlocked: false, ingredients: { noodle: 1, egg: 1, chicken: 1, soy_sauce: 1 } },
  { id: "recipe_64", name: "Savory Veggie Salad", cookingTime: 2, unlocked: false, ingredients: { vegetable: 2, lettuce: 2, soy_sauce: 1 } },
  { id: "recipe_61", name: "Smoky Chicken Curry", cookingTime: 2, unlocked: false, ingredients: { chicken: 2, spices: 2, rice: 1 } },
  { id: "recipe_73", name: "Savory Chicken Bowl", cookingTime: 1, unlocked: false, ingredients: { chicken: 2, rice: 2, soy_sauce: 1 } },
  { id: "wagyu", name: "Wagyu Beef", cookingTime: 3, unlocked: false, ingredients: { beef: 3, spices: 2, garlic: 1 } },
  
  // 🌟 LUXURY END-GAME RECIPES
  { id: "royal_surf_turf", name: "Royal Surf & Turf", cookingTime: 4, unlocked: false, ingredients: { wagyu: 1, shrimp: 2 } }, 
  { id: "seafood_platter", name: "Ultimate Seafood Platter", cookingTime: 5, unlocked: false, ingredients: { fish: 2, shrimp: 3, spices: 2 } }, 
  { id: "sushi_boat", name: "Ocean's Bounty Sushi Boat", cookingTime: 5, unlocked: false, ingredients: { fish: 3, shrimp: 2, rice: 4 } }, 
  { id: "emperor_burger", name: "Emperor Wagyu Burger", cookingTime: 4, unlocked: false, ingredients: { wagyu: 1, beef: 1, bun: 1, cheese: 3 } }, 
  { id: "wagyu_pasta", name: "Truffle Wagyu Pasta", cookingTime: 4, unlocked: false, ingredients: { wagyu: 1, noodle: 3, spices: 3, garlic: 2 } }, 
  { id: "tycoon_banquet", name: "Tycoon's Banquet", cookingTime: 6, unlocked: false, ingredients: { wagyu: 1, fish: 1, shrimp: 2, spices: 2 } } 
];

// 🧠 DYNAMIC PRICING ENGINE
export const RECIPES: Recipe[] = RAW_RECIPES.map(recipe => {
  // 1. Calculate raw food cost
  const rawCost = Object.entries(recipe.ingredients).reduce((total, [ingId, qty]) => {
    return total + (qty * (INGREDIENTS[ingId]?.cost || 0));
  }, 0);

  // 2. Base Price is 3x or 4x
  const basePrice = rawCost < 10 ? Math.round(rawCost * 3) : Math.round(rawCost * 4);

  // 3. Create a perfectly smooth unlock curve based on the item's value!
  // Cheap items: ~$300. Mid-tier: ~$2000. Luxury: ~$20,000+
  const calculatedUnlockCost = recipe.unlocked ? 0 : Math.round((basePrice * basePrice * 0.6 + basePrice * 25) / 100) * 100;

  // We set both `basePrice` and the current `price` to start identically.
  return { ...recipe, basePrice, price: basePrice, unlockCost: calculatedUnlockCost };
}).sort((a, b) => a.basePrice - b.basePrice);
