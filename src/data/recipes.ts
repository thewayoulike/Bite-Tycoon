
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

export const INGREDIENTS: Record<string, Ingredient> = {
  "rice": {
    "id": "rice",
    "name": "Rice",
    "cost": 2
  },
  "noodle": {
    "id": "noodle",
    "name": "Noodles",
    "cost": 2
  },
  "beef": {
    "id": "beef",
    "name": "Beef",
    "cost": 8
  },
  "chicken": {
    "id": "chicken",
    "name": "Chicken",
    "cost": 5
  },
  "fish": {
    "id": "fish",
    "name": "Fish",
    "cost": 6
  },
  "shrimp": {
    "id": "shrimp",
    "name": "Shrimp",
    "cost": 7
  },
  "vegetable": {
    "id": "vegetable",
    "name": "Vegetables",
    "cost": 2
  },
  "egg": {
    "id": "egg",
    "name": "Egg",
    "cost": 1
  },
  "flour": {
    "id": "flour",
    "name": "Flour",
    "cost": 1
  },
  "sugar": {
    "id": "sugar",
    "name": "Sugar",
    "cost": 1
  },
  "milk": {
    "id": "milk",
    "name": "Milk",
    "cost": 2
  },
  "cheese": {
    "id": "cheese",
    "name": "Cheese",
    "cost": 4
  },
  "potato": {
    "id": "potato",
    "name": "Potato",
    "cost": 2
  },
  "tomato": {
    "id": "tomato",
    "name": "Tomato",
    "cost": 2
  },
  "onion": {
    "id": "onion",
    "name": "Onion",
    "cost": 1
  },
  "garlic": {
    "id": "garlic",
    "name": "Garlic",
    "cost": 1
  },
  "spices": {
    "id": "spices",
    "name": "Spices",
    "cost": 3
  },
  "soy_sauce": {
    "id": "soy_sauce",
    "name": "Soy Sauce",
    "cost": 2
  },
  "oil": {
    "id": "oil",
    "name": "Cooking Oil",
    "cost": 2
  },
  "bread": {
    "id": "bread",
    "name": "Bread",
    "cost": 3
  }
};

