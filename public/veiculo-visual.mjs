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
