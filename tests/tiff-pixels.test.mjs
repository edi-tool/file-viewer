import {test} from 'node:test';import assert from 'node:assert/strict';import {orientRgba,cmyk8,unpremultiply} from '../src/tiff-pixels.mjs';
const input=Uint8Array.from([1,2,3,4,5,6].flatMap(x=>[x,0,0,255]));
test('all eight TIFF orientations',()=>{const expected=[[1,2,3,4,5,6],[3,2,1,6,5,4],[6,5,4,3,2,1],[4,5,6,1,2,3],[1,4,2,5,3,6],[4,1,5,2,6,3],[6,3,5,2,4,1],[3,6,2,5,1,4]];for(let i=1;i<=8;i++){const v=orientRgba(input,3,2,i);assert.deepEqual(Array.from(v.rgba.filter((_,j)=>j%4===0)),expected[i-1]);assert.equal(v.width,i>=5?2:3);assert.equal(v.height,i>=5?3:2);}});
test('CMYK primaries and black',()=>assert.deepEqual(Array.from(cmyk8(Uint8Array.of(0,255,255,0,255,255,0,0,0,0,0,255),3,1)),[255,0,0,255,0,0,255,255,0,0,0,255]));
test('associated alpha becomes straight alpha',()=>assert.deepEqual(Array.from(unpremultiply(Uint8Array.of(128,64,0,128,10,10,10,0))),[255,128,0,128,0,0,0,0]));
