export const MAX_FIGURANTES=2000;
export const QUANTIDADES=Object.freeze([0,180,300,600,1200,2000]);
export const NOMES=Object.freeze([
 'Rafael','Gabriel','Ana','João','Maria','Lucas','Fernanda','Pedro','Lia','Caio',
 'Bianca','Bruno','Camila','Sofia','Eduardo','Marina','Felipe','Juliana','Luiza','Daniel',
 'Patrícia','Amanda','Ricardo','Aline','Marcos','Clara','Helena','Gustavo','Davi','Nina',
 'Renata','Tiago','Carla','Samuel','Júlia','Vitor','Mateus','Alice','Beatriz','Rodrigo',
 'Paulo','Isabela','Letícia','André','Vinícius','Miguel','Yasmin','Carlos','Laura','Diego'
]);
export const CARTAZES=Object.freeze([
 {team:0,text:'LULA 13',cor:'#f9e6e6',tinta:'#921b26'},
 {team:0,text:'PAZ E RESPEITO',cor:'#fff8ec',tinta:'#173047'},
 {team:0,text:'DIÁLOGO JÁ',cor:'#fff8ec',tinta:'#173047'},
 {team:1,text:'BOLSONARO 22',cor:'#eff5e4',tinta:'#1f632e'},
 {team:1,text:'PAZ E RESPEITO',cor:'#fff8ec',tinta:'#173047'},
 {team:1,text:'DIÁLOGO JÁ',cor:'#fff8ec',tinta:'#173047'}
]);
export function quantidadeInicial({mobile=false,alto=false,param=null}={}){
 const val=Number(param);
 if(param!==null && QUANTIDADES.includes(val))return val;
 return mobile?180:(alto?600:300);
}
export function posicaoFigurante(id,t=0,total=600){
 const lado=Math.floor(id/2)%2===0?-1:1,faixa=Math.floor(id/4)%5,fileira=Math.floor(id/20);
 // Cada ala possui ambas as cores lado a lado; não representa uma contagem real de apoiadores.
 // Distribuir o total evita sobreposição entre pessoas mesmo no perfil de 2.000.
 const linhas=Math.max(1,Math.ceil(total/20)),espaco=Math.max(120,Math.min(420,linhas*4.2));
 const passo=linhas>1?espaco/(linhas-1):0;
 const x=lado*(8+faixa*6.15)+(id%2===0?-1.0:1.0)+Math.sin(id*2.19)*.28;
 const z=-80+fileira*passo+Math.sin(id*1.37)*.45;
 const wobble=Math.sin(t*.48+id*.71),drift=Math.sin(t*.12+id*.17)*2.6;
 return {x:x+drift, z:z+wobble*1.5,team:id%2};
}
