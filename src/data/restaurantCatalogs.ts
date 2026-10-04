import {INGREDIENTS,Recipe} from './recipes';

export type RestaurantType='diner'|'cafe'|'bistro'|'italian'|'fastfood'|'indian'|'japanese';
export const RESTAURANT_RECIPE_COUNT=30;
export type RestaurantAssignments=Record<string,RestaurantType>;
export const DEFAULT_RESTAURANT_TYPES:RestaurantAssignments={diner:'diner',cafe:'cafe',bistro:'bistro'};
type Dish=[name:string,ingredients:string,prep?:number];
const definitions:Record<RestaurantType,{name:string;description:string;dishes:Dish[]}>= {
  fastfood:{name:'Fast food',description:'Quick-service burgers, crispy chicken, wraps, loaded sides and cold drinks.',dishes:[
    ['Smash burger','beef bun onion ketchup'],['Double stack burger','beef:2 bun cheese:2 lettuce ketchup'],['Crispy chicken burger','chicken bun flour oil lettuce mayo'],['Spicy chicken burger','chicken bun flour oil hot_sauce mayo'],
    ['Grilled chicken wrap','chicken tortilla lettuce tomato mayo'],['Crunchy vegetable wrap','vegetable tortilla lettuce mayo'],['Chicken nugget box','chicken:2 flour egg oil'],['Crispy chicken tenders','chicken:2 flour oil spices'],
    ['Fried chicken bucket','chicken:4 flour:2 oil:2 spices'],['Hot wing box','chicken:2 hot_sauce butter oil'],['Skinny fries','potato:2 oil spices'],['Loaded cheese fries','potato:2 oil cheese ketchup'],
    ['Chili-loaded fries','potato:2 beef tomato hot_sauce oil'],['Crispy potato wedges','potato:3 flour oil spices'],['Mozzarella bites','cheese:2 flour egg oil'],['Crunchy slaw cup','vegetable carrot mayo'],
    ['Sweetcorn snack pot','corn:2 butter'],['Fish fillet burger','fish bun flour oil mayo'],['Chilled cola','soda_syrup water:2 sugar'],['Lemon ice cooler','lemon water:2 sugar'],
    ['Fruit slush','fruit:2 water sugar'],['Soft-serve cup','ice_cream milk'],['Chocolate sundae','ice_cream:2 chocolate cream'],['Apple hand pie','apple flour butter sugar'],
    ['Breakfast muffin stack','bread egg sausage cheese'],['Barbecue beef wrap','beef tortilla onion hot_sauce honey'],['Crispy fish bites','fish:2 flour egg oil'],
    ['Chicken loaded nachos','tortilla:2 chicken cheese tomato'],['Honey milkshake','milk ice_cream honey'],['Cheesy corn fritters','corn:2 flour cheese egg oil'],
  ]},
  diner:{name:'Classic diner',description:'Burgers, breakfast plates, comfort food and milkshakes.',dishes:[
    ['Diner cheeseburger','beef:2 bun cheese lettuce tomato'],['Crispy chicken sandwich','chicken:2 bread:2 flour oil mayo'],['French fries basket','potato:3 oil ketchup'],['Golden onion rings','onion:2 flour egg oil'],
    ['All-day breakfast omelet','egg:3 cheese tomato butter'],['Griddle pancakes','flour:2 egg milk honey'],['Chicken club sandwich','chicken bread:3 bacon lettuce mayo'],['Diner tomato soup','tomato:3 onion cream water'],
    ['Fish and chips','fish potato:2 flour oil'],['Homestyle meatloaf','beef:2 bread egg ketchup'],['Roast chicken supper','chicken:2 carrot potato butter'],['Sausage and mash','sausage:2 potato:2 butter milk'],
    ['Barbecue chicken bites','chicken:2 hot_sauce honey oil'],['Grilled cheese toast','bread:2 cheese:2 butter'],['Loaded baked potato','potato:2 cheese bacon cream'],['Sweetcorn side salad','corn:2 lettuce mayo'],
    ['Bottomless filter coffee','coffee_bean water:2'],['Vanilla diner milkshake','milk:2 ice_cream sugar'],['Chocolate diner shake','milk:2 chocolate ice_cream'],['Warm apple pie','apple:2 flour butter sugar'],
    ['Fresh lemonade','lemon:2 water sugar'],['Cola ice-cream float','soda_syrup water ice_cream'],['Beef chili bowl','beef:2 tomato onion hot_sauce'],['Breakfast burrito','tortilla egg:2 potato cheese'],
    ['Country chicken pot pie','chicken carrot vegetable flour butter'],['Spiced French toast','bread:2 egg milk sugar spices'],['Diner patty melt','beef bread:2 onion cheese butter'],
    ['Honey waffles','flour:2 egg milk butter honey'],['Chocolate cream pie','flour butter chocolate cream sugar'],['Bacon and egg breakfast plate','bacon:2 egg potato tomato'],
  ]},
  cafe:{name:'Café & bakery',description:'Espresso drinks, fresh baking, light lunches and cakes.',dishes:[
    ['Espresso','coffee_bean water'],['Americano','coffee_bean water:2'],['Cappuccino','coffee_bean milk water'],['Caffè latte','coffee_bean milk:2 water'],
    ['Flat white','coffee_bean:2 milk water'],['Café mocha','coffee_bean chocolate milk'],['Iced vanilla latte','coffee_bean milk sugar water'],['Luxury hot chocolate','chocolate:2 milk cream'],
    ['Fresh mint tea','mint water:2'],['Lemon iced tea','lemon mint water sugar'],['Butter croissant','flour:2 butter:2 milk'],['Chocolate croissant','flour:2 butter chocolate'],
    ['Apple spice muffin','apple flour egg sugar spices'],['Cheese scone','flour:2 cheese butter milk'],['Honey toast','bread:2 honey butter'],['Avocado sourdough toast','bread:2 avocado lemon'],
    ['Tomato and cheese panini','bread:2 tomato cheese oil'],['Egg mayonnaise sandwich','bread:2 egg:2 mayo'],['Mushroom toastie','bread:2 mushroom:2 cheese butter'],['Vegetable quiche','flour egg:2 cream vegetable'],
    ['Chocolate brownie','chocolate:2 flour egg butter sugar'],['Lemon loaf slice','lemon flour egg butter sugar'],['Seasonal fruit parfait','fruit:2 cream honey'],['Fruit cream cake','flour egg fruit cream sugar'],
    ['Cold-brew coffee','coffee_bean:2 water:2'],['Honey and mint tea','mint honey lemon water'],['Honey shortbread biscuit','flour:2 butter honey'],
    ['Spinach and cheese breakfast roll','vegetable bread cheese egg'],['Carrot cake slice','carrot:2 flour egg cream sugar'],['Roasted tomato lunch soup','tomato:3 vegetable cream water'],
  ]},
  bistro:{name:'Garden bistro',description:'Seasonal starters, roast plates, seafood and plated desserts.',dishes:[
    ['Seasonal garden greens','lettuce:2 tomato avocado lemon'],['Honey-roasted carrots','carrot:3 honey butter'],['Wild mushroom velouté','mushroom:3 cream onion water'],['French onion gratin soup','onion:3 bread cheese butter'],
    ['Citrus roast duck','duck:2 fruit lemon spices'],['Herb-crusted lamb','lamb:2 garlic mint oil'],['Lemon butter fish','fish:2 lemon butter vegetable'],['Crisp crab fritters','crab:2 flour egg oil'],
    ['Prawn and garden risotto','shrimp rice:2 vegetable butter'],['Bistro mushroom risotto','rice:2 mushroom:2 butter cheese'],['Bistro meatballs and frites','beef:2 egg potato:2 tomato'],['Garlic roast chicken','chicken:2 garlic:2 carrot butter'],
    ['Pork with apple glaze','pork:2 apple honey butter'],['Roasted vegetable tart','flour butter vegetable:2 cheese'],['Grilled avocado salad','avocado:2 lettuce corn lemon'],['Broccoli gratin','broccoli:2 cheese cream'],
    ['Carrot and ginger soup','carrot:3 ginger cream water'],['Warm mushroom salad','mushroom:2 lettuce garlic oil'],['Lemon cream posset','cream:2 lemon sugar'],['Dark chocolate mousse','chocolate:2 cream egg sugar'],
    ['Apple crumble skillet','apple:2 flour butter sugar'],['Honey-roasted seasonal fruit','fruit:2 honey cream'],['Mint and lemon spritzer','mint lemon soda_syrup water'],['Bistro iced coffee','coffee_bean milk cream water'],
    ['Pan-seared fish with broccoli','fish:2 broccoli lemon butter'],['Braised beef with root vegetables','beef:2 carrot potato onion'],['Roasted garden vegetable plate','vegetable:3 cream garlic spices'],
    ['Crab and citrus salad','crab lettuce lemon avocado'],['Baked cream custard','egg:2 milk cream sugar'],['Orchard fruit tart','apple:2 fruit flour butter honey'],
  ]},
  indian:{name:'Indian kitchen',description:'Curries, rice plates, breads, snacks and warm desserts.',dishes:[
 ['Butter chicken','chicken:2 tomato cream butter spices'],['Chickpea curry','chickpea:2 tomato onion spices'],['Vegetable biryani','rice:2 vegetable spices onion'],['Chicken biryani','rice:2 chicken:2 spices onion'],['Lamb rogan josh','lamb:2 tomato onion spices'],['Garlic naan','flour:2 garlic butter milk'],['Plain naan','flour:2 milk butter'],['Potato samosas','flour potato:2 onion oil'],['Spinach paneer','vegetable:2 cheese:2 cream spices'],['Red lentil dal','lentil:2 tomato spices water'],['Tandoori chicken','chicken:2 yogurt spices lemon'],['Fish curry','fish:2 tomato milk spices'],['Prawn masala','shrimp:2 tomato garlic spices'],['Aloo gobi','potato:2 vegetable:2 spices'],['Jeera rice','rice:2 spices butter'],['Onion bhaji','onion:2 flour oil spices'],['Chana chaat','chickpea tomato onion lemon'],['Mango lassi','fruit:2 yogurt milk sugar'],['Masala chai','tea milk sugar spices'],['Sweet lassi','yogurt:2 milk sugar'],['Coconut rice','rice:2 coconut milk'],['Keema peas','beef:2 vegetable tomato spices'],['Egg curry','egg:3 tomato onion spices'],['Mushroom masala','mushroom:2 cream tomato spices'],['Vegetable korma','vegetable:3 cream spices'],['Chicken tikka wrap','chicken:2 tortilla cream spices'],['Lemon rice','rice:2 lemon oil spices'],['Rice pudding','rice milk:2 sugar'],['Cardamom biscuits','flour:2 butter sugar spices'],['Gulab dessert bites','milk flour sugar water']
 ]},
 japanese:{name:'Japanese kitchen',description:'Rice bowls, grilled fish, noodles, sushi and tea.',dishes:[
 ['Salmon sushi','fish:2 rice:2 seaweed'],['Avocado maki','avocado rice seaweed'],['Cucumber maki','cucumber rice seaweed'],['Chicken teriyaki bowl','chicken:2 rice:2 soy_sauce sugar'],['Vegetable ramen','noodle:2 vegetable mushroom water'],['Chicken ramen','noodle:2 chicken egg water'],['Beef udon','noodle:2 beef onion soy_sauce'],['Prawn tempura','shrimp:2 flour egg oil'],['Vegetable tempura','vegetable:2 flour oil'],['Miso soup','miso tofu seaweed water'],['Chicken katsu','chicken:2 flour egg oil'],['Katsu rice curry','chicken rice:2 spices potato'],['Grilled fish rice','fish:2 rice lemon'],['Tofu teriyaki','tofu:2 rice soy_sauce sugar'],['Mushroom rice bowl','mushroom:2 rice soy_sauce'],['Egg donburi','egg:2 rice onion soy_sauce'],['Beef rice bowl','beef:2 rice onion soy_sauce'],['Tuna rice roll','fish rice seaweed'],['Sweetcorn ramen','corn:2 noodle milk water'],['Yakitori skewers','chicken:2 soy_sauce sugar'],['Cabbage pancakes','vegetable flour egg oil'],['Chicken gyoza','chicken flour onion garlic'],['Vegetable gyoza','vegetable flour mushroom garlic'],['Sesame cucumber salad','cucumber:2 sesame oil'],['Seaweed salad','seaweed:2 cucumber soy_sauce'],['Green tea','tea water:2'],['Iced lemon tea','tea lemon sugar water'],['Matcha milk drink','tea milk:2 sugar'],['Sweet rice cakes','rice:2 sugar milk'],['Strawberry cream roll','fruit flour cream sugar']
 ]},
  italian:{name:'Italian restaurant',description:'Pizza, pasta, antipasti, risotto and Italian desserts.',dishes:[
    ['Margherita pizza','flour:2 tomato:2 cheese:2 oil'],['Funghi pizza','flour:2 mushroom:2 cheese tomato'],['Spicy chicken pizza','flour:2 chicken:2 cheese tomato hot_sauce'],['Four-cheese pizza','flour:2 cheese:4 cream'],
    ['Garden vegetable pizza','flour:2 vegetable:2 cheese tomato'],['Spaghetti al pomodoro','pasta:2 tomato:3 garlic oil'],['Spaghetti carbonara','pasta:2 bacon egg cheese'],['Lasagna bolognese','pasta:2 beef:2 tomato cheese'],
    ['Mushroom fettuccine Alfredo','pasta:2 mushroom:2 cream cheese'],['Seafood linguine','pasta:2 shrimp fish garlic'],['Tomato bruschetta','bread:2 tomato:2 garlic oil'],['Garlic focaccia','flour:2 garlic oil spices'],
    ['Minestrone','vegetable:2 carrot tomato water'],['Creamy polenta','corn:2 milk butter cheese'],['Risotto ai funghi','rice:2 mushroom:2 butter cheese'],['Meatball marinara','beef:2 tomato:2 onion pasta'],
    ['Chicken parmigiana','chicken:2 cheese tomato flour'],['Italian stuffed vegetables','vegetable:2 rice cheese tomato'],['Gnocchi pomodoro','potato:2 flour tomato:2'],['Lemon cheese ravioli','pasta:2 cheese:2 lemon butter'],
    ['Tiramisu','coffee_bean cream egg flour sugar'],['Panna cotta','cream:2 milk sugar'],['Italian gelato','ice_cream:2 milk chocolate'],['Affogato','coffee_bean water ice_cream'],
    ['Calzone rustico','flour:2 bacon cheese tomato'],['Penne arrabbiata','pasta:2 tomato hot_sauce garlic oil'],['Vegetable and cheese cannelloni','pasta:2 vegetable cheese cream'],
    ['Arancini croquettes','rice:2 cheese flour egg oil'],['Rustic Tuscan mushroom soup','mushroom:2 tomato carrot garlic water'],['Chocolate dessert pizza','flour:2 chocolate cream sugar'],
  ]},
};

