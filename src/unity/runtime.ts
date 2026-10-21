import {wheelZoomAmount} from './input';
type UnityInstance={SendMessage:(object:string,method:string,value:string)=>void;Quit:()=>Promise<void>;Module?:{canvas:HTMLCanvasElement}};
declare global {interface Window {createUnityInstance?:(canvas:HTMLCanvasElement,config:Record<string,unknown>,progress:(n:number)=>void)=>Promise<UnityInstance>}}
let canvas:HTMLCanvasElement|undefined,instance:Promise<UnityInstance>|undefined;
let build={baseUrl:'/unity-comparison',name:'UnityComparison',product:'Business Simulator'};
/** Configure the active city build before the first canvas is attached. */
export function configureUnityRuntime(options:typeof build){
 if(instance)throw new Error('Choose the Unity build before starting the game.');
 build={...options};
}
const listeners=new Set<(progress:number,error?:string)=>void>();
let progress=0,error:string|undefined;
export function attachUnity(host:HTMLElement,onProgress:(n:number,error?:string)=>void){
 listeners.add(onProgress);onProgress(progress,error);
 if(!canvas){canvas=document.createElement('canvas');canvas.id='business-unity-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','Unity 3D city. Drag to move, right drag to rotate and scroll to zoom.');canvas.style.cssText='width:100%;height:100%;display:block;outline:none;touch-action:none';}
 host.appendChild(canvas);
 if(!instance){
  let suffix='';
  const script=document.createElement('script');
  const file=(extension:string)=>`${build.baseUrl}/Build/${build.name}.${extension}${suffix}`;
  instance=fetch(build.baseUrl+'/version.json',{cache:'no-store'}).then(async response=>{if(response.ok){const version=await response.json();if(typeof version.id==='string'&&/^[a-f0-9]{16}$/.test(version.id))suffix='?v='+version.id;}}).catch(()=>{})
   .then(()=>new Promise<void>((resolve,reject)=>{script.src=file('loader.js');script.onload=()=>resolve();script.onerror=()=>reject(new Error('Unity browser build is not available yet.'));document.head.appendChild(script);}))
   .then(()=>{if(!window.createUnityInstance)throw new Error('Unity could not initialize.');return window.createUnityInstance(canvas!,{
    dataUrl:file('data.unityweb'),frameworkUrl:file('framework.js.unityweb'),codeUrl:file('wasm.unityweb'),streamingAssetsUrl:build.baseUrl+'/StreamingAssets',companyName:'Business Simulator',productName:build.product,productVersion:'1.0',devicePixelRatio:Math.min(1.5,window.devicePixelRatio||1),matchWebGLToCanvasSize:true,
    showBanner:(message:string,type:string)=>{if(type==='error')for(const callback of listeners)callback(progress,message);},
   },n=>{progress=n;for(const callback of listeners)callback(n);});})
   .then(unity=>{
    canvas!.addEventListener('pointerdown',()=>{canvas!.focus();unity.SendMessage('BusinessGameBridge','SetInputFocus','1');});
    canvas!.addEventListener('blur',()=>unity.SendMessage('BusinessGameBridge','SetInputFocus','0'));
    canvas!.addEventListener('contextmenu',event=>event.preventDefault());
    canvas!.addEventListener('wheel',event=>{
     event.preventDefault();
     const amount=wheelZoomAmount(event.deltaY,event.deltaMode,canvas!.clientHeight);
     if(amount)unity.SendMessage('BusinessGameBridge','ZoomBy',String(amount));
    },{passive:false});
    return unity;
   })
   .catch(reason=>{error=String(reason instanceof Error?reason.message:reason);for(const callback of listeners)callback(progress,error);throw reason;});
 }
 return {ready:instance,detach:()=>{listeners.delete(onProgress);if(canvas?.parentElement===host){const parking=document.getElementById('unity-runtime-parking')??Object.assign(document.createElement('div'),{id:'unity-runtime-parking'});parking.style.cssText='position:fixed;width:1px;height:1px;left:-100px;overflow:hidden';document.body.appendChild(parking);parking.appendChild(canvas);}}};
}
