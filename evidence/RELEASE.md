# Ágora Brasil — evidência de release, 23/10/2026

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
