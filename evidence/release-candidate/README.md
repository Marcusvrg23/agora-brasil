# Release candidate — missão #15

**NO-GO para release/merge/deploy. GO para revisão do PR em rascunho.**
Execução iniciada em 23/10 e continuada em 24/10/2026 UTC. Nenhum aparelho físico
ou staging público foi usado. Capturas são renders reais de Chromium 154 /
SwiftShader no Linux; toque e viewports de iPhone são emulados.

## Base e preservação

Branch `qa/release-candidate-20261023`, derivada exatamente de
`fix/animacao-corrida-higgsfield-v2-20261023`, HEAD do PR #14
`a6b66bee865d72fded17b82f4669da8d9d8840ef`. O HEAD final e os runs novos ficam
identificados no PR desta entrega. [Auditoria dos HEADs e CI](audit.json).

| PR | HEAD real auditado | CI Node / browser |
| --- | --- | --- |
| #14 | `a6b66bee865d72fded17b82f4669da8d9d8840ef` | success / success |
| #13 | `a602c7bb054f96b7196bac461cba95bdfcb52f81` | success / success |
| #11 | `ee98e1cbccbfd4f7aa251d848d0db2bcac61a5e0` | success / success |
| #9 | `454f4411343a8c686bedc55aedf9d045feba5fb4` | success / success |

Os três HEADs anteriores são ancestrais da base. **Nenhum delta em `public/`,
`assets/`, servidor, combate, debate, anúncios ou pagamentos.** As identidades,
modelagem, materiais, Walk, Sprint e contratos WebSocket foram preservados.
Sprint original: SHA-256
`f8f71a6141f34aaa756683f9643e524b6b596d5e827bf65932a5ff65befb28b0`, 24 ossos,
21 canais, 0,86 s. Não houve importação do rig demonstrativo nem regeneração.

O diff contém harness de QA, captura/medição, correções de testes antigos,
empacotamento, workflow, um teste de isolamento e documentação/evidências.
Commit de infraestrutura de QA: `bfcc0f588f294d1b8afdd567f6a61ac18add8680`;
ajustes posteriores e evidências são identificados pelo HEAD final do PR.

## Resultados comprovados

