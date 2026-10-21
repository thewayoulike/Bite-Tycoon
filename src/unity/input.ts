/** DOM wheel units differ between mice, trackpads and browsers. */
export function wheelZoomAmount(deltaY:number,deltaMode:number,pageHeight:number){
 if(!Number.isFinite(deltaY)||deltaY===0)return 0;
 const pixels=deltaY*(deltaMode===1?16:deltaMode===2?Math.max(1,pageHeight):1);
 return Math.max(-3,Math.min(3,pixels/100));
}
