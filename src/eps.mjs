/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
import {dimensions} from './limits.mjs';
const number='[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)';
function readBox(section,name,decimal){
 const n=decimal?number:'[+-]?[0-9]+';
 const re=new RegExp('^%%'+name+':[ \\t]*('+n+')[ \\t]+('+n+')[ \\t]+('+n+')[ \\t]+('+n+')[ \\t]*\\r?$','m');
 const m=section.match(re);return m?m.slice(1).map(Number):null;
}
export function epsBoundingBox(bytes,limits){
 const b=new Uint8Array(bytes),head=new TextDecoder('latin1').decode(b.subarray(0,65536));
 if(!/^%!PS-Adobe-[^\r\n]*EPSF-/.test(head))throw new Error('EPSのヘッダーを確認できません。');
 const header=head.split(/^%%EndComments[ \t]*\r?$/m,1)[0];
 const tail=new TextDecoder('latin1').decode(b.subarray(Math.max(0,b.length-65536))),trailer=tail.lastIndexOf('%%Trailer');
 function resolve(name,decimal){let v=readBox(header,name,decimal);if(!v&&new RegExp('^%%'+name+':[ \\t]*\\(atend\\)','m').test(header)&&trailer>=0)v=readBox(tail.slice(trailer),name,decimal);return v;}
 const values=resolve('HiResBoundingBox',true)||resolve('BoundingBox',false);
 if(!values)throw new Error('EPSのBoundingBoxが見つかりません。');
 const [x,y,right,top]=values;
 if(!values.every(Number.isFinite)||right<=x||top<=y||values.some(v=>Math.abs(v)>104096))throw Error('EPSのBoundingBoxが不正です。');
 const {width,height}=dimensions(Math.ceil(right-x),Math.ceil(top-y),limits);
 if(Math.abs(x)>100000||Math.abs(y)>100000)throw new Error('EPSの原点が上限を超えています。');
 return {width,height,x,y};
}
// Preserve original source bytes; fractional coordinates are bounded and
// inserted as plain decimal tokens. EPS resetting the CTM remains approximate.
export function translateEps(bytes,box){
 const b=new Uint8Array(bytes);if(!box.x&&!box.y)return b;
 let pos=0;while(pos<b.length&&b[pos]!==10&&b[pos]!==13)pos++;
 if(pos>=b.length)throw Error('EPSのヘッダーが不正です。');
 if(b[pos]===13&&b[pos+1]===10)pos++;pos++;
 const decimal=n=>Number(n).toFixed(8).replace(/\.?0+$/,'')||'0';
 const command=new TextEncoder().encode(`\n${decimal(-box.x)} ${decimal(-box.y)} translate\n`);
 const result=new Uint8Array(b.length+command.length);result.set(b.subarray(0,pos));result.set(command,pos);result.set(b.subarray(pos),pos+command.length);return result;
}
