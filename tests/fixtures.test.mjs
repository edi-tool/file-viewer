import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,makePdf,makeTiff} from '../scripts/fixtures.mjs';
import {probe,epsSections} from '../src/probe.mjs';
const f=fixtures();
test('generated fixture routing',()=>{
  const routes={'two-colors.pdf':'pdf','pdf-compatible-candidate.ai':'pdf','composite.psd':'psd','rgb.tiff':'tiff','vector.eps':'eps','binary-preview.eps':'eps','invalid-preview.eps':'eps','wrong-extension.psd':'pdf','truncated.psd':'none'};
  for(const [name,route] of Object.entries(routes)) assert.equal(probe(f[name],name).route,route,name);
});
test('generated EPS preview is byte-identical TIFF',()=>{
  const b=f['binary-preview.eps'],s=epsSections(b,b.length);
  assert.deepEqual(b.subarray(s.tiff.offset,s.tiff.offset+s.tiff.length),makeTiff());
});
test('generated invalid EPS section rejected',()=>assert.throws(()=>epsSections(f['invalid-preview.eps']),/invalid EPS section/));
test('PDF xref points to each object',()=>{
  const s=makePdf().toString('ascii'),i=Number(s.match(/startxref\n(\d+)/)[1]);
  assert.equal(s.slice(i,i+4),'xref');
  const rows=s.slice(i).split('\n').slice(3,7);
  rows.forEach((row,j)=>assert.equal(s.slice(Number(row.slice(0,10)),Number(row.slice(0,10))+7),`${j+1} 0 obj`));
});
