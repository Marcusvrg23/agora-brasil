// Indicadores puros usados na montagem de veículos de reserva e na animação visual.
export function rodaNomeada(nome){
 return /^(?:Pneu|Wheel|Tire)(?:[_ .-]|$)/i.test(String(nome||''));
}
export function bandeiraNomeada(nome){
 return /^(?:Bandeira|Flag)(?:[_ .-]|$)/i.test(String(nome||''));
}
export function giroDaRoda(velocidade,dt,raioMetros=.7){
 if(![velocidade,dt,raioMetros].every(Number.isFinite)||raioMetros<=0)return 0;
 return velocidade*Math.max(0,Math.min(.05,dt))/raioMetros;
}
export function afastamentoModelo(distancia){
 return Number.isFinite(distancia)&&distancia>22;
}

export function pecaIsolada(dimensoes,{limite=3.3}={}){
 const {x,y,z}=dimensoes||{};
 if(![x,y,z].every(Number.isFinite)||y<=0||limite<=0)return false;
 // Uma malha que ocupa vários metros/rodas não deve girar em torno de um pivô comum.
 return Math.max(x,z) <= Math.max(limite,y*3);
}
