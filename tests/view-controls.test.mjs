import {test} from 'node:test';import assert from 'node:assert/strict';import {fitZoom,clampZoom,anchoredScroll} from '../src/view-controls.mjs';
test('fit page and width',()=>{assert.equal(fitZoom(100,200,600,400),2);assert.equal(fitZoom(100,200,600,400,'width'),6);});
test('zoom limits',()=>{assert.equal(clampZoom(99),8);assert.equal(clampZoom(0),.1);assert.equal(clampZoom(NaN),1);});
test('zoom keeps anchor',()=>assert.equal(anchoredScroll(100,50,0,0,2),250));