export const RECIPES: Recipe[] = [
  {
    "id": "sushi",
    "name": "Basic Sushi",
    "price": 25,
    "cookingTime": 1,
    "unlockCost": 0,
    "unlocked": true,
    "ingredients": {
      "rice": 1,
      "fish": 1
    }
  },
  {
    "id": "ramen",
    "name": "Ramen Bowl",
    "price": 40,
    "cookingTime": 1.5,
    "unlockCost": 500,
    "unlocked": false,
    "ingredients": {
      "noodle": 1,
      "egg": 1,
      "chicken": 1,
      "soy_sauce": 1
    }
  },
  {
    "id": "tempura",
    "name": "Shrimp Tempura",
    "price": 65,
    "cookingTime": 2,
    "unlockCost": 1500,
    "unlocked": false,
    "ingredients": {
      "shrimp": 2,
      "flour": 1,
      "oil": 1
    }
  },
  {
    "id": "wagyu",
    "name": "Wagyu Beef",
    "price": 150,
    "cookingTime": 3,
    "unlockCost": 4000,
    "unlocked": false,
    "ingredients": {
      "beef": 3,
      "spices": 2,
      "garlic": 1
    }
  },
  {
    "id": "recipe_1",
    "name": "Roasted Potato Soup",
    "price": 51,
    "cookingTime": 1,
    "unlockCost": 5031,
    "unlocked": false,
    "ingredients": {
      "onion": 1,
      "chicken": 3,
      "garlic": 2
    }
  },
  {
    "id": "recipe_2",
    "name": "Honey Fish Bites",
    "price": 10,
    "cookingTime": 3,
    "unlockCost": 1577,
    "unlocked": false,
    "ingredients": {
      "egg": 1,
      "tomato": 1
    }
  },
  {
    "id": "recipe_3",
    "name": "Smoky Shrimp Curry",
    "price": 48,
    "cookingTime": 2,
    "unlockCost": 1414,
    "unlocked": false,
    "ingredients": {
      "flour": 2,
      "chicken": 1,
      "sugar": 1,
      "shrimp": 2
    }
  },
  {
    "id": "recipe_4",
    "name": "Classic Egg Medley",
    "price": 57,
    "cookingTime": 3,
    "unlockCost": 641,
    "unlocked": false,
    "ingredients": {
      "spices": 1,
      "vegetable": 2,
      "rice": 2,
      "chicken": 2
    }
  },
  {
    "id": "recipe_5",
    "name": "Steamed Tomato Medley",
    "price": 32,
    "cookingTime": 3,
    "unlockCost": 1510,
    "unlocked": false,
    "ingredients": {
      "garlic": 1,
      "potato": 2,
      "egg": 2,
      "rice": 1
    }
  },
  {
    "id": "recipe_6",
    "name": "Spicy Vegetable Bites",
    "price": 40,
    "cookingTime": 1,
    "unlockCost": 5260,
    "unlocked": false,
    "ingredients": {
      "onion": 1,
      "spices": 2,
      "sugar": 2,
      "cheese": 1
    }
  },
  {
    "id": "recipe_7",
    "name": "Classic Chicken Bites",
    "price": 59,
    "cookingTime": 1,
    "unlockCost": 3443,
    "unlocked": false,
    "ingredients": {
      "oil": 2,
      "shrimp": 1,
      "onion": 2,
      "chicken": 2
    }
  },
  {
    "id": "recipe_8",
    "name": "Fried Shrimp Sandwich",
    "price": 30,
    "cookingTime": 1,
    "unlockCost": 1493,
    "unlocked": false,
    "ingredients": {
      "shrimp": 1,
      "garlic": 2
    }
  },
  {
    "id": "recipe_9",
    "name": "Fried Tofu Sandwich",
    "price": 19,
    "cookingTime": 1,
    "unlockCost": 1496,
    "unlocked": false,
    "ingredients": {
      "oil": 1,
      "shrimp": 1
    }
  },
  {
    "id": "recipe_10",
    "name": "Roasted Duck Wrap",
    "price": 71,
    "cookingTime": 2,
    "unlockCost": 3788,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "soy_sauce": 2,
      "bread": 1
    }
  },
  {
    "id": "recipe_11",
    "name": "Classic Beef Salad",
    "price": 14,
    "cookingTime": 1,
    "unlockCost": 4758,
    "unlocked": false,
    "ingredients": {
      "tomato": 1,
      "onion": 2
    }
  },
  {
    "id": "recipe_12",
    "name": "Spicy Potato Special",
    "price": 51,
    "cookingTime": 1,
    "unlockCost": 630,
    "unlocked": false,
    "ingredients": {
      "spices": 2,
      "milk": 2,
      "potato": 2
    }
  },
  {
    "id": "recipe_13",
    "name": "Zesty Potato Sandwich",
    "price": 50,
    "cookingTime": 2,
    "unlockCost": 3991,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 1,
      "cheese": 2,
      "fish": 2
    }
  },
  {
    "id": "recipe_14",
    "name": "Sweet Egg Bites",
    "price": 27,
    "cookingTime": 2,
    "unlockCost": 1087,
    "unlocked": false,
    "ingredients": {
      "garlic": 1,
      "tomato": 1,
      "fish": 1,
      "onion": 1
    }
  },
  {
    "id": "recipe_15",
    "name": "Roasted Beef Platter",
    "price": 15,
    "cookingTime": 2,
    "unlockCost": 1439,
    "unlocked": false,
    "ingredients": {
      "sugar": 2,
      "potato": 1
    }
  },
  {
    "id": "recipe_16",
    "name": "Crispy Tofu Plate",
    "price": 47,
    "cookingTime": 1,
    "unlockCost": 3616,
    "unlocked": false,
    "ingredients": {
      "shrimp": 2,
      "flour": 2,
      "potato": 1,
      "onion": 2
    }
  },
  {
    "id": "recipe_17",
    "name": "Spicy Bread Feast",
    "price": 28,
    "cookingTime": 2,
    "unlockCost": 1282,
    "unlocked": false,
    "ingredients": {
      "shrimp": 1,
      "tomato": 1,
      "garlic": 1,
      "potato": 1
    }
  },
  {
    "id": "recipe_18",
    "name": "Steamed Noodle Soup",
    "price": 62,
    "cookingTime": 2,
    "unlockCost": 2200,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "milk": 2,
      "oil": 2
    }
  },
  {
    "id": "recipe_19",
    "name": "Smoky Potato Wrap",
    "price": 29,
    "cookingTime": 3,
    "unlockCost": 1809,
    "unlocked": false,
    "ingredients": {
      "chicken": 2,
      "onion": 1,
      "tomato": 1
    }
  },
  {
    "id": "recipe_20",
    "name": "Zesty Vegetable Stew",
    "price": 32,
    "cookingTime": 3,
    "unlockCost": 2973,
    "unlocked": false,
    "ingredients": {
      "potato": 1,
      "oil": 2,
      "beef": 1
    }
  },
  {
    "id": "recipe_21",
    "name": "Honey Tomato Soup",
    "price": 42,
    "cookingTime": 1,
    "unlockCost": 2316,
    "unlocked": false,
    "ingredients": {
      "oil": 2,
      "vegetable": 2,
      "egg": 2,
      "potato": 2
    }
  },
  {
    "id": "recipe_22",
    "name": "Crispy Egg Delight",
    "price": 33,
    "cookingTime": 2,
    "unlockCost": 2201,
    "unlocked": false,
    "ingredients": {
      "chicken": 2,
      "oil": 1,
      "potato": 1
    }
  },
  {
    "id": "recipe_23",
    "name": "Sweet Rice Bites",
    "price": 29,
    "cookingTime": 1,
    "unlockCost": 3357,
    "unlocked": false,
    "ingredients": {
      "garlic": 2,
      "potato": 1,
      "vegetable": 2
    }
  },
  {
    "id": "recipe_24",
    "name": "Honey Potato Bites",
    "price": 56,
    "cookingTime": 1,
    "unlockCost": 4645,
    "unlocked": false,
    "ingredients": {
      "tomato": 1,
      "chicken": 1,
      "fish": 1,
      "rice": 2
    }
  },
  {
    "id": "recipe_25",
    "name": "Smoky Rice Feast",
    "price": 30,
    "cookingTime": 1,
    "unlockCost": 4240,
    "unlocked": false,
    "ingredients": {
      "bread": 2,
      "soy_sauce": 1,
      "egg": 1
    }
  },
  {
    "id": "recipe_26",
    "name": "Classic Bread Bites",
    "price": 73,
    "cookingTime": 1,
    "unlockCost": 2329,
    "unlocked": false,
    "ingredients": {
      "milk": 1,
      "noodle": 2,
      "egg": 2,
      "fish": 2
    }
  },
  {
    "id": "recipe_27",
    "name": "Roasted Potato Salad",
    "price": 26,
    "cookingTime": 3,
    "unlockCost": 1876,
    "unlocked": false,
    "ingredients": {
      "garlic": 4,
      "cheese": 2
    }
  },
  {
    "id": "recipe_28",
    "name": "Spicy Bread Salad",
    "price": 62,
    "cookingTime": 3,
    "unlockCost": 931,
    "unlocked": false,
    "ingredients": {
      "egg": 2,
      "beef": 2,
      "fish": 1
    }
  },
  {
    "id": "recipe_29",
    "name": "Fried Beef Curry",
    "price": 27,
    "cookingTime": 3,
    "unlockCost": 3548,
    "unlocked": false,
    "ingredients": {
      "cheese": 1,
      "garlic": 1,
      "onion": 1,
      "egg": 1
    }
  },
  {
    "id": "recipe_30",
    "name": "Garlic Rice Medley",
    "price": 48,
    "cookingTime": 2,
    "unlockCost": 1278,
    "unlocked": false,
    "ingredients": {
      "shrimp": 2,
      "vegetable": 2
    }
  },
  {
    "id": "recipe_31",
    "name": "Spicy Shrimp Special",
    "price": 23,
    "cookingTime": 1,
    "unlockCost": 5324,
    "unlocked": false,
    "ingredients": {
      "egg": 1,
      "fish": 1
    }
  },
  {
    "id": "recipe_32",
    "name": "Sweet Duck Medley",
    "price": 48,
    "cookingTime": 1,
    "unlockCost": 739,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "egg": 2,
      "sugar": 1
    }
  },
  {
    "id": "recipe_33",
    "name": "Garlic Noodle Medley",
    "price": 76,
    "cookingTime": 2,
    "unlockCost": 3703,
    "unlocked": false,
    "ingredients": {
      "milk": 1,
      "fish": 2,
      "beef": 1
    }
  },
  {
    "id": "recipe_34",
    "name": "Savory Beef Bowl",
    "price": 12,
    "cookingTime": 2,
    "unlockCost": 2207,
    "unlocked": false,
    "ingredients": {
      "noodle": 2,
      "vegetable": 1
    }
  },
  {
    "id": "recipe_35",
    "name": "Grilled Potato Platter",
    "price": 23,
    "cookingTime": 3,
    "unlockCost": 1448,
    "unlocked": false,
    "ingredients": {
      "chicken": 1,
      "onion": 1,
      "egg": 1
    }
  },
  {
    "id": "recipe_36",
    "name": "Crispy Tofu Bites",
    "price": 27,
    "cookingTime": 2,
    "unlockCost": 3413,
    "unlocked": false,
    "ingredients": {
      "cheese": 1,
      "fish": 1
    }
  },
  {
    "id": "recipe_37",
    "name": "Roasted Pork Sandwich",
    "price": 29,
    "cookingTime": 1,
    "unlockCost": 2880,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 2,
      "sugar": 1,
      "oil": 1,
      "noodle": 1
    }
  },
  {
    "id": "recipe_38",
    "name": "Spicy Bread Platter",
    "price": 52,
    "cookingTime": 3,
    "unlockCost": 3185,
    "unlocked": false,
    "ingredients": {
      "tomato": 2,
      "chicken": 2,
      "vegetable": 2
    }
  },
  {
    "id": "recipe_39",
    "name": "Zesty Fish Platter",
    "price": 32,
    "cookingTime": 2,
    "unlockCost": 2122,
    "unlocked": false,
    "ingredients": {
      "chicken": 1,
      "sugar": 2,
      "garlic": 4
    }
  },
  {
    "id": "recipe_40",
    "name": "Classic Rice Platter",
    "price": 24,
    "cookingTime": 2,
    "unlockCost": 1662,
    "unlocked": false,
    "ingredients": {
      "onion": 2,
      "soy_sauce": 1,
      "rice": 1,
      "oil": 1
    }
  },
  {
    "id": "recipe_41",
    "name": "Sweet Tomato Stir-fry",
    "price": 14,
    "cookingTime": 3,
    "unlockCost": 2602,
    "unlocked": false,
    "ingredients": {
      "cheese": 1,
      "oil": 1
    }
  },
  {
    "id": "recipe_42",
    "name": "Sweet Cheese Wrap",
    "price": 69,
    "cookingTime": 2,
    "unlockCost": 2778,
    "unlocked": false,
    "ingredients": {
      "sugar": 2,
      "fish": 1,
      "shrimp": 1,
      "vegetable": 2
    }
  },
  {
    "id": "recipe_43",
    "name": "Crispy Egg Plate",
    "price": 80,
    "cookingTime": 2,
    "unlockCost": 3727,
    "unlocked": false,
    "ingredients": {
      "egg": 2,
      "oil": 2,
      "bread": 2,
      "beef": 2
    }
  },
  {
    "id": "recipe_44",
    "name": "Sweet Beef Plate",
    "price": 32,
    "cookingTime": 2,
    "unlockCost": 2665,
    "unlocked": false,
    "ingredients": {
      "chicken": 2,
      "spices": 2
    }
  },
  {
    "id": "recipe_45",
    "name": "Roasted Cheese Special",
    "price": 13,
    "cookingTime": 1,
    "unlockCost": 4310,
    "unlocked": false,
    "ingredients": {
      "rice": 1,
      "onion": 2
    }
  },
  {
    "id": "recipe_46",
    "name": "Roasted Egg Stir-fry",
    "price": 17,
    "cookingTime": 1,
    "unlockCost": 3579,
    "unlocked": false,
    "ingredients": {
      "vegetable": 2,
      "milk": 1
    }
  },
  {
    "id": "recipe_47",
    "name": "Roasted Bread Curry",
    "price": 16,
    "cookingTime": 2,
    "unlockCost": 3702,
    "unlocked": false,
    "ingredients": {
      "milk": 1,
      "rice": 1,
      "egg": 1,
      "noodle": 1
    }
  },
  {
    "id": "recipe_48",
    "name": "Fried Tomato Salad",
    "price": 19,
    "cookingTime": 2,
    "unlockCost": 1625,
    "unlocked": false,
    "ingredients": {
      "vegetable": 2,
      "noodle": 1
    }
  },
  {
    "id": "recipe_49",
    "name": "Baked Vegetable Bowl",
    "price": 103,
    "cookingTime": 1,
    "unlockCost": 4967,
    "unlocked": false,
    "ingredients": {
      "fish": 2,
      "tomato": 2,
      "egg": 1,
      "chicken": 2
    }
  },
  {
    "id": "recipe_50",
    "name": "Crispy Bread Bowl",
    "price": 59,
    "cookingTime": 1,
    "unlockCost": 889,
    "unlocked": false,
    "ingredients": {
      "shrimp": 2,
      "oil": 1,
      "potato": 2
    }
  },
  {
    "id": "recipe_51",
    "name": "Roasted Cheese Stir-fry",
    "price": 18,
    "cookingTime": 1,
    "unlockCost": 5463,
    "unlocked": false,
    "ingredients": {
      "egg": 2,
      "oil": 1,
      "onion": 1,
      "noodle": 2
    }
  },
  {
    "id": "recipe_52",
    "name": "Smoky Vegetable Bowl",
    "price": 25,
    "cookingTime": 2,
    "unlockCost": 4300,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 1,
      "tomato": 2,
      "oil": 1,
      "vegetable": 2
    }
  },
  {
    "id": "recipe_53",
    "name": "Teriyaki Shrimp Bowl",
    "price": 35,
    "cookingTime": 3,
    "unlockCost": 2371,
    "unlocked": false,
    "ingredients": {
      "oil": 1,
      "fish": 2,
      "egg": 2
    }
  },
  {
    "id": "recipe_54",
    "name": "Smoky Potato Sandwich",
    "price": 49,
    "cookingTime": 1,
    "unlockCost": 631,
    "unlocked": false,
    "ingredients": {
      "fish": 1,
      "bread": 2,
      "soy_sauce": 2
    }
  },
  {
    "id": "recipe_55",
    "name": "Spicy Noodle Platter",
    "price": 31,
    "cookingTime": 3,
    "unlockCost": 1589,
    "unlocked": false,
    "ingredients": {
      "egg": 2,
      "garlic": 1,
      "bread": 2,
      "noodle": 2
    }
  },
  {
    "id": "recipe_56",
    "name": "Spicy Noodle Sandwich",
    "price": 26,
    "cookingTime": 1,
    "unlockCost": 4750,
    "unlocked": false,
    "ingredients": {
      "egg": 4,
      "rice": 1,
      "fish": 1
    }
  },
  {
    "id": "recipe_57",
    "name": "Teriyaki Tofu Plate",
    "price": 12,
    "cookingTime": 3,
    "unlockCost": 2445,
    "unlocked": false,
    "ingredients": {
      "oil": 1,
      "soy_sauce": 1
    }
  },
  {
    "id": "recipe_58",
    "name": "Zesty Chicken Platter",
    "price": 19,
    "cookingTime": 2,
    "unlockCost": 5467,
    "unlocked": false,
    "ingredients": {
      "egg": 2,
      "flour": 2,
      "milk": 1
    }
  },
  {
    "id": "recipe_59",
    "name": "Garlic Bread Platter",
    "price": 59,
    "cookingTime": 2,
    "unlockCost": 3335,
    "unlocked": false,
    "ingredients": {
      "spices": 2,
      "shrimp": 1,
      "cheese": 1,
      "sugar": 1
    }
  },
  {
    "id": "recipe_60",
    "name": "Zesty Beef Stew",
    "price": 44,
    "cookingTime": 3,
    "unlockCost": 1603,
    "unlocked": false,
    "ingredients": {
      "bread": 4,
      "oil": 1
    }
  },
  {
    "id": "recipe_61",
    "name": "Smoky Duck Curry",
    "price": 31,
    "cookingTime": 2,
    "unlockCost": 1288,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 2,
      "potato": 1,
      "flour": 2
    }
  },
  {
    "id": "recipe_62",
    "name": "Spicy Pork Special",
    "price": 62,
    "cookingTime": 1,
    "unlockCost": 4232,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "cheese": 2
    }
  },
  {
    "id": "recipe_63",
    "name": "Fried Chicken Bites",
    "price": 59,
    "cookingTime": 2,
    "unlockCost": 3436,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "flour": 2
    }
  },
  {
    "id": "recipe_64",
    "name": "Savory Tofu Salad",
    "price": 126,
    "cookingTime": 2,
    "unlockCost": 2761,
    "unlocked": false,
    "ingredients": {
      "rice": 2,
      "vegetable": 1,
      "beef": 2,
      "fish": 2
    }
  },
  {
    "id": "recipe_65",
    "name": "Classic Cheese Sandwich",
    "price": 23,
    "cookingTime": 1,
    "unlockCost": 4573,
    "unlocked": false,
    "ingredients": {
      "bread": 2,
      "flour": 2
    }
  },
  {
    "id": "recipe_66",
    "name": "Savory Cheese Plate",
    "price": 39,
    "cookingTime": 2,
    "unlockCost": 5056,
    "unlocked": false,
    "ingredients": {
      "spices": 1,
      "flour": 1,
      "beef": 1
    }
  },
  {
    "id": "recipe_67",
    "name": "Sweet Rice Delight",
    "price": 90,
    "cookingTime": 1,
    "unlockCost": 1404,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "potato": 2,
      "tomato": 2
    }
  },
  {
    "id": "recipe_68",
    "name": "Sweet Potato Bowl",
    "price": 41,
    "cookingTime": 1,
    "unlockCost": 1676,
    "unlocked": false,
    "ingredients": {
      "bread": 1,
      "beef": 2,
      "egg": 1
    }
  },
  {
    "id": "recipe_69",
    "name": "Zesty Shrimp Feast",
    "price": 14,
    "cookingTime": 1,
    "unlockCost": 2049,
    "unlocked": false,
    "ingredients": {
      "vegetable": 1,
      "egg": 2
    }
  },
  {
    "id": "recipe_70",
    "name": "Classic Tomato Plate",
    "price": 72,
    "cookingTime": 1,
    "unlockCost": 2500,
    "unlocked": false,
    "ingredients": {
      "egg": 1,
      "shrimp": 2,
      "chicken": 1
    }
  },
  {
    "id": "recipe_71",
    "name": "Classic Chicken Stir-fry",
    "price": 50,
    "cookingTime": 2,
    "unlockCost": 1835,
    "unlocked": false,
    "ingredients": {
      "bread": 2,
      "sugar": 1,
      "tomato": 4
    }
  },
  {
    "id": "recipe_72",
    "name": "Teriyaki Rice Medley",
    "price": 38,
    "cookingTime": 1,
    "unlockCost": 2728,
    "unlocked": false,
    "ingredients": {
      "flour": 1,
      "vegetable": 1,
      "shrimp": 2,
      "soy_sauce": 1
    }
  },
  {
    "id": "recipe_73",
    "name": "Savory Duck Bowl",
    "price": 76,
    "cookingTime": 1,
    "unlockCost": 5468,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 2,
      "noodle": 1,
      "fish": 2,
      "rice": 1
    }
  },
  {
    "id": "recipe_74",
    "name": "Steamed Bread Bites",
    "price": 23,
    "cookingTime": 2,
    "unlockCost": 2368,
    "unlocked": false,
    "ingredients": {
      "vegetable": 1,
      "fish": 1
    }
  },
  {
    "id": "recipe_75",
    "name": "Smoky Vegetable Medley",
    "price": 86,
    "cookingTime": 2,
    "unlockCost": 1496,
    "unlocked": false,
    "ingredients": {
      "tomato": 4,
      "shrimp": 2,
      "garlic": 2
    }
  },
  {
    "id": "recipe_76",
    "name": "Savory Beef Stew",
    "price": 21,
    "cookingTime": 1,
    "unlockCost": 1666,
    "unlocked": false,
    "ingredients": {
      "noodle": 2,
      "milk": 2
    }
  },
  {
    "id": "recipe_77",
    "name": "Fried Rice Feast",
    "price": 51,
    "cookingTime": 3,
    "unlockCost": 2578,
    "unlocked": false,
    "ingredients": {
      "beef": 2,
      "sugar": 1
    }
  },
  {
    "id": "recipe_78",
    "name": "Grilled Cheese Salad",
    "price": 70,
    "cookingTime": 3,
    "unlockCost": 2808,
    "unlocked": false,
    "ingredients": {
      "beef": 3
    }
  },
  {
    "id": "recipe_79",
    "name": "Steamed Duck Salad",
    "price": 29,
    "cookingTime": 1,
    "unlockCost": 5397,
    "unlocked": false,
    "ingredients": {
      "chicken": 1,
      "onion": 2,
      "tomato": 2
    }
  },
  {
    "id": "recipe_80",
    "name": "Sweet Beef Feast",
    "price": 23,
    "cookingTime": 2,
    "unlockCost": 4365,
    "unlocked": false,
    "ingredients": {
      "soy_sauce": 1,
      "oil": 1,
      "noodle": 1
    }
  },
  {
    "id": "recipe_81",
    "name": "Garlic Vegetable Bites",
    "price": 36,
    "cookingTime": 3,
    "unlockCost": 3911,
    "unlocked": false,
    "ingredients": {
      "beef": 1,
      "soy_sauce": 1
    }
  },
  {
    "id": "recipe_82",
    "name": "Classic Potato Bowl",
    "price": 68,
    "cookingTime": 3,
    "unlockCost": 2684,
    "unlocked": false,
    "ingredients": {
      "milk": 1,
      "fish": 2,
      "soy_sauce": 2,
      "shrimp": 1
    }
  },
  {
    "id": "recipe_83",
    "name": "Honey Fish Feast",
    "price": 26,
    "cookingTime": 2,
    "unlockCost": 788,
    "unlocked": false,
    "ingredients": {
      "bread": 2,
      "onion": 1
    }
  },
  {
    "id": "recipe_84",
    "name": "Honey Vegetable Curry",
    "price": 15,
    "cookingTime": 2,
    "unlockCost": 2919,
    "unlocked": false,
    "ingredients": {
      "spices": 2,
      "onion": 1
    }
  },
  {
    "id": "recipe_85",
    "name": "Classic Rice Curry",
    "price": 9,
    "cookingTime": 1,
    "unlockCost": 4223,
    "unlocked": false,
    "ingredients": {
      "sugar": 2,
      "garlic": 1
    }
  },
  {
    "id": "recipe_86",
    "name": "Spicy Cheese Bites",
    "price": 50,
    "cookingTime": 2,
    "unlockCost": 4992,
    "unlocked": false,
    "ingredients": {
      "spices": 1,
      "onion": 2,
      "beef": 1
    }
  },
  {
    "id": "recipe_87",
    "name": "Spicy Tofu Platter",
    "price": 12,
    "cookingTime": 1,
    "unlockCost": 4239,
    "unlocked": false,
    "ingredients": {
      "garlic": 2,
      "flour": 2
    }
  },
  {
    "id": "recipe_88",
    "name": "Roasted Shrimp Wrap",
    "price": 23,
    "cookingTime": 2,
    "unlockCost": 5248,
    "unlocked": false,
    "ingredients": {
      "noodle": 1,
      "potato": 2
    }
  },
  {
    "id": "recipe_89",
    "name": "Classic Egg Stew",
    "price": 23,
    "cookingTime": 1,
    "unlockCost": 1558,
    "unlocked": false,
    "ingredients": {
      "potato": 2,
      "garlic": 3,
      "noodle": 1
    }
  },
  {
    "id": "recipe_90",
    "name": "Savory Rice Delight",
    "price": 60,
    "cookingTime": 3,
    "unlockCost": 1850,
    "unlocked": false,
    "ingredients": {
      "rice": 2,
      "fish": 1,
      "beef": 1,
      "milk": 1
    }
  },
  {
    "id": "recipe_91",
    "name": "Garlic Tofu Soup",
    "price": 47,
    "cookingTime": 1,
    "unlockCost": 4066,
    "unlocked": false,
    "ingredients": {
      "fish": 2,
      "tomato": 1,
      "onion": 2
    }
  },
  {
    "id": "recipe_92",
    "name": "Steamed Duck Plate",
    "price": 22,
    "cookingTime": 1,
    "unlockCost": 567,
    "unlocked": false,
    "ingredients": {
      "oil": 2,
      "onion": 1,
      "rice": 1
    }
  },
  {
    "id": "recipe_93",
    "name": "Baked Beef Bowl",
    "price": 16,
    "cookingTime": 2,
    "unlockCost": 1801,
    "unlocked": false,
    "ingredients": {
      "bread": 1,
      "vegetable": 1,
      "egg": 2,
      "garlic": 1
    }
  },
  {
    "id": "recipe_94",
    "name": "Garlic Chicken Special",
    "price": 67,
    "cookingTime": 3,
    "unlockCost": 3454,
    "unlocked": false,
    "ingredients": {
      "sugar": 1,
      "shrimp": 2,
      "soy_sauce": 2
    }
  },
  {
    "id": "recipe_95",
    "name": "Teriyaki Fish Bowl",
    "price": 11,
    "cookingTime": 1,
    "unlockCost": 4234,
    "unlocked": false,
    "ingredients": {
      "egg": 1,
      "flour": 2
    }
  },
  {
    "id": "recipe_96",
    "name": "Grilled Rice Platter",
    "price": 13,
    "cookingTime": 1,
    "unlockCost": 5168,
    "unlocked": false,
    "ingredients": {
      "oil": 1,
      "potato": 2
    }
  }
];
