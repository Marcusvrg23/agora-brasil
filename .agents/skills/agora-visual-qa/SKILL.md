---
name: agora-visual-qa
description: Use em alterações na HUD mobile, entrada como visitante, avatares Three.js, cartazes 3D, animações, modelos GLB ou inventário do Ágora Brasil.
---

# QA visual e interação — Ágora Brasil

1. Defina cenas e ações concretas: entrar como visitante, entrar na manifestação, alternar inventário e dirigir veículo, com 1 e 2 sessões.
2. Se existir navegador configurado (Playwright ou equivalente), execute cenário real em viewport mobile e desktop; capture screenshots com versão/URL/estado e erros de console.
3. Confirme que as duas manifestações são visíveis, avatares mantêm rig e animações, cartazes são sólidos presos à mão, não há sobreposição de HUD/chat e controles funcionam por toque.
4. Teste modal de áudio apenas após gesto do usuário, com mute e volume; não substitua músicas fornecidas por arquivos artificiais.
5. Teste densidades de figurantes sem confundir FPS local com capacidade WebSocket. Não invente medição de FPS.
6. Se navegador/headless WebGL estiver indisponível, marque **VISUAL PENDENTE** e entregue checklist para smartphone; testes de sintaxe não substituem teste visual.
7. Nunca crie screenshots sintéticos e apresente como capturas reais de execução.

Esta skill é instrução de QA; instalar Playwright MCP requer configuração separada de ferramentas e dependências.
