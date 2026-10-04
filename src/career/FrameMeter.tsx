import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
export type FrameStats={fps:number;p95:number;draws:number;triangles:number;samples:number};
export function FrameMeter({onSample}:{onSample:(s:FrameStats)=>void}){
 const frames=useRef<number[]>([]),last=useRef(0);
 useFrame(({gl,clock},delta)=>{if(delta>0)frames.current.push(delta*1000);if(clock.elapsedTime-last.current<2)return;last.current=clock.elapsedTime;
 const ms=frames.current.splice(0),sorted=[...ms].sort((a,b)=>a-b);if(!ms.length)return;onSample({fps:1000/(ms.reduce((n,v)=>n+v,0)/ms.length),p95:sorted[Math.floor((sorted.length-1)*.95)],draws:gl.info.render.calls,triangles:gl.info.render.triangles,samples:ms.length});});
 return null;
}
