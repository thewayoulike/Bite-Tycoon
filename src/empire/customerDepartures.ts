export type CustomerDeparture={week:number;day?:number;subject:string;reason:string;count:number};
export const addDeparture=(history:CustomerDeparture[]|undefined,item:CustomerDeparture)=>[...(history??[]),item].slice(-100);
export function departureTip(reason:string){
 const r=reason.toLowerCase();
 if(r.includes('owner')||r.includes('declined'))return 'This was a management decision. Review the agreed rate and availability before accepting a booking.';
 if(r.includes('ingredient')||r.includes('stock')||r.includes('supplies'))return 'Replenish the required supplies and check purchasing targets before opening.';
 if(r.includes('group'))return 'Prepare all rooms in the group booking together and keep reception staffed.';
 if(r.includes('ready')||r.includes('room')||r.includes('unit'))return 'Clean and repair the reserved room or home, and prepare its required linen and supplies.';
 if(r.includes('order taken')||r.includes('order was taken'))return 'Put enough waiters on duty and keep clear routes between the counter and tables.';
 if(r.includes('food')||r.includes('kitchen')||r.includes('delivery'))return 'Check chef shifts, usable equipment and the kitchen queue; reduce demand if the team cannot keep up.';
 if(r.includes('table'))return 'Keep the reserved table free and clean before the guests arrive.';
 if(r.includes('expired')||r.includes('application'))return 'Review applications before their deadline or enable the leasing assistant with staff coverage.';
 if(r.includes('closing')||r.includes('closed'))return 'Start service earlier and clear the waiting queue before the trading week ends.';
 if(r.includes('crowd')||r.includes('queue'))return 'Increase service coverage before admitting more visitors.';
 return 'Check staffing and current service blockers so the next visitor can be helped before patience runs out.';
}
