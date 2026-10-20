# Ágora Brasil — Brasília 3D

Protótipo público, independente e apartidário de praça cívica virtual **gratuita**, pensado para manifestações e encontros online.

A primeira sala fica no **Congresso Nacional e Esplanada dos Ministérios**, em Brasília. O cenário foi produzido em Blender 5.2 via Higgsfield 3D Jutsu, com torres, cúpulas, espelho d'água, 12 volumes estilizados de ministérios, árvores, luzes de rua e quatro personagens animados.

**Estado atual: prévia técnica.** Não é um gêmeo digital georreferenciado nem um jogo implantado publicamente. A modelagem não é fotorrealista; possui aproximações geométricas. Os personagens simples não representam pessoas reais conectadas.

## Executar no Windows / Linux

Requer Node.js 20+:

~~~bash
npm install
npm start
~~~

Abra http://localhost:3000 (o CDN do Three.js exige conexão à internet).

Para testes:

~~~bash
npm test
~~~

## Estrutura

| Local | Conteúdo |
|---|---|
| \`server.js\` | Servidor HTTP/WebSocket com salas de municípios por códigos IBGE |
| \`public/\` | Cliente Three.js, navegação 3D, chat, painel de participantes |
| \`public/assets/brasilia-v4.glb\` | Modelo renderizado/exportado de Blender com animações |
| \`assets/blender/agora-brasil-v4.blend\` | Projeto editável Blender 5.2 |
| \`previews/\` | Pré-visualizações renderizadas |
| \`test/\` | Testes básicos |
| \`.github/workflows/import-blender.yml\` | Importação automática do pacote criado no Higgsfield |

A primeira execução do GitHub Actions deve baixar os assets da [versão 4 do Higgsfield](https://higgsfield.ai/3d-jutsu/daecc7f2-a214-462a-830d-80adddb81368), usando o ZIP disponibilizado pelo próprio projeto. Caso o download não seja executado, a cena 3D tem fallback geométrico local.

## Times e modo debate (v0.4)

- **Times por cor:** Vermelho ou Amarelo, com traje "Camisa do time" ou "Terno com faixa". A escolha aparece para todos e pode mudar a qualquer momento. Os times não têm nome, sigla ou símbolo de partido.
- **Modo debate** (`debate.js`): fila aberta na Tribuna da Esplanada. Com dois inscritos, o debate começa com abertura (60 s), réplica (45 s) e tréplica (30 s) para cada lado. Depois vem a votação da plateia (30 s, um voto por pessoa, debatedores não votam) e o resultado. Quem sai da sala perde por W.O.
- **Catálogo:** `public/catalogo.json` lista personagens, times, trajes, itens, veículos, espaços de anúncio e regras.
- **Modelos 3D:** `bash scripts/baixar-modelos.sh` baixa os GLB gerados no Higgsfield para `public/assets/`.

## Como funciona

A navegação é por teclado (WASD / setas), rotação e zoom por mouse/toque. É possível entrar com um apelido, selecionar sala, conversar em tempo real pelo WebSocket e visualizar uma representação simples dos demais participantes.

As salas para outros municípios **ainda compartilham o cenário experimental de Brasília** e não representam cidades já modeladas. A contagem de presentes indica conexões reais, não personagens de demonstração.

## Limitações

- Multiplayer: chat e posições simples em memória; sem persistência, moderação madura ou garantia de escala.
- A interface não oferece pagamentos. Skins políticas são possibilidade futura sujeita a avaliação jurídica, especialmente em período eleitoral.
- Os modelos foram criados para este projeto; nenhum código, modelo proprietário ou ortofoto do Google Maps ou manifestacao.com foi incorporado.
- Pendente: material mais realista, escala/colisão precisas, sincronizar animação escolhida por usuário, mobile QA e implantação escalável.
- O código-fonte está sob a licença MIT (veja [LICENSE](LICENSE)); antes de redistribuir ou explorar comercialmente modelos gerados com Higgsfield, verifique também os termos aplicáveis aos assets. Antes de reutilizar o modelo comercialmente, confira os termos aplicáveis aos assets Higgsfield.

## Links

- [Projeto 3D editável](https://higgsfield.ai/3d-jutsu/daecc7f2-a214-462a-830d-80adddb81368)
- [Pacote Blender/GLB e renders](https://d2ol7oe51mr4n9.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham/a2a99edf-f264-41b3-850c-21efcb5df5a1.zip?download=agora-brasil-congresso-esplanada-blender-v4.zip)

Este projeto não é uma plataforma oficial do Congresso Nacional nem possui afiliação com qualquer partido político.
