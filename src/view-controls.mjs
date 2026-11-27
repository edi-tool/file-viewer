export const MIN_ZOOM=.1,MAX_ZOOM=8;
export function clampZoom(n){return Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(n)?n:1));}
export function fitZoom(w,h,vw,vh,mode='fit'){if(!(w>0&&h>0&&vw>0&&vh>0))return 1;return Math.max(.01,Math.min(MAX_ZOOM,mode==='width'?vw/w:Math.min(vw/w,vh/h)));}
export function anchoredScroll(oldStart,anchor,oldOrigin,newOrigin,ratio){return Math.max(0,(oldStart+anchor-oldOrigin)*ratio+newOrigin-anchor);}
