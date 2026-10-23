'use strict';
// Event signaling: text megaphone, small WebRTC proximity groups and shared truck radios.
// This module never handles microphone media, only bounded signaling metadata.
const TRACKS = ['silencio', 'batida-praca', 'instrumental-calmo'];
const MAX_VOICES = 6;
function createEventHub({send, broadcast, peers, combateOf}) {
  const radios = new Map();
  function joined(ws) {
    send(ws,{type:'evento-config',youtubeId:/^[\w-]{11}$/.test(process.env.EVENTO_YOUTUBE_ID||'')?process.env.EVENTO_YOUTUBE_ID:null,voiceEnabled:process.env.VOICE_ENABLED!=='false',maxVoices:MAX_VOICES});
    const radio=radios.get(ws.room);
    if(radio)send(ws,{type:'truck-radio',...radio});
  }
  function left(ws) {
    if(!ws.room)return;
    if(ws.voice){ws.voice=false;broadcast(ws.room,{type:'voice-left',id:ws.playerId},ws);}
    const radio=radios.get(ws.room);
    if(radio?.owner===ws.playerId) {
      radios.delete(ws.room);broadcast(ws.room,{type:'truck-radio',truck:radio.truck,track:'silencio',startedAt:Date.now()});
    }
  }
  function handle(ws,msg) {
    if(!['megafone','truck-radio','voice-join','voice-leave','voice-signal'].includes(msg.type))return false;
    if(!ws.room)return true;
    const now=Date.now();
    if(msg.type==='megafone') {
      if(ws.look?.acessorio!=='megafone'||now-(ws.lastMegafone||0)<6000)return true;
      const text=String(msg.text||'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,140);
      if(!text)return true;
      ws.lastMegafone=now;
      broadcast(ws.room,{type:'megafone',id:ws.playerId,name:ws.name,text,time:now});
      return true;
    }
    if(msg.type==='truck-radio') {
      const j=combateOf(ws.room).jogadores.get(ws.playerId);
      const v=j?.veiculo&&combateOf(ws.room).veiculo(j.veiculo);
      if(!v||v.motorista!==ws.playerId||!v.tipo.startsWith('caminhao-'))return true;
      if(now-(ws.lastRadio||0)<2500)return true;
      if(!TRACKS.includes(msg.track))return true;
      ws.lastRadio=now;
      const radio={truck:v.id,track:msg.track,startedAt:now,owner:ws.playerId};
      if(radio.track==='silencio')radios.delete(ws.room);else radios.set(ws.room,radio);
      broadcast(ws.room,{type:'truck-radio',...radio});
      return true;
    }
    if(msg.type==='voice-join') {
      if(process.env.VOICE_ENABLED==='false')return true;
      const joined=peers(ws.room).filter(p=>p.voice&&p!==ws);
      if(joined.length>=MAX_VOICES-1) {send(ws,{type:'voice-error',message:'Limite de microfones próximos atingido. Use o debate ao vivo para acompanhar.'});return true;}
      if(ws.voice)return true;
      ws.voice=true;
      send(ws,{type:'voice-peers',peers:joined.map(p=>({id:p.playerId,name:p.name}))});
      broadcast(ws.room,{type:'voice-enter',id:ws.playerId,name:ws.name},ws);
      return true;
    }
    if(msg.type==='voice-leave') { if(ws.voice){ws.voice=false;broadcast(ws.room,{type:'voice-left',id:ws.playerId},ws);}return true; }
    if(!ws.voice||msg.type!=='voice-signal')return true;
    const target=peers(ws.room).find(p=>p.playerId===msg.to&&p.voice&&p!==ws);
    const signal=msg.signal;
    if(!target||!signal||!['offer','answer','candidate'].includes(signal.type))return true;
    const serialized=JSON.stringify(signal);
    if(serialized.length>3500||now-(ws.signalWindow||0)>1000){ws.signalWindow=now;ws.signalN=0;}
    if(++ws.signalN>35||serialized.length>3500)return true;
    send(target,{type:'voice-signal',from:ws.playerId,signal});
    return true;
  }
  return {joined,left,handle};
}
module.exports={createEventHub,TRACKS,MAX_VOICES};
