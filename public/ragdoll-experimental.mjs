// Prévia experimental: reação física VISUAL e reversível, não é ragdoll articulado.
// Não altera dano, posição autoritativa, colisões nem protocolo WebSocket.
export function ragdollHabilitado(query=''){
  return new URLSearchParams(String(query)).get('ragdoll')==='1';
}

export function criarRagdollExperimental({habilitado=false,maxAtivos=8}={}){
  const ativos=new Map();
  const max=Math.max(1,Math.min(16,Math.floor(Number(maxAtivos)||8)));
  const fonte=(avatar)=>avatar?.userData?.imported||avatar?.userData?.baseModel||avatar?.userData?.rig||null;

  function restaurar(id){
    const efeito=ativos.get(id);
    if(!efeito)return;
    const v=efeito.visual;
    if(v?.rotation)v.rotation.x=efeito.rotX;
    if(v?.position)v.position.x=efeito.posX;
    ativos.delete(id);
  }
  function limpar(){for(const id of [...ativos.keys()])restaurar(id)}
  function impacto(id,avatar,{vidaAnterior,vidaNova,pvp=false,vivo=false,veiculo=null}={}){
    // Somente usar com o evento de dano confirmado pelo servidor (nunca com efeito de explosão).
    if(!habilitado||!id||!pvp||!vivo||veiculo||!avatar||avatar.userData?.morto>0)return false;
    const antes=Number(vidaAnterior),depois=Number(vidaNova);
    if(!Number.isFinite(antes)||!Number.isFinite(depois)||depois<=0||depois>=antes)return false;
    const visual=fonte(avatar);
    if(!visual?.rotation||!visual?.position)return false;
    restaurar(id);
    if(ativos.size>=max)return false;
    let hash=0;for(const c of String(id))hash=(hash*31+c.charCodeAt(0))|0;
    ativos.set(id,{visual,rotX:visual.rotation.x,posX:visual.position.x,
      theta:0,vel:Math.min(5.8,2.8+Math.min(1,(antes-depois)/65)*3),
      lado:(hash&1)?1:-1,tempo:0});
    return true;
  }
  function atualizar(dt,obterAvatar,obterJogador){
    const passo=Math.min(.05,Math.max(0,Number(dt)||0));
    for(const [id,e] of ativos){
      const avatar=obterAvatar(id),j=obterJogador(id);
      if(!avatar||fonte(avatar)!==e.visual||!j?.vivo||!j.pvp||j.veiculo||avatar.userData?.morto>0){
        restaurar(id);continue;
      }
      e.tempo+=passo;
      // Massa/mola amortecida apenas sobre o holder visual; a raiz do jogador não se move.
      e.vel+=(-24*e.theta-8.5*e.vel)*passo;
      e.theta=Math.max(-.48,Math.min(.48,e.theta+e.vel*passo));
      e.visual.rotation.x=e.rotX-e.theta;
      e.visual.position.x=e.posX+e.lado*e.theta*.12;
      if(e.tempo>1.15)restaurar(id);
    }
  }
  return {impacto,atualizar,restaurar,limpar,ativos:()=>ativos.size,habilitado:()=>!!habilitado};
}
