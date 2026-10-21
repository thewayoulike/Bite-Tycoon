import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const sources=JSON.parse(await readFile(path.join(root,'artifacts/unity-setup/free-asset-sources.json'),'utf8')).filter(r=>r.status==='fulfilled').map(r=>r.value);
const uses=[
 [229716,'Birch, ash and spruce trees, with reduced detail at longer viewing distances.'],
 [124055,'Beds, lounge seating and coffee equipment in business interiors.'],
 [381394,'Sedans, pickups, sports cars, vans and factory delivery trucks on the existing road routes.'],
 [130318,'Imported and retained for comparison; the active scenery now uses CITY package buildings.'],
 [63481,'Imported and retained; CITY package houses are now active in this edition.'],
 [987,'Only the asphalt normal texture is used. Road meshes, intersections and layout were not built with the EasyRoads3D editor.'],
 [375558,'Kitchen racks and bread displays in restaurants.'],
 [383550,'Airliners at the terminal and on the existing arrival and departure routes.'],
 [107224,'26 prepared designs: six house models and 20 commercial styles across 319 homes and 80 scenery parcels. Existing CITY buildings retain their exterior when acquired; new construction uses the glass-fronted business models.'],
];
const packs=uses.map(([id,use])=>{
 const source=sources.find(s=>s.url.endsWith('-'+id));
 if(!source)throw new Error('Missing verified asset metadata: '+id);
 return{id,name:source.title.split(' | ')[0],image:source.image,url:source.url,use,status:[130318,63481].includes(id)?'available':id===987?'texture-only':'integrated'};
});
const report=JSON.parse(await readFile(path.join(root,'artifacts/unity-comparison/web-build-result.json'),'utf8'));
if(report.result!=='Succeeded'||report.errors)throw new Error('Publish status only after a successful comparison build.');
const version=JSON.parse(await readFile(path.join(root,'public/unity-comparison/version.json'),'utf8'));
const additional=[
 'Industrial Building / Garage — airport maintenance building',
 'Old Rowboat — small harbour boats',
 'HQ Motorboats — motorboats along the waterfront',
 'Coffee Shop Environment — dining tables and chairs',
 'Fast Food Restaurant Kit — countertop display',
 'Table Pack — apartment furniture',
 'Free Food: Breakfast Time — breakfast boards, cups and fruit',
 'RPG Food & Drinks — served meals and produce',
 'Food Pack Free Demo — supermarket produce',
];
const destination=path.join(root,'public/unity-comparison');
await mkdir(path.join(destination,'screenshots'),{recursive:true});
for(const [from,to] of [['city-package-homes','homes'],['city-package-commercial','city'],['city-package-house-close','city-close'],['audit-hotel-floor2','upper-floor'],['comparison-furniture-fixed','restaurant'],['comparison-airport','airport'],['comparison-boats','boats'],['comparison-petrol','petrol'],['neon-barber-night','night-signs'],['mall-restored-day','mall'],['comparison-seating-fixed','seating'],['comparison-busy-city','traffic']]){
 await copyFile(path.join(root,'UnityComparison/Assets/Screenshots',from+'.png'),path.join(destination,'screenshots',to+'.png'));
}
await writeFile(path.join(destination,'status.json'),JSON.stringify({
 stage:'ready',version:version.id,
 message:`CITY buildings retain their architecture when acquired. Willow Galleria now occupies a four-plot city block, with broad shopping wings, a glass atrium and roads routed around its perimeter. Shops have colourful neon nameboards at night. The city also includes a petrol station and 12 controlled traffic-light junctions. Seven selected packs and nine additional packs are active; the other two remain imported. The first browser download is about ${Math.round(version.bytes/1024/1024)} MB. Business rules, staffing, stock and progression use the same game logic.`,
 packs,additional,
},null,2));
console.log('Comparison status and updated in-game screenshots published.');
