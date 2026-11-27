import {dimensions} from './limits.mjs';
import {epsSections} from './probe.mjs';
function classic(url){return import(url);}
async function decode({buffer,probe,limits}){
 if(probe.route==='psd'){
  dimensions(probe.width,probe.height,limits);
  const {readPsd,initializeCanvas}=await classic('../vendor/psd.mjs');
  initializeCanvas((w,h)=>{dimensions(w,h,limits);return new OffscreenCanvas(w,h);});
  const psd=readPsd(buffer,{skipLayerImageData:true,skipThumbnail:true,skipLinkedFilesData:true,totalMemoryLimit:limits.maxPixels*16});
  if(!psd.canvas)throw new Error('保存済み合成画像がありません。');
  const canvas=psd.canvas,{width,height}=dimensions(canvas.width,canvas.height,limits);
  const rgba=canvas.getContext('2d').getImageData(0,0,width,height).data;
  return {width,height,rgba:rgba.buffer,warnings:['保存済み合成画像のみ。CMYKは近似、ICC色管理は保証しません。']};
 }
 if(probe.route==='tiff'||probe.route==='eps'){
  let bytes=buffer;
  if(probe.route==='eps'){if(probe.kind!=='eps-binary')throw new Error('PostScript本体の描画は未実装です。TIFFプレビュー付きEPSのみ対応。');const s=epsSections(new Uint8Array(buffer));if(!s.tiff)throw new Error('埋め込みTIFFプレビューがありません。');bytes=buffer.slice(s.tiff.offset,s.tiff.offset+s.tiff.length);}
  const {default:UTIF}=await classic('../vendor/tiff.mjs');
  const ifds=UTIF.decode(bytes);if(!ifds.length)throw new Error('TIFFページがありません。');
  const ifd=ifds[0];const {width,height}=dimensions(Number(ifd.t256?.[0]),Number(ifd.t257?.[0]),limits);
  const samples=Number(ifd.t277?.[0]??1),bits=ifd.t258||[1];
  if(!Number.isInteger(samples)||samples<1||samples>4||bits.some(x=>![1,2,4,8,16].includes(Number(x))))throw new Error('未対応のTIFFサンプル形式です。');
  UTIF.decodeImage(bytes,ifd);const rgba=UTIF.toRGBA8(ifd);
  if(rgba.byteLength!==width*height*4)throw new Error('TIFF寸法が一致しません。');
  return {width,height,rgba:rgba.buffer.slice(rgba.byteOffset,rgba.byteOffset+rgba.byteLength),warnings:[probe.route==='eps'?'埋め込み画像のみ。PostScript本体は未描画。':'先頭ページのみ表示。印刷色の確認には使えません。']};
 }
 if(probe.route==='jtd'){
  const {default:init,JtdDocument}=await import('../vendor/jtd/ezpzjtd_wasm.js');await init();
  const doc=new JtdDocument(new Uint8Array(buffer));try{const text=doc.text();if(text.length>2_000_000)throw new Error('本文が表示上限を超えています。');return {text};}finally{doc.free();}
 }
 throw new Error('未対応形式です。');
}
self.onmessage=async({data})=>{try{const r=await decode(data);self.postMessage(r,r.rgba?[r.rgba]:[]);}catch(e){self.postMessage({error:e instanceof TypeError?'描画ライブラリが準備されていないか、読み込みに失敗しました。':String(e?.message||'描画失敗').slice(0,160)});}};
