/*
SPDX-License-Identifier: Apache-2.0
Copyright 2026 ISHIKAWA, Natsuki
Project: edi-tool
Source: https://github.com/edi-tool
Applies to original code; third-party materials and separately licensed content retain their terms.
*/
export const LIMITS=Object.freeze({maxBytes:30*1024*1024,maxPixels:8_000_000,maxSide:4096,maxPages:500,timeoutMs:15000});
export function dimensions(w,h,limits=LIMITS){if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>limits.maxSide||h>limits.maxSide||w*h>limits.maxPixels)throw new Error('画像寸法が上限を超えるか不正です。');return {width:w,height:h};}
export function fit(w,h,scale,limits=LIMITS){if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||!Number.isFinite(scale)||scale<=0)throw new Error('寸法が不正です。');const s=Math.min(scale,limits.maxSide/w,limits.maxSide/h,Math.sqrt(limits.maxPixels/w/h));return dimensions(Math.max(1,Math.floor(w*s)),Math.max(1,Math.floor(h*s)),limits);}
export function sizeCheck(file,limits=LIMITS){if(!file.size||file.size>limits.maxBytes)throw new Error('空ファイル、または容量上限（30 MiB）を超えています。');}
export function pageCheck(n,limits=LIMITS){if(!Number.isSafeInteger(n)||n<1||n>limits.maxPages)throw new Error('ページ数が上限を超えるか不正です。');return n;}
