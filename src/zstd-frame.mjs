// Restrict Illustrator Zstd to one normal, dictionary-free frame before fzstd
// allocates its window. No concatenated/skippable frames. Bound both window
// and retained decompressed bytes; a dedicated Worker enforces elapsed time.
export function checkZstdFrame(bytes,max){
 const fail=()=>{throw Error('Zstandardフレームが不正、または上限を超えています。');};
 if(!Number.isSafeInteger(max)||max<1||max>32*1024*1024||bytes.length<8||bytes[0]!==0x28||bytes[1]!==0xb5||bytes[2]!==0x2f||bytes[3]!==0xfd)fail();
 const flag=bytes[4],single=Boolean(flag&32),checksum=Boolean(flag&4),dict=[0,1,2,4][flag&3],fc=flag>>>6;
 if(flag&24)fail();let p=5,window=0;
 if(!single){const wd=bytes[p++];const b=2**(10+(wd>>>3));window=b+b/8*(wd&7);if(window>max)fail();}
 const read=(n)=>{if(p+n>bytes.length)fail();let v=0;for(let i=0;i<n;i++){v+=bytes[p++]*2**(8*i);if(v>max)fail();}return v;};
 if(read(dict)!==0)fail();
 const sizeBytes=fc===0?(single?1:0):2**fc;
 const content=sizeBytes?read(sizeBytes)+(fc===1?256:0):null;
 if(content!==null&&content>max)fail();
 if(single){window=content;if(!window||window>max)fail();}
 let last=false,blocks=0;
 while(!last){if(++blocks>131072||p+3>bytes.length)fail();const h=bytes[p]|bytes[p+1]<<8|bytes[p+2]<<16;p+=3;last=Boolean(h&1);const type=(h>>>1)&3,n=h>>>3;if(type===3||n>131072||n>window)fail();p+=type===1?1:n;if(p>bytes.length)fail();}
 if(checksum)p+=4;if(p!==bytes.length)fail();return {content,window};
}
export async function decodeZstd(bytes,max,signal,Decompress){
 const {content}=checkZstdFrame(bytes,max);signal?.throwIfAborted();let total=0,finished=false;const chunks=[];
 const decoder=new Decompress((chunk,final)=>{signal?.throwIfAborted();if(chunk.length>max-total)throw Error('Zstandard展開量が上限を超えています。');total+=chunk.length;if(chunk.length)chunks.push(chunk.slice());finished=final===true;});
 decoder.push(bytes,true);if(!finished||(content!==null&&total!==content))throw Error('Zstandard展開結果が一致しません。');
 const out=new Uint8Array(total);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;
}
