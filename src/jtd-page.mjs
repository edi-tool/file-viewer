// Adapted read-only canvas drawing from EZPZ File JTD web/editor/app.js
// v0.5.14 (454c445a48ec9c3b5b2db4e9e44711d10ff45fcf).
// Copyright (c) 2026 EZPZ File (https://ezpzfile.com), MIT.
// See licenses/EZPZ-JTD-MIT.txt. Changes: Worker/OffscreenCanvas,
// local font fallback, no editing, no network fonts, bounded display lists.
import {fit,dimensions} from './limits.mjs';
import {imageDimensions} from './image-header.mjs';
const FONT_STACK = '"Hiragino Mincho ProN","Hiragino Mincho Pro","Yu Mincho","YuMincho","MS Mincho","Noto Serif CJK JP","Noto Serif JP",serif';
// text the document sets in a Gothic face (ＭＳ ゴシック, ゴシック体, …)
const GOTHIC_STACK = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","MS Gothic","Noto Sans CJK JP","Noto Sans JP",sans-serif';
/**
 * Faces by class (engine `face_class`): 0 Mincho, 1 Gothic, 2 rounded Gothic,
 * 3 textbook, 4 brush, 5 pop. The free look-alike comes first so every
 * computer draws the same kind of face; the Windows face follows for when
 * the free one cannot be fetched (the editor saved as a file on its own).
 */
const FACE_STACKS = [
  FONT_STACK,
  GOTHIC_STACK,
  '"Zen Maru Gothic","HG丸ｺﾞｼｯｸM-PRO","Hiragino Maru Gothic ProN",' + GOTHIC_STACK,
  '"Klee One","UD デジタル 教科書体 N-R","HG教科書体",' + FONT_STACK,
  '"Yuji Syuku","HG正楷書体-PRO","HG行書体",' + FONT_STACK,
  '"Mochiy Pop One","HGP創英角ﾎﾟｯﾌﾟ体","HG創英角ﾎﾟｯﾌﾟ体",' + GOTHIC_STACK,
];

const TURNS = new Set(Array.from("ー－―‐～〜…‥（）［］｛｝「」『』【】〔〕〈〉《》＜＞→←⇒＝"));
const SMALL_MARKS = new Set(Array.from("、。，．"));


const LINE_DASH = { 4: [3, 2], 5: [3, 2], 6: [3, 2], 8: [0.8, 1.6], 9: [6, 2.5], 10: [5, 1.5, 1, 1.5], 11: [5, 1.5, 1, 1.5], 15: [1, 1] };

/** One line item. `k` is the line type of a ruled line (0/1 solid). */
function drawLine(g, it) {
  const k = it.k || 0;
  g.save();
  g.strokeStyle = it.color || "#111"; g.lineWidth = it.w;
  g.setLineDash(LINE_DASH[k] || []);
  const dx = it.x2 - it.x1, dy = it.y2 - it.y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // unit normal
  const seg = (o) => { g.beginPath(); g.moveTo(it.x1 + nx * o, it.y1 + ny * o); g.lineTo(it.x2 + nx * o, it.y2 + ny * o); g.stroke(); };
  const wave = (o) => { // a zigzag along the line
    const step = 2, amp = 1.1, n = Math.max(1, Math.round(len / step));
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (i % 2 ? amp : -amp) + o;
      const x = it.x1 + dx * t + nx * a, y = it.y1 + dy * t + ny * a;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  };
  if (k === 7) { g.lineWidth = 0.5; seg(-0.9); seg(0.9); }
  else if (k === 12 || k === 13) wave(0);
  else if (k === 14) { g.lineWidth = 0.5; wave(-1); wave(1); }
  else seg(0);
  g.restore();
}


function dotPattern(g, color) {
  const c = new OffscreenCanvas(3,3);
  c.width = c.height = 3;
  const x = c.getContext("2d");
  x.fillStyle = color; x.fillRect(0, 0, 1, 1); x.fillRect(2, 2, 1, 1);
  return g.createPattern(c, "repeat") || color;
}

