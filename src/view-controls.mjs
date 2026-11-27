export const MIN_ZOOM=.1,MAX_ZOOM=8;
export function clampZoom(n){return Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(n)?n:1));}
export function fitZoom(w,h,vw,vh,mode='fit'){if(!(w>0&&h>0&&vw>0&&vh>0))return 1;return Math.max(.01,Math.min(MAX_ZOOM,mode==='width'?vw/w:Math.min(vw/w,vh/h)));}
export function anchoredScroll(oldStart,anchor,oldOrigin,newOrigin,ratio){return Math.max(0,(oldStart+anchor-oldOrigin)*ratio+newOrigin-anchor);}

export function pageIndex(value,count){const s=String(value).trim();if(!/^[0-9]+$/.test(s)||!Number.isSafeInteger(count)||count<1)return null;const n=Number(s);return Number.isSafeInteger(n)&&n>=1&&n<=count?n-1:null;}
export function swipeDelta(dx,dy,ms,direction='ltr'){if(ms>650||Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.5)return 0;return (dx<0?1:-1)*(direction==='rtl'?-1:1);}
