#!/usr/bin/env bash
# Baixa os modelos GLB gerados no Higgsfield (20/10/2026) para public/assets/.
# Uso: bash scripts/baixar-modelos.sh   (rodar na raiz do repositório)
set -euo pipefail
B=https://d8j0ntlcm91z4.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham
mkdir -p public/assets/personagens public/assets/jogadores public/assets/veiculos public/assets/bases

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

# Corpos base semi-realistas (modelo 3D + foto do cartão no criador)
baixar public/assets/bases/homem-vermelho.glb hf_20261020_215339_5b3afe7f-0a9f-4ddb-8aa1-741495549426.glb  # com esqueleto e caminhada
baixar public/assets/bases/homem-vermelho.png hf_20261020_214605_fadcc2c8-ed85-4ee7-8d46-5a6c03cd4abd.png
baixar public/assets/bases/mulher-vermelho.glb hf_20261020_214725_e26abeb8-f753-486d-b0c5-8fb9fc9058f1.glb
baixar public/assets/bases/mulher-vermelho.png hf_20261020_214605_df98cea5-b40e-4991-8e9b-30abdb82df67.png
baixar public/assets/bases/idoso-vermelho.glb hf_20261020_214729_ccc3dcc4-8e88-4b39-bc9c-c46e7c124ed1.glb
baixar public/assets/bases/idoso-vermelho.png hf_20261020_214604_06344de0-261c-47fa-9072-21746ae89e10.png
baixar public/assets/bases/idosa-vermelho.glb hf_20261020_214733_74f0e632-63cf-4dcb-9bad-0a20cbaa38af.glb
baixar public/assets/bases/idosa-vermelho.png hf_20261020_214605_2272ba5a-4ea6-4f7c-9223-26f6a424a5a9.png
baixar public/assets/bases/homem-amarelo.glb hf_20261020_214736_5b82cd6a-18be-47b3-a74f-d8c82ae66381.glb
baixar public/assets/bases/homem-amarelo.png hf_20261020_214628_05ab2456-ae6b-4f7d-8728-0d6c289324d5.png
baixar public/assets/bases/mulher-amarelo.glb hf_20261020_214739_82a57d11-7d0f-43c2-8a9c-11feadf2b3cd.glb
baixar public/assets/bases/mulher-amarelo.png hf_20261020_214630_98eccc5e-adca-41bd-996e-a02757bc89a5.png
baixar public/assets/bases/idoso-amarelo.glb hf_20261020_214742_b215eb66-6146-4afe-9de2-be150a9f2101.glb
baixar public/assets/bases/idoso-amarelo.png hf_20261020_214629_a81ece7f-f013-4f5c-acf4-4e064cb6bdf2.png
baixar public/assets/bases/idosa-amarelo.glb hf_20261020_214745_86472ca7-ab1c-45b1-80f7-cea8a0d52e3a.glb
baixar public/assets/bases/idosa-amarelo.png hf_20261020_214629_fca271b7-5500-4711-a45f-4a66a544a863.png

# Veículos
baixar public/assets/veiculos/trio_eletrico.glb hf_20261020_193509_24e9bb13-8f88-4621-98ee-cffb3ccc8939.glb

echo "Pronto. Modelos sem rig: confira escala (~1,7 m) no Blender antes de usar."
