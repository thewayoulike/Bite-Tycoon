import {restaurantCatalog,RESTAURANT_TYPES,RestaurantType} from '../data/restaurantCatalogs';
import './restaurantProgression.css';
export function RestaurantTypePicker({value,onChange,id='restaurant-type',legacy=false}:{value:RestaurantType;onChange:(type:RestaurantType)=>void;id?:string;legacy?:boolean}){
 const profile=restaurantCatalog(value);
 return <section className="restaurant-type-picker"><label htmlFor={id}>Restaurant type</label><select id={id} value={value} onChange={e=>onChange(e.target.value as RestaurantType)}>{RESTAURANT_TYPES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><p>{profile.description}</p><p><strong>Opening menu:</strong> {profile.recipes.filter(r=>profile.starterIds.includes(r.id)).map(r=>r.name).join(' · ')}</p><small>{legacy?'Existing stock, recipes and financial history are retained. Your previous recipes remain in the Legacy collection.':'Includes six learned recipes and a matching starter pantry.'} Reach higher restaurant levels to learn more of this type’s 24 recipes.</small></section>;
}
