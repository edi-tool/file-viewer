import {dimensions,fit} from './limits.mjs';
import {epsSections} from './probe.mjs';
import {epsBoundingBox,translateEps} from './eps.mjs';
import {guardTiff} from './tiff-guard.mjs';
import {renderJtdPage} from './jtd-page.mjs';
function classic(url){return import(url);}
async function psDecode(buffer,limits,scale=1){
 const box=epsBoundingBox(buffer,limits),{width,height}=box;
 const {Pscat}=await import('../vendor/pscat/core.js');
 const ps=await Pscat.load();ps.maxSteps=2_000_000;
 const target=fit(width,height,scale,limits),factor=Math.min(target.width/width,target.height/height);
 const status=ps.run(translateEps(buffer,box),width,height,factor);
 if(status!==0||ps.error)throw new Error('PostScriptの描画に失敗、または実行上限に達しました。');
 if(ps.pageCount()!==1)throw new Error('複数ページのPostScriptは未対応です。');
 const pixels=ps.pixels();dimensions(ps.width,ps.height,limits);if(pixels.length!==ps.width*ps.height*4)throw new Error('PostScriptの出力が不正です。');
 return {width:ps.width,height:ps.height,rgba:pixels.buffer,mode:'PostScript再描画（試験実装）',warnings:['BoundingBoxに基づく近似描画。座標系を初期化するEPS、フォント・色・効果の完全再現は保証しません。',...(ps.warnings.length?['フォントの代替が発生しました。']:[])]};
}
async function decode({buffer,probe,limits,pageIndex=0,scale=1}){
 if(probe.route==='eps'&&probe.kind!=='eps-binary')return psDecode(buffer,limits,scale);
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
  if(probe.route==='eps'){if(probe.kind!=='eps-binary')throw new Error('PostScript本体の描画は未実装です。TIFFプレビュー付きEPSのみ対応。');const s=epsSections(new Uint8Array(buffer));if(!s.tiff)return psDecode(buffer.slice(s.postscript.offset,s.postscript.offset+s.postscript.length),limits,scale);bytes=buffer.slice(s.tiff.offset,s.tiff.offset+s.tiff.length);}
  const checked=guardTiff(bytes,limits);
  const {default:UTIF}=await classic('../vendor/tiff.mjs');
  const ifds=UTIF.decode(bytes,{parseMN:false,debug:false});if(!ifds.length)throw new Error('TIFFページがありません。');
  if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=checked.pageCount||!ifds[pageIndex])throw Error('TIFFページがありません。');
  const ifd=ifds[pageIndex];const {width,height}=dimensions(Number(ifd.t256?.[0]),Number(ifd.t257?.[0]),limits);
  const samples=Number(ifd.t277?.[0]??1),bits=ifd.t258||[1];
  if(!Number.isInteger(samples)||samples<1||samples>4||bits.some(x=>![1,2,4,8,16].includes(Number(x))))throw new Error('未対応のTIFFサンプル形式です。');
  UTIF.decodeImage(bytes,ifd);const rgba=UTIF.toRGBA8(ifd);
  if(rgba.byteLength!==width*height*4)throw new Error('TIFF寸法が一致しません。');
  return {width,height,pageCount:probe.route==='eps'?1:checked.pageCount,rgba:rgba.buffer.slice(rgba.byteOffset,rgba.byteOffset+rgba.byteLength),warnings:[probe.route==='eps'?'埋め込み画像のみ。PostScript本体は未描画。':'印刷色の確認には使えません。']};
 }
 if(probe.route==='jtd'){
  const {default:init,JtdDocument,JtdEditor}=await import('../vendor/jtd/ezpzjtd_wasm.js');await init();
  const options=JSON.stringify({maxBytes:limits.maxBytes,maxTextUnits:2_000_000,maxPages:limits.maxPages,maxSheets:64,maxExpand:4,maxStyleEntries:500_000});
  const bytes=new Uint8Array(buffer);let text,sheets=1;
  if(pageIndex===0){const doc=JtdDocument.withLimits(bytes,options);try{sheets=doc.sheetCount();text=doc.text();if(text.length>2_000_000)throw Error('本文が表示上限を超えています。');}finally{doc.free();}}
  let editor;
  try{
   editor=JtdEditor.openWith(bytes,options);
   const pageCount=editor.pageCount();
   if(!Number.isInteger(pageCount)||pageCount<1||pageCount>limits.maxPages||pageIndex>=pageCount)throw Error('一太郎のページ数が不正です。');
   const result=await renderJtdPage(editor,pageIndex,limits,scale);
   const status=JSON.parse(editor.statusJson());if(status.truncated)result.warnings.push('ページ数の上限に達したため、後続ページは表示されません。');if(sheets>1)result.warnings.push('ページ描画は先頭シートのみ。本文テキストには他のシートが含まれる場合があります。');return {...result,pageCount,text,mode:'一太郎のページ描画（近似）'};
  }catch(e){if(pageIndex===0&&typeof text==='string')return {text,pageCount:1,warnings:['レイアウトを描画できないため、本文のみ表示します。']};throw e;}finally{editor?.free();}
 }
 throw new Error('未対応形式です。');
}
self.onmessage=async({data})=>{try{const r=await decode(data);self.postMessage(r,r.rgba?[r.rgba]:[]);}catch(e){self.postMessage({error:e instanceof TypeError?'描画ライブラリが準備されていないか、読み込みに失敗しました。':String(e?.message||'描画失敗').slice(0,160)});}};
