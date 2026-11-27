import {test} from 'node:test';import assert from 'node:assert/strict';import {epsBoundingBox} from '../src/eps.mjs';import {makeEps} from '../scripts/fixtures.mjs';const t=s=>new TextEncoder().encode(s);
test('origin aligned EPS',()=>assert.deepEqual(epsBoundingBox(makeEps()),{width:64,height:64}));
test('reject oversized and nonzero origin',()=>{for(const box of ['0 0 99999 99999','-2 0 64 64','0 0 0 64'])assert.throws(()=>epsBoundingBox(t('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: '+box+'\n%%EndComments\n')));});
test('BoundingBox atend',()=>assert.deepEqual(epsBoundingBox(t('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: (atend)\n%%EndComments\n%%Trailer\n%%BoundingBox: 0 0 20 30\n%%EOF\n')),{width:20,height:30}));
