import type {Employee,CrewAction,Shift} from './crew';
import {crewPremium} from './crew';
import type {Property} from '../prototype/expansionModel';

const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
function roleName(role:string,kind:Property['kind']){
 if(role==='service')return kind==='hotel'?'Receptionist':kind==='apartments'||kind==='plaza'?'Leasing agent':'Cashier';
 if(role==='care')return kind==='hotel'?'Housekeeper':kind==='apartments'?'Caretaker':kind==='shop'?'Stock assistant':'Cleaning crew';
 const names:Record<string,string>={chef:'Chef',waiter:'Waiter',cleaner:'Cleaner',manager:'Purchasing manager',maintenance:'Maintenance worker',concierge:'Concierge',supervisor:'Building supervisor',receiving:'Receiving assistant',handling:'Large-item delivery assistant',specialist:'Meat & fish specialist',electronics:'Electronics specialist',security:'Security officer',attendant:'Play-area attendant',operator:'Cinema operator'};
 return names[role]??role;
}
function trainingBenefit(role:string,kind:Property['kind']){
 if(role==='chef')return 'Prepares food faster at their assigned kitchen station.';
 if(role==='waiter')return 'Walks and takes or serves orders faster.';
 if(role==='cleaner')return 'Cleans faster and gets tired more slowly.';
 if(role==='manager')return 'Gets tired more slowly while checking stock. Training does not change purchase budgets, stock targets or supplier prices.';
 if(role==='service')return kind==='hotel'||kind==='apartments'?'Handles arrivals faster at reception.':'Adds service capacity. Checkout and facility limits still apply.';
 if(role==='care')return kind==='shop'?'Receives deliveries and refills shelves faster.':'Completes cleaning rounds more often, so rooms or shops are ready sooner.';
 if(role==='receiving')return 'Unloads incoming supermarket deliveries faster.';
 if(role==='handling')return 'Dispatches large-item deliveries more often.';
 if(role==='maintenance'&&(kind==='hotel'||kind==='apartments'))return 'Checks for room repairs more often. Repair supplies and cash are still needed.';
 if((role==='concierge'||role==='supervisor')&&(kind==='hotel'||kind==='apartments'))return 'Checks for guest or resident complaints more often.';
 return 'Gets tired more slowly and keeps their assigned service covered for longer. Training does not create extra shop or facility slots.';
}

export function EmployeeRoster({crew,cash,name,kind,maxFloor,weekMinutes,onAction}:{crew:Employee[];cash:number;name:string;kind:Property['kind'];maxFloor:number;weekMinutes:number;onAction:(action:CrewAction)=>void}){
 const weeklyPay=crew.reduce((sum,p)=>sum+p.pay,0);
 return <><h3>{name} · your team</h3>
  <p>Hire employees in Staff. Here you choose when and where they work, train them, or change their pay.</p>
  <div className="desk-help"><b>Training and a pay rise do different things</b><p><b>Train:</b> pay once to improve skill by one level, up to Level 5. The employee cannot start new jobs during training. Skilled staff tire more slowly. Each skill level adds 10% of the original work rate to timed jobs, up to 40% extra at Level 5.</p><p><b>Increase wage:</b> permanently raise weekly pay. This does not improve skill, speed or morale in the current game. Training does not automatically raise wages.</p><p><b>Shifts and breaks:</b> control availability, not pay. A break restores energy; an off-shift employee does not take jobs. Weekly salaries continue to accrue while the business runs, including time off shift, breaks and training.</p></div>
  <p><b>Whole team: {money(weeklyPay)}/week.</b> This includes {money(crewPremium(crew))} in agreed pay rises. Wages are due on Day 4 of the following week.</p>
  {!crew.length&&<p>No employees yet. Hire someone in Staff to see their controls here.</p>}
  <div className="desk-cards">{crew.map(person=>{
   const cost=person.skill*100,nextPay=Math.min(person.basePay*2,person.pay+5),raise=nextPay-person.pay,trained=person.skill>=5;
   const nextSkill=Math.min(5,person.skill+1),duration=Math.round(30*weekMinutes/3);
   return <article className="mc-inner-panel" key={person.id} aria-label={`${person.name} employee controls`}>
    <h4>{person.name} · {roleName(person.role,kind)}</h4>
    <p>Skill {person.skill}/5 · energy {Math.round(person.energy)}% · <b>{money(person.pay)}/week</b></p>
    <strong>{person.task}{person.training?` · ${Math.ceil(person.training*weekMinutes/3)}s remaining at normal speed`:''}</strong>
    <label>Shift<select aria-label={`${person.id} shift`} value={person.shift} onChange={v=>onAction({type:'shift',id:person.id,shift:v.target.value as Shift})}>{[['all','All day'],['morning','Morning · 06:00–14:00'],['afternoon','Afternoon · 14:00–22:00'],['night','Night · 22:00–06:00']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Work area<select aria-label={`${person.id} work area`} value={person.zone} onChange={v=>onAction({type:'zone',id:person.id,zone:Number(v.target.value)})}><option value={-1}>All open areas</option>{Array.from({length:maxFloor+1},(_,n)=><option key={n} value={n}>{n===0?'Ground / reception':`Floor ${n}`}</option>)}</select></label>
    {person.role==='chef'&&<label>Kitchen station<select aria-label={`${person.id} station`} value={person.station} onChange={v=>onAction({type:'station',id:person.id,station:v.target.value})}>{['all','grill','oven','cold','drinks'].map(v=><option key={v} value={v}>{v==='all'?'All stations':v}</option>)}</select></label>}
    <div className="desk-employee-action"><b>{trained?'Fully trained':`Train to skill ${nextSkill}`}</b><p>{trainingBenefit(person.role,kind)}{!trained&&` Cost: ${money(cost)} once. Takes ${duration} seconds at normal speed while the game runs. Weekly pay stays ${money(person.pay)}.`}</p><button disabled={trained||person.training>0||cash<cost} onClick={()=>onAction({type:'train',id:person.id})}>{trained?'Maximum skill reached':person.training>0?'Training in progress':`Train · ${money(cost)} once`}</button>{!trained&&!person.training&&cash<cost&&<p className="desk-warning">Needs {money(cost-cash)} more cash to start training.</p>}</div>
    <div className="desk-employee-action"><b>Increase weekly wage</b><p>{raise>0?`${money(person.pay)} → ${money(nextPay)} per week. Team total becomes ${money(weeklyPay+raise)}/week. No immediate payment; the extra wage accrues from now on.`:`At the pay limit: twice the starting salary (${money(person.basePay)}/week).`}</p><button disabled={raise<=0} onClick={()=>onAction({type:'raise',id:person.id})}>{raise>0?`Increase wage · +${money(raise)}/week`:'Maximum wage reached'}</button></div>
    <div className="desk-actions"><button disabled={person.training>0||person.task==='On break'} onClick={()=>onAction({type:'break',id:person.id})}>{person.task==='On break'?'Resting until 90% energy':'Give a paid break'}</button></div>
   </article>;
  })}</div>
 </>;
}
