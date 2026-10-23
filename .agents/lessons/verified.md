# Lições verificadas — Ágora Brasil

Registre somente erros com reprodução e teste pós-correção comprovados; não registrar hipóteses como fatos.

| Data | Sintoma | Causa raiz confirmada | Teste/reprodução | Correção / SHA | Limites |
| --- | --- | --- | --- | --- | --- |

Uma falha de CI que ainda não foi corrigida **não** constitui lição validada.

| 2026-10-23 | Reenvio de join reiniciava vida/inventário; queda perdia sessão | join executava leave + entrar sempre; navegador não reconectava | test/multiplayer.test.js: três regressões falharam antes; passaram após correção; npm test 58/58 | PR de integration/multiplayer-release-20261023: join idempotente, token aleatório rotativo, retomada 30 s e retry | Estado em memória, não sobrevive a restart; visitante bloqueado no servidor |
| 2026-10-23 | Observador perdia equipamento do jogador reconectado | leave removia o jogador remoto; retomada restaurava só o transporte e não republicava jogador | regressão de reconexão falhou com mensagem jogador ausente; passou após broadcast | Republicar jogador depois de enter na retomada | Sincroniza inventário/montaria; não certifica anti-cheat geométrico |
| 2026-10-23 | listen EPERM no teste local | Sandbox sem permissão de rede bloqueia bind, inclusive em servidor TCP mínimo | mesmo net.createServer: EPERM sem permissão e LOOPBACK_OK com network.enabled; integração real executada | Executar testes de portas com permissão sandbox de rede | Não confundir restrição de execução com falha da aplicação |
