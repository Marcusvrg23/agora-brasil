import * as THREE from 'three';
import {RoundedBoxGeometry} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/geometries/RoundedBoxGeometry.js';

// Fallbacks visuais próprios: usados APENAS enquanto o GLB principal está carregando
// ou quando o arquivo remoto não está disponível. Coordenadas normalizadas, +Z frente,
// +Y cima. Cada pneu tem o próprio pivô para girar sem deformar a carroceria.
const mat=(c,{roughness=.42,metalness=.3,emissive=null}={})=>new THREE.MeshStandardMaterial({
 color:c,roughness,metalness,...(emissive?{emissive:emissive,emissiveIntensity:.45}:{})
});
function make(root,geometry,material,name,x=0,y=0,z=0){
 const o=new THREE.Mesh(geometry,material);
 o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;
}
function box(root,name,x,y,z,w,h,l,m,r=.015){
 const g=r>0?new RoundedBoxGeometry(w,h,l,3,Math.min(r,w*.3,h*.3,l*.3)):new THREE.BoxGeometry(w,h,l);
 return make(root,g,m,name,x,y,z);
}
function rod(root,name,a,b,radius,m){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
 const o=make(root,new THREE.CylinderGeometry(radius,radius,d.length(),8),m,name,...A.clone().add(B).multiplyScalar(.5).toArray());
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
 return o;
}
function roda(root,name,x,y,z,r,materials){
 // Cilindro alongado no eixo lateral X. A rotação animada é em torno do pivô X.
 const wheel=new THREE.Group();wheel.name=name+'_PIVOT';wheel.position.set(x,y,z);root.add(wheel);
 const tyre=new THREE.CylinderGeometry(r,r,.075,24);tyre.rotateZ(Math.PI/2);
 make(wheel,tyre,materials.rubber,name,0,0,0);
 const rim=new THREE.CylinderGeometry(r*.63,r*.63,.078,20);rim.rotateZ(Math.PI/2);
 make(wheel,rim,materials.rim,name+'_ARO',0,0,0);
 const disc=new THREE.CylinderGeometry(r*.27,r*.27,.083,16);disc.rotateZ(Math.PI/2);
 make(wheel,disc,materials.dark,name+'_CUBO',0,0,0);
 return wheel;
}
function quad(root,name,points,m){
 const verts=[],faces=[0,1,2,0,2,3],pivot=points[0];
 for(const p of points)verts.push(p[0]-pivot[0],p[1]-pivot[1],p[2]-pivot[2]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(faces);g.computeVertexNormals();
 // O pivô na haste garante que animar Bandeira_* não faça o tecido orbitar a cabine.
 const o=make(root,g,m,name,...pivot);o.material.side=THREE.DoubleSide;return o;
}

export function criarCarroReserva(){
 const g=new THREE.Group();g.name='CARRO_RESERVA_DETALHADO';
 const M={paint:mat('#bc3a20',{roughness:.24,metalness:.6}),black:mat('#111a1f',{roughness:.38,metalness:.3}),
 glass:mat('#142d3a',{roughness:.13,metalness:.28}),chrome:mat('#a5b5bd',{roughness:.23,metalness:.7}),
 rubber:mat('#12171a',{roughness:.85,metalness:0}),rim:mat('#89959d',{roughness:.28,metalness:.8}),
 dark:mat('#343c41',{roughness:.5,metalness:.5}),white:mat('#f3efd9',{emissive:'#ddd9c1',metalness:0}),
 red:mat('#d82927',{emissive:'#ec3a2d',metalness:0})};
 box(g,'CHASSI_rebaixado',0,-.025,0,.43,.115,.95,M.black,.035);
 box(g,'CARRO_laterais',0,.025,-.003,.49,.16,.97,M.paint,.045);
 box(g,'CAPO_dianteiro',0,.105,.318,.455,.06,.32,M.paint,.025);
 box(g,'PORTA_MALAS',0,.107,-.346,.445,.075,.265,M.paint,.02);
 box(g,'CABINE_teto',0,.223,-.065,.325,.06,.36,M.paint,.035);
 box(g,'CABINE_parabrisas',0,.163,.143,.333,.13,.014,M.glass,.008).rotation.x=.35;
 box(g,'CABINE_vidro_traseiro',0,.167,-.258,.326,.12,.013,M.glass,.006).rotation.x=-.24;
 for(const x of [-1,1]){
  const X=x*.244;
  box(g,'JANELA_'+x,X,.164,-.064,.012,.123,.34,M.glass,.004);
  box(g,'RETROVISOR_'+x,x*.288,.15,.125,.045,.027,.073,M.black,.01);
  box(g,'MACANETA_'+x,x*.249,.085,-.055,.008,.011,.068,M.chrome,.003);
  box(g,'SAIA_LATERAL_'+x,x*.247,-.048,0,.021,.037,.63,M.black,.009);
  box(g,'FAROL_'+x,x*.178,.094,.481,.113,.041,.009,M.white,.005);
  box(g,'LANTERNA_'+x,x*.18,.106,-.479,.116,.035,.01,M.red,.005);
  box(g,'ARCO_RODA_DIANTEIRO_'+x,x*.248,-.052,.30,.02,.046,.18,M.black,.008);
  box(g,'ARCO_RODA_TRASEIRO_'+x,x*.248,-.052,-.30,.02,.046,.18,M.black,.008);
  roda(g,'Pneu_'+x+'_D',x*.273,-.092,.302,.112,M);
  roda(g,'Pneu_'+x+'_T',x*.273,-.092,-.302,.112,M);
 }
 box(g,'GRADE_fria',0,.035,.484,.25,.05,.012,M.black,.004);
 for(let i=0;i<3;i++)box(g,'GRADE_linha_'+i,0,.018+i*.02,.492,.23,.003,.01,M.chrome,0);
 box(g,'SPOILER_tras',0,.185,-.457,.46,.022,.065,M.black,.01);
 box(g,'PARACHOQUE_frente',0,-.040,.485,.46,.046,.038,M.black,.011);
 box(g,'PARACHOQUE_tras',0,-.048,-.487,.45,.045,.028,M.black,.008);
 g.userData.origem='procedural-detalhado-carro';
 return g;
}
export function criarCaminhaoReserva(tipo){
 const isGreen=tipo==='caminhao-bolsonaro';
 const g=new THREE.Group();g.name='CAMINHAO_RESERVA_DETALHADO_'+(isGreen?'VERDE':'VERMELHO');
 const M={paint:mat(isGreen?'#136c32':'#bc2234',{roughness:.29,metalness:.47}),
 fest:mat(isGreen?'#f2d33d':'#f3eeee',{metalness:0}),
 glass:mat('#142c37',{roughness:.17,metalness:.18}),dark:mat('#1d262a',{roughness:.57,metalness:.2}),
 steel:mat('#a8b3b9',{roughness:.28,metalness:.75}),rubber:mat('#101619',{roughness:.85,metalness:0}),
 rim:mat('#78868d',{roughness:.3,metalness:.75}),white:mat('#e9e6ce',{emissive:'#cfcbb9',metalness:0}),
 red:mat('#c73529',{emissive:'#aa271e',metalness:0})};
 box(g,'CHASSI',0,.006,-.004,.20,.047,.97,M.dark,.015);
 const axles=isGreen?[-.41,-.27,.32]:[-.36,.32];
 for(const z of axles)for(const side of [-1,1])roda(g,'Pneu_'+side+'_'+z,side*.15,-.035,z,.050,M);
 box(g,'CABINE_frente',0,.145,.332,.255,.245,.31,M.paint,.033);
 box(g,'CABINE_para-brisa',0,.215,.500,.217,.10,.014,M.glass,.007).rotation.x=.12;
 box(g,'CABINE_cobertura',0,.302,.323,.252,.035,.31,M.paint,.012);
 for(const side of [-1,1]){
  box(g,'CABINE_janela_'+side,side*.131,.206,.345,.012,.12,.143,M.glass,.003);
  box(g,'CABINE_espelho_'+side,side*.165,.237,.448,.042,.054,.025,M.dark,.008);
  box(g,'CABINE_farol_'+side,side*.088,.115,.497,.068,.032,.012,M.white,.005);
  box(g,'TRASEIRA_luz_'+side,side*.110,.07,-.494,.045,.028,.012,M.red,.005);
 }
 box(g,'CABINE_grade',0,.152,.502,.115,.06,.009,M.dark,.003);
 box(g,'CABINE_parachoque',0,.053,.511,.27,.037,.025,M.steel,.006);
 box(g,'PALCO_deck',0,.088,-.18,.35,.040,.62,M.steel,.006);
 box(g,'PALCO_guarda-corpo',0,.124,-.18,.358,.067,.61,M.paint,.009);
 box(g,'PALCO_cobertura',0,.388,-.18,.38,.023,.67,M.paint,.009);
 for(const x of [-.176,.176]){
  for(const z of [-.478,.126])rod(g,'TRELIS_coluna_'+x+'_'+z,[x,.136,z],[x,.385,z],.006,M.steel);
  for(const y of [.193,.268,.368])rod(g,'CORRIMAO_'+x+'_'+y,[x,y,-.475],[x,y,.120],.005,M.steel);
  for(let i=0;i<6;i++){
   const z=-.462+i*.094;
   rod(g,'TRELIS_vertical_'+x+'_'+i,[x,.19,z],[x,.38,z],.0027,M.steel);
   // Bunting in two color swags along open-air platform
   if(i<5)quad(g,'TECIDO_'+x+'_'+i,[[x,.313,z],[x,.313,z+.093],[x,.28,z+.093],[x,.27,z+.045]],i%2?M.fest:M.paint);
  }
 }
 for(const z of [-.475,.115])for(const y of [.20,.31])rod(g,'CORRIMAO_traseiro_'+z+'_'+y,[-.17,y,z],[.17,y,z],.004,M.steel);
 for(const z of [-.405,.02]){
  for(const x of [-.11,.11]){
   box(g,'CAIXA_SOM_'+z+'_'+x,x,.16,z,.065,.100,.058,M.dark,.007);
   box(g,'ALTO_FALANTE_'+z+'_'+x,x,.174,z-.035,.043,.056,.008,M.rubber,.003);
  }
 }
 for(let i=0;i<4;i++){
  const z=-.44+i*.18;
  box(g,'REFLETOR_'+i,-.10,.361,z,.037,.024,.034,M.dark,.004);
 }
 for(let i=0;i<3;i++){
  const z=-.44+i*.27;
  rod(g,'MASTRO_'+i,[-.175,.379,z],[-.175,.5,z],.003,M.steel);
  quad(g,'Bandeira_'+i,[[-.175,.495,z],[-.075,.498,z+.003],[-.075,.445,z+.003],[-.175,.45,z]],i%2?M.fest:M.paint);
 }
 g.userData.origem='procedural-detalhado-caminhao';
 return g;
}
