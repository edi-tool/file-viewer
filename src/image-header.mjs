/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
import {dimensions} from './limits.mjs';
export function imageDimensions(b,kind,limits){
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength),n=b.length;
 let w,h;
 if(kind==='png'&&n>=24){w=d.getUint32(16);h=d.getUint32(20);}
 else if(kind==='bmp'&&n>=54){const header=d.getUint32(14,true),offset=d.getUint32(10,true),height=d.getInt32(22,true),bits=d.getUint16(28,true);w=d.getInt32(18,true);h=Math.abs(height);if(header<40||header>n-14||offset<14+header||d.getUint16(26,true)!==1||![24,32].includes(bits)||d.getUint32(30,true)!==0||w<1||h<1||offset+Math.ceil(w*bits/32)*4*h>n)throw Error('未対応または不正なBMPです。');}
 else if(kind==='gif'&&n>=10){w=d.getUint16(6,true);h=d.getUint16(8,true);}
 else if(kind==='webp'&&n>=30){
  const type=String.fromCharCode(...b.subarray(12,16));
  if(type==='VP8X'){w=1+b[24]+256*b[25]+65536*b[26];h=1+b[27]+256*b[28]+65536*b[29];}
  else if(type==='VP8L'&&b[20]===47){const x=d.getUint32(21,true);w=(x&16383)+1;h=((x>>>14)&16383)+1;}
  else if(type==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42){w=d.getUint16(26,true)&16383;h=d.getUint16(28,true)&16383;}
 }else if(kind==='jpeg'){
  for(let i=2;i+4<n;){if(b[i++]!==255)break;while(i<n&&b[i]===255)i++;const m=b[i++];if(m===0xd9||m===0xda)break;if(m===1||m>=0xd0&&m<=0xd7)continue;if(i+2>n)break;const len=d.getUint16(i);if(len<2||i+len>n)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(m)&&len>=8){h=d.getUint16(i+3);w=d.getUint16(i+5);break;}i+=len;}
 }
 return dimensions(w,h,limits);
}
