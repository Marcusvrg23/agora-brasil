# Vercel completa — arquitetura e limites

Esta branch contém o backend Node/WebSocket existente do Claude adaptado a Vercel Functions.
**Não é correto apresentar essa versão como definitiva em escala nacional antes de adotar estado distribuído.**

- `api/ws.js` exporta o `http.Server` existente, com tick de combate/debate.
- O navegador conecta a `/api/ws` para interação efetiva. Se desconectar, reinicie a sala.
- `vercel.json` serve arquivos 3D em `public` e direciona WebSockets para a Function.
- A cidade `public/cidade.js` não foi alterada.
- Sem dados persistentes do multiplayer entre instâncias: o estado de jogadores/salas pode divergir no serverless.
- O armazenamento de anúncios também usa disco temporário, portanto o checkout/anúncio foi desabilitado até haver banco e storage duráveis.
- Nenhum token Mercado Pago foi copiado ou configurado.

### Critérios de promoção
Apenas promover para o domínio público depois de smoke test que confirme: `/` renderizado,
handshake WebSocket, resposta `hello`, entrada `joined`, estado `pvp`, `pvp-pegar`,
`pvp-entrar`, `pvp-sair`, `chat` e `debate`.
