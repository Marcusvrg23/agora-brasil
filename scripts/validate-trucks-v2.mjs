import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import validator from 'gltf-validator';
const directory='public/assets/veiculos/v2',out=process.env.QA_OUT||'evidence/trucks-v2';
fs.mkdirSync(out,{recursive:true});
for(const entry of JSON.parse(fs.readFileSync(directory+'/manifest.json'))){
 const bytes=fs.readFileSync(directory+'/'+entry.name+'.glb');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 const result=await validator.validateBytes(new Uint8Array(bytes),{uri:entry.name+'.glb'});
 fs.writeFileSync(out+'/'+entry.name+'-validation.json',JSON.stringify(result,null,2)+'\n');
 assert.equal(result.issues.numErrors,0);assert.equal(result.issues.numWarnings,0);
 console.log(entry.name,JSON.stringify({sha256:entry.sha256,errors:result.issues.numErrors,warnings:result.issues.numWarnings,hints:result.issues.numHints}));
}
