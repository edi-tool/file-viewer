import {fit,dimensions,pageCheck} from './limits.mjs';
// Experimental PGF path. Keep PDF-compatible rendering as the default.
async function engineFor(limits){
 let sdk;try{sdk=await import('../vendor/illustrator/engine.mjs');}catch{throw Error('Illustratorネイティブ描画資産の読み込みに失敗しました。配布版のビルド・更新状態をご確認ください。PDF互換AIの場合はPDF優先を選択してください。');}
 return sdk.createIllustratorEngine({workerFactory:()=>new Worker(new URL('../vendor/illustrator/worker.mjs',import.meta.url),{type:'module'}),defaultTimeoutMs:limits.timeoutMs,limits:{maxFileBytes:limits.maxBytes,maxDecodedBytes:32*1024*1024,maxPdfObjects:50000,maxPrivateBlocks:2048,maxTokens:300000,maxStatements:100000,maxNodes:50000,maxPathPoints:200000,maxNesting:64,maxStringBytes:2*1024*1024,maxSingleRasterPixels:limits.maxPixels,maxTotalRasterBytes:32*1024*1024,maxWorkerTimeMs:limits.timeoutMs,maxRenderPixels:limits.maxPixels,maxCacheBytes:8*1024*1024}});
}
async function withDocument(file,signal,limits,fn){
 signal.throwIfAborted();const engine=await engineFor(limits);let doc;
 const stop=()=>engine.dispose();signal.addEventListener('abort',stop,{once:true});try{
 signal.throwIfAborted();doc=await engine.open(file,{signal});signal.throwIfAborted();return await fn(doc);
 }finally{signal.removeEventListener('abort',stop);doc?.dispose();engine.dispose();}
}
export async function openNativeAi(file,{signal,limits}){
 const meta=await withDocument(file,signal,limits,async doc=>{
 const summary=await doc.getSummary(),boards=await doc.getArtboards();
 if(!boards.length||summary.nodes<1||summary.fidelity==='structure-only'||summary.fidelity==='unsupported')throw Error('表示できるIllustrator原生図形がありません。');
 return {boards:boards.map(b=>({id:b.id,bounds:b.bounds})),fidelity:summary.fidelity};
 });
 const pageCount=pageCheck(meta.boards.length,limits);
 return {mode:'Illustrator原生PGFの近似描画（試験）',scalable:true,pageCount,warnings:['PDFではなく原生データからの近似描画です。未対応の効果・文字・外部リンク画像・色管理は完全再現できません。精度区分: '+meta.fidelity],dispose(){},async renderPage(index,{scale,signal}){
 const board=meta.boards[index],b=board.bounds,w=b.right-b.left,h=b.top-b.bottom,target=fit(w,h,scale,limits);
 const bitmap=await withDocument(file,signal,limits,doc=>doc.renderToBitmap({artboardId:board.id,width:target.width,height:target.height,dpr:1,maxPixels:limits.maxPixels,background:'#ffffff',signal}));
 let canvas;try{signal.throwIfAborted();dimensions(bitmap.width,bitmap.height,limits);canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);return {element:canvas,dispose(){canvas.width=canvas.height=0;canvas.remove();}};}catch(e){if(canvas)canvas.width=canvas.height=0;throw e;}finally{bitmap.close();}
 }};
}
