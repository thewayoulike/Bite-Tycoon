import { memo } from 'react';
import { getFoodKind } from '../graphics/foodModels';

export const FoodIllustration = memo(function FoodIllustration({recipeId,name}: {recipeId:string;name:string}) {
  const kind=getFoodKind(recipeId);
  return <svg viewBox="0 0 80 64" width="48" height="40" role="img" aria-label={name}>
    <title>{name}</title><ellipse cx="40" cy="53" rx="33" ry="8" fill="#c8bca7" opacity=".35"/><ellipse cx="40" cy="49" rx="32" ry="9" fill="#fffaf0" stroke="#c9c5b7"/>
    {kind==='burger'?<g stroke="#85522c" strokeWidth="1.5"><path d="M16 29Q18 7 40 8Q62 7 64 29Z" fill="#dba64f"/><path d="M16 32l8-3 8 4 8-3 8 3 8-3 8 3v5H16Z" fill="#79a74a"/><rect x="17" y="36" width="46" height="8" rx="4" fill="#734b32"/><path d="M18 34h44l-12 7-8-4-15 4Z" fill="#eec75c"/><path d="M16 45h48q-1 10-24 10T16 45" fill="#dba64f"/><path d="M28 19l4-2m9 4 3-2m7 0 3-2" stroke="#ffe6a1" strokeWidth="3"/></g>:
    kind==='pizza'?<g><ellipse cx="40" cy="34" rx="28" ry="19" fill="#bd8245"/><ellipse cx="40" cy="32" rx="24" ry="15" fill="#edc767"/>{[[27,29],[42,23],[54,34],[36,39]].map(([x,y])=><ellipse key={x} cx={x} cy={y} rx="5" ry="3" fill="#c35c3d"/>)}<path d="m40 32 8 16m-8-16-22 7m22-7 0-17" stroke="#bd8245"/></g>:
    kind==='fries'?<g>{[0,1,2,3,4,5].map(i=><rect key={i} x={21+i*6} y={12+(i%3)*4} width="6" height="31" rx="2" fill={i%2?'#e8ba50':'#f1cd68'} transform={`rotate(${(i-2)*4} 40 40)`}/>)}<path d="M19 33h43l-6 21H25Z" fill="#b65c46"/><path d="M31 39h18v7H31Z" fill="#eed8a1"/></g>:
    kind==='coffee'||kind==='drink'?<g><path d="M24 19h32l-3 34H28Z" fill={kind==='coffee'?'#d9bea0':'#dca749'}/><ellipse cx="40" cy="19" rx="16" ry="5" fill={kind==='coffee'?'#64422e':'#efc466'}/>{kind==='coffee'?<path d="M56 25q18-1 7 16l-9 1" fill="none" stroke="#ba9876" strokeWidth="5"/>:<path d="m42 28 4-23 12-3" fill="none" stroke="#78948b" strokeWidth="4"/>}</g>:
    kind==='sushi'?<g>{[[26,29],[49,29],[38,43]].map(([x,y])=><g key={x}><rect x={x-10} y={y-3} width="20" height="12" rx="5" fill="#314a3c"/><ellipse cx={x} cy={y-3} rx="10" ry="6" fill="#efead7"/><ellipse cx={x} cy={y-3} rx="4" ry="3" fill="#d28c64"/></g>)}</g>:
    kind==='steak'||kind==='chicken'?<g><path d="M17 36Q17 20 34 22t26 9q6 15-21 17T17 36" fill="#a66a43"/><path d="m25 29 13 14m-3-16 13 14m-3-14 10 10" stroke="#684732" strokeWidth="3"/><circle cx="59" cy="45" r="5" fill="#7e9c4d"/></g>:
    kind==='sandwich'||kind==='hotdog'?<g><path d="M16 34Q16 18 40 18t24 16v12H16Z" fill="#dcb46f"/><path d="M19 35h42" stroke="#759a43" strokeWidth="7"/><path d="M22 30h36" stroke="#b36443" strokeWidth="9"/><path d="m25 28 8 4 7-5 8 4 7-4" fill="none" stroke="#ebc963" strokeWidth="3"/></g>:
    <g><ellipse cx="40" cy="30" rx="28" ry="11" fill="#739453"/>{[0,1,2,3,4,5].map(i=><ellipse key={i} cx={22+i*7} cy={26+i%2*6} rx="6" ry="4" fill={kind==='salad'?(i%3?'#8cac60':'#c66d46'):'#e6c577'}/>)}<path d="M12 31q3 26 28 26t28-26q-28 12-56 0" fill="#d1ddd1" stroke="#91aba0" strokeWidth="1.5"/></g>}
  </svg>;
});
