import type {BusinessKind} from '../prototype/expansionModel';
import {RESTAURANT_INTERIORS,defaultInterior,fittedInterior,interiorStyle,type RestaurantInteriorId} from './interiorStyles';
import './interiorSetup.css';

export function InteriorSetup({kind,method,type,value,onChange}:{kind:BusinessKind;method:string;type?:string;value?:RestaurantInteriorId;onChange:(value:RestaurantInteriorId)=>void}){
 const food=kind==='restaurant'||kind==='cafe';
 if(!food)return <section className="mc-inner-panel interior-setup"><h3>Interior included</h3><p>{kind==='shop'?'Shelving, checkout and stockroom are fitted for a supermarket. The electronics floor is fitted when you open it.':kind==='hotel'?'Reception and furnished standard rooms are included. Choose and upgrade individual room categories in Rooms & Rates.':kind==='apartments'?'Reception and furnished studio homes are included. Change individual home categories in Homes & Rents.':'The mall keeps its concourse and shared facilities. Each shop interior follows the business leasing that unit.'}</p></section>;
 if(method==='purchase')return <section className="mc-inner-panel interior-setup"><h3>Fitted interior · {interiorStyle(fittedInterior(kind))!.name}</h3><p>{interiorStyle(fittedInterior(kind))!.description} You are buying a running business, so its interior comes with it.</p></section>;
 const selected=value??defaultInterior(type);
 return <section className="interior-setup" aria-label="Choose interior style"><h3>Choose your interior</h3><p>Included in the opening fit-out. Your menu specialty, seating capacity and service routes stay the same.</p><div className="interior-style-options">{RESTAURANT_INTERIORS.map(s=><button type="button" key={s.id} className={s.id===selected?'mc-button-selected':'mc-button'} aria-pressed={s.id===selected} onClick={()=>onChange(s.id)}><span className="interior-palette" aria-hidden="true">{s.colors.map(c=><i key={c} style={{background:c}}/>)}</span><strong>{s.name}</strong><small>{s.description}</small></button>)}</div></section>;
}
