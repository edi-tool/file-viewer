// Small in-memory LRU; no persistent storage and no prefetch of user data.
export function createPageCache(maxBytes=16*1024*1024,maxEntries=3){
 const entries=new Map();let bytes=0;
 function remove(key){const v=entries.get(key);if(v){bytes-=v.size;entries.delete(key);}}
 return {get(key){const v=entries.get(key);if(!v)return;entries.delete(key);entries.set(key,v);return v.value;},
 put(key,value){remove(key);const size=value?.rgba?.byteLength;if(!Number.isSafeInteger(size)||size<1||size>maxBytes)return;while(entries.size>=maxEntries||bytes+size>maxBytes)remove(entries.keys().next().value);entries.set(key,{value,size});bytes+=size;},
 clear(){entries.clear();bytes=0;}};
}
