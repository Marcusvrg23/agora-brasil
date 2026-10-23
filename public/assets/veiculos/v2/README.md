# Caminhões V2 — protótipos opt-in

Importados sem alteração do ZIP `agora-caminhoes-v2-glb.zip` em 23/10/2026.
Hashes, bytes e contagens do autor estão em `manifest.json`. Os GLBs V1 em
`../caminhao-lula.glb` e `../caminhao-bolsonaro.glb` permanecem intactos.

- Vermelho: 2 eixos, 4 rodas, 3 bandeiras, 17 meshes, 12.144 triângulos.
- Verde: 3 eixos, 6 rodas, 3 bandeiras, 20 meshes, 13.496 triângulos.
- Eixos: X lateral, Y para cima, frente +Z. Runtime normaliza comprimento a 17 m.
- Cores por vértice, sem imagens/texturas externas, sem animações baked.
- Rodas `Pneu_*` possuem pivôs no eixo; bandeiras `Bandeira_*` usam haste vertical.
- Como não há materiais PBR exportados, a prévia ajusta metalness/roughness por peça.

Abrir **somente** `/preview-caminhoes.html?trucksV2=1`. Sem parâmetro, com
`trucksV2=0`, ou na página principal mesmo com `trucksV2=1`, os originais têm
prioridade. Falha de carregamento V2 volta ao respectivo V1.

Proveniência declarada no ZIP: modelagem procedural autoral com Python/trimesh,
derivada de conceitos visuais; requer aceite de acabamento, sem promessa de
fotorealismo. Não representa licença dos demais assets externos do projeto.

Evidências e decisão de substituição: `evidence/trucks-v2/README.md` na raiz.
