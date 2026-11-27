// Build a local preview, NOT a production deployment. Run vendor builds first.
import {access,cp,mkdir,rm,writeFile} from 'node:fs/promises';
const required=['vendor/pdfjs/pdf.min.mjs','vendor/pdfjs/pdf.worker.min.mjs','vendor/psd.mjs','vendor/tiff.mjs','vendor/pscat/core.js','vendor/pscat/pscat.wasm'];
for(const p of required)await access(p);
await rm('dist-preview',{recursive:true,force:true});await mkdir('dist-preview');
for(const p of ['index.html','styles.css','src','vendor','licenses'])await cp(p,'dist-preview/'+p,{recursive:true});
await writeFile('dist-preview/.nojekyll','');
console.log('Local preview: python3 -m http.server 8000 -d dist-preview --bind 127.0.0.1');
