/**
 * Ágora Brasil — interações determinísticas com veículos, sem créditos de IA.
 * Deformações de rodas, rotor e T-Rex continuam no módulo veiculos.js.
 */
export const DURACAO_EMBARQUE_MS=900;

const POSES=Object.freeze({
 trex:'montado',
 carro:'dirigindo-carro',
 'caminhao-lula':'dirigindo-carro',
 'caminhao-bolsonaro':'dirigindo-carro',
 moto:'pilotando-moto',
 helicoptero:'pilotando-helicoptero',
 caca:'pilotando-caca',
});

export function poseParaVeiculo(tipo){return POSES[tipo]||'sentado'}

export function progressoDeEmbarque(inicioMs,agoraMs,duracaoMs=DURACAO_EMBARQUE_MS){
 if(!Number.isFinite(inicioMs)||!Number.isFinite(agoraMs))return 1;
 const k=Math.max(0,Math.min(1,(agoraMs-inicioMs)/Math.max(1,duracaoMs)));
 return k*k*(3-2*k);
}

export function ritmoDeVeiculo(tipo,tempoSegundos,velocidade=0){
 if(!Number.isFinite(tempoSegundos))return 0;
 const mod=tipo==='trex'?3.6:tipo==='moto'?2.4:tipo==='helicoptero'?1.1:tipo==='caca'?.75:1.3;
 return tempoSegundos*(mod+Math.min(3,Math.abs(Number(velocidade)||0)*.025));
}

export function deveExibirPiloto(tipo){
 // GLBs fechados não têm interior/porta/cockpit aberto para visualização externa.
 return tipo==='trex'||tipo==='moto';
}
