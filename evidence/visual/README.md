# Preparação visual — continuação do PR #8

Base: `620c9b1d0bbfccd10c21124cbe43273c176025dd`, branch `integration/multiplayer-release-20261023`. Head final no PR. Sem merge, deploy ou acesso à Square Cloud.

## Alterações

- HUD com abas exclusivas Chat/Cartaz/Opções, painéis curtos e botão Minimizar/Expandir; vida/inventário e controles ocupam regiões separadas. Apuração e opções deixaram de ocupar permanentemente o canvas. A legenda da simulação continua visível ao minimizar.
- Analógico proporcional com zona morta, captura do ponteiro, liberação/cancelamento e botão de correr. Movimento a pé usa intensidade contínua; veículos recebem os eixos de direção pelo contrato de teclas existente.
- Nome local aparece somente na barra, sem etiqueta 3D própria. Nomes remotos preservados.
- Cartaz usa uma mão, haste de 0,28 m e placa de 1,12 × 0,64 m. Verso legível sem espelhamento. Mesmo criador de cartaz para jogadores, NPCs e multidão; mixer e GLBs preservados.
- Reaplicação da pose desfaz a sobreposição anterior; guardar cartaz libera a pose. Não foram editados GLBs, clips, regras PvP, protocolo de servidor nem limite de **100 conexões reais por sala**.

## Evidência executada

- `npm test`: **61/61**, zero falhas/skips. As 58 verificações anteriores foram preservadas e 3 regressões adicionadas para zona morta/proporcionalidade, diagonais/entrada inválida e cartaz de uma mão/haste curta. Os novos testes falharam antes e passaram após implementação. Logs em `tests-before.txt` e `tests.txt`.
- `npm run check` e `git diff --check`: passaram. Verificação de sintaxe ampliada para os módulos/scripts alterados.
- `npm run test:visual:layout`: **21 casos DOM** (três painéis × sete dimensões), sem retângulos principais fora da tela ou sobrepostos; minimizar/expandir, captura além da borda, soltura e cancelamento por eventos de toque via CDP no Chromium passaram. Este teste mede o HTML/CSS real com markup PvP, sem renderização 3D. Resultado: `hud-layout.json`.
- Cenário 3D real no Chromium 154/SwiftShader: três poses **parado/andando/correndo** capturadas, clips `caminhada`/`Run` observados, cartaz ancorado na mão (distância medida zero), texto entregue a cliente WebSocket independente e nenhuma etiqueta local duplicada. `layout-and-pose.json` preserva a execução que validou poses e 21 layouts no cenário, antes da falha posterior do controle.
- Capturas 3D reais: `desktop-cartaz-parado.png`, `desktop-cartaz-andando.png`, `desktop-cartaz-correndo.png`; `iphone-se-hud.png` (320×568), `iphone-8-hud.png` (375×667), `iphone-13-hud.png` (390×844), `android-small-hud.png` (360×800), `android-large-hud.png` (412×915), `landscape-hud.png` (844×390) e `desktop-hud.png` (1280×800). Capturas minimizadas antecedem o ajuste final que mantém a legenda; geometria final foi revalidada no teste DOM.

## Seis personagens originais

As seis identidades existentes reutilizam **quatro bases GLB**, não seis arquivos GLB distintos. Nenhuma identidade ou arquivo foi substituído nesta entrega.

| Identidade | Time | Base original | Carregamento e caminhada/corrida no navegador |
| --- | --- | --- | --- |
| Lia | vermelho | mulher.glb | PENDENTE: arquivo local ausente e CDN bloqueado |
| Caio | amarelo | homem.glb, camisa recolorida pelo código existente | CONFIRMADO: GLB + walk + run |
| Bia | amarelo | mulher.glb, camisa recolorida pelo código existente | PENDENTE: arquivo local ausente e CDN bloqueado |
| Rafa | vermelho | idoso.glb | PENDENTE: arquivo local ausente e CDN bloqueado |
| Ivo | vermelho | homem.glb | CONFIRMADO: GLB + walk + run |
| Nina | amarelo | idosa.glb, camisa recolorida pelo código existente | PENDENTE: arquivo local ausente e CDN bloqueado |

