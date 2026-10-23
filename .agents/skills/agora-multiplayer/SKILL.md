---
name: agora-multiplayer
description: Use para trabalhar com servidor WebSocket, salas, presença, movimentação, veículos, cartazes, permissões de visitantes, PvP e testes de escala do Ágora Brasil.
---

# Confiabilidade multiplayer — Ágora Brasil

## Antes de editar
- Inspecione `server.js`, `combate.js`, mensagens de `public/app.js`, `public/pvp.js` e testes da branch atual.
- Verifique PRs encadeados (#2, #5) e a versão exata dos contratos; não trabalhe em uma `main` antiga.
- Reproduza o bug com dois clientes independentes quando possível. Separe problema de rendering de problema de rede.

## Invariantes a proteger
- Servidor é autoridade para dano, propriedade de veículo, inventário, sessão e permissões; mensagens de cliente são não confiáveis.
- Visitantes não podem atacar nem alterar a partida; figurantes não contam como sessões reais.
- Uma conexão cai e volta sem duplicar jogadores, etiquetas, cartazes, listeners nem veículos.
- Salas são isoladas; não deve haver vazamento de estado, mensagens ou nomes entre salas.
- Cartazes e posição respeitam limites de tamanho/taxa; IDs e bilhetes não são reutilizados.

## Protocolo de validação
1. Testes de regressão de entrada, saída, reconexão, usuário visitante e controles PvP.
2. Teste de dois navegadores/clients na mesma sala e em salas diferentes; sincronize posições, cartazes e veículos.
3. Cobrir ações inválidas, repetidas e concorrentes; negar estado inconsistente no servidor.
4. Testar carga **apenas** em local/staging autorizado, progressivamente, com teto explícito e parada por erros/latência. Use Artillery só se estiver instalado e disponível; não alegue que esta skill o instala.
5. Reportar p50/p95 de latência quando medidos, conexões sustentadas, erros, CPU/RAM, limites do runner e condições exatas. Sem números presumidos.

Revisão: `.agents/skills/code-review-lite/SKILL.md`. Conclusão: `.agents/skills/verification-before-completion/SKILL.md`.
