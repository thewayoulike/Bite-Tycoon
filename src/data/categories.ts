export const INGREDIENT_ICONS: Record<string, string> = {
  tea:'🍵',seaweed:'🌿',cucumber:'🥒',chickpea:'🫘',lentil:'🫘',yogurt:'🥛',coconut:'🥥',miso:'🥣',sesame:'🌾',
  rice: "🍚", noodle: "🍜", beef: "🥩", chicken: "🍗", fish: "🐟", shrimp: "🍤", vegetable: "🥗", egg: "🥚",
  flour: "🌾", sugar: "🍬", milk: "🥛", cheese: "🧀", potato: "🥔", tomato: "🍅", onion: "🧅", garlic: "🧄",
  spices: "🌶️", soy_sauce: "🍶", oil: "🛢️", bread: "🍞", bun: "🍔", lettuce: "🥬", sausage: "🌭", fruit: "🍎", 
  coffee_bean: "☕", water: "💧", soda_syrup: "🥤", pork: "🥓", bacon: "🥓", tofu: "🧊", crab: "🦀", 
  lobster: "🦞", lamb: "🥩", duck: "🦆", wagyu: "👑", mushroom: "🍄", carrot: "🥕", corn: "🌽", broccoli: "🥦", 
  avocado: "🥑", apple: "🍏", lemon: "🍋", chocolate: "🍫", honey: "🍯", butter: "🧈", cream: "🥛", 
  ice_cream: "🍦", pasta: "🍝", tortilla: "🌮", ketchup: "🍅", mayo: "🥚", hot_sauce: "🌶️", mint: "🌿", ginger: "🫚"
};

export type IngredientCategory = 'all' | 'protein' | 'carb' | 'produce' | 'dairy' | 'sauce' | 'liquid';

export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  tea:'liquid',seaweed:'sauce',cucumber:'produce',chickpea:'carb',lentil:'carb',yogurt:'dairy',coconut:'sauce',miso:'sauce',sesame:'sauce',
  // Liquids
  water: 'liquid', soda_syrup: 'liquid', coffee_bean: 'liquid',
  
  // Carbs
  potato: 'carb', bun: 'carb', bread: 'carb', flour: 'carb', noodle: 'carb', rice: 'carb', pasta: 'carb', tortilla: 'carb',

  // Proteins
  beef: 'protein', chicken: 'protein', sausage: 'protein', pork: 'protein', bacon: 'protein', lamb: 'protein', 
  duck: 'protein', wagyu: 'protein', egg: 'protein', tofu: 'protein', shrimp: 'protein', fish: 'protein', crab: 'protein', lobster: 'protein',

  // Dairy & Sweets
  milk: 'dairy', cheese: 'dairy', sugar: 'dairy', butter: 'dairy', cream: 'dairy', ice_cream: 'dairy', chocolate: 'dairy', honey: 'dairy',

  // Produce
  lettuce: 'produce', tomato: 'produce', vegetable: 'produce', onion: 'produce', garlic: 'produce', fruit: 'produce', 
  mushroom: 'produce', carrot: 'produce', corn: 'produce', broccoli: 'produce', avocado: 'produce', apple: 'produce', lemon: 'produce',

  // Sauces & Herbs
  oil: 'sauce', soy_sauce: 'sauce', spices: 'sauce', ketchup: 'sauce', mayo: 'sauce', hot_sauce: 'sauce', mint: 'sauce', ginger: 'sauce'
};

export const CATEGORY_LABELS: { id: IngredientCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'protein', label: 'Proteins', icon: '🥩' },
  { id: 'carb', label: 'Carbs', icon: '🌾' },
  { id: 'produce', label: 'Produce', icon: '🥗' },
  { id: 'dairy', label: 'Dairy/Sweet', icon: '🧀' },
  { id: 'sauce', label: 'Sauces', icon: '🌶️' },
  { id: 'liquid', label: 'Drinks', icon: '☕' }
];
