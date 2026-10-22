'use strict';
// Vercel Function with native WebSocket upgrade support (Vercel Fluid Compute).
// Uses existing Claude server + debate/combat engines.
process.env.DATA_DIR ||= '/tmp/agora-brasil'; // ephemeral; advertising payments are disabled
const {server,tickDebates,tickCombates}=require('../server.js');
if(!global.__agoraVercelIntervalsStarted){
  global.__agoraVercelIntervalsStarted=true;
  setInterval(tickDebates,500).unref();
  setInterval(tickCombates,250).unref();
}
module.exports=server;
