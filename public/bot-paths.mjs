export const BOT_SEEDS=Object.freeze([
 {id:'npc1',name:'Lia',team:'vermelho',base:'mulher',x:-18,z:-24,rx:11,rz:7,speed:.54,phase:0},
 {id:'npc2',name:'Caio',team:'amarelo',base:'homem',x:16,z:-28,rx:10,rz:9,speed:.49,phase:1.1},
 {id:'npc3',name:'Bia',team:'amarelo',base:'mulher',x:5,z:4,rx:9,rz:14,speed:.55,phase:2.2},
 {id:'npc4',name:'Rafa',team:'vermelho',base:'idoso',x:-25,z:11,rx:12,rz:10,speed:.4,phase:3.3},
 {id:'npc5',name:'Ivo',team:'vermelho',base:'homem',x:-39,z:-72,rx:13,rz:10,speed:.46,phase:4.4},
 {id:'npc6',name:'Nina',team:'amarelo',base:'idosa',x:35,z:-67,rx:15,rz:9,speed:.42,phase:5.5}
]);
export function posicaoBot(bot,t){
 const p=t*bot.speed+bot.phase;
 return {x:bot.x+Math.sin(p)*bot.rx,z:bot.z+Math.sin(p*.67+.5)*bot.rz};
}
