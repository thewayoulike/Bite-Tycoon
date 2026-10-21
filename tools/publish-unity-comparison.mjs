import {readFile,stat,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'UnityComparison/Builds/UnityComparison/Build');
const destination=path.join(root,'public/unity-comparison/Build');
const report=JSON.parse(await readFile(path.join(root,'artifacts/unity-comparison/web-build-result.json'),'utf8'));
if(report.result!=='Succeeded'||report.errors)throw new Error('The comparison build has not succeeded. Nothing was published.');
const files=['UnityComparison.loader.js','UnityComparison.data.unityweb','UnityComparison.framework.js.unityweb','UnityComparison.wasm.unityweb'];
const hashes=[];let bytes=0;
for(const name of files){
 const file=path.join(source,name);
 if(!(await stat(file)).size)throw new Error(`Missing build content: ${name}`);
 const buffer=await readFile(file);bytes+=buffer.length;
 hashes.push(createHash('sha256').update(buffer).digest('hex'));
}
await mkdir(destination,{recursive:true});
for(const name of files)await copyFile(path.join(source,name),path.join(destination,name));
const version={id:createHash('sha256').update(hashes.join('')).digest('hex').slice(0,16),bytes,built:new Date().toISOString()};
await writeFile(path.join(destination,'../version.json'),JSON.stringify(version));
console.log(`Separate comparison published: ${(bytes/1024/1024).toFixed(1)} MB, ${version.id}`);
