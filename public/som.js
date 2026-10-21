// Sons sintetizados no navegador (WebAudio), sem arquivos: tiros, explosões, espada, arco, rugido e motores.
let ctx=null,mestre=null,ruidoBuf=null,mudo=false;
try{mudo=localStorage.getItem('agora-som')==='0'}catch{}
function iniciar(){
 if(ctx||mudo)return ctx;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
 ctx=new AC();mestre=ctx.createGain();mestre.gain.value=.5;mestre.connect(ctx.destination);
 ruidoBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=ruidoBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 return ctx;
}
window.addEventListener('pointerdown',iniciar,{once:false,passive:true});
window.addEventListener('keydown',iniciar,{passive:true});
export function alternarSom(){mudo=!mudo;try{localStorage.setItem('agora-som',mudo?'0':'1')}catch{};if(mestre)mestre.gain.value=mudo?0:.5;return !mudo}
export function somLigado(){return !mudo}
function ruido(dur,{freq=1000,tipo='lowpass',q=1,vol=1,ataque=.005,queda=dur,f2=null}={},quando=0){
 if(!iniciar()||mudo)return;const t=ctx.currentTime+quando;
 const s=ctx.createBufferSource();s.buffer=ruidoBuf;s.loop=true;
 const f=ctx.createBiquadFilter();f.type=tipo;f.frequency.setValueAtTime(freq,t);f.Q.value=q;if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+ataque);g.gain.exponentialRampToValueAtTime(.001,t+queda);
 s.connect(f).connect(g).connect(mestre);s.start(t,Math.random());s.stop(t+dur+.05);
}
function tom(dur,{f0=200,f1=null,tipo='sine',vol=.3,ataque=.005}={},quando=0){
 if(!iniciar()||mudo)return;const t=ctx.currentTime+quando;
 const o=ctx.createOscillator();o.type=tipo;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+ataque);g.gain.exponentialRampToValueAtTime(.001,t+dur);
 o.connect(g).connect(mestre);o.start(t);o.stop(t+dur+.05);
}
const vol=(dist)=>Math.max(0,Math.min(1,18/Math.max(18,dist||0)));
export const som={
 explosao(dist){const v=vol(dist);if(v<.03)return;ruido(1.8,{freq:900,f2:80,vol:v,queda:1.8});tom(.9,{f0:90,f1:30,vol:.6*v,tipo:'sine'})},
 tiro(dist){const v=vol(dist)*.5;ruido(.09,{freq:2500,tipo:'bandpass',q:.8,vol:v,queda:.09});tom(.06,{f0:180,f1:60,vol:v*.6,tipo:'square'})},
 missil(dist){const v=vol(dist);ruido(1.2,{freq:600,f2:3000,tipo:'bandpass',vol:.5*v,ataque:.05,queda:1.2})},
 espada(){ruido(.25,{freq:3000,f2:900,tipo:'bandpass',q:2,vol:.35,ataque:.04,queda:.25})},
 acerto(){tom(.08,{f0:1400,f1:900,vol:.18,tipo:'triangle'})},
 corda(){tom(.18,{f0:220,f1:180,vol:.25,tipo:'triangle'});ruido(.12,{freq:1800,tipo:'bandpass',vol:.2})},
 flecha(){ruido(.35,{freq:2600,f2:1200,tipo:'bandpass',q:3,vol:.18,ataque:.02})},
 pavio(){ruido(.4,{freq:5000,tipo:'highpass',vol:.12})},
 rugido(dist){const v=vol(dist)*1.4;tom(1.6,{f0:110,f1:55,tipo:'sawtooth',vol:.3*v,ataque:.15});tom(1.5,{f0:73,f1:40,tipo:'sawtooth',vol:.25*v,ataque:.2});ruido(1.6,{freq:500,f2:200,vol:.4*v,ataque:.2,queda:1.6})},
 mordida(){tom(.12,{f0:160,f1:60,tipo:'square',vol:.3});ruido(.15,{freq:700,vol:.4})},
 buzina(){tom(.45,{f0:415,tipo:'square',vol:.12});tom(.45,{f0:523,tipo:'square',vol:.1})},
 pegar(){tom(.12,{f0:660,f1:990,vol:.15,tipo:'triangle'})},
 dano(){tom(.15,{f0:220,f1:110,vol:.25,tipo:'sawtooth'})},
};
// Motor contínuo do veículo que você dirige: muda de timbre conforme o tipo e a velocidade.
let motor=null;
export function motorVeiculo(tipo,rot){
 if(!iniciar()||mudo){if(motor){motor.parar();motor=null}return}
 if(!tipo){if(motor){motor.parar();motor=null}return}
 if(!motor||motor.tipo!==tipo){motor?.parar();motor=criarMotor(tipo)}
 motor.ajustar(rot);
}
function criarMotor(tipo){
 const t=ctx.currentTime,g=ctx.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(.18,t+.5);g.connect(mestre);
 const nos=[];let ajustar;
 if(tipo==='carro'||tipo==='moto'){
  const o=ctx.createOscillator();o.type=tipo==='moto'?'square':'sawtooth';const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;
  o.connect(f).connect(g);o.start();nos.push(o);
  ajustar=(r)=>{o.frequency.setTargetAtTime((tipo==='moto'?38:48)+r*(tipo==='moto'?120:160),ctx.currentTime,.08);f.frequency.setTargetAtTime(500+r*1500,ctx.currentTime,.1)};
 } else if(tipo==='helicoptero'){
  const s=ctx.createBufferSource();s.buffer=ruidoBuf;s.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
  const am=ctx.createGain();am.gain.value=.4;const lfo=ctx.createOscillator();lfo.frequency.value=14;const lg=ctx.createGain();lg.gain.value=.45;lfo.connect(lg).connect(am.gain);
  s.connect(f).connect(am).connect(g);s.start();lfo.start();nos.push(s,lfo);
  ajustar=(r)=>{lfo.frequency.setTargetAtTime(6+r*12,ctx.currentTime,.3)};
 } else if(tipo==='caca'){
  const s=ctx.createBufferSource();s.buffer=ruidoBuf;s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=.6;
  const o=ctx.createOscillator();o.type='sine';const og=ctx.createGain();og.gain.value=.05;o.connect(og).connect(g);
  s.connect(f).connect(g);s.start();o.start();nos.push(s,o);
  ajustar=(r)=>{f.frequency.setTargetAtTime(500+r*1800,ctx.currentTime,.3);o.frequency.setTargetAtTime(900+r*1500,ctx.currentTime,.3)};
 } else {
  ajustar=()=>{};
 }
 return {tipo,ajustar,parar(){const t=ctx.currentTime;g.gain.setTargetAtTime(0,t,.15);setTimeout(()=>{nos.forEach(n=>{try{n.stop()}catch{}});g.disconnect()},700)}};
}
