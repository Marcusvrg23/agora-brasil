# Ágora Brasil - implantação Square Cloud

## Upload ZIP
1. Abra dashboard.squarecloud.app, crie **novo aplicativo web Node.js**. Não substitua outros aplicativos.
2. Envie o ZIP **agora-brasil-squarecloud-social.zip** gerado em Actions → Pacote Square Cloud Social.
3. O ZIP possui `squarecloud.app`, `package.json`, código Node e `public/`.
4. Configure variáveis com segurança pelo painel: `ADMIN_TOKEN` forte para moderação; sem `MP_ACCESS_TOKEN` para evitar checkout.
5. Abra /health, entre com dois navegadores diferentes, confira movimentos, chat, montaria, coleta, modo PvP e graffiti.
6. Placar de vitórias é persistido em `data/vitorias.json` na instância única; faça backup do arquivo.
7. Espaço de grafites é virtual e temporário (por sala, reinicia junto com o processo). Moderar conteúdo é requisito antes de abertura irrestrita.
8. `SUBDOMAIN` é uma solicitação; o endereço final deve ser confirmado no dashboard.
9. Nenhum URL ao vivo eleitoral está codificado: links levam ao TSE e ao canal da Justiça Eleitoral.

## GitHub
Branch da versão: `feat/squarecloud-modos-social`. É possível usar integração Git da Square Cloud com branch específica, mas testar ZIP primeiro reduz riscos. Não copie tokens para código.

## Pontos que ainda precisam de QA antes de declarar versão definitiva
- Performance de modelos GLB e explosões em PCs fracos;
- Chat e etiquetas renderizados com dois clientes reais;
- Colisão helicóptero / câmera no Congresso;
- Moderar grafites, persistir em DB com auditoria e opt-in;
- Votos eleitorais nunca derivam do placar do jogo, fontes oficiais externas.
