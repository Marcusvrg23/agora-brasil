// Helpers puros: sem dependência do navegador, utilizáveis nos testes do jogo.
export const FATOR_DURACAO_CORRIDA = 0.74;
export function temposCorrida(tempos, fator = FATOR_DURACAO_CORRIDA) {
  if (!Number.isFinite(fator) || fator <= 0 || fator > 1) throw new RangeError('Fator de corrida inválido');
  return Float32Array.from(tempos, tempo => Number(tempo) * fator);
}
export function modoLocomocao(movendo, ritmo = 1) {
  return !movendo ? 'idle' : ritmo >= 2 ? 'run' : 'walk';
}
export function deslocamentoRoda(velocidade, dt, raio = 0.73) {
  if (![velocidade,dt,raio].every(Number.isFinite) || raio <= 0) return 0;
  return velocidade * Math.max(0, Math.min(dt, 0.1)) / raio;
}
export function ondulacaoBandeira(tempo, indice, velocidade = 0) {
  return Math.sin(tempo * 3.5 + indice * 0.92) * (0.025 + Math.min(0.05, Math.abs(velocidade) * 0.002));
}
