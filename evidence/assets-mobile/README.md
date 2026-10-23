# Investigação dos originais e preparação mobile

Base: `e4bc322ae986643987ceac99873bf64b0fe7dedb`.
Branch: `investigation/original-assets-mobile-20261023`; head remoto consta no PR.
**Homologação mobile física: NÃO REALIZADA. Staging público: NÃO IMPLANTADO.**

| Evidência | O que demonstra |
| --- | --- |
| `network.json`, `environment.json` | proxy nega CONNECT dos três GLBs; nenhuma resposta/byte da origem; host fora da allowlist |
| `provider-discovery.json` | descoberta somente leitura da conexão 3D Jutsu; não localiza as bases, sem concluir que não existam na conta |
| `local-audit.json` | homem original com SHA, bytes, materiais, textura, ossos e caminhada; demais bases ausentes |
| `baseline-tests.txt` | 61/61 antes desta continuação |
| `tests-before.txt` | novo teste falhou antes da existência do importador |
| `asset-tests.txt`, `tests.txt`, `syntax.txt` | 8 regressões; suíte 69/69; sintaxe passou |
| `hud-layout.json`, `layout-console.txt` | 21 casos DOM e captura/soltura/cancelamento do analógico, sem renderizar cenário |
| `browser.json`, `browser-console.txt` | execução final HTTPS/WSS real em loopback, cenário WebGL, poses e controles; zero exceções JS, requests remotos falhos registrados |
| `screenshots.json` | dimensões, estado e SHA-256 das sete capturas finais |
| `first-run.json`, `first-run-console.txt`, `first-run-failure.png` | falha inicial do harness ao trocar isMobile/recarregar; não é falha dos GLBs ou aprovação funcional |

Todos os screenshots são de navegador realmente executado, sem composição ou
substituição de modelos. Usam qualidade leve, 180 figurantes solicitados mais seis
NPCs, Chromium 154/SwiftShader. Cenário contém a base homem original carregada e
fallbacks **preexistentes** das bases indisponíveis. Não representa os seis GLBs
completamente carregados. Texto “SIMULAÇÃO” e contador online continuam separados.

| Captura | Ambiente e estado |
| --- | --- |
| [Desktop parado](desktop-idle.png) | Chromium desktop, 1000×700, cartaz e GLB homem |
| [Desktop andando](desktop-walk.png) | mesmo ambiente, clip caminhada |
| [Desktop correndo](desktop-run.png) | mesmo ambiente, clip Run |
| [Mobile 390×844](iphone-13-emulated.png) | EMULAÇÃO de viewport/mobile/toque; participante chamado “Visitante” |
| [Mobile 320×568](iphone-se-emulated.png) | EMULAÇÃO; cartaz/analógico/HUD; painel pode cobrir parte do cenário |
| [Paisagem 844×390](iphone-landscape-emulated.png) | EMULAÇÃO; GLB/cartaz/controles |
| [Visitante 390×844](iphone-visitor-emulated.png) | EMULAÇÃO; sessão visitante separada, sem vida/ações PvP |

O teste TLS usa certificado efêmero confiado por chave pública específica no
Chromium e CA explícita no peer WSS. Não demonstra um certificado público confiável
no iPhone. `browser.json` fixa `physicalDeviceTested=false` e
`publicStagingTested=false`. O teste de toque usa CDP, não dedo/aparelho físico.
Não houve novo benchmark de FPS nem teste prolongado de carga.

Limites e próximos passos: [plano de homologação](../../docs/HOMOLOGACAO-MOBILE.md)
e [relatório de release atualizado](../RELEASE.md). Direitos/licença, acesso às três
bases, validação dos seis perfis, HTTPS público/WSS no Safari e hardware físico
continuam bloqueando a aprovação mobile. Nenhum merge/deploy/produção foi feito.
