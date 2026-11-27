/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
import {dimensions} from './limits.mjs';
// Structural preflight for the first-generation TIFF renderer. Deliberately
// reject nested/RAW/tiled/JPEG TIFF rather than expose unbounded decode.
const sizes=[0,1,1,2,4,8,1,1,2,4,8,4,8,4];
export function guardTiff(buffer,limits){
 const d=new DataView(buffer),n=d.byteLength;
 const fail=()=>{throw new Error('TIFFの構造が不正、または安全な初期対応範囲外です。');};
 if(n<8)fail();const order=d.getUint16(0),le=order===0x4949;
 if((!le&&order!==0x4d4d)||d.getUint16(2,le)!==42)fail();
 let offset=d.getUint32(4,le),count=0,fields=0;const visited=new Set();let first;
 const forbidden=new Set([330,34665,34853,50740,61440,37500,50885,322,323,324,325,45]);
 while(offset){
  if(++count>64||visited.has(offset)||offset<8||offset+2>n)fail();
  visited.add(offset);const k=d.getUint16(offset,le);if(k<1||k>512||offset+2+k*12+4>n)fail();
  const tags=new Map();
  for(let j=0;j<k;j++){
   const p=offset+2+j*12,tag=d.getUint16(p,le),type=d.getUint16(p+2,le),num=d.getUint32(p+4,le),size=sizes[type];
   if(!size||!num||num>262144||forbidden.has(tag)||tags.has(tag))fail();
   fields+=num;if(fields>500000)fail();
   const len=size*num,at=len<=4?p+8:d.getUint32(p+8,le);
   if(at+len>n||at<8)fail();tags.set(tag,{type,num,at});
  }
  const values=(tag,defaultValue)=>{const v=tags.get(tag);if(!v)return defaultValue;if(![3,4].includes(v.type))fail();return Array.from({length:v.num},(_,i)=>v.type===3?d.getUint16(v.at+i*2,le):d.getUint32(v.at+i*4,le));};
  const one=(tag,defaultValue)=>{const v=values(tag,[defaultValue]);if(v.length!==1||v[0]===undefined)fail();return v[0];};
  const width=one(256),height=one(257);dimensions(width,height,limits);
  const spp=one(277,1),bits=values(258,[1]),compression=one(259,1),photo=one(262,1),planar=one(284,1),rows=one(278,height);
  if(spp<1||spp>4||bits.length!==spp||bits.some(x=>![1,2,4,8,16].includes(x)||x!==bits[0])||![1,5,8,32946,32773].includes(compression)||![0,1,2,3,5].includes(photo)||planar!==1||rows<1)fail();
  const predictor=one(317,1);
  if(![1,2].includes(predictor)||(predictor===2&&bits[0]!==8)||(compression===1&&predictor!==1)||([8,32946].includes(compression)&&bits[0]!==8))fail();
  const orientation=one(274,1),extra=values(338,[]),format=values(339,[1]);
  if(orientation<1||orientation>8||format.some(v=>v!==1))fail();
  if(photo===2&&(![3,4].includes(spp)||![8,16].includes(bits[0])||(spp===4&&(extra.length!==1||![1,2].includes(extra[0])))))fail();
  if(photo===5&&(spp!==4||bits[0]!==8||one(332,1)!==1||extra.length))fail();
  if([0,1].includes(photo)&&(spp!==1||![1,4,8,16].includes(bits[0])))fail();
  if(photo===3&&(spp!==1||![1,2,4,8].includes(bits[0])||values(320,[]).length!==3*(2**bits[0])))fail();
  if(tags.has(271))fail(); // vendor-specific RAW overrides in UTIF
  const offsets=values(273,[]),lengths=values(279,[]),strips=Math.ceil(height/rows);
  if(offsets.length!==strips||lengths.length!==strips||strips>4096)fail();
  let total=0;for(let i=0;i<strips;i++){
   const expected=Math.ceil(width*bits[0]*spp/8)*Math.min(rows,height-i*rows);
   if(!lengths[i]||offsets[i]<8||offsets[i]+lengths[i]>n||(compression===1&&lengths[i]!==expected))fail();
   total+=lengths[i];if(total>n*2)fail();
  }
  first??={width,height,compression};offset=d.getUint32(offset+2+k*12,le);
 }
 if(!first)fail();return {...first,pageCount:count};
}