URLs originais, mapeamento e estado: `original-models.json`. A política de rede consultada estava aplicada e **não autorizava** `d8j0ntlcm91z4.cloudfront.net`; o navegador registrou `ERR_TUNNEL_CONNECTION_FAILED`. Nenhuma tentativa de contornar o proxy. Miniaturas e carro/moto/helicóptero/caça/T-rex remotos também estão afetados, como nas evidências anteriores.

`assets-local.json` audita SHA-256, malhas, rigs e nomes de animação dos arquivos locais: homem, corrida, os dois caminhões e Brasília. A presença/parse de um arquivo não equivale a sua renderização. No navegador, Caio/Ivo e o jogador confirmaram a base homem com caminhada `Casual_Walk` e corrida retargeteada `RIG_Run`. Bases bloqueadas continuam pendentes; não se apresenta fallback existente como GLB carregado.

## Falhas e limites

- A primeira leitura de movimento após 650 ms falhou; o teste foi corrigido para aguardar a alteração real de estado em vez de presumir um quadro novo. Os resultados iniciais foram preservados, sem marcar o smoke completo como aprovado.
- A leitura do analógico no cenário também falhou com espera fixa de 600 ms; foi preparada uma continuação com espera por eixo, movimento e parada efetivos. Uma continuação teve timeout de 20 s na inicialização; a captura posterior mostra a interface já carregada. Timeout de prontidão foi ampliado para 60 s e viewport inicial reduzida na continuação. Logs/resultados mantêm essas falhas.
- Continuação final: **passou**, com zero exceções JavaScript. O analógico moveu e parou o jogador no cenário real; visitante ficou sem ações/vida PvP e com permissões bloqueadas. `mobile-visitante.png` é a captura adicional da versão final. `results.json` consolida a continuação e os casos já aprovados, sem repetir as 21 cenas/3 poses.
- A emulação de dimensões **não aprova desempenho móvel físico**, teclado virtual, Safari/iOS, GPU móvel ou sessões prolongadas. Esses testes continuam necessários.
- Os GLBs bloqueados impedem aprovação visual dos seis modelos completos. Sem ensaio novo de carga WebSocket: servidor e limite padrão foram preservados; os números de carga anteriores permanecem associados à versão medida.

## Desempenho visual medido

Chromium 154, SwiftShader (GPU por software), viewport 800×600, qualidade leve, assets remotos incompletos. Cada estágio pediu até 20 quadros, com janela máxima de 12 s. Poucos quadros e cenários/LOD dinâmicos não permitem comparar densidades como benchmark controlado. FPS usa o intervalo real de `requestAnimationFrame`, não o `dt` limitado da simulação.

| Figurantes solicitados/efetivos | Quadros medidos | Tempo médio de quadro | FPS amostrado |
| --- | --- | --- | --- |
| 180/180 | 11 | 1083 ms | 0.92 |
| 600/600 | 8 | 1426 ms | 0.70 |
| 1200/1200 | 9 | 1269 ms | 0.79 |
| 2000/2000 | 9 | 1240 ms | 0.81 |

**Desempenho móvel não aprovado.** O renderizador por software deste runner ficou abaixo de 1 FPS; falta medir em hardware gráfico real e nos aparelhos alvo com todos os assets. O resultado funcional `ok` do smoke não estabelece uma meta de FPS cumprida.

**Conclusão de code-review-lite: APTO PARA REVISÃO, com aprovação visual completa pendente.** Revisão do delta contra `620c9b1`: controle de entrada/limpeza, compartilhamento/disposição de material do verso, estado de HUD, contratos de rede e preservação dos assets conferidos. Não autoriza merge ou deploy.
