const icons={
 play:'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 city:'<path d="M3 21V8h6v13m0 0V3h7v18m0 0V11h5v10M6 11v2m0 3v2m6-12v2m0 3v2m0 3v2m7-4v3M1 21h22"/>',
 settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 folder:'<path d="M3 6h6l2 2h10v12H3ZM3 6V4h6l2 2h10v2"/>',
 star:'<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 4 13 4 18 0m-9 1v4"/>',
 sandbox:'<path d="m3 7 9-4 9 4-9 5Zm0 0v11l9 4 9-4V7M12 12v10"/>',
 shop:'<path d="M3 11v10h18V11M2 4h20l-2 7H4ZM7 21v-6h5v6m4-6h2"/>',
 cup:'<path d="M4 9h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 10h3a3 3 0 0 1 0 6h-3M7 2v3m5-3v3"/>',
 home:'<path d="m2 10 10-8 10 8M5 8v13h14V8M10 21v-7h4v7"/>',
 pin:'<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.city}</svg>`;
const options=[
 {id:5,name:'Business Empire',tag:'New · inspired by your example',description:'An original city-and-founder game cover, a dimensional gold title and bold Play controls. This is menu artwork, not a change to the in-game city graphics.',features:'Original cover art · gold logo · bold game controls',image:'business-cover-v1'},
 {id:1,name:'Cinematic Empire',tag:'Cinematic & focused',description:'A bold title, a gold play button and a city backdrop. A clear, focused menu with the feel of a premium tycoon game.',features:'Cinematic city · gold accents · left-side menu',image:'sunset'},
 {id:2,name:'Classic Tycoon',tag:'Bright & playful',description:'A big dimensional logo, colorful buttons and a career badge. The most instantly recognizable game menu in the collection.',features:'Chunky buttons · bright colors · central menu',image:'day'},
 {id:3,name:'Neighborhood Stories',tag:'Warm & welcoming',description:'A shop-sign title and a paper-style save card, with the neighborhood behind them. A slower, cozy business-building feel.',features:'Shopfront identity · warm paper · cozy street',image:'street'},
 {id:4,name:'After Hours',tag:'Modern & atmospheric',description:'A night-time city, a crisp title and large play-mode panels. A modern simulation-game look with strong blue and amber contrast.',features:'Night scene · horizontal cards · electric blue',image:'night'}
];
const content=document.querySelector('#content');
const dialog=document.querySelector('#preview-dialog');
let active=1;
let focusBeforeDialog;
const button=(label,type,cls='',mark='arrow')=>`<button class="${cls}" data-action="${type}"><span>${label}</span>${icon(mark)}</button>`;
const title=(cls='')=>`<div class="game-title ${cls}" aria-label="Business Simulator"><strong>BUSINESS</strong><span>SIMULATOR</span></div>`;
const tools=()=>`<div class="menu-tools">${button('Saved games','saves','','folder')}${button('Settings','settings','','settings')}</div>`;
function screen(id){
 if(id===5)return '<div class="cover-top"><span class="cover-edition">'+icon('city')+' BUILD · MANAGE · GROW</span><div class="cover-utilities">'+button('Saved games','saves','','folder')+button('Settings','settings','','settings')+'</div></div><div class="cover-identity"><div class="cover-kicker"><span></span> YOUR NEXT BIG ADVENTURE <span></span></div><div class="cover-logo" aria-label="Business Simulator"><strong>BUSINESS</strong><span>SIMULATOR</span></div><p>YOUR CITY. YOUR BUSINESS. YOUR RULES.</p></div><div class="cover-play-panel"><div class="cover-save">'+icon('briefcase')+' CAREER <span>WEEK 8 · 3 BUSINESSES</span></div><button class="cover-play" data-action="continue"><span class="cover-play-icon">'+icon('play')+'</span><span><strong>LET’S PLAY</strong><small>Continue your empire</small></span>'+icon('arrow')+'</button><div class="cover-modes">'+button('NEW CAREER','new','','city')+button('SANDBOX','sandbox','','sandbox')+'</div><span class="cover-sample">Sample save · interactive menu preview</span></div><div class="cover-caption"><span>START SMALL.</span><strong>DREAM BIG.</strong></div><div class="screen-footer"><span>BUSINESS SIMULATOR</span><span>ORIGINAL COVER ART · DESIGN CONCEPT</span></div>';
 if(id===1)return `<div class="cinematic-content"><div class="edition"><span></span> A BUSINESS TYCOON GAME</div>${title()}<p class="motto">ONE BUSINESS. ENDLESS POSSIBILITIES.</p><div class="cinematic-menu">${button('CONTINUE CAREER','continue','main-button','play')}<div class="save-line">${icon('clock')} Week 8 <i>·</i> 3 businesses <i>·</i> Sample save</div>${button('NEW CAREER','new','text-button')}${button('SANDBOX','sandbox','text-button')}${tools()}</div></div><div class="cinematic-location"><span class="tiny">YOUR NEXT CHAPTER</span><h2>A city to call your own.</h2><div>${icon('pin')} Maple District <span class="line"></span> 18:15</div></div><div class="screen-footer"><span>BUILD. MANAGE. GROW.</span><span>MAIN MENU <i>01</i></span></div>`;
 if(id===2)return `<div class="classic-top"><span>${icon('city')} YOUR CITY. YOUR RULES.</span><button data-action="settings" aria-label="Settings">${icon('settings')}</button></div><div class="classic-logo"><div class="logo-crown">${icon('city')} THE CITY IS YOURS ${icon('star')}</div>${title()}<div class="logo-ribbon">BUILD YOUR BUSINESS EMPIRE</div></div><div class="classic-panel"><div class="classic-welcome">READY, BOSS?</div>${button('LET’S PLAY','continue','classic-play','play')}<div class="classic-saved"><span class="medal">${icon('star')}<b>3</b></span><span><b>YOUR GROWING EMPIRE</b><small>Week 8 · 3 businesses · Sample save</small></span></div><div class="classic-modes">${button('New career','new','','briefcase')}${button('Sandbox','sandbox','','sandbox')}</div>${button('Saved games','saves','classic-load','folder')}</div><div class="classic-fact"><span>${icon('shop')}</span><div><small>EVERY EMPIRE STARTS SOMEWHERE</small><b>One little shop. One big idea.</b></div></div><div class="screen-footer"><span>MAKE YOUR FIRST MOVE.</span><span>BUSINESS SIMULATOR</span></div>`;
 if(id===3)return `<div class="cozy-header"><span>${icon('home')} MAPLE DISTRICT</span><span>Est. by you.</span></div><div class="cozy-sign"><div class="cozy-sign-inner"><span class="cozy-ornament">✦ &nbsp; WELCOME TO &nbsp; ✦</span>${title()}<p>A little ambition goes a long way.</p></div></div><div class="cozy-note"><div class="note-pin"></div><span class="paper-label">YOUR STORY CONTINUES</span><h2>Welcome back,<br>neighbor.</h2><p>Your doors are ready to open.</p><div class="cozy-save"><span>${icon('shop')}</span><div><b>Your neighborhood</b><small>Week 8 · 3 businesses</small><small>Sample save</small></div></div>${button('Open for business','continue','cozy-play','play')}<div class="cozy-options">${button('Start a new story','new')}${button('Play in sandbox','sandbox')}${button('Saved games','saves','','folder')}</div><button class="cozy-settings" data-action="settings">${icon('settings')} Settings</button></div><div class="cozy-caption"><span class="handwritten">Every big dream<br>starts on a little street.</span><span class="caption-rule"></span>${icon('cup')}</div><div class="screen-footer"><span>YOUR NEIGHBORHOOD. YOUR STORY.</span><span>TAKE YOUR TIME. BUILD SOMETHING GOOD.</span></div>`;
 return `<div class="night-top"><span>${icon('city')} BUSINESS SIMULATOR</span><div><i></i> CITY AFTER HOURS <button data-action="settings" aria-label="Settings">${icon('settings')}</button></div></div><div class="night-heading"><span class="night-kicker">FROM YOUR FIRST SHOP TO YOUR OWN EMPIRE</span>${title()}<p>THE CITY DOESN’T STOP DREAMING.</p></div><div class="night-location">${icon('pin')} MAPLE DISTRICT <b>21:00</b></div><div class="night-cards"><button class="night-continue" data-action="continue"><span class="card-number">01 / CONTINUE</span><strong>Back to business.</strong><span class="night-save">Week 8 <i>·</i> 3 businesses <i>·</i> Sample save</span><span class="night-go">ENTER YOUR CITY ${icon('arrow')}</span></button><button class="night-secondary" data-action="new"><span class="card-number">02 / CAREER</span>${icon('briefcase')}<strong>Build your future.</strong><span>$250,000. Your first move.</span></button><button class="night-secondary" data-action="sandbox"><span class="card-number">03 / SANDBOX</span>${icon('sandbox')}<strong>Think bigger.</strong><span>Explore. Experiment. Create.</span></button></div><div class="screen-footer"><button data-action="saves">${icon('folder')} SAVED GAMES</button><span>BUY <i>/</i> BUILD <i>/</i> MANAGE <i>/</i> GROW</span></div>`;
}
function render(){
 document.body.classList.remove('immersive'); document.querySelector('.toast').hidden=true;
 const key=location.hash.slice(1)||'all';
 const choice=options.find(o=>String(o.id)===key);
 document.querySelectorAll('.design-nav a').forEach(a=>{if(a.dataset.view===(choice?key:'all'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(!choice){
 content.innerHTML=`<section class="collection"><div class="collection-heading"><div><p class="overline">FIVE DIRECTIONS. ONE GAME.</p><h1>Make an entrance.</h1><p>Choose the kind of game you want to step into.</p></div><div class="collection-note">These are clickable menu concepts.<br>Your current game and saves stay as they are.</div></div><div class="design-grid">${options.map(o=>`<a class="design-card" href="#${o.id}"><div class="card-image"><img src="/menu-designs/design-${o.id}.png" alt="${o.name} main-menu design" width="940" height="529"><span class="design-number">0${o.id}</span><span class="preview-overlay">Open interactive preview ${icon('arrow')}</span></div><div class="card-copy"><span class="card-tag">${o.tag}</span><h2>${o.name} ${icon('arrow')}</h2><p>${o.description}</p></div></a>`).join('')}</div><p class="collection-foot">Design 05 uses original illustrated cover art. Designs 01–04 use your existing 3D preview scenery. Sample progress is for comparison only.</p></section>`;
 return;
 }
 active=choice.id;
 content.innerHTML=`<section class="single-design" aria-label="${choice.name} preview"><div class="stage-wrap"><div class="game-stage theme-${choice.id}"><div class="scene-photo" aria-hidden="true"></div><div class="scene-shade" aria-hidden="true"></div><div class="scene-grain" aria-hidden="true"></div>${screen(choice.id)}</div><button class="leave-immersive" data-action="fullscreen">← Back to designs</button></div><div class="design-description"><div><p class="overline">DESIGN 0${choice.id} <span> / </span> ${choice.tag}</p><h1>${choice.name}</h1><p>${choice.description}</p></div><div class="preview-actions">${button('Full preview','fullscreen','','expand')}${button('Preview new career','new','','play')}<small>Buttons open sample screens · no save changes</small></div></div></section>`;
}
const closeDialog=()=>{dialog.close();focusBeforeDialog?.focus();};
function openDialog(action){
 focusBeforeDialog=document.activeElement;
 let html='';
 if(action==='new')html=`<span class="dialog-eyebrow">NEW CAREER · PREVIEW ONLY</span><h2 id="dialog-title">Your first business starts here.</h2><p>Choose how you want to begin. Every career starts at Level 1 with <strong>$250,000</strong>.</p><div class="start-choices"><button data-action="choice" data-choice="Lease an empty shop">${icon('shop')}<b>Lease a shop</b><span>Lower upfront cost. Fit out the space and stock your shelves.</span></button><button data-action="choice" data-choice="Buy a running business">${icon('briefcase')}<b>Buy a business</b><span>Take over an existing restaurant or supermarket.</span></button><button data-action="choice" data-choice="Buy land and build">${icon('city')}<b>Build your own</b><span>Choose land, a business type and a building design.</span></button></div><p class="sample-warning">This demonstrates the welcome-screen flow. No purchase will be made.</p>`;
 if(action==='continue'||action==='saves')html=`<span class="dialog-eyebrow">SAVED GAMES · SAMPLE DATA</span><h2 id="dialog-title">Your city is waiting.</h2><p>This is how a saved career could appear on the new welcome screen.</p><div class="sample-save"><div class="sample-save-picture"></div><div><span class="save-tag">CAREER</span><h3>Maple District</h3><p>Week 8 · Level 3 · 3 businesses</p><div class="sample-stat"><span>Business cash <b>$84,250</b></span><span>Last played <b>Sample save</b></span></div></div></div><button class="dialog-primary" data-action="sample-enter">${icon('play')} Continue this sample</button><p class="sample-warning">Real saved games are not read or changed by this preview.</p>`;
 if(action==='sandbox')html=`<span class="dialog-eyebrow">SANDBOX · PREVIEW ONLY</span><h2 id="dialog-title">Room to experiment.</h2><p>Explore restaurants, supermarkets, hotels, apartments and the mall in a separate sandbox.</p><div class="sandbox-list"><span>${icon('check')} Seven test properties open</span><span>${icon('check')} Extra funds to explore</span><span>${icon('check')} Separate progress from Career</span></div><button class="dialog-primary" data-action="sample-enter">${icon('sandbox')} Try the sample sandbox</button><p class="sample-warning">This button demonstrates the menu interaction. It does not start a real session.</p>`;
 if(action==='settings')html=`<span class="dialog-eyebrow">MENU SETTINGS · PREVIEW ONLY</span><h2 id="dialog-title">Make yourself comfortable.</h2><p>Try how settings could look with this design.</p><label class="settings-row">Menu movement <input id="motion-setting" type="checkbox" ${document.body.classList.contains('still')?'':'checked'}></label><label class="settings-row">Interface size <select id="size-setting"><option value="normal" ${document.body.classList.contains('large-type')?'':'selected'}>Standard</option><option value="large" ${document.body.classList.contains('large-type')?'selected':''}>Larger</option></select></label><p class="sample-warning">Changes apply only to this preview and reset when it is reloaded.</p><button class="dialog-primary" data-action="close">Done</button>`;
 document.querySelector('#dialog-content').innerHTML=html;
 dialog.dataset.theme=String(active);
 dialog.showModal();
}
function toast(message){const el=document.querySelector('.toast');clearTimeout(toast.timer);el.textContent=message;el.hidden=false;toast.timer=setTimeout(()=>{el.hidden=true;},4500);}
function act(event){
 const el=event.target.closest('[data-action]');if(!el)return;
 const action=el.dataset.action;
 if(action==='fullscreen'){document.body.classList.toggle('immersive');document.querySelector(document.body.classList.contains('immersive')?'.leave-immersive':'.preview-actions button').focus();window.scrollTo({top:0});return;}
 if(action==='close'){closeDialog();return;}
 if(action==='choice'){closeDialog();toast(`${el.dataset.choice} selected for this preview. Your real game is unchanged.`);return;}
 if(action==='sample-enter'){closeDialog();toast('Preview complete. In the game, this would open your city.');return;}
 openDialog(action);
}
document.addEventListener('click',act);
document.querySelector('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('cancel',()=>{focusBeforeDialog?.focus();});
document.addEventListener('change',event=>{if(event.target.id==='motion-setting')document.body.classList.toggle('still',!event.target.checked);if(event.target.id==='size-setting')document.body.classList.toggle('large-type',event.target.value==='large');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.open)document.body.classList.remove('immersive'); document.querySelector('.toast').hidden=true;});
window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();render();window.scrollTo({top:0});});
render();


