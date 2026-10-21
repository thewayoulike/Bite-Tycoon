import type {Recipe} from '../data/recipes';
import type {RetailProduct} from '../empire/retailRange';

/** Visual identity only: never used to calculate orders, stock or prices. */
export function dishVisual(recipe:Recipe){
 const n=recipe.name.toLowerCase(),has=(pattern:RegExp)=>pattern.test(n);
 const kind=has(/burger/)?'burger':has(/pizza/)?'pizza':has(/sushi|maki|nigiri|roll platter/)?'sushi':
  has(/coffee|espresso|americano|cappuccino|latte|flat white|mocha|chocolate$|\btea\b/)?'coffee':
  has(/juice|soda|shake|lemonade|cola|cooler|slush|spritzer|float|lassi/)?'drink':
  has(/fries|frites|wedges/)?'fries':has(/hot.?dog/)?'hotdog':has(/pasta|spaghetti|lasagne|carbonara|linguine|penne|ravioli/)?'pasta':
  has(/soup|velouté|dal|stew/)?'soup':has(/salad|greens|slaw/)?'salad':has(/pancake|waffle|french toast/)?'pancakes':
  has(/croissant/)?'croissant':has(/cake|brownie|muffin|scone|biscuit|shortbread|loaf slice/)?'cake':
  has(/pie|tart|quiche|crumble/)?'pie':has(/ice.?cream|sundae|soft.serve|parfait|mousse|posset|custard/)?'dessert':
  has(/sandwich|toast|panini|toastie|wrap|burrito|naan|bread|patty melt|muffin stack/)?'sandwich':
  has(/curry|biryani|rice|risotto|bowl|ramen|udon|noodle|masala|rogan|paneer|gobi|donburi/)?'bowl':
  has(/steak|beef|lamb|pork|meatloaf|duck/)?'steak':has(/fish|salmon/)?'fish':has(/chicken|wing|nugget|tender|tempura|fritter/)?'chicken':'plate';
 return {id:recipe.id,name:recipe.name,kind,ingredients:Object.keys(recipe.ingredients)};
}
export function retailVisual(product:RetailProduct){
 const form=product.form??(product.category==='Produce'?'produce':product.category==='Bakery'?'loaf':
  product.category==='Meat & Fish'||['chicken','eggs'].includes(product.id)?'tray':
  ['milk','tea','cereal','biscuits','chocolate'].includes(product.id)?'box':
  ['rice','pasta','coffee','frozen_vegetables'].includes(product.id)?'bag':
  product.id==='flowers'?'flower':['Drinks','Household','Personal care'].includes(product.category)?'bottle':'box');
 return {name:product.name,form,color:product.color};
}
