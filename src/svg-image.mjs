/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
import {fit} from './limits.mjs';

const MAX_SVG_BYTES=5*1024*1024;
const FORBIDDEN=new Set(['script','foreignobject','animate','animatemotion','animatetransform','set']);
function abortError(){return new DOMException('処理を中止しました','AbortError');}
function decodeSvg(bytes){
  if(bytes[0]===0xff&&bytes[1]===0xfe)return new TextDecoder('utf-16le',{fatal:true}).decode(bytes);
  if(bytes[0]===0xfe&&bytes[1]===0xff)return new TextDecoder('utf-16be',{fatal:true}).decode(bytes);
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
function safeReference(value){
  const v=String(value??'').trim();
  return !v||v.startsWith('#')||/^data:/i.test(v);
}
function inspectCss(value){
  const css=String(value??'');
  if(/@import\b/i.test(css)||/@keyframes\b/i.test(css)||/(^|[;{\s])animation(?:-[\w-]+)?\s*:/i.test(css))throw Error('アニメーションや外部CSSを含むSVGは安全のため表示できません。');
  const re=/url\(\s*(['"]?)(.*?)\1\s*\)/gi;let match;
  while((match=re.exec(css)))if(!safeReference(match[2]))throw Error('外部参照を含むSVGは安全のため表示できません。');
}
function fallbackSize(root){
  const number=v=>{const m=String(v??'').trim().match(/^([0-9]+(?:\.[0-9]+)?)(?:px)?$/i);return m?Number(m[1]):0;};
  let width=number(root.getAttribute('width')),height=number(root.getAttribute('height'));
  if(width>0&&height>0)return {width,height};
  const vb=String(root.getAttribute('viewBox')??'').trim().split(/[\s,]+/).map(Number);
  if(vb.length===4&&vb.every(Number.isFinite)&&vb[2]>0&&vb[3]>0)return {width:vb[2],height:vb[3]};
  return {width:300,height:150};
}
export function sanitizeSvg(text){
  if(/<!DOCTYPE\b/i.test(text))throw Error('DOCTYPEを含むSVGは安全のため表示できません。');
  const doc=new DOMParser().parseFromString(text,'image/svg+xml');
  const root=doc.documentElement;
  if(!root||root.localName?.toLowerCase()!=='svg'||doc.querySelector('parsererror'))throw Error('SVGとして解析できません。');
  for(const el of doc.querySelectorAll('*')){
    const name=el.localName?.toLowerCase()||'';
    if(FORBIDDEN.has(name))throw Error('スクリプト・埋め込みHTML・アニメーションを含むSVGは安全のため表示できません。');
    if(name==='style')inspectCss(el.textContent);
    for(const attr of el.attributes){
      const attrName=attr.localName?.toLowerCase()||attr.name.toLowerCase();
      if(/^on/.test(attrName))throw Error('イベントスクリプトを含むSVGは安全のため表示できません。');
      if(attrName==='href'&&!safeReference(attr.value))throw Error('外部参照を含むSVGは安全のため表示できません。');
      if(attrName==='style'||/url\(/i.test(attr.value))inspectCss(attr.value);
    }
  }
  return {markup:new XMLSerializer().serializeToString(doc),fallback:fallbackSize(root)};
}
async function loadImage(markup,signal,timeoutMs){
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),img=new Image();
  try{
    await new Promise((resolve,reject)=>{
      let done=false;
      const finish=error=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);img.onload=img.onerror=null;error?reject(error):resolve();};
      const abort=()=>{img.src='';finish(abortError());};
      const timer=setTimeout(()=>finish(Error('SVGの読み込み時間の上限を超えました。')),timeoutMs);
      signal.addEventListener('abort',abort,{once:true});
      img.onload=()=>finish();img.onerror=()=>finish(Error('SVG画像を読み込めません。'));
      if(signal.aborted)abort();else img.src=url;
    });
    signal.throwIfAborted();
    return {url,img};
  }catch(e){URL.revokeObjectURL(url);throw e;}
}
export async function openSvg(file,{signal,limits}){
  if(file.size>MAX_SVG_BYTES)throw Error('SVG表示は5 MiBまでです。');
  const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();
  let parsed;try{parsed=sanitizeSvg(decodeSvg(bytes));}catch(e){if(e instanceof TypeError)throw Error('UTF-8/UTF-16のSVGとして読めません。');throw e;}
  const loaded=await loadImage(parsed.markup,signal,limits.timeoutMs);
  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;loaded.img.src='';URL.revokeObjectURL(loaded.url);};
  signal.addEventListener('abort',dispose,{once:true});
  const width=loaded.img.naturalWidth||parsed.fallback.width,height=loaded.img.naturalHeight||parsed.fallback.height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0){dispose();throw Error('SVGの表示寸法が不正です。');}
  return {mode:'SVG静的画像',scalable:true,pageCount:1,warnings:['SVGは画像として静的表示します。スクリプト・埋め込みHTML・アニメーション・外部参照を含むファイルは拒否します。色管理やフォントの完全再現は保証しません。'],dispose,async renderPage(_,{scale,signal}){
    signal.throwIfAborted();if(disposed)throw Error('SVGは既に閉じられています。');
    const target=fit(width,height,scale,limits),canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height;
    try{canvas.getContext('2d').drawImage(loaded.img,0,0,target.width,target.height);signal.throwIfAborted();return {element:canvas,dispose(){canvas.width=canvas.height=0;canvas.remove();}};}
    catch(e){canvas.width=canvas.height=0;throw e;}
  }};
}
