/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
// TIFF orientation is metadata, not a transformation of the source file.
export function orientRgba(rgba,width,height,orientation=1){
 if(!Number.isInteger(orientation)||orientation<1||orientation>8)throw Error('TIFFのOrientationが不正です。');
 if(orientation===1)return {rgba,width,height};
 const swap=orientation>=5,w=swap?height:width,h=swap?width:height,out=new Uint8Array(rgba.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let X=x,Y=y;
  switch(orientation){case 2:X=width-1-x;break;case 3:X=width-1-x;Y=height-1-y;break;case 4:Y=height-1-y;break;case 5:X=y;Y=x;break;case 6:X=height-1-y;Y=x;break;case 7:X=height-1-y;Y=width-1-x;break;case 8:X=y;Y=width-1-x;break;}
  const a=(y*width+x)*4,b=(Y*w+X)*4;out[b]=rgba[a];out[b+1]=rgba[a+1];out[b+2]=rgba[a+2];out[b+3]=rgba[a+3];
 }
 return {rgba:out,width:w,height:h};
}
export function cmyk8(data,width,height){
 if(data.length!==width*height*4)throw Error('CMYK TIFFのサンプル数が不正です。');
 const rgba=new Uint8Array(data.length);
 for(let i=0;i<data.length;i+=4){const k=(255-data[i+3])/255;rgba[i]=Math.round((255-data[i])*k);rgba[i+1]=Math.round((255-data[i+1])*k);rgba[i+2]=Math.round((255-data[i+2])*k);rgba[i+3]=255;}
 return rgba;
}
export function unpremultiply(rgba){
 for(let i=0;i<rgba.length;i+=4){const a=rgba[i+3];for(let j=0;j<3;j++)rgba[i+j]=a?Math.min(255,Math.round(rgba[i+j]*255/a)):0;}
 return rgba;
}
