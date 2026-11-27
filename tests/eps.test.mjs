import {test} from 'node:test';import assert from 'node:assert/strict';import {epsBoundingBox,translateEps} from '../src/eps.mjs';import {makeEps,makeShiftedEps} from '../scripts/fixtures.mjs';const t=s=>new TextEncoder().encode(s);
test('origin aligned EPS',()=>assert.deepEqual(epsBoundingBox(makeEps()),{width:64,height:64,x:0,y:0}));
test('reject oversized and excessive origin',()=>{for(const box of ['0 0 99999 99999','-200000 0 -199936 64','0 0 0 64'])assert.throws(()=>epsBoundingBox(t('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: '+box+'\n%%EndComments\n')));});
test('BoundingBox atend',()=>assert.deepEqual(epsBoundingBox(t('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: (atend)\n%%EndComments\n%%Trailer\n%%BoundingBox: 0 0 20 30\n%%EOF\n')),{width:20,height:30,x:0,y:0}));

test('negative origin translated',()=>{const b=makeShiftedEps(),box=epsBoundingBox(b);assert.deepEqual(box,{width:64,height:64,x:-20,y:10});assert.match(new TextDecoder().decode(translateEps(b,box)),/20 -10 translate/);});
