import test from 'node:test';
import assert from 'node:assert/strict';
import {PHOTO_PROFILES,obterPerfilFoto,validarArquivoFoto,FOTO_MAX_BYTES} from '../public/personagens.mjs';
test('três perfis distintos e com looks compatíveis',()=>{
 assert.equal(PHOTO_PROFILES.length,3);
 assert.equal(new Set(PHOTO_PROFILES.map(x=>x.id)).size,3);
 for(const p of PHOTO_PROFILES){assert.equal(obterPerfilFoto(p.id),p);assert.equal(p.look.base,'boneco');assert.ok(['vermelho','amarelo'].includes(p.look.team))}
 assert.equal(obterPerfilFoto('inexistente'),null);
});
test('valida arquivos de retrato antes do processamento local',()=>{
 assert.match(validarArquivoFoto(null),/Selecione/);
 assert.equal(validarArquivoFoto({type:'image/png',size:1024}),null);
 assert.equal(validarArquivoFoto({type:'image/jpeg',size:FOTO_MAX_BYTES}),null);
 assert.match(validarArquivoFoto({type:'image/svg+xml',size:1234}),/JPG/);
 assert.match(validarArquivoFoto({type:'image/webp',size:FOTO_MAX_BYTES+1}),/3 MB/);
});
