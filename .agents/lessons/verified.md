# Lições verificadas — Ágora Brasil

Registre somente erros com reprodução e teste pós-correção comprovados; não registrar hipóteses como fatos.

| Data | Sintoma | Causa raiz confirmada | Teste/reprodução | Correção / SHA | Limites |
| --- | --- | --- | --- | --- | --- |

Uma falha de CI que ainda não foi corrigida **não** constitui lição validada.

| 2026-10-23 | Reenvio de join reiniciava vida/inventário; queda perdia sessão | join executava leave + entrar sempre; navegador não reconectava | test/multiplayer.test.js: três regressões falharam antes; passaram após correção; npm test 58/58 | PR de integration/multiplayer-release-20261023: join idempotente, token aleatório rotativo, retomada 30 s e retry | Estado em memória, não sobrevive a restart; visitante bloqueado no servidor |
| 2026-10-23 | Observador perdia equipamento do jogador reconectado | leave removia o jogador remoto; retomada restaurava só o transporte e não republicava jogador | regressão de reconexão falhou com mensagem jogador ausente; passou após broadcast | Republicar jogador depois de enter na retomada | Sincroniza inventário/montaria; não certifica anti-cheat geométrico |
| 2026-10-23 | listen EPERM no teste local | Sandbox sem permissão de rede bloqueia bind, inclusive em servidor TCP mínimo | mesmo net.createServer: EPERM sem permissão e LOOPBACK_OK com network.enabled; integração real executada | Executar testes de portas com permissão sandbox de rede | Não confundir restrição de execução com falha da aplicação |

| 2026-10-23 | HUD mobile cobria o cenário/controles e mostrava nome local no espaço 3D | Painéis permanentes e etiqueta local coexistiam com HUD PvP em posições absolutas independentes | Capturas anteriores do PR #8 versus evidence/visual; 21 layouts no cenário e 21 casos DOM sem colisões | Abas exclusivas/recolhimento, zonas de controles e nome somente na barra; continuação do PR #8 | Dimensões emuladas, não aprovação de telefone físico/teclado virtual |
| 2026-10-23 | Smoke lia movimento antes de um quadro novo | Espera de 600/650 ms menor que quadros de 1,1–1,4 s do SwiftShader observado | layout-and-pose.json/startup-timeout.json versus results.json: continuação aguardou eixo/movimento/parada e passou | Aguardar condição de estado no teste visual, não prazo fixo | Não esconder timeouts nem inferir FPS físico dos resultados do runner |
| 2026-10-23 | Harness mobile clicava em HUD oculta após desktop | Puppeteer setViewport com mudança de isMobile recarrega a página e perde a entrada em memória | evidence/assets-mobile/first-run.json e first-run-failure.png versus browser.json ok=true; node scripts/mobile-readiness-qa.mjs | Sair pela UI, trocar modo e entrar novamente antes de testar controles; branch investigation/original-assets-mobile-20261023 | Chromium 154/Puppeteer; não comprova Safari ou hardware físico |
| 2026-10-24 | Smoke HTTPS rejeitava o Sprint V2 já carregado | Matcher procurava somente `run`, mas o clipe original chama-se `Sprint_V2_RealStride` | `evidence/release-candidate/mobile-baseline/browser.json` falha; `mobile/second-browser-startup-timeout.json` comprova as três poses e o Sprint antes de timeout posterior do harness | Aceitar `sprint` ou `run` nos dois smokes legados; não alterar GLB | Corrige reconhecimento do clipe no teste, não aprova contato dos pés, deslizamento ou Safari físico |

## Escala de rodas e pivôs V2 (PR #13, 23/10/2026)

- Causa: medir Box3 de uma peça antes de atualizar matrixWorld do holder
  escalado produzia raio 0,28 m (clamp), em vez de 0,767 m, acelerando o giro.
- Correção: atualizar matrizes após normalização, antes de inspecionar peças;
  medir deriva no referencial da carroceria para excluir suspensão global.
- Evidência antes/depois: `scripts/trucks-v2-browser-qa.mjs` falhou no teste de
  raio e passou após a correção. Binários do ZIP e V1 permanecem intactos.
- Limite: métricas de contato das solas não homologam Safari/iPhone físico;
  o Run ainda não alcança o piso na prévia. Ver `evidence/trucks-v2/README.md`.
