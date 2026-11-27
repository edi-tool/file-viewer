/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
// Preliminary format routing only. No renderer or external dependencies.
const ascii = (s) => [...s].map(c => c.charCodeAt(0));
const starts = (b, a, at = 0) => a.every((v, i) => b[at+i] === v);
const pdf = ascii('%PDF-'), ps = ascii('%!PS'), dos = [0xc5,0xd0,0xd3,0xc6];
const cfb = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
const jtdExt = new Set(['jtd','jtt','jtdc','jttc']);
export function probe(input, name = '') {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const ext = name.toLowerCase().split('.').pop();
  const isAi=ext==='ai'||ext==='ait';
  const out = (kind, route, extra = {}) => ({kind, route, extension: ext, ...extra});
  if (starts(b, ascii('8BPS'))) {
    if (b.length < 26) return out('invalid','none',{reason:'truncated-psd'});
    const d = new DataView(b.buffer,b.byteOffset,b.byteLength);
    const v = d.getUint16(4), channels = d.getUint16(12), height = d.getUint32(14), width = d.getUint32(18), depth = d.getUint16(22), colorMode = d.getUint16(24);
    const max = v === 1 ? 30000 : 300000;
    if (![1,2].includes(v) || !width || !height || width > max || height > max || !channels || channels > 56 || ![1,8,16,32].includes(depth) || b.subarray(6,12).some(x=>x!==0)) return out('invalid','none',{reason:'bad-psd-header'});
    return out(v===1?'psd':'psb','psd',{width,height,depth,channels,colorMode,pixels:width*height});
  }
  if (starts(b,dos)) return out('eps-binary','eps');
  // PDF may have a leading prefix; only look for the header in the first 1024 bytes.
  if (starts(b,ps)) return out(isAi?'ai-postscript':'postscript','eps');
  for(let i=0;i<Math.min(1024,b.length-4);i++) if(starts(b,pdf,i)) return out(isAi?'ai-pdf-candidate':'pdf','pdf',{headerOffset:i,warning:isAi?'verify-not-placeholder':undefined});
  if(starts(b,[0x49,0x49,42,0])||starts(b,[0x4d,0x4d,0,42])) return out('tiff','tiff');
  if(starts(b,[0x49,0x49,43,0])||starts(b,[0x4d,0x4d,0,43])) return out('bigtiff','none',{reason:'not-yet-supported'});
  if(starts(b,[137,80,78,71,13,10,26,10])) return out('png','image');
  if(starts(b,[255,216,255])) return out('jpeg','image');
  if(starts(b,ascii('GIF87a'))||starts(b,ascii('GIF89a'))) return out('gif','image');
  if(starts(b,ascii('RIFF'))&&starts(b,ascii('WEBP'),8)) return out('webp','image');
  if(starts(b,ascii('BM'))) return out('bmp','image');
  if(jtdExt.has(ext)) return out('jtd-candidate','jtd',{container:starts(b,cfb)?'cfb':'unknown',warning:'engine-must-validate'});
  if(starts(b,cfb)) return out('cfb','none',{reason:'ambiguous-container'});
  if(isAi) return out('ai-unknown','none',{reason:'no-recognized-preview'});
  if(['txt','csv','tsv','md','log'].includes(ext))return out('text-candidate','text');
  return out('unknown','none',{reason:'unsupported-or-invalid'});
}
export function epsSections(input, fileSize = input.byteLength) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if(!starts(b,dos) || b.length < 30 || !Number.isSafeInteger(fileSize) || fileSize < 30) throw new Error('invalid EPS binary header');
  const d = new DataView(b.buffer,b.byteOffset,b.byteLength);
  const result = {};
  for(const [name,p] of [['postscript',4],['wmf',12],['tiff',20]]) {
    const offset=d.getUint32(p,true), length=d.getUint32(p+4,true);
    if(offset===0&&length===0) {result[name]=null;continue;}
    if(offset<30 || !length || offset+length>fileSize) throw new Error('invalid EPS section: '+name);
    result[name]={offset,length};
  }
  if(!result.postscript) throw new Error('missing PostScript section');
  const sorted=Object.values(result).filter(Boolean).sort((a,b)=>a.offset-b.offset);
  for(let i=1;i<sorted.length;i++) if(sorted[i-1].offset+sorted[i-1].length>sorted[i].offset) throw new Error('overlapping EPS sections');
  return result;
}
export async function probeFile(file) {
  return probe(new Uint8Array(await file.slice(0,1024).arrayBuffer()),file.name);
}
