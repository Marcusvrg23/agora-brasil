# Caminhões de palco V2 — protótipos 3D independentes

**Data:** 23/10/2026 · **Status:** PROTÓTIPOS, sem integração, sem deploy, sem merge.

## Origem

O responsável aprovou duas referências conceituais 2D geradas na conversa do ChatGPT: caminhão de palco vermelho (cabine, palco aberto, treliça, bandeiras e ornamentos vermelho/branco) e caminhão verde (mesma função, três eixos, detalhes verde/amarelo). Os renders não são GLBs. Foram produzidos **dois novos GLBs procedurais** em arquivos independentes, disponíveis no pacote `agora-caminhoes-v2-glb.zip` entregue ao responsável na conversa. O pacote inclui também um gerador Python/trimesh, prévias renderizadas e visualizador HTML.

**Importante:** esses dois GLBs **ainda não estão adicionados a esta branch**. Antes de iniciar testes integrados, obter do responsável o ZIP e colocar os arquivos na pasta `public/assets/veiculos/v2/` em uma continuação revisada. Não referenciar URLs temporárias do ChatGPT como dependência em runtime.

| Protótipo | Arquivo no ZIP | Bytes | Triângulos | Rodas/flags | SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| Vermelho | `caminhao-vermelho-v2.glb` | 221760 | 12144 | 4 / 3 | `a13703cee4ac08662986b6b1523fc0e9aae09afd3eb6a71da18cd2d1f2d6a65c` |
| Verde | `caminhao-verde-v2.glb` | 223896 | 13496 | 6 / 3 | `1b4c4466be557aaf35b9ee64f88bf506d176dc52d3730ef11eeb6b7c2137f235` |

## Geometria e integração

- Malhas GLB verificadas após reabertura em trimesh, cabeçalho glTF válido.
- Coordenadas normalizadas para integração Three.js: +Y vertical, +Z frontal e +X lateral.
- Malhas de pneus móveis com nomes `Pneu_*`, bandeiras com nomes `Bandeira_*` para o seletor já existente em `public/veiculos.js`.
- Cor via vértices (sem texturas fotográficas). Visual protótipo: geometria de palco, cabine, grades, caixas de som, bandeiras e rodas. Não declarar equivalência fotorrealista às referências.
- Animação é controlada pelo runtime existente; não há skeletal animation embutida.
- O visualizador HTML offline exige WebGL. Neste ambiente de teste o Chromium retornou `WebGL is not supported`; a visualização no Chromium **não foi homologada**. Prévia 2D foi inspecionada a partir das malhas GLB.

## Proteções obrigatórias

1. **Preservar os originais** `public/assets/veiculos/caminhao-lula.glb` e `public/assets/veiculos/caminhao-bolsonaro.glb`. Nunca sobrescrever silenciosamente. Manter rollback.
2. Implementar seleção opt-in de V2 somente no preview, carregamento GLB com cache e verificação visual/console e MIME. Não ativar automaticamente para todos.
3. Validar materiais, pivô de rotação, posição e animação das rodas/bandeiras, escala/colisão, câmera, dirigibilidade e sincronização multiplayer antes de integrar.
4. Medir FPS/frame time e consumo de memória em desktop/mobile; testar Safari físico em fase separada. Sem alegar qualidade mobile certificada.
5. O polimento P0 [Issue #12](https://github.com/Marcusvrg23/agora-brasil/issues/12), QA do ragdoll experimental (OFF por padrão) e staging isolado seguem como gates. Issue #10 mantém prioridade após o P0.
6. **Sem merge, deploy, edição de produção Square Cloud ou substituição de qualquer um dos seis modelos de personagens**.

## Projeto de prévia 3D

[Higgsfield 3D Jutsu — Caminhões de Palco V2](https://higgsfield.ai/3d-jutsu/d71c4b97-58ef-4024-981e-a4d0ff2181c8). Cena colaborativa remota contendo duas reconstruções procedurais (não são os mesmos bytes dos GLBs separados neste pacote). Arquivos baixáveis estão no ZIP entregue nesta conversa.

Para integrar, anexar o ZIP à task do Codex e pedir comparação dos modelos V2 com os originais no `public/preview-caminhoes.html`, com diff/testes/prints e sem deploy.