export const RESTAURANT_TYPES=(Object.entries(definitions) as [RestaurantType,typeof definitions[RestaurantType]][]).map(([id,type])=>({id,name:type.name,description:type.description}));
export function restaurantCatalog(type:RestaurantType){
  const definition=definitions[type];
  const recipes:Recipe[]=definition.dishes.map(([name,supplies,prep],i)=>{
    const ingredients=Object.fromEntries(supplies.split(' ').map(item=>{const [id,qty]=item.split(':');if(!INGREDIENTS[id])throw new Error(`Unknown catalog ingredient: ${id}`);return [id,Number(qty??1)];}));
    const raw=Object.entries(ingredients).reduce((n,[id,qty])=>n+INGREDIENTS[id].cost*qty,0);
    const price=Math.max(3,Math.ceil(raw*2.6));
    return {id:`cuisine_${type}_${i+1}`,name,ingredients,basePrice:price,price,cookingTime:prep??(i<4?1.2:2),unlocked:true,unlockCost:Math.round(price*3)};
  });
  const opening={indian:[0,2,5,7,17,18],japanese:[0,3,4,9,12,25],fastfood:[0,2,4,10,18,21],diner:[0,1,2,4,17,16],cafe:[0,2,10,13,16,21],bistro:[0,2,5,6,18,22],italian:[0,5,10,14,20,22]}[type];
  const starterIds=opening.map(i=>recipes[i].id);
  return {name:definition.name,description:definition.description,recipes,starterIds,ingredientIds:[...new Set(recipes.flatMap(r=>Object.keys(r.ingredients)))],signatureIds:starterIds};
}