function checkList(data){
 let count=0,chars=0;
 function walk(items,depth=0){
  if(!Array.isArray(items)||depth>8)throw Error('一太郎の描画リストが上限を超えています。');
  for(const it of items){
   if(!it||typeof it!=='object'||++count>50_000)throw Error('一太郎の描画要素数が上限を超えています。');
   for(const k of ['x','y','w','h','x1','x2','y1','y2','size','r','lw'])if(k in it&&(!Number.isFinite(it[k])||Math.abs(it[k])>100_000))throw Error('一太郎の描画座標が不正です。');
   if(it.t==='Text'){
    if(typeof it.s!=='string'||!Array.isArray(it.xs)||it.xs.length>200_000||it.xs.some(x=>!Number.isFinite(x)||Math.abs(x)>100_000))throw Error('一太郎の文字座標が不正です。');
    chars+=it.s.length;if(chars>200_000)throw Error('一太郎のページ文字数が上限を超えています。');
   }
   if(it.t==='Turned')walk(it.items,depth+1);
  }
 }
 walk(data.items);if(data.flat)walk(data.flat);
}
function collectIds(data){const ids=new Set();function visit(items){for(const it of items){if(it.t==='Image')ids.add(it.id);if(it.t==='Turned')visit(it.items);}}visit(data.items);if(data.flat)visit(data.flat);return ids;}
export async function renderJtdPage(editor,index,limits,scale=1){
 const pageSetup=JSON.parse(editor.setupJson()),raw=editor.pageJson(index);
 if(typeof raw!=='string'||raw.length>16_000_000)throw Error('一太郎のページデータが上限を超えています。');
 let data=JSON.parse(raw);
 if(!data)throw Error('一太郎のページがありません。');
 if(pageSetup.vertical)data={...data,w:data.h,h:data.w,vertical:true};
 checkList(data);const {width,height}=fit(data.w,data.h,scale*96/72,limits);
 const ids=collectIds(data),pics=new Map();let skipped=0,totalPixels=0;
 const meta=JSON.parse(editor.picturesJson());if(!Array.isArray(meta)||meta.length>10_000)throw Error('一太郎の画像数が上限を超えています。');
 const kinds={'image/png':'png','image/jpeg':'jpeg','image/gif':'gif','image/webp':'webp'};
 try{
  for(const p of meta){
   if(!ids.has(p.id))continue;
   let bitmap=null;
   try{
    const kind=kinds[p.mime];if(!kind)throw Error('unsupported image');
    const bytes=editor.pictureData(p.id);if(bytes.byteLength>limits.maxBytes)throw Error('oversize');
    const d=imageDimensions(bytes,kind,limits);totalPixels+=d.width*d.height;if(totalPixels>limits.maxPixels)throw Error('oversize');
    bitmap=await createImageBitmap(new Blob([bytes],{type:p.mime}));dimensions(bitmap.width,bitmap.height,limits);
    pics.set(p.id,{image:bitmap,complete:true,naturalWidth:bitmap.width,dataset:{mime:p.mime}});bitmap=null;
   }catch{skipped++;}finally{bitmap?.close();}
  }
  const canvas=new OffscreenCanvas(width,height),g=canvas.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#fff';g.fillRect(0,0,width,height);g.setTransform(width/data.w,0,0,height/data.h,0,0);
  function picture(id){return pics.get(id);}
  function isBackground(it, data) {
  return (it.t === "Image" && it.id === 0xfffe) || (it.t === "Rect" && it.noline && it.x === 0 && it.y === 0 && it.w >= data.w - 1 && it.h >= data.h - 1);
}
// part: "gfx" pictures, figures and box frames; "text" the text and lines.
// All the text is drawn after all the pictures: 一太郎ビューア keeps a text
// box's text above a figure stacked over the box (a school handout's
// title scroll laid over a text box, probed by moving the scroll).
function paintItems(g, data, marks, part) {
  const setup = pageSetup;
  if (!part) {
    paintItems(g, data, marks, "gfx");
    paintItems(g, data, marks, "text");
    return;
  }
  if (data.vertical) {
    // the background first (it is kept on the paper as it is)
    const flat = data.flat || [];
    const bg = flat.filter((it) => isBackground(it, data));
    if (bg.length && part === "gfx") paintItems(g, { w: data.w, h: data.h, items: bg }, false, "gfx");
    data = { ...data, flat: flat.filter((it) => !isBackground(it, data)) };
    // turn the layout back: layout x runs down the page, layout y from the right edge
    g.save();
    g.transform(0, 1, -1, 0, data.w, 0);
    paintItems(g, { ...data, vertical: false, upright: true }, marks, part);
    g.restore();
    // a box writing across on a 縦組み page: drawn on the paper as it is
    if (data.flat && data.flat.length) paintItems(g, { w: data.w, h: data.h, items: data.flat }, false, part);
    return;
  }
  if (part === "text") return paintText(g, data, marks);
  if (marks) {
    // text-area corner marks (like most Japanese word processors)
    const mm = 72 / 25.4, A = textArea(setup);
    const L = A.L;
    const R = A.L + A.W, T = setup.margin_top_mm * mm, B = setup.height_mm * mm - setup.margin_bottom_mm * mm;
    g.strokeStyle = "#a8b0c4"; g.lineWidth = 0.5; g.beginPath();
    for (const [x, y, dx, dy] of [[L, T, -1, -1], [R, T, 1, -1], [L, B, -1, 1], [R, B, 1, 1]]) {
      g.moveTo(x + dx * 10, y); g.lineTo(x, y); g.lineTo(x, y + dy * 10);
    }
    g.stroke();
  }
  // the background colour, then pictures, under the text
  for (const it of data.items) {
    if (it.t === "Rect" && isBackground(it, data)) { g.fillStyle = it.fill[0][1]; g.fillRect(0, 0, it.w, it.h); }
  }
  // pictures, box frames and 縦書き boxes in their stacking order (the
  // frame's place in /Frame: later on top), under the text
  const zOf = (it) => it.z || 0;
  const layered = data.items.filter((it) => it.t === "Image" || it.t === "Turned" || (it.t === "Rect" && !it.cell && !isBackground(it, data)));
  layered.sort((a, b) => zOf(a) - zOf(b));
  for (const it of layered) {
    if (it.t === "Image") {
      const img = picture(it.id);
      if (!(img && img.complete && img.naturalWidth)) continue;
      // a bitmap keeps its dots as 一太郎ビューア shows them (no blur when
      // a small clip-art picture is enlarged); drawings stay smooth
      g.imageSmoothingEnabled = img.dataset.mime === "image/svg+xml";
      if (data.upright) {
        g.save(); g.translate(it.x + it.w / 2, it.y + it.h / 2); g.rotate(-Math.PI / 2);
        g.drawImage(img.image, -it.h / 2, -it.w / 2, it.h, it.w); g.restore();
      } else g.drawImage(img.image, it.x, it.y, it.w, it.h);
      continue;
    }
    if (it.t === "Turned") {
      // 縦書き text boxes on a page written across: turned a quarter turn
      g.save(); g.translate(it.x, it.y); g.transform(0, 1, -1, 0, it.w, 0);
      paintItems(g, { w: it.h, h: it.w, items: it.items, upright: true }, false, "gfx");
      g.restore();
      continue;
    }
    const shape = (dx, dy) => {
      g.beginPath();
      if (g.roundRect && it.r > 0) g.roundRect(it.x + dx, it.y + dy, it.w, it.h, it.r); else g.rect(it.x + dx, it.y + dy, it.w, it.h);
    };
    g.save();
    // drop shadow: solid, or dotted like the frame line
    if (it.shadow) {
      const [sx, sy, sc] = it.shadow;
      g.fillStyle = it.dot ? dotPattern(g, sc) : sc;
      shape(sx, sy); g.fill();
      g.fillStyle = "#fff"; shape(0, 0); g.fill();
    }
    if (it.fill && it.fill.length) {
      if (it.fill.length === 1) g.fillStyle = it.fill[0][1];
      else {
        const a = ((it.angle || 0) * Math.PI) / 180, cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        const dx = (Math.cos(a) * it.w) / 2, dy = (Math.sin(a) * it.h) / 2;
        const gr = g.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        for (const [p, c] of it.fill) gr.addColorStop(Math.min(1, Math.max(0, p)), c);
        g.fillStyle = gr;
      }
      shape(0, 0); g.fill();
    }
    if (!it.noline && it.double) {
      // 二重線: a thick line along the edge, a gap, a thin line inside
      // (一太郎ビューア: about 2.6, 0.7 and 0.7 times the line width)
      const lw = Math.max(0.5, it.lw), inset = (d, w) => {
        g.lineWidth = w; g.beginPath();
        const r = Math.max(0, it.r - d);
        if (g.roundRect && r > 0) g.roundRect(it.x + d, it.y + d, it.w - 2 * d, it.h - 2 * d, r); else g.rect(it.x + d, it.y + d, it.w - 2 * d, it.h - 2 * d);
        g.stroke();
      };
      g.strokeStyle = it.color || "#000";
      inset(1.3 * lw, 2.6 * lw);
      inset(3.65 * lw, 0.7 * lw);
    } else if (!it.noline) {
      g.strokeStyle = it.color || "#000";
      g.lineWidth = Math.max(0.5, it.lw);
      if (it.dot) g.setLineDash([Math.max(1, it.lw), Math.max(2, it.lw * 2)]);
      shape(0, 0); g.stroke();
    }
    g.restore();
  }
}

function paintText(g, data, marks) {
  // table cell shading belongs to the text: over the boxes, under the characters
  for (const it of data.items) {
    if (it.t === "Rect" && it.cell && it.fill && it.fill.length) { g.fillStyle = it.fill[0][1]; g.fillRect(it.x, it.y, it.w, it.h); }
  }
  g.textBaseline = "alphabetic";
  for (const it of data.items) {
    if (it.t === "Turned") {
      g.save(); g.translate(it.x, it.y); g.transform(0, 1, -1, 0, it.w, 0);
      paintItems(g, { w: it.h, h: it.w, items: it.items, upright: true }, false, "text");
      g.restore();
    } else if (it.t === "Text") {
      g.font = `${it.i ? "italic " : ""}${it.b ? "bold " : ""}${it.size}px ${FACE_STACKS[it.f || (it.g ? 1 : 0)] || FONT_STACK}`;
      // System fonts only; do not fetch font resources.
      g.fillStyle = it.color || "#111";
      const chars = Array.from(it.s);
      for (let k = 0; k < chars.length; k++) {
        const ch = chars[k];
        const half = ch.charCodeAt(0) < 0x2000 || (ch >= "｡" && ch <= "ﾟ");
        const x = it.xs[k];
        if (data.upright && !half && !TURNS.has(ch)) {
          // 縦組み: stand the character up in its cell; 、。 sit at the cell's top right
          const z = it.size, cx = x + z / 2, cy = it.y - z * 0.38;
          g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 2);
          const w = g.measureText(ch).width;
          if (SMALL_MARKS.has(ch)) g.fillText(ch, -w / 2 + z * 0.55, z * 0.38 - z * 0.55);
          else g.fillText(ch, -w / 2, z * 0.38);
          g.restore();
          continue;
        }
        if (half) {
          // Half-width cell: centre narrow glyphs, squeeze wide ones (W, M, …)
          // so text keeps the monospaced grid look of Ichitaro.
          const cell = it.size / 2, w = g.measureText(ch).width;
          if (w > cell) { g.save(); g.translate(x, it.y); g.scale(cell / w, 1); g.fillText(ch, 0, 0); g.restore(); }
          else g.fillText(ch, x + (cell - w) / 2, it.y);
        } else g.fillText(ch, x, it.y);
      }
    } else if (it.t === "Line") {
      drawLine(g, it);
    } else if (it.t === "Mark" && marks) {
      g.strokeStyle = "#6fa5ff"; g.fillStyle = "#6fa5ff"; g.lineWidth = 0.6;
      const z = it.size;
      if (it.k === "ret") { // 改行マーク
        const x = it.x + 1.5, y = it.y - z * 0.1;
        g.beginPath(); g.moveTo(x + z * 0.4, y - z * 0.55); g.lineTo(x + z * 0.4, y); g.lineTo(x, y); g.stroke();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + z * 0.16, y - z * 0.12); g.lineTo(x + z * 0.16, y + z * 0.12); g.closePath(); g.fill();
      } else if (it.k === "sp") { // 全角スペース □ (kept faint: forms are full of them)
        g.save(); g.globalAlpha = 0.55;
        g.strokeRect(it.x + z * 0.15, it.y - z * 0.72, z * 0.7, z * 0.7);
        g.restore();
      } else if (it.k === "tab") {
        g.beginPath(); g.moveTo(it.x + 2, it.y - z * 0.35); g.lineTo(it.x + z * 1.2, it.y - z * 0.35); g.stroke();
      } else if (it.k === "pb") {
        g.setLineDash([3, 2]); g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.x + it.size, it.y); g.stroke(); g.setLineDash([]);
        g.font = `7px ${FONT_STACK}`;
        const lbl = "改ページ";
        g.fillText(lbl, it.x + it.size / 2 - g.measureText(lbl).width / 2, it.y - 2);
      }
    }
  }
}


  paintItems(g,data,false);
  const rgba=g.getImageData(0,0,width,height).data.buffer;
  return {width,height,rgba,warnings:['一太郎のレイアウトを近似描画しています。フォント・ルビ・罫線・画像の完全再現は未検証です。',...(skipped?['一部の埋め込み画像を表示できませんでした（SVG等を含む）。']:[])]};
 }finally{for(const p of pics.values())p.image.close();}
}
