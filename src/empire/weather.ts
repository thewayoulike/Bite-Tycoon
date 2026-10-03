import type {BusinessKind} from '../prototype/expansionModel';

export type WeatherKind='clear'|'cloudy'|'rain'|'snow'|'wind';
export type Weather={kind:WeatherKind;label:string;temperature:number;wind:number;cloud:number;wet:number;snow:number};
export type WeatherDemand={visits:number;delivery:number};
export const LEGACY_WEATHER_SEED=48271;
export function weatherSeed(seed?:number){return Number.isFinite(seed)?seed!>>>0:LEGACY_WEATHER_SEED;}
export function newWeatherSeed(){return Math.floor(Math.random()*0x100000000)>>>0;}
function roll(seed:number,index:number){let v=(seed+Math.imul(index+1,0x9e3779b9))>>>0;v=Math.imul(v^v>>>16,0x21f0aaad);v=Math.imul(v^v>>>15,0x735a2d97);return ((v^v>>>15)>>>0)/4294967296;}

/** Daily weather is random per game, but stable across saves, visits and frame rates. */
export function weatherForDay(week:number,day:number,seed?:number):Weather{
 const index=(Math.max(1,Math.floor(week))-1)*7+Math.max(0,Math.floor(day)-1),s=weatherSeed(seed),r=roll(s,index*3);
 const kind:WeatherKind=r<.3?'clear':r<.47?'cloudy':r<.7?'rain':r<.85?'wind':'snow';
 const t=roll(s,index*3+1),gust=roll(s,index*3+2);
 const settings={clear:{label:'Clear skies',temperature:18+Math.floor(t*9),wind:5+Math.floor(gust*7),cloud:0,wet:0,snow:0},cloudy:{label:'Cloudy',temperature:12+Math.floor(t*7),wind:9+Math.floor(gust*10),cloud:.65,wet:0,snow:0},rain:{label:'Rain',temperature:8+Math.floor(t*7),wind:14+Math.floor(gust*14),cloud:.9,wet:1,snow:0},wind:{label:'Windy',temperature:10+Math.floor(t*7),wind:32+Math.floor(gust*22),cloud:.45,wet:0,snow:0},snow:{label:'Snow',temperature:-5+Math.floor(t*6),wind:12+Math.floor(gust*14),cloud:.8,wet:0,snow:1}};
 return {kind,...settings[kind]};
}
// Demand affects new arrivals, never signed rents, booked rates or account balances directly.
const VISITS:Record<WeatherKind,Record<BusinessKind,number>>={
 clear:{restaurant:1.1,cafe:1.08,hotel:1.05,apartments:1.05,shop:1,park:1.3,plaza:1},
 cloudy:{restaurant:1,cafe:1,hotel:1,apartments:1,shop:1,park:.9,plaza:1.05},
 rain:{restaurant:.76,cafe:1.15,hotel:.88,apartments:.8,shop:1.1,park:.4,plaza:1.2},
 snow:{restaurant:.65,cafe:1.1,hotel:.72,apartments:.65,shop:1.18,park:.3,plaza:.85},
 wind:{restaurant:.85,cafe:.95,hotel:.9,apartments:.85,shop:.92,park:.5,plaza:1.08},
};
export function weatherDemand(kind:BusinessKind,weather:WeatherKind):WeatherDemand{
 return {visits:VISITS[weather][kind],delivery:({clear:.95,cloudy:1,rain:1.3,snow:1.2,wind:1.15})[weather]};
}
export const WEATHER_EXPLANATIONS:Record<WeatherKind,string>={
 clear:'Good walking weather brings more diners, café visitors and viewings.',
 cloudy:'A mild day. Sheltered shopping has a small advantage.',
 rain:'Fewer walk-ins at restaurants. Cafés, groceries, indoor shopping and food delivery benefit.',
 snow:'Travel slows. Groceries and hot drinks are in demand, while bookings and viewings fall.',
 wind:'Less outdoor foot traffic; indoor shopping and food delivery gain demand.',
};
