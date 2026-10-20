#!/usr/bin/env bash
# Baixa os modelos GLB gerados no Higgsfield (20/10/2026) para public/assets/.
# Uso: bash scripts/baixar-modelos.sh   (rodar na raiz do repositório)
set -euo pipefail
B=https://d8j0ntlcm91z4.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham
mkdir -p public/assets/personagens public/assets/jogadores public/assets/veiculos

baixar() { echo "-> $1"; curl -fL --retry 2 -o "$1" "$B/$2"; }

# Personagens fictícios
baixar public/assets/personagens/senador.glb      hf_20261020_193457_636fec9e-1237-4ac8-9653-33168e6c408a.glb
baixar public/assets/personagens/ministra.glb     hf_20261020_193500_f2d04780-c456-472f-a66a-70afc40f643d.glb
baixar public/assets/personagens/sindicalista.glb hf_20261020_193503_9ab2af6a-2b52-4882-b4a2-80186011f89a.glb
baixar public/assets/personagens/manifestante.glb hf_20261020_193506_9382cf35-c2ea-4cdb-b4c8-a33ec9f26d1e.glb

# Jogadores dos times (camisa / terno com faixa)
baixar public/assets/jogadores/camisa-vermelho.glb      hf_20261020_195217_a874f8f6-579c-4687-a645-d20571e90a5d.glb
baixar public/assets/jogadores/camisa-amarelo.glb       hf_20261020_195220_72c4ae9d-bab9-4cb5-b8dc-2b192fb4f7e1.glb
baixar public/assets/jogadores/terno-faixa-vermelho.glb hf_20261020_195224_d0959fa3-7fe8-494f-8948-02e0d9a03003.glb
baixar public/assets/jogadores/terno-faixa-amarelo.glb  hf_20261020_195227_99d2310c-5303-4a56-8af1-7add6f9a1ac0.glb

# Veículos
baixar public/assets/veiculos/trio_eletrico.glb hf_20261020_193509_24e9bb13-8f88-4621-98ee-cffb3ccc8939.glb

echo "Pronto. Modelos sem rig: confira escala (~1,7 m) no Blender antes de usar."
