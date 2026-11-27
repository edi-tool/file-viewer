import {dimensions} from './limits.mjs';
export function epsBoundingBox(bytes,limits){
 const b=new Uint8Array(bytes),head=new TextDecoder('latin1').decode(b.subarray(0,65536));
 if(!/^%!PS-Adobe-[^\r\n]*EPSF-/m.test(head.split(/\r?\n/,1)[0]))throw new Error('EPSのヘッダーを確認できません。');
 const header=head.split(/^%%EndComments\s*$/m,1)[0];
 const pattern=/^%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*$/m;
 let m=header.match(pattern);
 if(!m&&/^%%BoundingBox:\s*\(atend\)/m.test(header)){const tail=new TextDecoder('latin1').decode(b.subarray(Math.max(0,b.length-65536)));const trailer=tail.lastIndexOf('%%Trailer');if(trailer>=0)m=tail.slice(trailer).match(pattern);}
 if(!m)throw new Error('EPSのBoundingBoxが見つかりません。');
 const [x,y,right,top]=m.slice(1).map(Number);
 if(![x,y,right,top].every(Number.isSafeInteger))throw new Error('EPSのBoundingBoxが不正です。');
 const {width,height}=dimensions(right-x,top-y,limits);
 if(Math.abs(x)>100000||Math.abs(y)>100000)throw new Error('EPSの原点が上限を超えています。');
 return {width,height,x,y};
}

// Preserve original source bytes and insert a bounded coordinate translation.
// EPS resetting the CTM may still render incorrectly.
export function translateEps(bytes,box){
 const b=new Uint8Array(bytes);if(!box.x&&!box.y)return b;
 let pos=0;while(pos<b.length&&b[pos]!==10&&b[pos]!==13)pos++;
 if(pos>=b.length)throw Error('EPSのヘッダーが不正です。');
 if(b[pos]===13&&b[pos+1]===10)pos++;pos++;
 const command=new TextEncoder().encode(`\n${-box.x} ${-box.y} translate\n`);
 const result=new Uint8Array(b.length+command.length);result.set(b.subarray(0,pos));result.set(command,pos);result.set(b.subarray(pos),pos+command.length);return result;
}
