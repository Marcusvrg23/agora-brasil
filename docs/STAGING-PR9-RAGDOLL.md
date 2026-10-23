# Prévia isolada PR #9 + reação de impacto (ragdoll experimental)
Data: 23/10/2026

## Escopo e isolamento
Base exata: PR #9, branch `investigation/original-assets-mobile-20261023`, head de origem `454f4411343a8c686bedc55aedf9d045feba5fb4`.
Branch de testes: `preview/ragdoll-pr9-20261023`.
Nenhum merge na `main`, nenhum deploy da aplicação pública. Somente código/CI de um pacote para **nova aplicação** com dados próprios. A produção `agora-brasil-multiplayer.squareweb.app` permanece intocada.

## Ragdoll: nomenclatura e limites
Existe uma *reação visual leve a impacto confirmado*, **não** um motor de física de esqueleto/ossos (ragdoll articulado). O original já tinha uma animação de queda na morte. Esta prévia adiciona um balanço curto/atenuado do corpo visual no dano não letal, sem deslocar a raiz física, sincronizar posições, alterar hitboxes, dano, PvP, servidor ou protocolo.

- Padrão: desativado. Somente ligar com `?ragdoll=1` no URL da prévia.
- 4 reações simultâneas por cliente no máximo, duração de até 1,15 s, restauração dos transforms.
- Não ativa para visitante, PvP desligado, passageiro/condutor, morte, cura, dano falso, explosão visual ou jogadores sem avatar.
- Ao desconectar, renascer, sair ou mudar de estado PvP a animação é cancelada.
- O parâmetro funciona também fora da prévia se este código for publicado; **não transferir para produção** antes de aprovar o recurso.
- Na presença de GLB sem rig funcional, a reação visual move o holder sem substituir modelo.

## Gerar pacote em GitHub Actions, sem credencial Square Cloud
Workflow: `.github/workflows/preview-package.yml`, branch de origem fixa. Executa CI, empacota apenas arquivos de runtime e publica artefato temporário `agora-brasil-pr9-ragdoll-preview`.
O arquivo `squarecloud.app` dentro do ZIP usa SUBDOMAIN de **prévia** (`agora-brasil-preview-qa`), não o nome do aplicativo de produção. O nome solicitado não garante disponibilidade do subdomínio.
Não há segredo de produção ou automático deploy no workflow.

## Teste em Square Cloud — SOMENTE após autenticação e autorização de staging
1. Verificar se existe quota para uma **nova app**; não sobrescrever app existente. A quota pode exigir recursos extras.
2. Baixar ZIP do artefato do workflow e verificar que `squarecloud.app` indica preview, não `agora-brasil-multiplayer`.
3. Criar app web Node.js separada com storage e variáveis próprias; nenhuma credencial do ambiente de produção.
4. Restringir acesso se houver mecanismo seguro disponível (VPN, gateway ou autenticação de acesso); o app inclui chat/PvP e não foi homologado para público.
5. Testar `/health` e as URLs: `/` (sem reação) e `/?ragdoll=1` (reação experimental).
6. Validar WebSocket WSS com duas sessões, modo visitante sem PvP, dano confirmado em jogadores PvP, morte/respawn e reconexão.
7. No iPhone físico, registrar modelo/iOS/Safari, verificar HUD, desempenho e 15 minutos de uso; não inferir FPS de testes Chromium/SwiftShader.
8. Se dano/renderização apresentarem bugs ou perda de desempenho, usar URL sem `?ragdoll=1`. Para rollback integral, não promover esta branch.
9. Manter **sem merge/deploy** até autorização explícita; staging não substitui homologação dos GLBs (mulher/idoso/idosa).

## Bloqueios atuais
Três bases dos seis personagens ainda indisponíveis (proxy 403 no CONNECT), licença dos GLBs a validar, testes físicos no iPhone pendentes e staging ainda não implantado. Não usar fallback para alegar presença de GLB original.

## Gate de release
- CI com testes existentes + teste novo `test/ragdoll-experimental.test.mjs` deve passar.
- Prints/filmagem de usuários reais em telefone: pendente até execução em dispositivo físico.
- Reação visual experimental não faz parte do escopo obrigatório de lançamento.
- A aplicação Square Cloud de produção não é alterada por este workflow.
