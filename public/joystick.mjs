// Radial dead zone and proportional speed; no browser dependency for the calculation.
export function eixosAnalogico(dx,dy,raio){
 const zero={x:0,y:0,intensidade:0};
 if(![dx,dy,raio].every(Number.isFinite)||raio<=0)return zero;
 const distance=Math.hypot(dx,dy),fraction=Math.min(1,distance/raio);
 if(fraction<=.14)return zero;
 const intensidade=(fraction-.14)/.86;
 return {x:dx/distance*intensidade,y:dy/distance*intensidade,intensidade};
}
export function iniciarAnalogico(element,runButton){
 let state={x:0,y:0,intensidade:0},pointer=null,running=false,runPointer=null;
 const thumb=element.querySelector('.joystick-thumb');
 const reset=()=>{state={x:0,y:0,intensidade:0};thumb.style.transform='translate(0px,0px)';element.dataset.movement='idle';};
 const update=event=>{
  const rect=element.getBoundingClientRect(),radius=rect.width/2;
  state=eixosAnalogico(event.clientX-rect.left-radius,event.clientY-rect.top-rect.height/2,radius);
  thumb.style.transform=`translate(${state.x*radius*.65}px,${state.y*radius*.65}px)`;
  element.dataset.movement=state.intensidade?'moving':'idle';
 };
 element.addEventListener('pointerdown',event=>{
  if(pointer!==null)return;event.preventDefault();pointer=event.pointerId;
  element.setPointerCapture(pointer);update(event);
 });
 element.addEventListener('pointermove',event=>{if(event.pointerId===pointer){event.preventDefault();update(event);}});
 const release=event=>{if(event.pointerId===pointer){pointer=null;reset();}};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,release);
 runButton.addEventListener('pointerdown',event=>{event.preventDefault();runPointer=event.pointerId;runButton.setPointerCapture(runPointer);running=true;runButton.setAttribute('aria-pressed','true');});
 const stopRun=()=>{running=false;runPointer=null;runButton.setAttribute('aria-pressed','false');};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])runButton.addEventListener(type,event=>{if(event.pointerId===runPointer)stopRun();});
 const stop=()=>{pointer=null;reset();stopRun();};
 window.addEventListener('blur',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 return {get state(){return state;},get running(){return running;},reset:stop,
  get keys(){const keys=new Set();if(state.y<-.18)keys.add('w');if(state.y>.18)keys.add('s');if(state.x<-.18)keys.add('a');if(state.x>.18)keys.add('d');if(running)keys.add('shift');return keys;}};
}