| Requisito | Estado e evidência |
| --- | --- |
| `npm ci` | PASS com cache gravável em `/tmp`, sem mudar lockfile |
| Suíte completa | PASS **87/87**, incluindo permissões, reconexão, dano autoritativo, consentimento e guards do Congresso; [log final](logs/npm-test-final.log) |
| Sintaxe e whitespace | PASS `npm run check`, `node --check` dos novos scripts/teste e `git diff --check`; [log](logs/check-final.log) |
| HUD DOM | PASS **21/21**: 320×568, 375×667, 390×844, 360×800, 412×915, 844×390 e 1280×800; chat/cartaz/opções sem colisão, minimizar e analógico circular/cancelamento; [geometria](layout/hud-layout.json) |
| HUD no jogo HTTPS mobile emulado | PASS **9/9**: chat/cartaz/opções em 320×568, 390×844 e 844×390, sem sobreposição/saída da tela; toque move e cancelamento para o jogador; visitante sem ações/vida e PvP desabilitado; [JSON final mobile](mobile/browser.json) |
| Seleção dos seis perfis | PASS seleção de base/time, nomes preservados; [execução com seis seleções e três poses](mobile/second-browser-startup-timeout.json). Não aprova os GLBs ausentes |
| Assets dos seis NPCs | **BLOQUEADO**: só Caio/Ivo carregam homem GLB + Walk + Sprint; Lia/Bia/Rafa/Nina estão no fallback preexistente. [Estado dos modelos](mobile/second-browser-startup-timeout.json), [requests novos](network.json) |
| Walk versus Sprint | PASS seleção real de `caminhada` 4,20 s e `Sprint_V2_RealStride` 0,86 s; ambos `timeScale=1`; [smoke](vehicle-run/result.json), [medição](contact/metrics.json) |
| Contato / foot slide | **NO-GO**, detalhado abaixo; `ok` do script significa medição concluída, não aprovação visual |
| Caminhões V1/V2 | PASS **8 comparações**, duas cores × versões × desktop/mobile emulado; fallback V2→V1 nas duas cores e V1 mantido na página principal mesmo com flag; [JSON](trucks/browser.json) |
| Rodas/bandeiras V2 | PASS 4 rodas vermelho / 6 verde, 3 bandeiras por modelo, raio ~0,767 m, deriva dos eixos/âncoras próxima de zero, câmera contém o modelo; glTF Validator: zero erros e warnings; [validação](trucks/validation/) |
| Carro | PASS funcional da reserva com 4 rodas. **GLB externo não comprovado**, request remoto indisponível; [smoke e origem procedural](vehicle-run/result.json) |
| Spawn / Congresso | PASS testes de spawn, rejeição autoritativa de posições terrestres dentro do Congresso e teleporte visual sem interpolar pelo prédio; [suíte](logs/npm-test-final.log). Direção/câmera/colisões em iPhone físico continuam pendentes |
| HTTPS/WSS local | PASS contexto seguro, WSS, observador independente recebe cartaz, idle→walk→Sprint, cartaz na mão e reconexão com mesmo ID; [execução](mobile/second-browser-startup-timeout.json). O timeout posterior foi na abertura da segunda página |
| Multiplayer / visitantes / consentimento | PASS suíte com clientes independentes, salas isoladas, visitante sem alterações proibidas, reconexão, dano autoritativo e consentimento; [log](logs/npm-test-final.log) |
| Dois contextos 3D de navegador simultâneos | **NÃO APROVADO localmente**: duas tentativas terminaram em timeout de navegação de 90 s. [Tentativa 1](mobile/second-browser-startup-timeout.json), [tentativa 2](mobile/second-browser-startup-retry.json). Isso não invalida os dois clientes WebSocket da suíte, mas não comprova dois navegadores gráficos. O cenário completo permanece no CI |
| Reação de impacto | PASS gate OFF no acesso normal; opt-in `?ragdoll=1` preservado e testado. É reação visual, não corpo articulado |
| Pacote isolado | PASS arquivo extraído, hashes, allowlist de conteúdo, assets inalterados, `/health` e visitante WebSocket; teste incluído nos 87; [verificação adicional](package-check.json) |
| Safari/iPhone físico | **PENDENTE**, nenhum teste em hardware real ou WebKit/Safari executado |
| Staging público HTTPS/WSS | **PENDENTE**, nenhuma instância/domínio provisionado nem deploy executado |

Os resultados da continuação do navegador, métricas e capturas finais estão em
`mobile/browser.json`; tentativas anteriores são preservadas com nomes próprios.
A seleção dos seis perfis e o desktop já concluídos não são repetidos na
continuação mobile local (`QA_SKIP_SELECTION=1 QA_MOBILE_ONLY=1`); o segundo
contexto com timeout fica separado (`QA_SKIP_SECOND_BROWSER=1`). Esses campos
estão explícitos no JSON. O CI executa a seleção, desktop e os dois contextos.

## Contato dos pés — bloqueio visual real

O teste anterior do PR #13 usava a prévia com chão em **−0,025 m**, avatar em
escala 1. Com o Sprint do PR #14, 61 fases produziram gap **4,34–9,41 cm** e
**0/61** amostras a até 2 cm desse piso. [Dados da prévia](trucks/browser.json).
Não confundir esse referencial com o chão do jogo.

Foi acrescentada medição da malha com skinning na **escala real do jogo 0,84,
chão 0**, sem mexer no arquivo ou runtime: sola de apoio **1,55–5,80 cm** acima
do solo, **23/121** fases dentro de ±2 cm. Walk preservado: −3,06–1,23 cm,
86/121 fases nessa tolerância; também há penetração que impede aprovação plena.

