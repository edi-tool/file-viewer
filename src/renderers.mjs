import {LIMITS,fit,dimensions,pageCheck} from './limits.mjs';
import {imageDimensions} from './image-header.mjs';
import {createPageCache} from './page-cache.mjs';
const modes={pdf:'PDF描画',ai:'PDF互換候補（作品データか要確認）',psd:'保存済み合成画像',tiff:'TIFF画像',eps:'埋め込みTIFFプレビュー',image:'画像表示',jtd:'本文のみ（レイアウト未再現）'};
function canvasFrame(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;try{draw(canvas.getContext('2d'));return {element:canvas,dispose(){canvas.width=canvas.height=0;canvas.remove();}};}catch(e){canvas.width=canvas.height=0;throw e;}}
function abortError(){return new DOMException('処理を中止しました','AbortError');}
async function imageOpen(file,kind,{signal,limits}){const bytes=new Uint8Array(await file.arrayBuffer());const mime={png:'image/png',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[kind];imageDimensions(bytes,kind,limits);signal.throwIfAborted();const bitmap=await createImageBitmap(new Blob([bytes],{type:mime}));try{signal.throwIfAborted();dimensions(bitmap.width,bitmap.height,limits);}catch(e){bitmap.close();throw e;}
 return {mode:modes.image,pageCount:1,warnings:['アニメーションは静止画として表示される場合があります。'],dispose(){bitmap.close();},async renderPage(_,{scale,signal}){signal.throwIfAborted();const {width,height}=fit(bitmap.width,bitmap.height,scale,limits);return canvasFrame(width,height,ctx=>ctx.drawImage(bitmap,0,0,width,height));}};
}
let pdfLib;
async function pdfOpen(file,kind,{signal,limits}){
 const base=new URL('../vendor/pdfjs/',import.meta.url);
 try{pdfLib??=await import(new URL('pdf.min.mjs',base).href);}catch{throw new Error('PDF描画ライブラリが準備されていません。');}
 signal.throwIfAborted();pdfLib.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',base).href;
 const data=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();
 const task=pdfLib.getDocument({data,cMapUrl:new URL('cmaps/',base).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',base).href,wasmUrl:new URL('wasm/',base).href,iccUrl:new URL('iccs/',base).href,isEvalSupported:false,enableXfa:false,stopAtErrors:true,maxImageSize:limits.maxPixels,canvasMaxAreaInBytes:limits.maxPixels*4,useWorkerFetch:true});
 let destroyed=false;const dispose=()=>{if(!destroyed){destroyed=true;void task.destroy().catch(()=>{});}};const cancel=()=>dispose();signal.addEventListener('abort',cancel,{once:true});let expired=false;const timer=setTimeout(()=>{expired=true;dispose();},limits.timeoutMs);let encrypted=false;task.onPassword=()=>{encrypted=true;dispose();};
 try{
  if(signal.aborted)dispose();
  const doc=await task.promise;signal.throwIfAborted();pageCheck(doc.numPages,limits);
  if(kind==='ai-pdf-candidate'){
   const p=await doc.getPage(1);const t=await p.getTextContent();const s=t.items.map(x=>x.str||'').join(' ');
   if(/saved without pdf content|without pdf content|create pdf compatible file|PDF互換ファイルを作成/i.test(s))throw new Error('PDF互換データがなく、案内ページのみのAIです。');
  }
  return {scalable:true,mode:kind==='ai-pdf-candidate'?modes.ai:modes.pdf,pageCount:doc.numPages,warnings:['画面用RGB表示です。AIはPDF部分のみ。非互換案内の検出は完全ではありません。'],dispose,async renderPage(index,{scale,signal}){
   const page=await doc.getPage(index+1);signal.throwIfAborted();const vp=page.getViewport({scale:1});const {width,height}=fit(vp.width,vp.height,scale,limits);
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const viewport=page.getViewport({scale:width/vp.width});
   let rendering,expired=false;const abort=()=>rendering?.cancel();const timer=setTimeout(()=>{expired=true;abort();},limits.timeoutMs);signal.addEventListener('abort',abort,{once:true});
   try{rendering=page.render({canvas,canvasContext:canvas.getContext('2d'),viewport,annotationMode:pdfLib.AnnotationMode.DISABLE,background:'#fff'});if(signal.aborted)rendering.cancel();await rendering.promise;signal.throwIfAborted();return {element:canvas,dispose(){canvas.width=canvas.height=0;canvas.remove();}};}catch(e){canvas.width=canvas.height=0;if(expired)throw new Error('PDF描画時間の上限を超えました。');throw e;}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);page.cleanup();}
  }};
 }catch(e){dispose();if(encrypted)throw new Error('パスワード付きPDFは未対応です。');if(expired)throw new Error('PDFの読み込み時間の上限を超えました。');throw e;}finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}
function workerCall(file,probe,signal,limits,pageIndex=0,scale=1){
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(abortError());return;}
  const worker=new Worker(new URL('./decode-worker.mjs',import.meta.url),{type:'module'});let done=false;
  const end=(error,result)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();signal.removeEventListener('abort',cancel);error?reject(error):resolve(result);};
  const cancel=()=>end(abortError());const timer=setTimeout(()=>end(new Error('処理時間の上限を超えました。')),limits.timeoutMs);
  signal.addEventListener('abort',cancel,{once:true});
  worker.onerror=()=>end(new Error('描画Workerを起動できません。'));
  worker.onmessage=({data})=>data.error?end(new Error(data.error)):end(null,data);
  file.arrayBuffer().then(buffer=>{if(!done)worker.postMessage({buffer,probe,limits,pageIndex,scale},[buffer]);},e=>end(e));
 });
}
async function workerOpen(file,probe,{signal,limits}){
 let first=await workerCall(file,probe,signal,limits);signal.throwIfAborted();
 if(!first.rgba&&typeof first.text==='string'){let text=first.text;return {mode:modes.jtd,pageCount:1,warnings:first.warnings||['書式・図版は表示しません。'],dispose(){text='';first=null;},async renderPage(_,{signal}){signal.throwIfAborted();const element=document.createElement('pre');element.textContent=text;return {element,dispose(){element.textContent='';element.remove();}};}};}
 const mode=first.mode||modes[probe.route],pageCount=pageCheck(first.pageCount??1,limits),warnings=first.warnings||[];
 let text=first.text;delete first.text;
 const scalable=probe.route==='jtd'||mode.startsWith('PostScript再描画');
 const cache=createPageCache();
 return {scalable,mode,pageCount,warnings,dispose(){first=null;text=undefined;cache.clear();},async renderPage(index,{scale,signal}){
  signal.throwIfAborted();
  const isJtd=probe.route==='jtd';
  const workerScale=scalable?scale:1,key=index+':'+workerScale;
  let result=cache.get(key);if(!result){if(index===0&&first&&workerScale===1){result=first;if(pageCount>1)first=null;}else result=await workerCall(file,probe,signal,limits,index,workerScale);signal.throwIfAborted();if(pageCount>1&&workerScale===1&&result.rgba){delete result.text;cache.put(key,result);}}
  signal.throwIfAborted();
  if(!result.rgba)throw Error('ページを描画できません。');
  const {width,height}=dimensions(result.width,result.height,limits),rgba=new Uint8ClampedArray(result.rgba);
  if(rgba.length!==width*height*4)throw Error('描画結果が不正です。');
  const src=document.createElement('canvas');src.width=width;src.height=height;src.getContext('2d').putImageData(new ImageData(rgba,width,height),0,0);
  let frame;
  try{const d=scalable?{width,height}:fit(width,height,scale,limits);frame=canvasFrame(d.width,d.height,ctx=>ctx.drawImage(src,0,0,d.width,d.height));}finally{src.width=src.height=0;}
  if(!isJtd||typeof text!=='string')return frame;
  const element=document.createElement('div'),details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
  summary.textContent='文書全体の本文テキスト';pre.textContent=text;details.append(summary,pre);element.append(frame.element,details);
  return {element,dispose(){frame.dispose();pre.textContent='';element.remove();}};
 }};
}
export function adapterFor(probe){return {open(file,opts){const o={...opts,limits:opts.limits||LIMITS};if(probe.route==='image')return imageOpen(file,probe.kind,o);if(probe.route==='pdf')return pdfOpen(file,probe.kind,o);if(['psd','tiff','eps','jtd'].includes(probe.route))return workerOpen(file,probe,o);throw new Error('この形式は未対応、または破損しています。');}};}
