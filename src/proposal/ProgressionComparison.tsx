import {Property} from '../prototype/expansionModel';
import {MENU_CAPACITIES,HOTEL_FLOORS,HOME_FLOORS,MALL_OPEN_FLOORS} from './sample';

export function ProgressionComparison({p,level,after,onClose,onStage}:{p:Property;level:number;after:boolean;onClose:()=>void;onStage:(n:number)=>void}){
  const food=p.kind==='restaurant'||p.kind==='cafe',n=level-1;
  const rows=food?[
    ['Active menu','Always up to 6 dishes',`${MENU_CAPACITIES[n]} dishes at Level ${level}`],
    ['Recipe collection','Buy recipes and keep them permanently','Keep every recipe; menu slots grow separately'],
    ['Cuisine','All restaurants share the same recipe catalog','Separate 24-recipe collections for diner, café & bakery, bistro, Italian and fast food; each has its own pantry'],
    ['Next expansion','Buy tables, staff and individual upgrades',level===6?'Flagship reached':`${[60,180,450,975,1800][n]} cumulative guests · $${[750,1800,4000,8000,14000][n].toLocaleString()} fit-out`],
    ['Readiness','Staff unlock at service milestones','Level 3+: 80% served. Level 4+: 2 profitable weeks and no overdue wages'],
    ['Inventory','Active-menu ingredients and automatic manager orders','Keep that working link; equipment, delivery windows and coverage targets follow later'],
  ]:p.kind==='hotel'?[
    ['Building',`${HOTEL_FLOORS[n]} guest floors in this sample · up to 5`,'Same five-floor hotel and reception-only ground floor'],
    ['First expansion','4 guests served + $6,000, between weeks','30 occupied room-nights + $6,000'],
    ['Later floors','Serve the current room count; pay $9,000 / $12,000 / $15,000','100 / 220 / 400 room-nights; same construction prices'],
    ['Daily operations','Bookings, check-in, cleaning, repairs, prices and staff','Keep the working guest journey; add laundry and clearer workload planning'],
    ['Stock','Linen, toiletries, cleaning, towels, refreshments and repair supplies','Add clean / in-use / dirty linen, stock coverage and incoming orders'],
    ['Visual change','Current reception and guest-room interiors','Existing 3D shell retained here; new laundry/service rooms are still planned'],
  ]:p.kind==='apartments'?[
    ['Building',`${HOME_FLOORS[n]} residential floors in this sample · up to 10`,'Same ten-floor building; preserve occupied homes and leases'],
    ['First expansion','3 tenants served + $4,800, between weeks','6 occupied-home weeks + $4,800'],
    ['Later floors','Service count based on current homes; $2,400 × next floor','18 / 36 / 60 / 90 / 126 / 168 / 216 / 270 occupied-home weeks'],
    ['Readiness','Service milestone, cash and between-week construction','Floor 4+: 70% occupancy and maintenance readiness. Floor 8+: 80 satisfaction'],
    ['Leasing','Six-week leases, rent collection, repairs and home types','Proposed 6 / 12 / 24-week terms, renewal offers and furnishing packages'],
    ['Visual change','Current distinct studio, one-bedroom and family layouts','Keep these layouts; parcel, laundry and resident amenities are planned additions'],
  ]:p.kind==='shop'?[
    ['Electronics unlock','20 shoppers + $5,000','Store Level 4: 300 shoppers + $5,000; existing unlocked floors stay'],
    ['Departments','24 grocery products + 12 electronics/appliances','Five store levels; deepen the same two sales floors'],
    ['Physical stock','Available stock and products placed on shelves','Delivery → receiving → stockroom → shelf refill → checkout'],
    ['Manager','One weekly budget, reserve and low-stock rules','Grocery/electronics budget split plus incoming-order tracking'],
    ['Staff','Cashier, stock assistant and manager','Add electronics adviser, receiving and service desk when needed'],
    ['Visual change','Actual grocery and electronics interiors shown here','New receiving jobs and counter work are planned; not rendered as finished here'],
  ]:[
    ['Building',`${MALL_OPEN_FLOORS[n]} shopping floors in this sample · up to 20 shops`,'Keep the glass mall, five shopping floors, play area and food court'],
    ['Floor 1','4 cumulative leases + $6,500','Also maintain 75% occupancy for two weeks'],
    ['Floor 2','8 leases + $9,000','Also 75% occupancy and two profitable weeks'],
    ['Floors 3 / 4','12 / 16 leases + $11,500 / $14,000','Add satisfaction 75 / 85, cleaning/security readiness and 80% top-floor occupancy'],
    ['Shop operation','Tenant-operated units; landlord handles leases and common areas','Keep tenants by default; optional owner-operated units with separate accounts later'],
    ['Stock & people','Shared supplies, leasing and care staff','Add explicit facility staffing, tenant health and expiry planning'],
  ];
  return <div className="proposal-comparison-backdrop" role="dialog" aria-modal="true" aria-label="Before and after progression">
    <section className="mc-panel proposal-comparison-window">
      <div className="mc-panel-header proposal-comparison-heading"><div><small>{p.name} · {after?'AFTER · PROPOSED DESIGN':'BEFORE · ORIGINAL GAME'}</small><h2>LEVELS & UNLOCKS</h2></div><button className="mc-button-red" onClick={onClose} aria-label="Close progression comparison">×</button></div>
      <div className="proposal-comparison-body"><p className="proposal-scope">{after?'Design preview: these new career requirements are proposed. The stage selector demonstrates the existing 3D floors and proposed menu capacity; it does not charge your sample account.':'Current game rules, shown with a disposable sample. The ordinary game’s menus, floors and management screens remain available behind this window.'}</p>
        <div className="proposal-change-grid">{rows.map(([name,before,proposed])=><article className="mc-slot" key={name}><h3>{name}</h3><p>{after?proposed:before}</p><small>{after?'Before: ':'Proposal: '}{after?before:proposed}</small></article>)}</div>
        <div className="proposal-stage-actions"><strong>Inspect a stage in 3D</strong><div>{MENU_CAPACITIES.map((_,i)=><button key={i} className={level===i+1?'mc-button-selected':'mc-button'} onClick={()=>onStage(i+1)}>{i===0?'Opening':i===5?'Fully expanded':`Stage ${i+1}`}</button>)}</div></div>
      </div>
    </section>
  </div>;
}
