// Três perfis jogáveis para personalizar com retratos importados pelo próprio usuário.
// Nenhuma foto é transferida ao servidor: só as opções públicas de roupas/cores são sincronizadas.
export const FOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PHOTO_PROFILES = Object.freeze([
 {id:'perfil-1',nome:'Personagem 1',descricao:'Terno escuro, cabelos grisalhos',look:{base:'boneco',outfit:'terno-faixa',team:'vermelho',cabeloEstilo:'grisalho',pele:'#c99a74',cabelo:'#ddddda',terno:'#252b31',calca:'#252b31',acessorio:'nenhum'}},
 {id:'perfil-2',nome:'Personagem 2',descricao:'Camisa verde-amarela, cabelos curtos',look:{base:'boneco',outfit:'camisa',team:'amarelo',cabeloEstilo:'curto',pele:'#ce9e82',cabelo:'#46382d',terno:'#263c46',calca:'#28324a',acessorio:'nenhum'}},
 {id:'perfil-3',nome:'Personagem 3',descricao:'Traje executivo e cabelo ondulado',look:{base:'boneco',outfit:'terno-faixa',team:'vermelho',cabeloEstilo:'ondulado',pele:'#b78568',cabelo:'#2b1d14',terno:'#202631',calca:'#202631',acessorio:'nenhum'}}
]);
export function obterPerfilFoto(id){return PHOTO_PROFILES.find(p=>p.id===id)||null}
export function validarArquivoFoto(file){
 if(!file)return 'Selecione uma foto.';
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Use JPG, PNG ou WebP.';
 if(file.size<=0||file.size>FOTO_MAX_BYTES)return 'A foto precisa ter no máximo 3 MB.';
 return null;
}
