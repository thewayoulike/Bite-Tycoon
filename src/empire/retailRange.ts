/** Everyday departments share the same ordering, FIFO, pricing and shelf system. */
export type RetailForm='box'|'bag'|'bottle'|'can'|'jar'|'roll'|'tray'|'loaf'|'produce'|'textile'|'flower';
export type RetailProduct={id:string;name:string;category:string;cost:number;price:number;icon:string;color:string;form?:RetailForm};
type Row=[id:string,name:string,cost:number,price:number,form?:RetailForm];
function range(category:string,icon:string,colors:string[],form:RetailForm,rows:Row[]):RetailProduct[]{
 return rows.map(([id,name,cost,price,shape],i)=>({id,name,cost,price,category,icon,color:colors[i%colors.length],form:shape??form}));
}
export const EVERYDAY_PRODUCTS:RetailProduct[]=[
 ...range('Produce','🥬',['#d1a557','#74a252','#d68953','#905557'],'produce',[
  ['oranges','Oranges · bag',2,4.5],['lemons','Lemons · bag',1.8,4],['pears','Pears · pack',2,4.5],['grapes','Seedless grapes',2.8,6],
  ['strawberries','Strawberry punnet',3,6.5],['blueberries','Blueberry punnet',3.5,7],['avocados','Avocados · pair',2.5,5.5],['onions','Onions · bag',1.3,3],
  ['broccoli','Fresh broccoli',1.5,3.5],['cucumber','Cucumber',.8,2],['peppers','Mixed peppers',2,4.5],['mushrooms','Mushroom punnet',1.8,4],
 ]),
 ...range('Bakery','🥐',['#c39155','#d6ae78','#b17c42'],'loaf',[
  ['wholegrain_bread','Wholegrain loaf',1.8,4.5],['bagels','Bagels · six pack',2.1,5],['croissants','Butter croissants',2.5,6],['rolls','Dinner rolls',1.5,3.5],
  ['muffins','Blueberry muffins',2.4,5.5],['tortillas','Tortilla wraps',1.7,4,'bag'],['pitta','Pitta bread',1.4,3.5,'bag'],
 ]),
 ...range('Chilled','🥛',['#eee3bd','#8aa4ba','#d3cc99','#bb9c83'],'tray',[
  ['yogurt','Natural yogurt',1.6,3.5,'jar'],['cheese','Cheddar cheese',2.8,6],['butter','Butter block',2.1,4.5],['cream','Fresh cream',1.5,3.5,'bottle'],
  ['mozzarella','Mozzarella',2.3,5],['oat_milk','Oat drink',1.8,4,'box'],['hummus','Hummus tub',1.7,4,'jar'],['fresh_pasta','Fresh pasta',2.4,5.5],
 ]),
 ...range('Meat & Fish','🥩',['#bd8878','#d3ad91','#9aafb2'],'tray',[
  ['minced_beef','Minced beef',4.5,9],['lamb','Lamb chops',7,14],['turkey','Turkey breast',5,10],['salmon','Salmon fillets',6,12],
  ['prawns','Peeled prawns',5.5,11],['chicken_sausages','Chicken sausages',3.2,7],
 ]),
 ...range('Pantry','🥫',['#b28c60','#a96b51','#899d69','#dbbf78'],'bag',[
  ['flour','Plain flour',1.1,2.5],['sugar','Granulated sugar',1.2,2.8],['salt','Table salt',.5,1.5,'box'],['oats','Rolled oats',1.6,3.5],
  ['lentils','Red lentils',1.8,4],['chickpeas','Canned chickpeas',.8,2,'can'],['beans','Baked beans',.9,2.2,'can'],['tinned_tomatoes','Chopped tomatoes',.8,2,'can'],
  ['tuna','Canned tuna',1.3,3,'can'],['olive_oil','Olive oil',4,8,'bottle'],['cooking_oil','Cooking oil',2,4.5,'bottle'],['pasta_sauce','Pasta sauce',1.5,3.5,'jar'],
  ['honey','Pure honey',2.5,6,'jar'],['jam','Strawberry jam',1.6,4,'jar'],['peanut_butter','Peanut butter',2.2,5,'jar'],['spice_mix','Cooking spices',1,2.8,'jar'],
 ]),
 ...range('Drinks','🥤',['#89adba','#b9694e','#c1af65','#63866b'],'bottle',[
  ['water','Bottled water · six pack',1.8,4],['sparkling_water','Sparkling water',.7,1.8],['cola','Cola · can pack',2.5,5.5,'can'],['lemonade','Lemonade',1.2,3],
  ['orange_juice','Orange juice',2.2,5,'box'],['smoothie','Fruit smoothie',2.5,5.5],['hot_chocolate','Hot chocolate powder',2,5,'jar'],
 ]),
 ...range('Snacks','🍿',['#be775b','#ddba69','#8b6d59','#899958'],'bag',[
  ['crisps','Potato crisps',1,2.5],['popcorn','Popcorn',1.2,3],['nuts','Mixed nuts',2.5,5.5],['dried_fruit','Dried fruit',2.3,5],
  ['crackers','Wholegrain crackers',1.4,3.5,'box'],['granola_bars','Granola bars',2,4.5,'box'],['sweets','Fruit sweets',1,2.8],['rice_cakes','Rice cakes',1.2,3],
 ]),
 ...range('Frozen','❄️',['#779ab3','#cdb789','#8aaf81','#a87965'],'box',[
  ['ice_cream','Ice cream tub',2.5,6,'tray'],['frozen_pizza','Frozen pizza',2.8,6],['frozen_fries','Frozen fries',1.8,4,'bag'],['frozen_berries','Frozen berries',2.8,6,'bag'],
  ['fish_fingers','Fish fingers',2.5,5.5],['frozen_dumplings','Vegetable dumplings',3,6.5,'bag'],['frozen_meal','Ready meal',2.5,5.5],
 ]),
 ...range('Household','🧽',['#7ba9a0','#9ea4bd','#dfd9bd','#9eb0b8'],'bottle',[
  ['dish_soap','Dishwashing liquid',1.4,3.5],['surface_cleaner','Multi-surface cleaner',1.8,4],['toilet_cleaner','Toilet cleaner',1.6,4],
  ['softener','Fabric softener',3,7],['dishwasher_tabs','Dishwasher tablets',4,9,'box'],['toilet_paper','Toilet tissue · six rolls',2.8,6,'roll'],
  ['paper_towels','Kitchen paper · two rolls',1.8,4,'roll'],['bin_bags','Bin liners',1.5,3.5,'box'],['sponges','Cleaning sponges',.8,2.5,'bag'],
 ]),
 ...range('Personal care','🪥',['#c4d9d0','#bfa4ba','#7cacc0','#e2d6be'],'bottle',[
  ['shampoo','Shampoo',2.5,6],['conditioner','Hair conditioner',2.5,6],['body_wash','Body wash',2,5],['toothpaste','Toothpaste',1.5,4,'box'],
  ['toothbrushes','Toothbrush twin pack',1.3,3.5,'bag'],['deodorant','Deodorant',2,5],['sanitary_pads','Sanitary pads',2,4.5,'bag'],
  ['tissues','Facial tissues',1,2.5,'box'],['sunscreen','Sun cream',3.5,8],['bandages','Adhesive bandages',1.2,3.5,'box'],
 ]),
 ...range('Baby care','🍼',['#e3d8b7','#a8c5c2','#d0adc0'],'bag',[
  ['nappies','Baby nappies',5,11],['baby_wipes','Baby wipes',1.2,3],['baby_food','Baby food jars',1.1,2.5,'jar'],
  ['baby_cereal','Baby cereal',2.5,5.5,'box'],['baby_wash','Gentle baby wash',2.2,5,'bottle'],['baby_bottle','Feeding bottle',2,5,'box'],
 ]),
 ...range('Pet care','🐾',['#b99467','#809783','#b98476'],'bag',[
  ['dog_food','Dry dog food',4,9],['cat_food','Dry cat food',3.5,8],['wet_pet_food','Wet pet food',.8,2,'can'],
  ['pet_treats','Pet treats',1.5,4],['cat_litter','Cat litter',3,7],['pet_shampoo','Pet shampoo',2.5,6,'bottle'],
 ]),
 ...range('Home & kitchen','🍽️',['#cad0c2','#ac9677','#829ba3'],'box',[
  ['foil','Kitchen foil',1.5,3.5],['food_wrap','Food wrap',1.2,3],['food_containers','Food storage containers',3,7],['baking_paper','Baking paper',1.3,3.5],
  ['mugs','Ceramic mugs · pair',2.5,6],['plates','Dinner plates · four pack',4,9],['tea_towels','Kitchen towels · pair',2,5,'textile'],['bath_towel','Bath towel',4,9,'textile'],
 ]),
 ...range('Stationery','✏️',['#c7b77c','#8397aa','#b47765'],'box',[
  ['notebook','Notebook',1,3],['pens','Ballpoint pens · pack',1,3],['pencils','Colouring pencils',1.5,4],['tape','Adhesive tape',.7,2],['greeting_card','Greeting card',.8,2.5],
 ]),
 ...range('Clothing basics','🧦',['#8f9aab','#c4b9a9','#9d8192'],'textile',[
  ['socks','Cotton socks · three pairs',2.5,6],['tshirt','Cotton T-shirt',4,9],['kids_pyjamas','Children’s pyjamas',5,12],['slippers','Indoor slippers',3.5,8],
 ]),
 ...range('Gifts','🎁',['#b59bb2','#8a9b7a'],'box',[
  ['candle','Scented candle',2.5,6,'jar'],['gift_wrap','Gift wrap roll',1,3],
 ]),
];

