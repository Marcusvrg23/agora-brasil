import test from 'node:test';
import assert from 'node:assert/strict';
// Regression invariants for input and sign dimensions; browser tests exercise the DOM/rig.
import * as joystick from '../public/joystick.mjs';
import * as sign from '../public/cartaz-config.mjs';
test('analógico mantém zona morta e intensidade proporcional ao deslocamento',()=>{
 assert.equal(typeof joystick.eixosAnalogico,'function');
 assert.deepEqual(joystick.eixosAnalogico(2,2,50),{x:0,y:0,intensidade:0});
 const half=joystick.eixosAnalogico(25,0,50);
 assert.ok(half.x>0 && half.x<1);assert.equal(half.y,0);
 assert.ok(half.intensidade>0 && half.intensidade<1);
});
test('analógico limita diagonais e rejeita medidas inválidas',()=>{
 assert.equal(typeof joystick.eixosAnalogico,'function');
 const edge=joystick.eixosAnalogico(100,-100,50);
 assert.ok(Math.abs(Math.hypot(edge.x,edge.y)-1)<1e-9);
 assert.deepEqual(joystick.eixosAnalogico(Infinity,0,50),{x:0,y:0,intensidade:0});
 assert.deepEqual(joystick.eixosAnalogico(1,2,0),{x:0,y:0,intensidade:0});
});
test('cartaz é segurado por uma mão, com braço estendido e haste curta',()=>{
 assert.ok(sign.POSE_CARTAZ);
 assert.deepEqual(Object.keys(sign.POSE_CARTAZ),['bracoD']);
 const [upper,fore]=sign.POSE_CARTAZ.bracoD;
 assert.ok(upper[2]>.7 && fore[2]>.8);
 assert.ok(upper[1]<0 && Math.abs(fore[1])<.3);
 assert.ok(sign.CARTAZ_MEDIDAS.haste<=.3);
 assert.ok(sign.CARTAZ_MEDIDAS.altura<.8);
});
