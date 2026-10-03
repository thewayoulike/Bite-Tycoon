import {useState} from 'react';
import {Sun,Cloud,CloudRain,Snowflake,Wind,ChevronDown,X} from 'lucide-react';
import {weatherForDay,weatherDemand,WEATHER_EXPLANATIONS,WeatherKind} from '../empire/weather';
import {ExpansionState,PROPERTIES} from '../prototype/expansionModel';
import '../empire/weather.css';
export const WeatherIcon=({kind,size=19}:{kind:WeatherKind;size?:number})=>{const Icon={clear:Sun,cloudy:Cloud,rain:CloudRain,snow:Snowflake,wind:Wind}[kind];return <Icon size={size} aria-hidden/>;};
const percent=(v:number)=>{const n=Math.round((v-1)*100);return n===0?'Normal':`${n>0?'+':''}${n}%`;};
export function WeatherPanel({district,focus}:{district:ExpansionState;focus:string|null}){
 const [open,setOpen]=useState(false),weather=weatherForDay(district.week,district.day,district.weatherSeed),p=PROPERTIES.find(p=>p.id===focus);
 return <div className="world-weather">
  <button className="weather-summary mc-button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="weather-details" aria-label="Weather and business forecast"><WeatherIcon kind={weather.kind}/><strong>{weather.label}</strong><span>{weather.temperature}°C</span><ChevronDown size={14}/></button>
  {open&&<section id="weather-details" className="weather-details" aria-label="Weather forecast">
   <header><div><strong>Neighborhood weather</strong><small>Week {district.week} · Day {district.day}</small></div><button aria-label="Close weather forecast" onClick={()=>setOpen(false)}><X size={18}/></button></header>
   <p>{WEATHER_EXPLANATIONS[weather.kind]}</p><small>Wind {weather.wind} km/h · Changes each game day</small>
   <div className="weather-forecast">{[1,2,3].map(offset=>{const day=district.day+offset,week=district.week+Math.floor((day-1)/7),d=(day-1)%7+1,w=weatherForDay(week,d,district.weatherSeed);return <div key={offset}><small>{offset===1?'Tomorrow':`W${week} · D${d}`}</small><WeatherIcon kind={w.kind}/><b>{w.label}</b><span>{w.temperature}°C</span></div>;})}</div>
   <h3>Today’s customer demand</h3>
   {PROPERTIES.map(property=>{const effect=weatherDemand(property.kind,weather.kind);return <div key={property.id} className={`weather-impact ${p?.id===property.id?'active':''}`}><span>{property.name}<small>{property.kind==='apartments'?'New viewings':property.kind==='hotel'?'New bookings & walk-ins':property.kind==='plaza'?'Footfall & leasing enquiries':'Customer arrivals'}</small></span><b className={effect.visits>1?'up':effect.visits<1?'down':''}>{percent(effect.visits)}</b></div>;})}
   <div className="weather-impact"><span>Restaurant & café delivery</span><b className={weatherDemand('restaurant',weather.kind).delivery>1?'up':''}>{percent(weatherDemand('restaurant',weather.kind).delivery)}</b></div>
   <footer>Demand compared with a normal day. Actual sales still depend on prices, stock, staff and capacity. Existing rents and booked rates stay fixed.</footer>
  </section>}
 </div>;
}
