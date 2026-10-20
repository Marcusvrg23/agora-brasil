const test=require('node:test');
const assert=require('node:assert/strict');
const {clean,roomCode}=require('../server');
test('remove marcacao html e caracteres de controle',()=>assert.equal(clean('<b>olá</b>\n'), 'bolá/b'));
test('limita texto',()=>assert.equal(clean('123456789',4),'1234'));
test('sala Brasilia default',()=>assert.equal(roomCode(''), '5300108'));
test('aceita codigos municipais IBGE',()=>assert.equal(roomCode('3550308'),'3550308'));
test('descarta codigo arbitrario',()=>assert.equal(roomCode('../secret'),'5300108'));
