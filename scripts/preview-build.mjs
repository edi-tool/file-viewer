// Assemble the exact static site; do not copy experimental or stale vendor assets.
import {access,cp,mkdir,rm,writeFile,readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const required=['pdfjs/pdf.min.mjs','pdfjs/pdf.worker.min.mjs','psd.mjs','tiff.mjs','pscat/core.js','pscat/pscat.wasm','illustrator/engine.mjs','illustrator/worker.mjs','illustrator/LICENSE','illustrator/fzstd-LICENSE','illustrator/THIRD_PARTY_NOTICES.md'];
const full=process.argv.includes('--full');
if(full)required.push('jtd/ezpzjtd_wasm.js','jtd/ezpzjtd_wasm_bg.wasm','jtd/LICENSE','jtd/SOURCE_COMMIT');
for(const p of required){const s=await stat('vendor/'+p);if(!s.isFile()||!s.size)throw Error('必須描画資産がありません: '+p);}
await rm('dist-preview',{recursive:true,force:true});await mkdir('dist-preview');
for(const p of ['index.html','styles.css','src','licenses','LICENSE','NOTICE'])await cp(p,'dist-preview/'+p,{recursive:true});
await mkdir('dist-preview/vendor');
const allowed=['pdfjs','pscat','illustrator','psd.mjs','tiff.mjs','SHA256.json','ag-psd-LICENSE','utif-LICENSE','base64-js-LICENSE','pako-LICENSE',...(full?['jtd']:[])];
for(const p of allowed){try{await access('vendor/'+p);}catch{if(p.endsWith('-LICENSE'))throw Error('第三者ライセンスがありません: '+p);throw Error('配布資産がありません: '+p);}await cp('vendor/'+p,'dist-preview/vendor/'+p,{recursive:true});}
const assets={};async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else if(e.isFile())assets[p.slice('dist-preview/'.length)]=createHash('sha256').update(await readFile(p)).digest('hex');else throw Error('Unexpected asset '+p);}}await walk('dist-preview/vendor');
await writeFile('dist-preview/build-info.json',JSON.stringify({schema:1,full,commit:process.env.GITHUB_SHA||'local',assets},null,2)+'\n');
await writeFile('dist-preview/.nojekyll','');
console.log('Local preview: python3 -m http.server 8000 -d dist-preview --bind 127.0.0.1');
