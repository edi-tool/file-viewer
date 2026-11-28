import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {deflateSync,zstdCompressSync} from 'node:zlib';
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
export function makeReaderPdf(count=12){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>',''];
 const kids=[];
 for(let i=0;i<count;i++){const page=objects.length+1,stream=page+1;kids.push(page+' 0 R');const rgb=i%2?'0 0 1':'1 0 0';const content=rgb+' rg 0 0 400 600 re f\n';objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << >> /Contents ${stream} 0 R >>`,`<< /Length ${b(content).length} >>\nstream\n${content}endstream`);}
 objects[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${count} >>`;
 let s='%PDF-1.4\n';const offsets=[];objects.forEach((o,i)=>{offsets.push(b(s).length);s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=b(s).length;s+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');return b(s+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
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
export function makeColorTiff({orientation=1,cmyk=false}={}){
 const w=64,h=64,spp=cmyk?4:3,tags=11,bits=8+2+12*tags+4,pixels=bits+2*spp;
 const out=Buffer.alloc(pixels+w*h*spp);out.write('II');out.writeUInt16LE(42,2);out.writeUInt32LE(8,4);out.writeUInt16LE(tags,8);
 [[256,4,1,w],[257,4,1,h],[258,3,spp,bits],[259,3,1,1],[262,3,1,cmyk?5:2],[273,4,1,pixels],[274,3,1,orientation],[277,3,1,spp],[278,4,1,h],[279,4,1,w*h*spp],[284,3,1,1]].forEach(([tag,type,count,value],i)=>{const p=10+i*12;out.writeUInt16LE(tag,p);out.writeUInt16LE(type,p+2);out.writeUInt32LE(count,p+4);out.writeUInt32LE(value,p+8);});
 for(let i=0;i<spp;i++)out.writeUInt16LE(8,bits+2*i);
 for(let i=0;i<w*h;i++){const left=i%w<w/2;out.set(cmyk?(left?[0,255,255,0]:[255,255,0,0]):(left?[255,0,0]:[0,0,255]),pixels+i*spp);}
 return out;
}
export function makeDeflateTiff(predictor=2,overflow=false){
 const w=64,h=64,spp=3,tags=11,bits=8+2+12*tags+4,pixels=bits+2*spp,raw=Buffer.alloc(w*h*spp+(overflow?1024:0));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*spp;raw[p]=x<w/2?255:0;raw[p+2]=x<w/2?0:255;}
 if(predictor===2)for(let y=0;y<h;y++)for(let x=w*spp-1;x>=spp;x--){const p=y*w*spp+x;raw[p]=(raw[p]-raw[p-spp])&255;}
 const compressed=deflateSync(raw),out=Buffer.alloc(pixels+compressed.length);out.write('II');out.writeUInt16LE(42,2);out.writeUInt32LE(8,4);out.writeUInt16LE(tags,8);
 [[256,4,1,w],[257,4,1,h],[258,3,spp,bits],[259,3,1,8],[262,3,1,2],[273,4,1,pixels],[277,3,1,spp],[278,4,1,h],[279,4,1,compressed.length],[284,3,1,1],[317,3,1,predictor]].forEach(([tag,type,count,value],i)=>{const p=10+i*12;out.writeUInt16LE(tag,p);out.writeUInt16LE(type,p+2);out.writeUInt32LE(count,p+4);out.writeUInt32LE(value,p+8);});
 for(let i=0;i<spp;i++)out.writeUInt16LE(8,bits+2*i);compressed.copy(out,pixels);return out;
}
export function makeMultiTiff(){
 const first=makeTiff(),second=makeTiff(),shift=first.length-8;
 first.writeUInt32LE(first.length,130);
 for(const entry of [2,5]){const p=10+entry*12+8;second.writeUInt32LE(second.readUInt32LE(p)+shift,p);}
 const pixels=second.length-64*64*3;
 for(let i=pixels;i<second.length;i+=3){const red=second[i];second[i]=second[i+2];second[i+2]=red;}
 return Buffer.concat([first,second.subarray(8)]);
}
export function makeShiftedEps(x=-20,y=10){
 return b(`%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: ${x} ${y} ${x+64} ${y+64}\n%%EndComments\n1 0 0 setrgbcolor ${x} ${y} 32 64 rectfill\n0 0 1 setrgbcolor ${x+32} ${y} 32 64 rectfill\nshowpage\n%%EOF\n`);
}
export function makeHiResEps(){return b('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 65 65\n%%HiResBoundingBox: 0.5 0.5 64.5 64.5\n%%EndComments\n1 0 0 setrgbcolor 0.5 0.5 32 64 rectfill\n0 0 1 setrgbcolor 32.5 0.5 32 64 rectfill\nshowpage\n%%EOF\n');}
export function makeEps(){return b('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 64 64\n%%EndComments\n1 0 0 setrgbcolor 0 0 32 64 rectfill\n0 0 1 setrgbcolor 32 0 32 64 rectfill\nshowpage\n%%EOF\n');}
export function makeBinaryEps(){const ps=makeEps(),tiff=makeTiff(),head=Buffer.alloc(30);head.set([197,208,211,198]);head.writeUInt32LE(30,4);head.writeUInt32LE(ps.length,8);head.writeUInt32LE(30+ps.length,20);head.writeUInt32LE(tiff.length,24);head.writeUInt16LE(65535,28);return Buffer.concat([head,ps,tiff]);}
export function fixtures(){const bad=makeBinaryEps();bad.writeUInt32LE(0xffffffff,24);return {'two-colors.pdf':makePdf(),'pdf-compatible-candidate.ai':makePdf(),'composite.psd':makePsd(),'rgb.tiff':makeTiff(),'deflate.tiff':makeDeflateTiff(1),'deflate-predictor.tiff':makeDeflateTiff(2),'deflate-overflow.tiff':makeDeflateTiff(2,true),'cmyk.tiff':makeColorTiff({cmyk:true}),'oriented.tiff':makeColorTiff({orientation:2}),'two-pages.tiff':makeMultiTiff(),'shifted.eps':makeShiftedEps(),'hires.eps':makeHiResEps(),'positive-origin.eps':makeShiftedEps(100,200),'vector.eps':makeEps(),'binary-preview.eps':makeBinaryEps(),'invalid-preview.eps':bad,'wrong-extension.psd':makePdf(),'truncated.psd':b('8BPS')};}
export function writeFixtures(dir){mkdirSync(dir,{recursive:true});for(const [name,data] of Object.entries(fixtures()))writeFileSync(resolve(dir,name),data);}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)writeFixtures(resolve(process.argv[2]||'generated-fixtures'));

export function makeBmp(){
 const w=64,h=64,stride=w*3,offset=54,out=Buffer.alloc(offset+stride*h);
 out.write('BM');out.writeUInt32LE(out.length,2);out.writeUInt32LE(offset,10);out.writeUInt32LE(40,14);out.writeInt32LE(w,18);out.writeInt32LE(h,22);out.writeUInt16LE(1,26);out.writeUInt16LE(24,28);out.writeUInt32LE(stride*h,34);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=offset+y*stride+x*3;out[at]=x<w/2?0:255;out[at+2]=x<w/2?255:0;}return out;
}
export function makeNativeAi(){
 return b(['%!PS-Adobe-3.0','%%Creator: Adobe Illustrator 28.0','%%AI8_CreatorVersion: 28.0','%%BoundingBox: 0 0 200 100','%AIArtboard: Main|0 0 200 100','0 1 1 0 k','10 10 m','190 10 l','190 90 l','10 90 l','h','f','%%EOF',''].join('\n'));
}
export function makePrivateAi(algorithm='deflate'){
 const source=makeNativeAi(),privateBytes=algorithm==='zstd'?Buffer.concat([b('%AI24_ZStandard_Data\n'),zstdCompressSync(source)]):Buffer.concat([b('%AI12_CompressedData\n'),deflateSync(source)]),placeholder='BT /F1 12 Tf 10 50 Td (saved without PDF content) Tj ET\n';
 const objects=[b('<< /Type /Catalog /Pages 2 0 R /PieceInfo << /Illustrator << /Private 4 0 R >> >> >>'),b('<< /Type /Pages /Count 1 /Kids [3 0 R] >>'),b('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 8 0 R >> >> /Contents 7 0 R >>'),b('<< /NumBlock 1 /AIPrivateData1 5 0 R >>'),Buffer.concat([b(`<< /Length ${privateBytes.length} >>\nstream\n`),privateBytes,b('\nendstream')]),b('<< /Creator (Adobe Illustrator 28.0) >>'),b(`<< /Length ${b(placeholder).length} >>\nstream\n${placeholder}endstream`),b('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')];
 let chunks=[b('%PDF-1.7\n')],length=chunks[0].length;const offsets=[];for(const [i,o] of objects.entries()){offsets.push(length);const x=Buffer.concat([b(`${i+1} 0 obj\n`),o,b('\nendobj\n')]);chunks.push(x);length+=x.length;}chunks.push(b(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${length}\n%%EOF\n`));return Buffer.concat(chunks);
}

export function makePsb(){const psd=makePsd(),out=Buffer.alloc(psd.length+4);psd.copy(out,0,0,34);out.writeUInt16BE(2,4);psd.copy(out,42,38);return out;}

export function makeSvg(kind='safe'){
 const extra=kind==='external'?'<image href="https://example.com/tracker.png" x="0" y="0" width="64" height="64"/>':kind==='script'?'<script>globalThis.__svgExecuted=true</script>':'';
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${extra}<rect width="32" height="64" fill="#ff0000"/><rect x="32" width="32" height="64" fill="#0000ff"/></svg>`);
}
