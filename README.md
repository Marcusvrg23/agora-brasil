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
- **Criador de personagem** (`public/avatar.js`): time, traje, acessório (boné, chapéu panamá, óculos, megafone) e cores de pele, cabelo, calça e terno, com prévia giratória e botão "Ver andando". O visual fica salvo no navegador e é validado no servidor.
- **Corpos base semi-realistas:** no criador, cartões Boneco, Homem, Mulher, Idoso e Idosa (estilo dos simuladores de vida), com versão vermelha e amarela de cada um. Os arquivos ficam em `public/assets/bases/<base>-<time>.glb` (+ `.png` do cartão) e vêm do `scripts/baixar-modelos.sh`. Todos os jogadores veem o corpo escolhido. Sem o arquivo, aparece o boneco.
- **Personagem padrão semi-realista:** quem entra já começa com o corpo "Homem" do Higgsfield. Se o arquivo não estiver em `public/assets/bases`, o jogo busca o modelo direto no Higgsfield. O `homem-vermelho` já vem com esqueleto e caminhada. O "Boneco" desenhado em código (proporções humanas, rosto pintado, nove estilos de cabelo) fica como reserva e opção de personalização livre.
- **Importar modelo 3D:** o jogador pode carregar um `.glb`/`.gltf` (até 15 MB). O modelo é ajustado para 2,2 m e usa animações com nome "walk"/"idle" se existirem. Ele aparece **só para quem importou**; os outros jogadores veem o boneco personalizado. Compartilhar modelos com todos exige upload e moderação, que ainda não existem.
- **Animações:** os bonecos andam com braços e pernas balançando, viram para a direção do movimento e respiram parados. O telão da tribuna mostra o debate ao vivo.
- **Catálogo:** `public/catalogo.json` lista personagens, times, trajes, itens, veículos, espaços de anúncio e regras.
- **Modelos 3D:** `bash scripts/baixar-modelos.sh` baixa os GLB gerados no Higgsfield para `public/assets/`.

## Cidade em código e telões (v0.6)

- **Esplanada redesenhada em código** (`public/cidade.js`), em metros reais: Congresso (torres de 100 m e 28 andares, cúpula do Senado, bacia da Câmara com 62 m, colunata, rampa e espelho d'água com reflexo), 18 ministérios com fachada de vidro, Itamaraty e Palácio da Justiça com arcos e cascatas, anexo com mosaico dourado, Praça dos Três Poderes (Planalto, STF, mastro de 100 m com bandeira, Pombal, Panteão), Alameda das bandeiras, pistas com faixas, trânsito, estacionamentos, árvores, postes, Catedral, Museu e Torre de TV ao fundo.
- **Visual:** céu físico com sol de fim de tarde, nuvens, sombras, tons de filme e névoa no horizonte. O modo **leve** (padrão em notebooks com 4 núcleos ou menos e no celular) desliga o reflexo real do espelho d'água e reduz sombras e detalhes. Force com `?graficos=alto` ou `?graficos=leve`.
- **Câmera e movimento:** a câmera segue o jogador; WASD anda relativo à câmera; Shift corre; prédios e espelhos d'água bloqueiam a passagem.
- **Telões de anúncio** em 7 pontos (2 diante do Congresso, 2 no Eixo, 2 na altura dos ministérios, 1 na Praça). Fluxo: pedido no painel "Anunciar nos telões" → Pix (Mercado Pago) → moderação em `/admin` → no ar pelos dias contratados, em rodízio. Propaganda político-eleitoral é recusada automaticamente e na moderação.
- **Variáveis de ambiente:** `ADMIN_TOKEN` (obrigatória para moderar), `MP_ACCESS_TOKEN` (ativa o Pix automático), `PUBLIC_URL` (endereço público, para o aviso de pagamento do Mercado Pago), `DATA_DIR` (onde ficam pedidos e imagens; padrão `data/`). Sem `MP_ACCESS_TOKEN`, o pedido é salvo e o pagamento é confirmado à mão no `/admin`.
- **Animação:** os quatro corpos (Homem, Mulher, Idoso, Idosa) têm esqueleto e usam a mesma caminhada; o time amarelo usa o mesmo modelo com a camisa recolorida.

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
