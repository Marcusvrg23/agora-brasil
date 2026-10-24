# Homologação do release candidate — issue #15

Este ZIP é um pacote de revisão isolado, não um deploy. O commit de origem e os
SHA-256 de cada arquivo estão em `preview-manifest.json`; o hash do ZIP acompanha
o artefato. Dados, sessões, `.env`, dependências instaladas e segredos de produção
não são incluídos. Sprint V2 e os seis personagens foram preservados. Caminhões
V2 só na prévia com `?trucksV2=1`; impacto experimental OFF no acesso normal.

## Preparar um preview autorizado

1. Baixar o artefato `agora-brasil-release-candidate-preview` no run do workflow
   **Pacote de preview isolado**, conferir o SHA-256, extrair em pasta nova e
   conferir os hashes de `preview-manifest.json`.
2. Usar Node 22+; rodar `npm ci`. Para teste local iniciar com
   `HOST=127.0.0.1 PORT=8080 DATA_DIR=/caminho/novo/qa-data npm start`.
   Reservar um diretório vazio exclusivo. Não copiar variáveis de produção,
   credenciais de pagamento, tokens administrativos ou dados reais.
3. Para iPhone fora desta máquina é necessário um host de staging autorizado,
   domínio próprio de QA, certificado TLS público válido e proxy com Upgrade
   WebSocket para `/api/ws`. O exemplo `ops/staging/Caddyfile.example` do repo é
   apenas referência. A configuração `squarecloud.app` identifica outro app,
   `agora-brasil-preview-qa`; sua presença não autoriza criar serviço público/pago.
   Nenhum provisionamento ou deploy foi executado nesta missão.
4. Antes de publicar: obter autorização específica para o host/custo/acesso e
   credenciais seguras pelo mecanismo de segredos do ambiente. Garantir dados
   isolados, controle de acesso, HTTPS/WSS e ausência de integrações reais.

## Assets e gates obrigatórios

Mulher/idoso/idosa ainda exigem os arquivos originais e evidência de licença.
Consultar `assets/original-models.manifest.json` e `docs/HOMOLOGACAO-MOBILE.md` no
repositório. O bloqueio CONNECT 403 do proxy não determina o estado da origem.
Usar configuração de rede suportada ou exportação autorizada do titular, medir
bytes/hashes, registrar licença, executar o importador e validar rigs/materiais.
Fallback preexistente não comprova carregamento dos seis personagens.

## Roteiro Safari / iPhone físico (pendente)

Registrar modelo, versão iOS/Safari, URL, commit, rede Wi-Fi/4G/5G, data e duração.
Capturas Chromium/SwiftShader e toque CDP são **emulação**, não aparelho físico.
TLS local autoassinado também não comprova TLS público no Safari.

- Abrir em retrato e paisagem; verificar HUD, áreas seguras, teclado/chat,
  minimizar, analógico circular, correr e cancelar toque sem movimento preso.
- Conferir as seis identidades, materiais/rosto, seleção, nomes únicos e cartaz
  3D na mão parado/andando/correndo. Filmar sola dos pés e transições.
- Abrir segundo dispositivo/navegador; conferir movimento, cartaz, contagem real
  separada dos figurantes, reconexão sem duplicação, visitante sem ações PvP,
  consentimento mútuo e dano autoritativo.
- Comparar `/preview-caminhoes.html` com `?trucksV2=1`; V1 padrão, rodas/bandeiras,
  câmera, dirigir perto do Congresso sem atravessar ou nascer dentro dele.
- Medir 10–15 minutos, carga fria/quente, memória, temperatura e frame-time com
  180 figurantes; subir 300/600/1200/2000 somente enquanto o aparelho aguentar.
  Parar em travamento, memória crescente ou degradação persistente. Quantidade
  de figurantes não é capacidade de conexões WebSocket.
- Reação visual `?ragdoll=1` apenas em sessão experimental separada; verificar
  acesso normal OFF. Nunca tratar o efeito como física corporal articulada.

Registrar PASS/FAIL/PENDENTE por item com vídeo/captura do próprio aparelho e
logs sanitizados. Não promover release enquanto houver gate obrigatório pendente.
Para encerrar o ensaio, parar somente o processo de QA e descartar seus dados.
