# Animações 3D sem custo de geração — Ágora Brasil

## Objetivo
Conservar os créditos do Higgsfield. Animações de usuário/veículo são executadas **no navegador com Three.js** sobre os modelos GLB já existentes. Nenhuma chamada a APIs pagas foi adicionada.

## Integrado nesta branch
- Cinco poses distintas: piloto de carro, moto, helicóptero, caça e montaria de T-Rex.
- Embarque visual interpolado com `smoothstep` por 900 ms nas montarias abertas, evitando teleporte.
- Montarias fechadas mantêm o avatar oculto sob a carenagem enquanto é conduzido.
- Poses dos braços e pernas calculadas a cada quadro por rotações e direções de ossos; animação procedimental independente de arquivos adicionais.
- Vibração/balanço de montaria vinculados ao tempo e velocidade.
- Animação já existente preservada: rodas, esterçamento, rotores, suspensão, T-Rex, cauda, mandíbula e pós-combustão.
- Código original da cidade (`public/cidade.js`) **não modificado**.

## O que não está finalizado
- Entrada/saída de carro, abertura das portas e cockpit transparente requerem peças separadas/modelagem.
- A posição exata das mãos e quadris depende das proporções de cada GLB e exige revisão visual no Three.js e possível Blender.
- Os modelos que não possuem armature não ganham automaticamente articulações: os movimentos do T-Rex e das rodas continuam baseados em shader.
- Multiplayer completo, mobile e sombras precisam de QA em navegador. Os testes fornecidos verificam as fórmulas matemáticas, não o WebGL renderizado.

## Arquivos
- `public/montaria.mjs` — funções de montagem, tempo e poses (JavaScript puro, testável no Node).
- `public/avatar.js` — cinco conjuntos de alvos para ossos e mãos.
- `public/pvp.js` — aplica poses e transições durante o vínculo jogador-veículo.
- `test/montaria.test.mjs` — testes sem recursos pagos.

## Passos para testar
Na raiz:
```powershell
npm install
npm test
npm start
```
Abra http://localhost:3000, escolha uma sala, aproxime-se de um veículo e pressione **E**.
Use o teclado para dirigir. Saia com **E**. Confira posições e possíveis interseções entre o corpo e o veículo.

Os arquivos GLB podem ser baixados separadamente por `bash scripts/baixar-modelos.sh`. Cheque a origem e licença antes de redistribuir.

**Não usar créditos de IA para animações simples.** Se houver rigging manual de elevada fidelidade, usar Blender local e exportar o GLB para substituir os modelos, após testes.
