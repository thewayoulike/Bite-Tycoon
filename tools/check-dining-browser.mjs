// Run only against the isolated QA browser/profile on port 9331.
import fs from 'node:fs';
const directory='artifacts/dining-furniture';fs.mkdirSync(directory,{recursive:true});
const tabs=await(await fetch('http://127.0.0.1:9331/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw r.exceptionDetails;return r.result.value;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(name){const s=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${directory}/${name}.png`,Buffer.from(s.data,'base64'));}
try{
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await evaluate(`(async()=>{if(!window.checkErrors){window.checkErrors=[];const old=console.error;console.error=(...a)=>{window.checkErrors.push(a.map(String).join(' '));old.apply(console,a);};window.addEventListener('error',e=>window.checkErrors.push(e.message));}if(!window.itemQA){const canvas=document.querySelector('#business-unity-canvas');const r=await import('/src/unity/runtime.ts');const unity=await r.attachUnity(canvas.parentElement,()=>{}).ready;window.itemQA={unity,send:unity.SendMessage.bind(unity)};unity.SendMessage=(...a)=>a[1]==='ApplyFrame'?undefined:window.itemQA.send(...a);}return true})()`);
 const original=JSON.parse(fs.readFileSync('artifacts/item-visuals/diner.json','utf8'));
 const meals=JSON.parse(fs.readFileSync('artifacts/item-visuals/catalog.json','utf8')).meals;
 const frame={...original,revision:Math.floor(Date.now()/1000)%1000000,night:false,hours:12,rain:0,snow:0,weather:'clear',speed:0,meter:true};
 frame.tables=Array.from({length:4},(_,n)=>({id:'dining-'+n,x:n%2?7:-7,z:n<2?0:12,dirty:false,customer:'guest-'+n,meals:['burger','pizza','sushi','pasta'].map(kind=>meals.find(m=>m.kind===kind))}));
 frame.customers=frame.tables.map((t,n)=>({id:t.customer,table:t.id,party:4,state:'eating',cast:['amira','daniel','sofia','noah'].map(id=>({id,height:1.76})),routes:[[-2.8,0],[2.8,0],[0,-2.8],[0,2.8]].map(([x,z])=>({points:[{x:0,z:27},{x:t.x+x,z:t.z+z}]}))}));
 const results=[];
 for(const style of ['diner','cafe','bistro','japanese']){
  frame.interiorStyle=style;fs.writeFileSync(`${directory}/${style}.json`,JSON.stringify(frame));
  // Same revision/camera/guest orders throughout: style alone must rebuild correctly.
  await evaluate(`window.itemQA.send('BusinessGameBridge','ApplyFrame',${JSON.stringify(JSON.stringify(frame))});true`);
  if(style!=='diner')await evaluate(`window.itemQA.send('BusinessGameBridge','ZoomBy','3');window.itemQA.send('BusinessGameBridge','ZoomBy','3');true`);
  await pause(2300);await shot(style+'-occupied-overview');
  await evaluate(`window.itemQA.send('BusinessGameBridge','ZoomBy','-3');window.itemQA.send('BusinessGameBridge','ZoomBy','-3');true`);
  await pause(1300);await shot(style+'-occupied-close');
  results.push({style,tables:frame.tables.length,customers:frame.customers.length*4,errors:await evaluate('window.checkErrors??[]')});
 }
 const resources=await evaluate(`[...document.scripts].map(s=>s.src).filter(s=>s.includes('UnityComparison.loader.js'))`);
 const version=JSON.parse(fs.readFileSync('public/unity-comparison/version.json','utf8')).id;
 if(!resources.some(r=>r.includes(version)))throw Error('Browser has not loaded the latest published Unity build');
 fs.writeFileSync(`${directory}/browser-checks.json`,JSON.stringify({version,results,resources},null,2));console.log(JSON.stringify({version,results}));
}finally{ws.close();}
