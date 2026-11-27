import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const b = s => Buffer.from(s, 'ascii');
// All fixtures are generated, no third-party artwork or real documents.
export function makePdf() {
  const stream = '1 0 0 rg 0 0 32 64 re f\n0 0 1 rg 32 0 32 64 re f\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 64 64] /Resources << >> /Contents 4 0 R >>',`<< /Length ${b(stream).length} >>\nstream\n${stream}endstream`];
  let s = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((o,i)=>{offsets.push(b(s).length);s+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=b(s).length;
  s+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
  return b(s+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
export function makePsd() {
  const w=64,h=64,n=w*h, out=Buffer.alloc(40+3*n);
  out.write('8BPS');out.writeUInt16BE(1,4);out.writeUInt16BE(3,12);out.writeUInt32BE(h,14);out.writeUInt32BE(w,18);out.writeUInt16BE(8,22);out.writeUInt16BE(3,24);
  // Three empty sections and compression 0; planar RGB composite follows.
  for(let i=0;i<n;i++){const left=i%w<w/2;out[40+i]=left?255:0;out[40+2*n+i]=left?0:255;}
  return out;
}
export function makeTiff() {
  const w=64,h=64,n=w*h, tags=10, bits=8+2+12*tags+4, pixels=bits+6;
  const out=Buffer.alloc(pixels+3*n);out.write('II');out.writeUInt16LE(42,2);out.writeUInt32LE(8,4);out.writeUInt16LE(tags,8);
  [[256,4,1,w],[257,4,1,h],[258,3,3,bits],[259,3,1,1],[262,3,1,2],[273,4,1,pixels],[277,3,1,3],[278,4,1,h],[279,4,1,3*n],[284,3,1,1]].forEach(([tag,type,count,value],i)=>{const p=10+i*12;out.writeUInt16LE(tag,p);out.writeUInt16LE(type,p+2);out.writeUInt32LE(count,p+4);out.writeUInt32LE(value,p+8);});
  for(let i=0;i<3;i++)out.writeUInt16LE(8,bits+2*i);
  for(let i=0;i<n;i++){const left=i%w<w/2;out[pixels+3*i]=left?255:0;out[pixels+3*i+2]=left?0:255;}
  return out;
}
export function makeEps(){return b('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 64 64\n%%EndComments\n1 0 0 setrgbcolor 0 0 32 64 rectfill\n0 0 1 setrgbcolor 32 0 32 64 rectfill\nshowpage\n%%EOF\n');}
export function makeBinaryEps(){const ps=makeEps(),tiff=makeTiff(),head=Buffer.alloc(30);head.set([197,208,211,198]);head.writeUInt32LE(30,4);head.writeUInt32LE(ps.length,8);head.writeUInt32LE(30+ps.length,20);head.writeUInt32LE(tiff.length,24);head.writeUInt16LE(65535,28);return Buffer.concat([head,ps,tiff]);}
export function fixtures(){const bad=makeBinaryEps();bad.writeUInt32LE(0xffffffff,24);return {'two-colors.pdf':makePdf(),'pdf-compatible-candidate.ai':makePdf(),'composite.psd':makePsd(),'rgb.tiff':makeTiff(),'vector.eps':makeEps(),'binary-preview.eps':makeBinaryEps(),'invalid-preview.eps':bad,'wrong-extension.psd':makePdf(),'truncated.psd':b('8BPS')};}
export function writeFixtures(dir){mkdirSync(dir,{recursive:true});for(const [name,data] of Object.entries(fixtures()))writeFileSync(resolve(dir,name),data);}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)writeFixtures(resolve(process.argv[2]||'generated-fixtures'));
