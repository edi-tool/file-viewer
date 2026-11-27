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
 // Until a translation/crop implementation is compared against real EPS,
 // only origin-aligned documents are rendered; other files use previews.
 if(x!==0||y!==0)throw new Error('原点が0以外のEPS本体描画は未対応です。');
 return {width,height};
}
