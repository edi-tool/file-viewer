import {test} from 'node:test';import assert from 'node:assert/strict';import {createPageCache} from '../src/page-cache.mjs';
const data=n=>({rgba:new ArrayBuffer(n)});
test('bounded cache evicts least recently used pages',()=>{const c=createPageCache(12,2),a=data(4),b=data(4),d=data(4);c.put('a',a);c.put('b',b);assert.equal(c.get('a'),a);c.put('d',d);assert.equal(c.get('b'),undefined);assert.equal(c.get('a'),a);});
test('reject oversized and clear',()=>{const c=createPageCache(8,3);c.put('large',data(9));assert.equal(c.get('large'),undefined);c.put('x',data(8));c.put('y',data(4));assert.equal(c.get('x'),undefined);c.clear();assert.equal(c.get('y'),undefined);});
