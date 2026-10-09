export type CityZone='homes'|'commercial'|'civic'|'industry';
export function outerCityZone(x:number,z:number):CityZone{
  if(x<=-50)return 'homes';
  if(x>=75&&z<=-100)return 'industry';
  if(x>=25)return 'commercial';
  return 'civic';
}
export function cityGreenBuffer(x:number,z:number){
  // Parks on both sides of the industrial boundary; a civic greenway divides east and west.
  return x===0||(x>=50&&z===-75)||(x===50&&z<=-100);
}
export const isOuterPark=(x:number,z:number)=>cityGreenBuffer(x,z)||(outerCityZone(x,z)!=='industry'&&(Math.abs(x*3+z)/25)%17===0);
