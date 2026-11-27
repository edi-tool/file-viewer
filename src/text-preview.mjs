// Text only. No HTML interpretation, spreadsheet formulas, or scripts.
export async function openText(file,{signal}){
 if(file.size>2*1024*1024)throw Error('テキスト表示は2 MiBまでです。');
 const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{try{text=new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}catch{throw Error('UTF-8/Shift_JISのテキストとして読めません。');}}
 if(/\u0000/.test(text))throw Error('バイナリデータはテキストとして表示できません。');
 return {mode:'テキスト表示',pageCount:1,warnings:['書式・表組みは再現しません。UTF-8を優先し、失敗時はShift_JISで読み込みます。'],dispose(){text='';},async renderPage(_,{signal}){signal.throwIfAborted();const element=document.createElement('pre');element.textContent=text;return {element,dispose(){element.textContent='';element.remove();}};}};
}
