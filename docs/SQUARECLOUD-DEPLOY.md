# Deploy Square Cloud — Ágora Brasil versão Claude

Este deploy **não substitui** outras aplicações da conta Square Cloud nem altera a branch `main`.

## Estado
- Branch: `deploy/squarecloud-claude-completo` (criada a partir de `feat/animacoes-gratuitas-threejs`)
- Node.js 24 (`VERSION=recommended`), WebSocket (`ws`), porta provida por `PORT`.
- Uso de RAM solicitado: 512 MB, sujeito ao limite e disponibilidade do plano.
- Subdomínio solicitado: `agora-brasil-claude` (a disponibilidade precisa ser confirmada pela Square).
- Pagamentos Pix **não ativados** sem `MP_ACCESS_TOKEN`.
- Chat, combate, debates e veículos exigem processo Node.js; **não** usar hospedagem estática.

## Primeira instalação (novo app, nunca commit sobre aplicativo alheio)
1. Acesse [dashboard.squarecloud.app](https://dashboard.squarecloud.app/).
2. Crie **uma nova aplicação web Node.js**. Não reutilize um app existente.
3. Escolha importar do GitHub: `Marcusvrg23/agora-brasil`, branch `deploy/squarecloud-claude-completo`; ou baixe o ZIP do workflow **Pacote Square Cloud (versão completa Claude)** no GitHub Actions.
4. Use `squarecloud.app` na raiz (arquivo de entrada: `server.js`). Habilite publicação web/HTTPS.
5. Não configure `MP_ACCESS_TOKEN` na prévia. Se futuramente habilitar moderação, crie `ADMIN_TOKEN` forte na área segura do painel, nunca no repositório.
6. Espere a Square confirmar o domínio (pode ser necessário outro subdomínio se o pretendido estiver ocupado).
7. Faça smoke test: `/health`, `/`, arquivo `/cidade.js`, e duas sessões simultâneas para chat/debate.

## Restrições conhecidas
A versão é um protótipo avançado, não produto em produção auditado. O backend guarda conexões e alguns eventos em memória; pedidos e imagens de anúncio usam arquivos locais, que podem ser efêmeros. Não prometer persistência garantida nem atendimento a muitos jogadores. Não use uma URL em mensagens públicas até testar WebSocket e mobile.

## GitHub Actions
O workflow `.github/workflows/squarecloud-package.yml` produz um ZIP pronto para upload manual pelo painel. **Não** contém tokens.
