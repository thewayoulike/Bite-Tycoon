import type {Business} from '../prototype/expansionModel';
export type Promotion={id:string;day:number;product:string;discount:5|10|15;budget:number;spent:number;week:number};
export type RetailEvents={promotions:Promotion[];week:number;day:number;message:string};
export function promotionDiscount(b:Business,id:string){const e=b.retailEvents;return e?Math.max(0,...e.promotions.filter(p=>p.week===e.week&&p.day===e.day&&p.product===id&&p.spent>0).map(p=>p.discount))/100:0;}
export function schedulePromotion(b:Business,week:number,day:number,product:string,discount:5|10|15,budget:number):Business{
 if(!b.retail?.shelves.includes(product)||!Number.isInteger(day)||day<1||day>7||![5,10,15].includes(discount)||!Number.isFinite(budget)||budget<10||budget>500||b.cash<budget)return b;
 const old=b.retailEvents??{promotions:[],week,day:1,message:''},id=`${week}-${day}-${product}`;if(old.promotions.some(p=>p.id===id))return b;
 return {...b,retailEvents:{...old,promotions:[...old.promotions,{id,day,product,discount,budget,spent:0,week}],message:'Promotion scheduled. Advertising is charged only on its active day; sale prices capture the discount.'}};
}
export function advanceRetailEvents(b:Business,week:number,day:number):Business{
 if(!b.retailEvents)return b;let cash=b.cash,cost=0;
 const promotions=b.retailEvents.promotions.filter(p=>p.week>=week-1).map(p=>{
  if(p.week!==week||p.day!==day||p.spent||cash<p.budget)return p;
  cash-=p.budget;cost+=p.budget;return {...p,spent:p.budget};
 });
 return {...b,cash,books:b.books?{...b.books,maintenance:b.books.maintenance+cost}:undefined,retailEvents:{...b.retailEvents,promotions,week,day,message:cost?`Advertising active: $${cost}. Discounts reduce sales revenue; advertising is an operating cost.`:b.retailEvents.message}};
}
export function promotionDemand(b:Business){return b.retailEvents?.promotions.some(p=>p.week===b.retailEvents!.week&&p.day===b.retailEvents!.day&&p.spent>0)?1.3:1;}
