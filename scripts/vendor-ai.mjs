// Build-time only, exact version and integrity pinned by root package-lock.json.
import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root='node_modules/illustrator-pgf',pkg=JSON.parse(await readFile(root+'/package.json','utf8'));
if(pkg.version!=='0.1.0'||Object.keys(pkg.dependencies||{}).length)throw Error('Unexpected PGF package');
await mkdir('vendor/illustrator',{recursive:true});
for(const [name,contents] of [['engine',"export {createIllustratorEngine} from 'illustrator-pgf'"],['worker',"import {installIllustratorWorker} from 'illustrator-pgf/worker-runtime'; import {Decompress} from 'fzstd'; import {decodeZstd} from './src/zstd-frame.mjs'; installIllustratorWorker(self,{zstdDecoder:(bytes,max,signal)=>decodeZstd(bytes,max,signal,Decompress)});"]])await build({stdin:{contents,resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',outfile:'vendor/illustrator/'+name+'.mjs',legalComments:'eof'});
for(const p of ['LICENSE','THIRD_PARTY_NOTICES.md'])await cp(root+'/'+p,'vendor/illustrator/'+p);
await cp('node_modules/fzstd/LICENSE','vendor/illustrator/fzstd-LICENSE');
const manifest={};for(const p of ['engine.mjs','worker.mjs'])manifest[p]=createHash('sha256').update(await readFile('vendor/illustrator/'+p)).digest('hex');
await writeFile('vendor/illustrator/SHA256.json',JSON.stringify(manifest,null,2)+'\n');