export const SUPERMARKET_STARTER_IDS=['apples','bananas','carrots','tomatoes','bread','milk','rice','pasta','cereal','tea','coffee','juice','biscuits','chocolate','water','toilet_paper','dish_soap','shampoo','toothpaste','tissues'];

export function retailStorage(product:RetailProduct){
 if(['Electronics','Appliances'].includes(product.category))return {location:'Secure electronics stockroom',supplier:'Electronics distributor'};
 if(product.category==='Frozen')return {location:'Freezer',shelfLife:28,supplier:'Frozen food supplier'};
 if(product.id==='chicken'||product.category==='Meat & Fish')return {location:'Chilled store',shelfLife:7,supplier:'Fresh meat & fish supplier'};
 if(product.category==='Chilled')return {location:'Chilled store',shelfLife:7,supplier:'Dairy & chilled supplier'};
 if(product.category==='Produce'||product.id==='flowers')return {location:'Fresh produce store',shelfLife:7,supplier:'Fresh produce supplier'};
 if(product.category==='Bakery')return {location:'Bakery racks',shelfLife:7,supplier:'Bakery supplier'};
 if(['Household','Personal care','Baby care','Pet care','Home & kitchen','Stationery','Clothing basics','Gifts'].includes(product.category))return {location:'Household stockroom',supplier:'Everyday essentials wholesaler'};
 return {location:'Dry stockroom',supplier:'Grocery wholesaler'};
}
