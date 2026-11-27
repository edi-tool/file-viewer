// Experimental dependency: exact npm release; keep it isolated from main lock
// until the generated integrity-bearing lock is reviewed and committed.
import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
const dir='experimental/illustrator';
await mkdir(dir,{recursive:true});
await writeFile(dir+'/package.json',JSON.stringify({name:'file-viewer-ai-trial',private:true,dependencies:{'illustrator-pgf':'0.1.0'}}));
execFileSync('npm',['install','--prefix',dir,'--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});
const root=dir+'/node_modules/illustrator-pgf',pkg=JSON.parse(await readFile(root+'/package.json','utf8'));
if(pkg.version!=='0.1.0'||Object.keys(pkg.dependencies||{}).length)throw Error('Unexpected PGF package');
await mkdir('vendor/illustrator',{recursive:true});
for(const [name,contents] of [['engine',"export {createIllustratorEngine} from 'illustrator-pgf'"],['worker',"import {installIllustratorWorker} from 'illustrator-pgf/worker-runtime'; installIllustratorWorker(self);"]])await build({stdin:{contents,resolveDir:process.cwd()+'/'+dir},bundle:true,platform:'browser',format:'esm',outfile:'vendor/illustrator/'+name+'.mjs',legalComments:'eof'});
for(const p of ['LICENSE','THIRD_PARTY_NOTICES.md'])await cp(root+'/'+p,'vendor/illustrator/'+p);
const manifest={};for(const p of ['engine.mjs','worker.mjs'])manifest[p]=createHash('sha256').update(await readFile('vendor/illustrator/'+p)).digest('hex');
await writeFile('vendor/illustrator/SHA256.json',JSON.stringify(manifest,null,2)+'\n');
console.log('AI_TRIAL_LOCK '+JSON.stringify(JSON.parse(await readFile(dir+'/package-lock.json','utf8'))));
