import * as THREE from 'three';

export const HOUSE_PALETTES = [
  {name:'Cedar sage',siding:'#929d89',roof:'#424b48',trim:'#e0dacc',accent:'#4e645a'},
  {name:'Coastal blue',siding:'#859daa',roof:'#424a54',trim:'#e6e0d5',accent:'#475b6d'},
  {name:'Warm cream',siding:'#c0b396',roof:'#59504a',trim:'#eee4d0',accent:'#68705b'},
  {name:'Soft terracotta',siding:'#b99280',roof:'#4a4745',trim:'#eadbca',accent:'#675651'},
  {name:'Pearl grey',siding:'#b3b6b1',roof:'#3d454e',trim:'#eee8dc',accent:'#5d7077'},
  {name:'Sandstone',siding:'#aa9d89',roof:'#555953',trim:'#e4dccb',accent:'#5e6559'},
] as const;
export type HouseStyle = 0|1|2;
export type HouseAppearance = {palette:number;style:HouseStyle};

/** Stable by plot, with different paint and details on the two neighboring homes. */
export function houseAppearanceAt(x:number,z:number,side:number):HouseAppearance {
  const seed=(Math.imul(Math.round(x/25)+37,73856093)^Math.imul(Math.round(z/25)+61,19349663))>>>0;
  return {palette:(seed%HOUSE_PALETTES.length+side*(1+(seed>>>8)%(HOUSE_PALETTES.length-1)))%HOUSE_PALETTES.length,
    style:((seed>>>16)%3+side)%3 as HouseStyle};
}

/** Recolor the existing diffuse maps while retaining their grain and normal detail. */
export function houseMaterialTint(material:THREE.MeshStandardMaterial,palette:number):THREE.Color {
  const colors=HOUSE_PALETTES[palette];
  const channel = material.name==='cedar'?['siding','#878d84']
    :material.name==='slate'?['roof','#444b51']
    :material.name==='ivory'?['trim','#ffffff']
    :material.name==='limestone'?['trim','#c7bda7']
    :material.name==='house_trim'?['trim','#ffffff']
    :material.name==='house_accent'?['accent','#ffffff']:null;
  if(!channel)return new THREE.Color(1,1,1);
  const target=new THREE.Color(colors[channel[0] as 'siding'|'roof'|'trim'|'accent']),base=material.color.clone();
  if(material.map)base.multiply(new THREE.Color(channel[1]));
  return new THREE.Color(target.r/base.r,target.g/base.g,target.b/base.b);
}
