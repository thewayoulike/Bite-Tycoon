import type {GameState} from '../hooks/useGameLoop';
import {restaurantManagerStatus} from '../inventory/restaurantStockroom';

export function RestaurantManagerStatus({state}:{state:GameState}){
 const status=restaurantManagerStatus(state);
 return <section className="mc-slot p-3 my-3 text-sm" aria-label="Purchasing manager status" role="status">
  <strong>{status.title}</strong><p className="mt-1">{status.detail}</p>
 </section>;
}
