// Build-time only. No runtime CDN. Install exact dependencies first.
import {mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
await mkdir('vendor/pdfjs',{recursive:true});
for(const p of ['legacy/build/pdf.min.mjs','legacy/build/pdf.worker.min.mjs','cmaps','standard_fonts','iccs','wasm','LICENSE']){
 await cp('node_modules/pdfjs-dist/'+p,'vendor/pdfjs/'+p.split('/').at(-1),{recursive:true});
}
await build({stdin:{contents:"export {readPsd,initializeCanvas} from 'ag-psd';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',outfile:'vendor/psd.mjs',legalComments:'eof'});
await build({stdin:{contents:"export {default} from 'utif';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',outfile:'vendor/tiff.mjs',legalComments:'eof'});
for(const name of ['ag-psd','utif','base64-js','pako']){const pkg=JSON.parse(await readFile('node_modules/'+name+'/package.json','utf8'));const path='node_modules/'+name+'/LICENSE';try{await cp(path,'vendor/'+name+'-LICENSE');}catch{try{await cp(path+'.md','vendor/'+name+'-LICENSE');}catch{console.warn('Review license manually:',name);}}console.log(name,pkg.version,pkg.license);}
const manifest={};for(const p of ['pdfjs/pdf.min.mjs','pdfjs/pdf.worker.min.mjs','psd.mjs','tiff.mjs'])manifest[p]=createHash('sha256').update(await readFile('vendor/'+p)).digest('hex');
await writeFile('vendor/SHA256.json',JSON.stringify(manifest,null,2)+'\n');

await mkdir('vendor/pscat',{recursive:true});
for(const p of ['core.js','pscat.wasm','LICENSE-MIT','LICENSE-APACHE','LICENSE-OFL','fonts/LICENSE','THIRD_PARTY_NOTICES.md','THIRD_PARTY_LICENSES.html']){const dest='vendor/pscat/'+p;await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});await cp('node_modules/pscat/'+p,dest);}
for(const p of ['pscat/core.js','pscat/pscat.wasm'])manifest[p]=createHash('sha256').update(await readFile('vendor/'+p)).digest('hex');
await writeFile('vendor/SHA256.json',JSON.stringify(manifest,null,2)+'\n');

await import('./vendor-ai.mjs');
