import {probeFile} from './probe.mjs';
import {createSessionManager} from './session.mjs';
import {adapterFor} from './renderers.mjs';
import {LIMITS,sizeCheck} from './limits.mjs';
const $=id=>document.getElementById(id),m=createSessionManager();let files=[],selected=-1,doc=null,frame=null,index=0,revision=0,drawId=0;
function status(s,error=false){$('status').textContent=s;$('status').dataset.error=String(error);}
function clearFrame(){frame?.dispose();frame=null;$('preview').replaceChildren();}
function controls(){const active=Boolean(doc);$('prev').disabled=!active||index===0;$('next').disabled=!active||index>=doc.pageCount-1;$('zoom').disabled=!active;$('page').textContent=active?`${index+1} / ${doc.pageCount}`:'—';$('clear').disabled=!files.length;}
function list(){const ul=$('files');ul.replaceChildren();files.forEach((f,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=f.name;b.setAttribute('aria-pressed',String(i===selected));b.addEventListener('click',()=>open(i));li.append(b);ul.append(li);});controls();}
async function draw(){const my=++drawId,g=revision;if(!doc)return;clearFrame();controls();status('描画中…');try{const next=await m.renderPage(index,Number($('zoom').value));if(g!==revision||my!==drawId){next.dispose();return;}frame=next;$('preview').replaceChildren(frame.element);status(doc.mode);}catch(e){if(g===revision&&my===drawId&&e.name!=='AbortError')status(e.message,true);}}
async function open(i){const g=++revision;++drawId;m.close();doc=null;clearFrame();selected=i;index=0;$('zoom').value='1';$('filename').textContent=files[i].name;$('warning').textContent='';list();status('読み込み中…');try{const f=files[i];sizeCheck(f);const p=await probeFile(f);if(g!==revision)return;const d=await m.open(adapterFor(p),f,LIMITS);if(g!==revision)return;doc=d;$('warning').textContent=(d.warnings||[]).join(' ');if(p.route==='pdf'&&!['pdf','ai'].includes(p.extension))$('warning').textContent+=' 拡張子とファイル内容が異なります。';await draw();}catch(e){if(g===revision&&e.name!=='AbortError')status(e.message,true);}finally{if(g===revision)controls();}}
function add(items){const incoming=Array.from(items).slice(0,Math.max(0,50-files.length));if(!incoming.length)return;const start=files.length;files.push(...incoming);list();void open(start);}
$('pick').addEventListener('change',e=>{add(e.target.files);e.target.value='';});
const drop=$('drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag');});drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');add(e.dataTransfer.files);});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
$('prev').onclick=()=>{if(index>0){index--;void draw();}};$('next').onclick=()=>{if(doc&&index+1<doc.pageCount){index++;void draw();}};$('zoom').onchange=()=>void draw();
$('clear').onclick=()=>{revision++;drawId++;m.close();doc=null;files=[];selected=-1;clearFrame();$('filename').textContent='ファイル未選択';$('warning').textContent='';list();status('ファイルを選択してください。');};window.addEventListener('pagehide',()=>{m.close();clearFrame();});list();
