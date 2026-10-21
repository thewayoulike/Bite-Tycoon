// Runs against a dedicated, isolated Chrome test profile on port 9331.
import {writeFileSync,readFileSync} from 'node:fs';
const tabs=await (await fetch('http://127.0.0.1:9331/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let serial=0;const waiting=new Map();
ws.addEventListener('message',event=>{
 const msg=JSON.parse(event.data);
 if(msg.id){const callback=waiting.get(msg.id);waiting.delete(msg.id);msg.error?callback.reject(msg.error):callback.resolve(msg.result);}
});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw r.exceptionDetails;return r.result.value;}
try{
 const mode=process.argv[2];
 if(mode==='navigate'){
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.checkErrors=[];window.checkMetrics=[];
   window.addEventListener('error',e=>window.checkErrors.push(e.message));
   window.addEventListener('unhandledrejection',e=>window.checkErrors.push(String(e.reason)));
   const original=console.error;console.error=(...args)=>{window.checkErrors.push(args.map(String).join(' '));original.apply(console,args)};
   window.addEventListener('business-unity-event',e=>{try{const m=JSON.parse(e.detail);if(m.type==='performance'){window.checkMetrics.push(m);if(window.checkMetrics.length>30)window.checkMetrics.shift()}}catch{}});
  `});
  console.log(await cdp('Page.navigate',{url:process.argv[3]}));
 }else if(mode==='frame'){
  const frame=JSON.parse(readFileSync(process.argv[3],'utf8'));
  if(process.argv[4])Object.assign(frame,{focus:'',selected:'',area:process.argv[4],detail:'room'});
  Object.assign(frame,{meter:true,fast:false,night:process.argv[5]==='night'});
  console.log(await evaluate(`window.testFrame=${JSON.stringify(frame)};window.checkMetrics=[];window.unity.SendMessage('BusinessGameBridge','ApplyFrame',JSON.stringify(window.testFrame));'Test frame applied'`));
 }else if(mode==='screenshot'){
  const image=await cdp('Page.captureScreenshot',{format:'png'});
  writeFileSync(process.argv[3],Buffer.from(image.data,'base64'));console.log(process.argv[3]);
 }else if(mode==='eval')console.log(await evaluate(process.argv[3]));
 else if(mode==='eval-file')console.log(await evaluate(readFileSync(process.argv[3],'utf8')));
 else if(mode==='wheel')console.log(await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:700,y:480,deltaX:0,deltaY:Number(process.argv[3]??-400)}));
 else console.log(await evaluate(`({
  url:location.href,title:document.title,text:document.body.innerText.slice(0,6500),
  errors:window.checkErrors,metrics:window.checkMetrics?.slice(-5),
  canvas:!!document.querySelector('canvas'),
  resources:performance.getEntriesByType('resource').filter(r=>/unityweb|loader.js|version.json/.test(r.name)).map(r=>({name:r.name,duration:Math.round(r.duration),bytes:r.transferSize}))
 })`));
}finally{ws.close();}
