# Codex quality harness — instalação em branch isolada

## Conteúdo
- 2 skills originais de Superpowers (`systematic-debugging`, `verification-before-completion`) preservadas em versão fixada.
- 1 adaptação segura de TDD, 1 adaptação de revisão de código de baixa cota, 2 skills próprias de QA, 1 skill de aprendizado seletivo.
- `AGENTS.md` estabelece escopo e critérios de qualidade.

## Uso no Codex Cloud
1. **Selecione a branch `chore/codex-quality-skills-20261023` como base** de uma nova tarefa. Publicar o ambiente nuvem por si só não seleciona a branch nem instala skills em outras branches.
2. Peça: 'Mostre as skills disponíveis nesta branch e leia `.agents/skills/agora-multiplayer/SKILL.md` e `.agents/skills/verification-before-completion/SKILL.md` antes de editar'.
3. Se a detecção automática falhar, instrua leitura explícita dos arquivos; não declare a skill ativa só porque está em um PR.
4. A integração definitiva nas branches de desenvolvimento deve ocorrer por PR revisado **após** concluir outras alterações em andamento.

## Não instalado nesta etapa
Playwright MCP (ferramenta externa), Artillery (test runner externo), UI/UX Pro Max (baixo impacto no prazo), framework Hermes completo. `agora-visual-qa` e `agora-multiplayer` não fingem que essas dependências já existem.

## Proveniência, licença e atualização
- Superpowers em `obra/superpowers@2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`: 2 SKILL.md copiados literalmente e TDD reescrito para preservar código existente. MIT: `.agents/third-party/obra-superpowers-LICENSE.txt`.
- Matt Pocock Skills em `mattpocock/skills@5beb35b040e3de97e54fa9e386d7e42d15c295c2`: ideia de revisão Standards/Spec adaptada, sem os subagentes paralelos do upstream. MIT: `.agents/third-party/mattpocock-skills-LICENSE.txt`.
- Não executar scripts upstream nem baixar dependências automaticamente. Revisar diff antes de atualizar versões das skills.
