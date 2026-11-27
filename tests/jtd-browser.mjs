import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8000/');
 const bytes=await page.evaluate(async()=>{const {default:init,JtdEditor}=await import('/vendor/jtd/ezpzjtd_wasm.js');await init();const d=new JtdEditor();try{d.insertText('合成試験の本文');return Array.from(d.toJtd());}finally{d.free();}});
 await page.locator('#pick').setInputFiles({name:'generated.jtd',mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
 await page.locator('#preview canvas').waitFor({timeout:20000});assert.match(await page.locator('#status').textContent(),/ページ描画/);assert.ok(await page.locator('#preview canvas').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<data.length;i+=4)if(data[i]<128&&data[i+1]<128&&data[i+2]<128&&data[i+3]>0)return true;return false;}),'page contains visible ink');await page.locator('#preview summary').click();await page.locator('#preview pre').waitFor({timeout:20000});assert.match(await page.locator('#preview pre').textContent(),/合成試験の本文/);console.log('JTD synthetic page rendering and text roundtrip PASS');
}finally{await browser.close();}
