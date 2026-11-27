import {dimensions} from './limits.mjs';
import {epsSections} from './probe.mjs';
import {epsBoundingBox} from './eps.mjs';
function classic(url){return import(url);}
async function psDecode(buffer,limits){
 const {width,height}=epsBoundingBox(buffer,limits);
 const {Pscat}=await import('../vendor/pscat/core.js');
 const ps=await Pscat.load();ps.maxSteps=2_000_000;
 const status=ps.run(new Uint8Array(buffer),width,height);
 if(status!==0||ps.error)throw new Error('PostScriptの描画に失敗、または実行上限に達しました。');
 if(ps.pageCount()!==1)throw new Error('複数ページのPostScriptは未対応です。');
 const pixels=ps.pixels();if(ps.width!==width||ps.height!==height||pixels.length!==width*height*4)throw new Error('PostScriptの出力が不正です。');
 return {width,height,rgba:pixels.buffer,mode:'PostScript再描画（試験実装）',warnings:['原点0のEPSのみ。フォント・色・効果の完全再現は保証しません。',...(ps.warnings.length?['フォントの代替が発生しました。']:[])]};
}
async function decode({buffer,probe,limits}){
 if(probe.route==='eps'&&probe.kind!=='eps-binary')return psDecode(buffer,limits);
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
  const doc=JtdDocument.withLimits(new Uint8Array(buffer),JSON.stringify({maxBytes:limits.maxBytes,maxTextUnits:2_000_000,maxPages:limits.maxPages,maxSheets:100,maxExpand:4}));try{const text=doc.text();if(text.length>2_000_000)throw new Error('本文が表示上限を超えています。');return {text};}finally{doc.free();}
 }
 throw new Error('未対応形式です。');
}
self.onmessage=async({data})=>{try{const r=await decode(data);self.postMessage(r,r.rgba?[r.rgba]:[]);}catch(e){self.postMessage({error:e instanceof TypeError?'描画ライブラリが準備されていないか、読み込みに失敗しました。':String(e?.message||'描画失敗').slice(0,160)});}};
