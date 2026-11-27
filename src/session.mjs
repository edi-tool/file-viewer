/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
// Own one current document. Adapters must synchronously dispose resources and
// honor signals or terminate their own worker when aborted. Returned frames
// belong to the caller; stale frames are released here.
const aborted = () => new DOMException('Operation superseded','AbortError');
const release = (resource) => resource?.dispose?.();
export function createSessionManager() {
  let generation=0, document=null, opening=null, rendering=null;
  const stopRender=()=>{const c=rendering;rendering=null;c?.abort();};
  function close(){
    generation++; const c=opening;opening=null;c?.abort();stopRender();
    const old=document;document=null;release(old);
  }
  async function open(adapter,file,limits){
    close();const g=generation,c=new AbortController();opening=c;
    let candidate;
    try {
      candidate=await adapter.open(file,{signal:c.signal,limits});
      if(g!==generation||c.signal.aborted) {const stale=candidate;candidate=null;release(stale);throw aborted();}
      if(!candidate||typeof candidate.renderPage!=='function'||typeof candidate.dispose!=='function')throw new TypeError('Invalid adapter document');
      document=candidate;candidate=null;return document;
    } catch(e){release(candidate);if(c.signal.aborted||g!==generation)throw aborted();throw e;}
    finally{if(opening===c)opening=null;}
  }
  async function renderPage(index,scale=1){
    if(!document)throw new Error('No active document');
    if(!Number.isInteger(index)||index<0||index>=document.pageCount||!Number.isFinite(scale)||scale<=0)throw new RangeError('Invalid page or scale');
    stopRender();const current=document,c=new AbortController();rendering=c;
    try {
      const frame=await current.renderPage(index,{scale,signal:c.signal});
      if(c.signal.aborted||document!==current||rendering!==c){release(frame);throw aborted();}
      return frame;
    }catch(e){if(c.signal.aborted||document!==current)throw aborted();throw e;}
    finally{if(rendering===c)rendering=null;}
  }
  return {open,renderPage,close};
}
