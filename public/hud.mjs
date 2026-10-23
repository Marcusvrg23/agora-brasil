export function iniciarHud(root=document.querySelector('#game-hud')){
 const button=root.querySelector('#hud-minimize'),tabs=[...root.querySelectorAll('[data-hud-panel]')];
 const panels=[...root.querySelectorAll('.hud-panel')];
 let collapsed=false,active=null;
 const paint=()=>{
  root.classList.toggle('hud-collapsed',collapsed);
  button.textContent=collapsed?'Expandir':'Minimizar';button.setAttribute('aria-expanded',String(!collapsed));
  for(const tab of tabs)tab.setAttribute('aria-expanded',String(!collapsed&&active===tab.dataset.hudPanel));
  for(const panel of panels)panel.hidden=collapsed||active!==panel.id;
 };
 button.addEventListener('click',()=>{collapsed=!collapsed;paint();});
 for(const tab of tabs)tab.addEventListener('click',()=>{collapsed=false;active=active===tab.dataset.hudPanel?null:tab.dataset.hudPanel;paint();});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){active=null;paint();button.focus();}});
 const toolbar=root.querySelector('.game-toolbar');
 new ResizeObserver(()=>root.style.setProperty('--toolbar-height',toolbar.getBoundingClientRect().height+'px')).observe(toolbar);
 paint();
 return {role(role){document.body.classList.toggle('observando',role==='visitor');}};
}
