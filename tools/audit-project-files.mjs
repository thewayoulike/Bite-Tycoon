// Read-only dependency and disk inventory. Writes its report under artifacts/folder-audit.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root=path.resolve(import.meta.dirname,'..');
const relative=file=>path.relative(root,file).replaceAll('\\','/');
const inventory=[],links=[];
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,item.name),rel=relative(file);
  if(item.isSymbolicLink()){links.push(rel);continue;}
  if(item.isDirectory()){
   if(rel==='.git'||rel==='node_modules')continue;
   walk(file);
  }else if(item.isFile())inventory.push({path:rel,bytes:fs.statSync(file).size});
 }
}
walk(root);
const sourceFiles=inventory.filter(f=>f.path.startsWith('src/')&&/\.(tsx?|css)$/.test(f.path)).map(f=>f.path);
const edges=new Map();
function resolve(from,specifier){
 if(!specifier.startsWith('.'))return;
 const base=path.resolve(root,path.dirname(from),specifier);
 for(const suffix of ['','.ts','.tsx','.js','.css','/index.ts','/index.tsx']){
  const file=base+suffix;
  if(fs.existsSync(file)&&fs.statSync(file).isFile())return relative(file);
 }
}
for(const f of inventory.filter(f=>/\.(tsx?|m?js|cjs|css)$/.test(f.path)&&/^(src|tests|tools)\//.test(f.path))){
 const content=fs.readFileSync(path.join(root,f.path),'utf8');
 const imports=ts.preProcessFile(content,true,true).importedFiles.map(i=>i.fileName);
 edges.set(f.path,imports.map(i=>resolve(f.path,i)).filter(Boolean));
}
function closure(roots){
 const seen=new Set(),pending=[...roots];
 while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);pending.push(...(edges.get(file)??[]));}
 return seen;
}
const mainRoots=['src/main.tsx','src/unity/main.tsx','src/save-slots/main.tsx'];
const supportRoots=inventory.filter(f=>/^(tests|tools)\//.test(f.path)&&/\.(tsx?|m?js|cjs)$/.test(f.path)).map(f=>f.path);
const retained=closure([...mainRoots,...supportRoots]);
// Python asset tools also read TypeScript catalogs directly rather than importing them.
for(const file of inventory.filter(f=>f.path.startsWith('tools/')&&/\.py$/.test(f.path))){
 const text=fs.readFileSync(path.join(root,file.path),'utf8');
 for(const source of sourceFiles)if(text.includes(source))for(const dep of closure([source]))retained.add(dep);
}
const legacyPages=inventory.filter(f=>!f.path.includes('/')&&/\.html$/.test(f.path)&&!['index.html','save-slots.html','unity-game.html','unity-comparison.html'].includes(f.path)).map(f=>f.path);
const legacyRoots=legacyPages.flatMap(file=>[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/src=["']\/(src\/[^"']+)["']/g)].map(m=>m[1]));
const legacyOnly=[...closure(legacyRoots)].filter(f=>f.startsWith('src/')&&!retained.has(f)).sort();
const groups=new Map();
for(const file of inventory){
 const bits=file.path.split('/');
 const group=bits.length===1?'(root)':bits.slice(0,Math.min(2,bits.length-1)).join('/');
 const entry=groups.get(group)??{path:group,files:0,bytes:0};entry.files++;entry.bytes+=file.bytes;groups.set(group,entry);
}
const report={created:new Date().toISOString(),notes:['.git and node_modules are excluded from the inventory.','Symbolic links are recorded, not followed.','Candidate lists require review: dynamic asset loading cannot be inferred from imports alone.'],links,groups:[...groups.values()].sort((a,b)=>b.bytes-a.bytes),legacyPages,legacyOnly,retainedSourceFiles:[...retained].filter(f=>f.startsWith('src/')).sort(),files:inventory};
const out=path.join(root,'artifacts/folder-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({groups:report.groups.slice(0,22),legacyPages,legacyOnly,links},null,2));
