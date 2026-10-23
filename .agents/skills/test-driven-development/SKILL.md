---
name: test-driven-development
description: Use ao criar ou corrigir funcionalidades no Ágora Brasil; exige uma regressão observável antes de implementar, sem descartar código existente.
---

# TDD seguro e incremental — adaptação para Ágora Brasil

Inspirado em `obra/superpowers` (licença MIT, veja `.agents/SOURCES.md`). Não execute subagentes adicionais.

1. Escolha **um** comportamento verificável por iteração. Inspecione testes existentes e reproduza o defeito.
2. Escreva ou ajuste um teste mínimo que **falhe pelo motivo correto** antes da mudança; capture o resultado inicial. Para código legado ou UI sem harness, registre um repro equivalente com comando/evidência.
3. Faça a menor alteração necessária para o teste passar. **Nunca apague implementação existente só para seguir uma regra de TDD.** Preserve contratos do servidor, assets e dados.
4. Execute o teste focal, os testes do módulo e `npm test`; verifique que a regressão passaria a falhar caso o defeito reaparecesse.
5. Revise diff, trate handles/conexões abertas e documente testes não executados (especialmente navegador e carga).
6. Caso um teste antigo falhe, investigue a causa antes de alterar a expectativa. Nunca enfraqueça teste para produzir verde artificial.

Quando não houver infraestrutura de teste adequada, **não invente validação**: documente o bloqueio e mantenha a alteração em rascunho.
