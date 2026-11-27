/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
// Decode only the already validated 8-bit chunky strips. Fixed-size output
// prevents a small compressed strip from expanding without a bound.
export async function inflateExact(bytes,expected){
 if(!Number.isSafeInteger(expected)||expected<1||expected>32_000_000)throw Error('TIFF展開量が不正です。');
 if(typeof DecompressionStream!=='function')throw Error('このブラウザはTIFFのDeflate展開に対応していません。');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 const out=new Uint8Array(expected);let at=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;if(at+value.length>expected)throw Error('TIFFの展開量が上限を超えています。');out.set(value,at);at+=value.length;}if(at!==expected)throw Error('TIFFの展開サイズが一致しません。');return out;}
 finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
export async function decodeDeflateTiff(buffer,ifd,width,height){
 const spp=Number(ifd.t277?.[0]??1),rows=Number(ifd.t278?.[0]??height),predictor=Number(ifd.t317?.[0]??1),stride=width*spp;
 const src=new Uint8Array(buffer),out=new Uint8Array(stride*height);
 let at=0;for(let i=0;i<ifd.t273.length;i++){
  const lines=Math.min(rows,height-i*rows),off=Number(ifd.t273[i]),len=Number(ifd.t279[i]);
  const strip=await inflateExact(src.subarray(off,off+len),stride*lines);
  if(predictor===2)for(let y=0;y<lines;y++)for(let x=spp;x<stride;x++){const p=y*stride+x;strip[p]=(strip[p]+strip[p-spp])&255;}
  out.set(strip,at);at+=strip.length;
 }
 if(at!==out.length)throw Error('TIFFストリップが不足しています。');
 ifd.width=width;ifd.height=height;ifd.data=out;
}