Nos intervalos de apoio, a diferença finita do centro de um conjunto fixo de
vértices dos pés, somada à velocidade nominal +Z do jogo (7,5 m/s), estima deriva
média de **7,48 m/s** no Sprint. Walk: ~3,07 m/s a 3,2 m/s nominal. É um
**diagnóstico cinemático**, não rastreamento de vídeo de uma corrida real nem
medição em iPhone. Os dados não sustentam declarar ausência de foot slide.
[Método e amostras](contact/metrics.json).

Não foi aplicado deslocamento cosmético no corpo/piso nem acelerado o Walk.
Corrigir a relação entre velocidade, passada e apoio requer revisão dirigida da
locomoção existente, respeitando a instrução de não recriar o Sprint. Este PR
documenta o bloqueio em vez de promover uma alteração visual sem aceite.

## Carga de conexões — ambiente local isolado

Runner Linux, 2 CPUs de cgroup e 8 GiB de memória. Ensaio em loopback, uma sala,
5 movimentos/s/cliente, 20 s/estágio, limite de sala elevado **somente no processo
de teste**. Não representa Internet, Square Cloud ou capacidade de 2.000 usuários.

| Conexões | Sustentadas | Reconexões | Sync p95 | Ping p95 | RSS máximo | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | 25 | 2 | 11,76 ms | 15,46 ms | 47,58 MiB | PASS |
| 50 | 50 | 5 | 60,14 ms | 64,67 ms | 63,59 MiB | PASS |
| 100 | 100 | 10 | 172,44 ms | 172,46 ms | 81,26 MiB | PASS |
| 200 | 200 | 20 | 719,98 ms | 659,72 ms | 129,64 MiB | **FAIL / parada** |

Zero erros ou desconexões inesperadas. No estágio 200, reconexão p95 2,28 s e
event-loop p95 máximo ~776 ms. O teste parou ao exceder 250 ms; CPU/RSS não eram
o primeiro limite. Havia outro QA WebGL no mesmo executor: são condições
compartilhadas medidas, não benchmark isolado de capacidade do servidor.
[Métricas completas e limites](load.json), [log](logs/load.log).

Figurantes são contados separadamente de sessões reais. A avaliação de
180→300→600→1200→2000 mede frame-time e heap JS no navegador e para se p95 exceder
100 ms, heap exceder 512 MiB ou faltar amostra. Consultar `mobile/browser.json`.
Heap JS não inclui toda a memória GPU/processo; SwiftShader não homologa GPU móvel.

**Resultado mobile emulado:** 180 solicitados/180 efetivos + 6 NPCs nomeados,
6 frames na janela limitada, p50 **1.050 ms**, p95 **3.216,5 ms**, heap JS
**24,80 MiB**, 174 chamadas e 774.582 triângulos no frame medido. **FAIL do gate
de desempenho / parada**: 300/600/1200/2000 não executados. O `ok=true` do smoke
final aprova as interações executadas, não esse gate de desempenho ou as seções
explicitamente não executadas na continuação. [Dados](mobile/browser.json).

## Evidências visuais reais

- [Seleção Lia](mobile/selection-Lia.png) — fallback; [Caio](mobile/selection-Caio.png) — GLB; [Bia](mobile/selection-Bia.png) — fallback; [Rafa](mobile/selection-Rafa.png) — fallback; [Ivo](mobile/selection-Ivo.png) — GLB; [Nina](mobile/selection-Nina.png) — fallback.
- [Parado](mobile/desktop-idle.png), [Walk](mobile/desktop-walk.png), [Sprint com cartaz](mobile/desktop-run.png).
- [Sprint fase 15%](contact/run-0.15.png) e [55%](contact/run-0.55.png), usando escala/chão do jogo no laboratório.
- [Vermelho V1](trucks/vermelho-v1.png) / [V2](trucks/vermelho-v2.png); [verde V1](trucks/verde-v1.png) / [V2](trucks/verde-v2.png); [V2 mobile emulado](trucks/verde-v2-mobile.png).
- [Carro de reserva](vehicle-run/carro-esportivo.png), [mobile emulado](vehicle-run/carro-mobile-emulado.png).
- Mobile emulado no jogo: [320×568](mobile/iphone-se-emulated.png), [390×844](mobile/iphone-13-emulated.png), [844×390](mobile/iphone-landscape-emulated.png), [visitante](mobile/iphone-visitor-emulated.png).

