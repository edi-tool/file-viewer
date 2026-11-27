import {test} from 'node:test';import assert from 'node:assert/strict';import {probe} from '../src/probe.mjs';import {imageDimensions} from '../src/image-header.mjs';import {makeBmp} from '../scripts/fixtures.mjs';
const t=s=>new TextEncoder().encode(s);
test('AIT follows AI path',()=>{assert.equal(probe(t('%PDF-1.7'),'x.ait').kind,'ai-pdf-candidate');assert.equal(probe(t('%!PS-Adobe-3.0'),'x.ait').kind,'ai-postscript');});
test('BMP bounded header',()=>{const b=makeBmp();assert.equal(probe(b,'x.bmp').kind,'bmp');assert.deepEqual(imageDimensions(b,'bmp'),{width:64,height:64});assert.throws(()=>imageDimensions(b.subarray(0,55),'bmp'));});
test('text is candidate only',()=>{assert.equal(probe(t('a,b'),'x.csv').route,'text');assert.equal(probe(t('%PDF-1.7'),'x.txt').route,'pdf');});
