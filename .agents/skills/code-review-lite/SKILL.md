---
name: code-review-lite
description: Use para revisar um diff ou PR do Ágora Brasil frente às regras do repositório e aos critérios da tarefa, em uma única passagem, com baixo custo de cota.
---

# Revisão de código econômica

Adaptação do princípio de revisão por **Padrões** e **Especificação** de `mattpocock/skills/engineering/code-review` (licença MIT); não copia seus subagentes paralelos.

1. Identifique base e HEAD exatos; use `git diff --stat <base>...HEAD` e `git diff <base>...HEAD`. Não confunda o delta de um PR encadeado com `main`.
2. Revise dois eixos na **mesma** passagem:
   - **Padrões**: segurança, WebSocket, validação no servidor, limpeza de listeners, desempenho, compatibilidade mobile, política de branches.
   - **Especificação**: requisitos efetivos da missão, testes esperados, visitas/PvP, simulação versus jogadores reais.
3. Liste somente achados verificáveis, ordenando P0 crítico, P1 alto e P2 menor. Para cada um: arquivo/linha, evidência, risco, correção sugerida.
4. Execute os testes pertinentes ou informe que não foram executados; nunca trate ausência de falhas visíveis como PASS.
5. Não crie subagentes nem rode avaliações LLM repetidas automaticamente. Evite recomendações cosméticas com prazo urgente.
6. Faça uma conclusão objetiva: **APTO PARA REVISÃO**, **BLOQUEADO POR TESTES** ou **NÃO VALIDADO VISUALMENTE**. Nenhuma dessas autoriza merge/deploy.
