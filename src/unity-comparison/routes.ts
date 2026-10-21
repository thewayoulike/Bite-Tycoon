/** Old bookmarks open the same game, mode and save instead of a second renderer. */
export function mainGameUrl(value:string){
 const url=new URL(value,'http://localhost'),q=new URLSearchParams();
 const mode=url.searchParams.get('mode');
 if(mode==='fast-track'||mode==='sandbox'||mode==='career')q.set('mode',mode);
 const preview=url.searchParams.get('preview');if(preview==='1'||preview==='fast-track')q.set('preview','1');
 if(url.searchParams.has('saves')||url.pathname==='/save-slots.html'||(url.pathname==='/unity-comparison.html'&&url.searchParams.get('play')!=='1'))q.set('saves','1');
 return '/'+(q.size?'?'+q.toString():'');
}
