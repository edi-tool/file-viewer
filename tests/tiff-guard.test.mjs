import {test} from 'node:test';import assert from 'node:assert/strict';import {makeTiff} from '../scripts/fixtures.mjs';import {guardTiff} from '../src/tiff-guard.mjs';
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
test('valid baseline TIFF',()=>assert.deepEqual(guardTiff(ab(makeTiff())),{width:64,height:64,compression:1,pageCount:1}));
test('TIFF circular IFD rejected',()=>{const b=makeTiff();b.writeUInt32LE(8,130);assert.throws(()=>guardTiff(ab(b)));});
test('TIFF oversized count rejected',()=>{const b=makeTiff();b.writeUInt32LE(0xffffffff,14);assert.throws(()=>guardTiff(ab(b)));});
test('TIFF strip outside file rejected',()=>{const b=makeTiff();b.writeUInt32LE(0xffffffff,10+5*12+8);assert.throws(()=>guardTiff(ab(b)));});
test('TIFF forbidden nested tag rejected',()=>{const b=makeTiff();b.writeUInt16LE(330,10+9*12);assert.throws(()=>guardTiff(ab(b)));});
test('TIFF unbounded inflate rejected',()=>{const b=makeTiff();b.writeUInt32LE(8,10+3*12+8);assert.throws(()=>guardTiff(ab(b)));});
