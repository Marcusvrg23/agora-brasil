# Preparação de homologação mobile — 23/10/2026

Estado: **não homologado em hardware real**. Nenhum deploy foi feito. O ensaio
local usa TLS autoassinado, Chromium e SwiftShader; não aprova Safari, certificado
público, rede móvel, temperatura, memória ou desempenho de iPhone.

## Assets originais e admissão

O manifesto `assets/original-models.manifest.json` fixa os URLs originais e as seis
identidades. Há quatro bases: Lia/Bia → mulher; Caio/Ivo → homem; Rafa → idoso;
Nina → idosa. Não há seis GLBs diferentes. Não se deve usar o fallback procedural
preexistente como evidência de que uma dessas bases foi carregada.

Os três requests em `evidence/assets-mobile/network.json` receberam **403 do proxy
no CONNECT**, `curl` 56, status de origem `000`, nenhum corpo recebido. O host
`d8j0ntlcm91z4.cloudfront.net` está fora da allowlist aplicada. Isso não demonstra
403/404/expiração/corrupção no CDN: **estado da origem desconhecido**. Não se usou
proxy alternativo, acesso direto ou produção Square Cloud para contornar a política.

Para resolver o acesso, incluir o host exato pela configuração suportada do ambiente
e repetir os requests, ou obter exportação dos mesmos arquivos pela conta titular em
um ambiente autorizado. Registrar URL final, status de origem, Content-Type,
Content-Length, data e cabeçalhos de CORS. No caminho local escolhido abaixo, os
GLBs passam a ser same-origin e não dependem de CORS do CDN. CORS remoto e
compatibilidade real dos três arquivos continuam pendentes.

Antes de admitir bytes:

1. Registrar titular/conta de geração, termos vigentes e permissão aplicável para
   copiar/hospedar/redistribuir os assets e texturas. MIT do código não aprova os
   assets Higgsfield. `license.status` permanece `pending`, inclusive para o homem
   já existente; registrar evidência e `approved` somente após revisão efetiva.
2. Obter os originais sem reexportar, simplificar ou recomprimir; conservar uma
   cópia de referência fora da pasta pública. Medir bytes e SHA-256 em fonte
   confiável e preencher o manifesto em revisão. Hash calculado só depois do
   download prova consistência futura, não prova sozinho autoria/autenticidade.
3. Executar `node scripts/original-assets.mjs audit`. Para admitir um arquivo já
   exportado: `node scripts/original-assets.mjs install mulher /caminho/original.glb`
   (idem idoso/idosa). O comando exige licença documentada, tamanho e hash fixados,
   GLB v2 com malha, material e rig esperado; recusa recursos externos não admitidos
   e não sobrescreve um destino existente. Não modifica os bytes. A inspeção é
   estrutural, não substitui o validador glTF completo nem o teste no Three.js.
4. Validar os três com glTF Validator e navegador, conferir mãos, pele, cabelo,
   texturas, recoloração amarela, caminhada compartilhada e Run retargeteado. Rig
   incompatível exige investigação, nunca troca de personagem por outro modelo.
5. Rodar suíte e smoke, exigir `glb/walk/run=true` nas **seis** identidades. Repetir
   cartaz parado/andando/correndo, frente/verso, guardar/reequipar, analógico e HUD.
   O smoke atual passa com homem e relata ausências; não é gate de seis modelos.

O homem tem **2.478.984 bytes (2,36 MiB)**, SHA-256
`5e90a942da4a573417463cb1b38f7e288be6410948881c5b90cf9d7c75c2d156`.
Tamanho/hash dos outros três são desconhecidos e ficam nulos. O teto de admissão
de 50 MiB por arquivo é uma proteção do importador, **não uma medição ou orçamento
mobile aprovado**. Medir soma transferida, memória de texturas/rigs, tempo de carga
frio/quente e custo de tráfego antes de decidir cache/CDN. Não acrescentar GLBs
desconhecidos ao Git. Se grandes, guardar em storage versionado controlado, com
artefato identificado por hash e cópia same-origin no pacote de staging. Preservar
materiais/animações e revisar licenciamento antes de disponibilização pública.

## HTTPS público e WebSocket no iPhone — estratégia preparada

