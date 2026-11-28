import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probe,epsSections,probeFile} from '../src/probe.mjs';
const t=s=>new TextEncoder().encode(s);
function psd(v=1,w=100,h=200){const b=new Uint8Array(26);b.set(t('8BPS'));const d=new DataView(b.buffer);d.setUint16(4,v);d.setUint16(12,3);d.setUint32(14,h);d.setUint32(18,w);d.setUint16(22,8);d.setUint16(24,3);return b;}
function eps(){const b=new Uint8Array(30);b.set([197,208,211,198]);const d=new DataView(b.buffer);d.setUint32(4,30,true);d.setUint32(8,40,true);d.setUint32(20,70,true);d.setUint32(24,20,true);return b;}
test('PSD dimensions and mode',()=>assert.deepEqual(probe(psd(),'cover.PSD'),{kind:'psd',route:'psd',extension:'psd',width:100,height:200,depth:8,channels:3,colorMode:3,pixels:20000}));
test('PSB header',()=>assert.equal(probe(psd(2,40000),'large.psb').kind,'psb'));
test('truncated header',()=>assert.equal(probe(t('8BPS'),'x.psd').kind,'invalid'));
test('invalid dimensions',()=>assert.equal(probe(psd(1,40000),'x.psd').kind,'invalid'));
test('AI with PDF header is only candidate',()=>assert.equal(probe(t('%PDF-1.7'),'cover.ai').kind,'ai-pdf-candidate'));
test('PDF header within prefix',()=>assert.equal(probe(t('prefix%PDF-1.7'),'x.pdf').headerOffset,6));
test('wrong extension overridden by signature',()=>assert.equal(probe(t('%PDF-1.7'),'x.jtd').route,'pdf'));
test('legacy AI PostScript',()=>assert.equal(probe(t('%!PS-Adobe-3.0'),'x.ai').kind,'ai-postscript'));
test('EPS binary header and sections',()=>{assert.equal(probe(eps(),'x.eps').kind,'eps-binary');assert.deepEqual(epsSections(eps(),90),{postscript:{offset:30,length:40},wmf:null,tiff:{offset:70,length:20}});});
test('EPS section bounds',()=>assert.throws(()=>epsSections(eps(),89),/invalid EPS section/));
test('EPS section overlap',()=>{const b=eps();new DataView(b.buffer).setUint32(20,69,true);assert.throws(()=>epsSections(b,90),/overlapping/);});
test('EPS truncated header',()=>assert.throws(()=>epsSections(eps().slice(0,20),90),/invalid EPS/));
test('EPS requires PS section',()=>{const b=eps();new DataView(b.buffer).setUint32(4,0,true);new DataView(b.buffer).setUint32(8,0,true);assert.throws(()=>epsSections(b,90),/missing/);});
test('TIFF and BigTIFF differ',()=>{assert.equal(probe(Uint8Array.of(73,73,42,0),'a.tif').route,'tiff');assert.equal(probe(Uint8Array.of(73,73,43,0),'a.tif').route,'none');});
test('CFB does not prove JTD',()=>{const b=Uint8Array.of(208,207,17,224,161,177,26,225);assert.equal(probe(b,'a.jtd').kind,'jtd-candidate');assert.equal(probe(b,'a.doc').kind,'cfb');});
test('compressed JTD candidate',()=>assert.equal(probe(t('unknown'),'a.jtdc').warning,'engine-must-validate'));
test('unknown AI does not claim rendering',()=>assert.equal(probe(t('unknown'),'a.ai').route,'none'));
test('native images',()=>{assert.equal(probe(Uint8Array.of(137,80,78,71,13,10,26,10),'a.png').kind,'png');assert.equal(probe(t('RIFF1234WEBP'),'a.webp').kind,'webp');});
test('SVG is a validated candidate',()=>{assert.deepEqual(probe(t('<svg xmlns="http://www.w3.org/2000/svg"/>'),'a.svg'),{kind:'svg',route:'svg',extension:'svg',warning:'validate-svg-safety'});assert.equal(probe(t('%PDF-1.7'),'a.svg').route,'pdf');});
test('reads bounded file prefix',async()=>{const f=new File([t('%PDF-1.7'),new Uint8Array(2000)],'x.pdf');assert.equal((await probeFile(f)).route,'pdf');});
