# Ágora Brasil — evidência de release, 23/10/2026

## Continuação: assets originais e preparação mobile (base e4bc322)

Base exata: `e4bc322ae986643987ceac99873bf64b0fe7dedb`.
Branch: `investigation/original-assets-mobile-20261023`; head final no PR em rascunho
[#9](https://github.com/Marcusvrg23/agora-brasil/pull/9), encadeado à branch
`integration/multiplayer-release-20261023`. Head de implementação e evidências
ensaiado: `ec8214e257737a2b2ab9e6a148346d240693db22`; o commit seguinte atualiza
somente documentação/metadados. As correções anteriores
não foram refeitas. Código do jogo, servidor, seis identidades, GLBs, animações,
materiais e protocolo estão sem delta contra essa base. Sem merge/deploy/produção.

**Recomendação atual: APTO PARA REVISÃO; homologação mobile e release amplo
BLOQUEADOS.** A conclusão de investigação é de restrição comprovada do ambiente,
com estado dos arquivos de origem ainda desconhecido.

- Três URLs originais testados com permissão de rede do sandbox: `curl` 56, **403
  do proxy no CONNECT**, status de origem `000`, nenhum byte GLB recebido. Política
  `restricted/enforced`, host fora da allowlist. Isso não é um 403/404 do CDN nem
  prova corrupção/expiração. Não houve acesso direto ou contorno de proxy.
- A descoberta de projetos 3D Jutsu pela conexão Higgsfield expôs somente o projeto
  de corrida; não localizou as bases pendentes. Essa API/listagem não representa
  todos os arquivos da conta. Nenhuma cena foi gerada, exportada ou alterada.
- Manifesto novo fixa URLs e mapeamento Lia/Bia→mulher, Caio/Ivo→homem, Rafa→idoso,
  Nina→idosa. Os hashes/tamanhos dos três ausentes ficam **nulos**. Licença de
  assets permanece pendente; licença MIT do código não foi estendida aos modelos.
- Importador offline preparado exige evidência de licença, SHA-256, bytes fixados,
  estrutura GLB/rig/materiais; recusa recursos externos e não sobrescreve destinos.
  Preserva bytes sem recomprimir/reexportar. Teto de 50 MiB não é tamanho medido.
  Homem: **2.478.984 bytes**, SHA-256
  `5e90a942da4a573417463cb1b38f7e288be6410948881c5b90cf9d7c75c2d156`.
- `npm test`: **69/69**, zero falhas/skips, preservando os **61** existentes e
  acrescentando **8 regressões** de admissão, integridade, identidades e entrega
  HTTP com MIME correto/bytes originais/404. `npm run check` e `git diff --check`
  passaram. Sem nova dependência de runtime. Driver Puppeteer opcional não foi
  acrescentado ao lockfile. Logs novos em `assets-mobile/`.
- `QA_OUTPUT=evidence/assets-mobile npm run test:visual:layout`: **21/21 casos DOM**
  sem colisões; captura além da borda, soltura e cancelamento por toque passaram.
  O parâmetro de saída preserva os artefatos históricos de `evidence/visual`.
- `npm run test:mobile:readiness`: **PASS funcional**, Chromium
  **154.0.8037.57/SwiftShader**, HTTPS autoassinado em loopback → proxy → servidor
  HTTP local, WebSocket **WSS real**, contexto seguro/WebGL, cartaz recebido por
  peer independente e reconexão com mesmo ID. Cartaz preso à mão (gap medido zero)
  em idle/caminhada/Run, sem etiqueta local duplicada. Toque emulado CDP moveu o
  jogador e cancelamento parou movimento; visitante ficou sem vida/ações PvP.
  Zero exceções JavaScript; **24 requests falhos de assets remotos** registrados,
  não ocultados. Sem teste novo de FPS/carga; não inferir desempenho deste PASS.
- Caio/Ivo e jogador: base homem GLB + caminhada/corrida confirmadas. Lia/Bia,
  Rafa e Nina: `glb/walk/run=false`; três bases `faltando` no diagnóstico. Sete
  screenshots finais em `assets-mobile/`, com dimensões/hash em `screenshots.json`:
  desktop 1000×700 parado/andando/correndo; **emulação** mobile 390×844, 320×568,
  844×390 e visitante 390×844. O participante mobile se chama “Visitante” após o
  reload; seu papel continua participante. A captura `iphone-visitor-emulated.png`
  mostra a sessão visitante separada (“Observando”). Nenhuma captura é de iPhone.
- Primeira execução do harness falhou ao clicar na HUD oculta depois de
  `setViewport(isMobile=true)`, que recarrega a página. Captura/log/estado mantidos
  em `first-run-*`. O roteiro passou depois de sair e entrar explicitamente pela
  interface mobile. As três capturas desktop foram renovadas na execução final.

Índice dos artefatos: [assets-mobile/README.md](assets-mobile/README.md).
Revisão `code-review-lite` do delta: importação não sobrescreve nem altera bytes,
TLS de teste confia em chaves específicas, portas/dados/certificado são temporários,
nenhum token de sessão aparece no relatório, contratos/runtime preservados.

Plano e critérios físicos: [docs/HOMOLOGACAO-MOBILE.md](../docs/HOMOLOGACAO-MOBILE.md).
Exemplo de proxy: `ops/staging/Caddyfile.example`, preparado e **não executado**.
Propõe processo/subdomínio/dados isolados, TLS público e WSS same-origin com controle
de acesso. Nenhuma URL pública, contratação, DNS ou deploy foi realizado.

Metadados de PR via CLI continuam impedidos neste ambiente: `api.github.com`
recebe 403 no CONNECT (`assets-mobile/github-api-network.txt`). `gh auth status`
informa token inválido, mas essa mensagem isolada não comprova validade da
credencial quando a API está bloqueada. Não foi usado editor que regravasse arquivos
para contornar a restrição. A descrição revisável está em
`assets-mobile/PR-DESCRIPTION.md`. **PR #9 criado em rascunho via conector GitHub,
com descrição completa e capturas publicadas**, confirmado por leitura do retorno
remoto (`assets-mobile/github-pr.json`). O bloqueio da CLI foi registrado e não
impediu a publicação da descrição pelo conector. O PR histórico #8 permanece
preservado; nenhum arquivo do jogo foi comprometido.

### Bloqueios objetivos

1. Acesso autorizado/exportação das mesmas três bases; resposta real do CDN,
   CORS remoto, bytes, hash e compatibilidade ainda desconhecidos.
2. Registro de direitos/licença aplicável antes de nova hospedagem/redistribuição.
3. Conferência visual de GLB/walk/run/materiais/cartazes em **todos os seis** perfis.
   Homem confirmado não libera aprovação de mulher/idoso/idosa; fallback procedural
   preexistente não foi substituído nem apresentado como original carregado.
4. Staging HTTPS público com WSS e cadeia TLS confiável no Safari ainda não existe.
5. iPhone físico: Safari/iOS, GPU, teclado virtual, safe areas, Wi-Fi/4G/5G,
   background/retomada e desempenho prolongado continuam **NÃO TESTADOS**.
6. Limites anteriores permanecem: anti-cheat geométrico incompleto e sessões em
   memória; nenhum novo ensaio de carga certifica capacidade de hospedagem.

Os dados abaixo são históricos e não substituem os resultados da continuação.

## Histórico de multiplayer anterior a e4bc322

**Recomendação: BLOQUEAR release amplo.** P0 recebeu correções e testes reais locais; uma demonstração restrita a 100 conexões por sala ainda requer validação na hospedagem autorizada e dos assets completos. Sem merge/deploy.

Base: `2f1ba472928eb15e9474959fce92deee53d98297` (skills / PR #6, inclui PR #5). PR #7 `ea490f1` incorporado por cherry-pick em `6503146`. Head exato consta no PR. Checkout inicial `work`/`59673ee` preservado; trabalho em worktree separado.

Correções: heartbeat 5 s e prazo de join 10 s; retomada autenticada por token aleatório rotativo por 30 s; substituição de transporte sem duplicação; join repetido preserva vida/inventário; observadores recebem equipamento restaurado; saída voluntária libera imediatamente; visitante somente leitura no servidor; contagem exclui offline; limpeza de salas/grafites; limite de buffer 1 MiB, mensagens 80/s, 500 transportes globais e **100 por sala por padrão**. Os tetos são proteções, não certificação de capacidade global. `MAX_ROOM_PLAYERS` permite configuração explícita até 250, a validar antes de uso.

## Testes executados

- Inicial após PR #7: `npm test`: **50/50**.
- TDD WebSocket inicial: **2 passaram / 3 falharam** por papel visitante ausente, sessão ausente e join reiniciando estado; correções comprovadas. Regressão adicional reproduziu inventário remoto ausente após retomar.
- Final: `npm test`: **58/58**, sem skips/falhas. **47 testes unitários + 11 de integração** (10 WebSocket reais e 1 HTTP). Integração dedicada: `node --test test/multiplayer.test.js`: **8/8**.
- `npm run check`: passou (servidor, combate, app e scripts novos); `git diff --check`: passou.
- WebSocket real cobre clientes independentes, isolamento de salas/chat/cartaz/posição, entrada tardia, motorista único, veículo sincronizado, visitante sem mutações, reconexão com inventário/cartaz/posição, takeover de conexão aberta, heartbeat sem pong, payload excessivo e limite de sala com retomada.
- `listen EPERM` foi restrição do sandbox, reproduzida num servidor TCP mínimo; com permissão adicional `network.enabled`, portas loopback e testes funcionaram. Nenhum teste foi enfraquecido para contornar a falha.
- Logs completos em `tests.txt`, `baseline-tests.txt`, `websocket-before.txt` e `syntax.txt`.

## Carga real local

`node scripts/local-load.cjs`: servidor próprio em loopback, processo separado, sala única, 5 movimentos/s/cliente, pausas de 10+10 s por estágio, mais o tempo de reconectar 10% dos clientes. Sem alvo externo. CPU/RSS do servidor, não do gerador. Chromium concorrente no runner de 3 CPUs; resultados não isolam contenção do runner. Medição antecede redução do limite padrão para 100 e a republicação do equipamento na retomada.

| Conexões ao final | Sync p50/p95 ms | Ping p50/p95 ms | CPU pico (% de 1 núcleo) | RSS pico MiB | Reconexões induzidas | Erros / quedas inesperadas |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | 2,3 / 6,6 | 2,4 / 7,1 | 9,9 | 47,4 | 2 | 0 / 0 |
| 50 | 6,5 / 14,7 | 7,1 / 21,4 | 9,8 | 63,9 | 5 | 0 / 0 |
| 100 | 24,8 / 83,8 | 25,0 / 75,2 | 30,6 | 83,3 | 10 | 0 / 0 |
| 200 | 202,1 / 413,5 | 168,1 / 426,8 | 68,4 | 186,8 | 20 | 0 / 0 |

**100 cumpriram os critérios; 200 mantiveram conexões, mas falharam em latência.** Execução parou no teto 200, sem avanço. Limites: p95 250 ms, CPU 90% de um núcleo, RSS 512 MiB e zero erros/quedas inesperadas. Mínimo de conexões durante reconexões induzidas: alvo menos um. Dados e percentis de join/reconexão em `load.json`. Não comprova usuários na Internet, capacidade prolongada nem suporte a milhares.

## Navegador e capturas reais

`node scripts/release-browser-smoke.mjs`, Chromium 154.0.8037.57 em SwiftShader: entrada desktop, cartaz, reconexão automática com mesmo ID e visitante mobile 390×844 passaram; zero exceções JavaScript. `browser.json` contém versão/diagnóstico. Capturas: `desktop-manifestacao.png`, `mobile-visitante.png`.

O smoke original falhou na CA do proxy; o smoke novo confia somente na chave da CA pública injetada no ambiente. CDN Higgsfield permaneceu bloqueada por política de rede: bases mulher/idoso/idosa, miniaturas e parte dos veículos remotos não foram carregados. Arquivos/modelos originais não foram alterados nem substituídos nesta entrega. A presença visual dos seis modelos originais completos **não está validada**. Capturas também mostram sobreposição de HUD/etiquetas, sobretudo mobile. Não são aprovação visual completa.

Reproduzir: `npm install`; driver de navegador opcional `npm install --no-save --package-lock=false puppeteer-core`; Chromium instalado; executar comandos com permissão de rede local no sandbox. Scripts de carga não aceitam URL externa.

## Revisão code-review-lite e pendências

Revisão única do delta contra a base das skills: políticas de branch/sem deploy preservadas, assets intactos, visitante validado no servidor, token nunca publicado aos pares, cleanup e limites revisados. **APTO PARA REVISÃO; release amplo bloqueado.**

- P1: carga 200 excedeu critério; broadcast de movimento cresce quadraticamente por sala. Baixo custo: manter 100/sala e distribuir salas por processos; antes de escalar, agregar snapshots em ticks e medir interesse por proximidade. Estado em memória exige afinidade de sala; não basta subir réplicas aleatórias. Nenhum provedor contratado/configurado.
- P1: validar cenário completo com acesso autorizado aos assets originais; corrigir sobreposições mobile e medir em telefone real. Browser smoke funcional não garante todos os modelos nem desempenho mobile.
- P1: movimentação ainda confia em coordenadas limitadas informadas pelo cliente; bilhetes validam alcance/arma/time/recarga mas não trajetória/linha de visão. Anti-cheat completo e teste hostil prolongado pendentes; não liberar PvP competitivo.
- Retomada é limitada a 30 s e memória do processo; ausência maior/restart cria nova sessão. Durante a janela, estado PvP/veículo permanece no servidor, sem invulnerabilidade nova; transporte offline não conta como online.
- Staging/hospedagem: TLS público, proxy WebSocket, rede móvel e teste prolongado não executados. Square Cloud de produção não foi acessada.
- Inventário responsivo ampliado e áudio espacial MP3 não iniciados: dependem da aprovação de P0/P1 e dos arquivos fornecidos. Sem áudios inventados.