Usar instância/processo **novo e isolado**, sem conexão com produção Square Cloud.
Revisar o commit desta branch; instalar dependências em staging; iniciar Node 22+
com `HOST=127.0.0.1`, `PORT=8080`, `DATA_DIR` próprio e `MAX_ROOM_PLAYERS=100`.
Não copiar pagamentos, tokens administrativos, dados ou sessões de produção.

Reservar subdomínio novo, apontar DNS exclusivamente para staging e terminar TLS
público válido em proxy com suporte a Upgrade. `ops/staging/Caddyfile.example`
prepara Caddy com autenticação básica e reverse proxy same-origin; o app já usa
`wss://<location.host>/api/ws` em HTTPS. Caddy gerencia certificado público e Upgrade
automaticamente. Fornecer domínio/hash de senha fora do Git, validar a configuração
com a versão de Caddy escolhida e revisar acesso antes de qualquer implantação.
**Exemplo ainda não executado/validado com Caddy.** Não há URL pública entregue.

Validar no host novo: cadeia TLS sem alertas no Safari; `/health` e GLBs com MIME
`model/gltf-binary`/SHA correto; `/api/ws` retornando **101**; dois clientes na mesma
sala trocando posição/cartaz, isolamento entre salas, visitante bloqueado,
heartbeat e retomada até 30 s. Autenticação do proxy deve permitir o handshake WSS
do Safari após login HTTPS. Se um proxy de acesso exigir headers customizados no
WebSocket do navegador, adaptar a camada de acesso e repetir o teste. Sessões são
em memória: manter afinidade de sala/processo, sem réplicas aleatórias. Timeout do
proxy deve exceder o heartbeat; testar o comportamento efetivo, sem inferir do 101.

Nada foi contratado, provisionado, publicado ou alterado em DNS. A execução desse
plano depende de autorização específica posterior para staging, conforme o limite
expresso desta missão de não fazer deploy.

## Matriz de teste físico obrigatória

| Ensaio | Evidência exigida | Estado |
| --- | --- | --- |
| iPhone/Safari real | modelo do aparelho, iOS/Safari, commit, URL HTTPS e data | PENDENTE |
| Todos os modelos | seis identidades, materiais, walk/run e cartazes com mão/verso corretos | PENDENTE |
| HUD e toque | retrato/paisagem, safe areas/notch, minimizar/abas, analógico/correr e cancelamento | PENDENTE |
| Teclado virtual | chat/cartaz, foco, teclado aberto/fechado, rolagem e controles sem bloqueio | PENDENTE |
| Conectividade | Wi-Fi e 4G/5G, WSS 101, dois clientes, queda/retomada, bloqueio de tela/background | PENDENTE |
| Desempenho | 15 min, FPS/frame time medidos, memória/reloads, aquecimento, bateria, carga fria/quente | PENDENTE |
| Densidade e regras | perfis 180/600 etc. com fallback, visitantes sem PvP, contadores reais distintos | PENDENTE |

Capturar vídeo/capturas pelo próprio aparelho e log sanitizado sem tokens/senhas.
Não lançar PvP competitivo: movimento ainda não implementa anti-cheat geométrico
completo. O ensaio de carga antigo a 100/sala é local e não certifica Internet ou
capacidade do futuro staging. A homologação mobile só pode mudar de estado após
execução documentada em aparelho físico com todos os assets.

## Reproduzir os ensaios desta entrega

`npm ci --cache /tmp/agora-npm-cache`; instalar driver opcional com
`npm install --no-save --package-lock=false --cache /tmp/agora-npm-cache puppeteer-core`.
Chromium e OpenSSL são pré-requisitos. `npm test`; `npm run check`;
`node scripts/original-assets.mjs audit`;
`QA_OUTPUT=evidence/assets-mobile npm run test:visual:layout`;
`node scripts/mobile-readiness-qa.mjs`.

Executar com permissão de rede do sandbox para portas loopback e CDN autorizada.
O ensaio HTTPS gera certificado/chave efêmeros em `/tmp`, confia somente nas chaves
públicas necessárias, usa DATA_DIR temporário e encerra os listeners. Não usa
`ignoreHTTPSErrors`, não publica credenciais, não toca em serviço externo do jogo.
Não trata falhas de assets remotos como erros JavaScript nem as esconde: registra
`failedRequests`, `baseStatus` e o estado de cada identidade em `browser.json`.
