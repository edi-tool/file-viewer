import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/');
 const bytes=await page.evaluate(async()=>{const {default:init,JtdEditor}=await import('/vendor/jtd/ezpzjtd_wasm.js');await init();const d=new JtdEditor();try{d.insertText('合成試験の本文');d.pageBreak();d.insertText('第二ページの本文');return Array.from(d.toJtd());}finally{d.free();}});
 await page.locator('#pick').setInputFiles({name:'generated.jtd',mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
 const wait=async(n)=>{await page.waitForFunction(n=>document.querySelector('#page').textContent===n+' / 2'&&document.querySelector('#preview canvas')&&document.querySelector('#preview').getAttribute('aria-busy')==='false',n,{timeout:20000});assert.match(await page.locator('#status').textContent(),/ページ描画/);assert.ok(await page.locator('#preview canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i]<128&&d[i+1]<128&&d[i+2]<128&&d[i+3]>0)return true;return false;}),'page contains visible ink');};
 await wait(1);await page.locator('#next').click();await wait(2);await page.locator('#prev').click();await wait(1);
 await page.locator('#preview summary').click();await page.locator('#preview pre').waitFor({timeout:20000});const text=await page.locator('#preview pre').textContent();assert.match(text,/合成試験の本文/);assert.match(text,/第二ページの本文/);
 console.log('JTD two-page rendering, navigation and text roundtrip PASS');
}finally{await browser.close();}
