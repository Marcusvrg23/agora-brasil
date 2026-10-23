Os três GLBs originais pendentes não chegaram ao CDN neste ambiente: o proxy nega
CONNECT com 403, sem status/bytes da origem. A continuação parte exatamente de
`e4bc322ae986643987ceac99873bf64b0fe7dedb`, sem delta no runtime, personagens,
materiais, animações ou protocolo. PR encadeado à integração do #8.

- Manifesto dos seis perfis/quatro bases e importador offline com licença
  documentada, bytes/SHA-256 fixados, inspeção GLB/rig e instalação sem sobrescrita.
  Os três hashes/tamanhos desconhecidos permanecem nulos; nenhum modelo substituído.
- 69/69 testes (61 preservados + 8 regressões), sintaxe e 21 layouts DOM passaram.
- Chromium 154/SwiftShader, cenário real em HTTPS/WSS local: cartaz recebido por
  cliente independente, reconexão com mesmo ID, idle/walk/Run, analógico por toque
  emulado/cancelamento e visitante sem PvP passaram; zero exceções JavaScript.
  Sete screenshots novos, com manifesto SHA-256. Primeira falha do harness foi
  mantida e corrigida; requests de assets bloqueados continuam registrados.
- Estratégia de staging isolado, TLS público/WSS e checklist de iPhone real
  preparados. Exemplo Caddy não executado. Nenhum deploy, merge ou produção.

**Homologação mobile NÃO concluída.** Faltam acesso legítimo e licença das três
bases, SHA/tamanho/compatibilidade e validação dos seis perfis, staging público com
WSS e teste em iPhone físico (Safari, teclado, rede móvel e desempenho prolongado).
O `ok` do smoke é funcional e não aprova todos os assets nem FPS mobile.

Relatório: `evidence/RELEASE.md`; evidências: `evidence/assets-mobile/README.md`;
plano: `docs/HOMOLOGACAO-MOBILE.md`. O uso da CLI para metadados continua bloqueado
pela rede; a descrição completa foi publicada pelo conector GitHub no
[PR #9](https://github.com/Marcusvrg23/agora-brasil/pull/9), confirmado em rascunho.
Head de implementação ensaiado: `ec8214e257737a2b2ab9e6a148346d240693db22`.
Nenhum arquivo do jogo alterado. **Manter em rascunho, sem merge ou deploy.**