Dimensões, hashes e origem das capturas estão em `screenshots.json`. Nenhuma
imagem foi gerada por IA, desenhada para simular execução ou apresentada como
captura de iPhone físico.

## Reprodução e pacote de homologação

```sh
npm ci --cache /tmp/agora-npm-cache
npm test
npm run check
git diff --check
QA_OUTPUT=evidence/release-candidate/layout npm run test:visual:layout
QA_CDN_VIA_CURL=1 QA_OUT=evidence/release-candidate/trucks node scripts/trucks-v2-browser-qa.mjs
QA_CDN_VIA_CURL=1 QA_RC=1 QA_OUTPUT=evidence/release-candidate/mobile node scripts/mobile-readiness-qa.mjs
QA_CDN_VIA_CURL=1 node scripts/sprint-contact-qa.mjs
node scripts/package-preview.mjs /tmp/agora-brasil-release-candidate.zip
```

Drivers opcionais `puppeteer-core`/`gltf-validator` foram instalados fora do projeto
e vinculados em `node_modules`, sem alterar dependências/lockfile. `CHROME_BIN`
seleciona o Chromium/Chrome instalado. O helper de CDN usa curl pelo proxy com
TLS verificado e bytes inalterados; apenas para módulos Three.js autorizados.
Servidores usam loopback e dados temporários. Portas e processos requerem a
permissão de rede do sandbox; a primeira tentativa sem ela teve EPERM e foi
preservada em [log](logs/npm-test-sandbox-failure.log).

O smoke antigo rejeitou `Sprint_V2_RealStride` por procurar apenas “run”:
[antes](mobile-baseline/browser.json). Corrigiu-se o matcher, sem mudar animação.
O timeout de navegação de preview foi tratado aguardando DOM e condições reais,
sem esperar todos os requests externos indisponíveis. As falhas do harness
continuam nos JSON/logs; não foram tratadas como falhas do produto nem ocultadas.
O roteiro ampliado também tentou clicar em abas depois de minimizar a HUD:
[reprodução](mobile/hud-harness-first-attempt.json). A continuação expande a HUD
antes de passar ao próximo viewport. O primeiro teste de pacote teve um cleanup
aguardando um processo já encerrado por sinal; corrigiu-se a verificação de
`signalCode`, e a suíte final comprova a saída normal. [Registro inicial](logs/package-test-runner-first-attempt.log).
Um probe TLS mínimo confirmou HTTP 200 em contexto normal e incógnito, mas não
isolou a causa do timeout da segunda cena: [probe](tls-context-probe.json).

O workflow `preview-package.yml` do PR #11 foi reaproveitado para PRs sobre o
PR #14. Produz **`agora-brasil-release-candidate-preview`** com ZIP + SHA-256,
retenção de 14 dias, somente `contents: read`, sem qualquer etapa de deploy.
O link permanente do run fica no PR; não há entrega por URL R2 presigned.
[Roteiro completo de Safari/iPhone e staging](../../docs/HOMOLOGACAO-RC.md).

## Pendências para mudar para GO

1. Reavaliar apoio/deriva dos pés e transições no Sprint existente com revisão
   visual dirigida; repetir métrica e vídeo da corrida no jogo.
2. Obter GLBs originais mulher/idoso/idosa e evidência de licença aplicável
   (inclusive do homem já versionado); admitir via manifesto/importador,
   validar rig/materiais e carregar as seis identidades. CONNECT 403 do proxy
   não prova ausência da origem e não foi contornado.
3. Validar frame-time/memória e controles no Safari em iPhone físico, incluindo
   teclado, safe areas, rotação, perda/retorno da rede e sessão prolongada.
4. Obter host de staging, TLS público/WSS, acesso controlado e dados isolados
   mediante autorização específica e credenciais seguras; seguir o roteiro.

Não houve merge, deploy, restart, push em `main`, mudança de Square Cloud,
provisionamento público/pago ou uso de dados reais de produção.
