import {chromium} from 'playwright';import assert from 'node:assert/strict';import {fixtures} from '../scripts/fixtures.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 const external=[];await page.route('**/*',route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:8000'){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto('http://127.0.0.1:8000/');const f=fixtures();
 const check=async(name,mime)=>{await page.locator('#pick').setInputFiles({name,mimeType:mime,buffer:f[name]});await page.locator('#preview canvas').waitFor({timeout:20000});const colors=await page.locator('#preview canvas').evaluate(c=>{const ctx=c.getContext('2d');return [Array.from(ctx.getImageData(16,32,1,1).data),Array.from(ctx.getImageData(48,32,1,1).data)];});assert.deepEqual(colors,[[255,0,0,255],[0,0,255,255]],name);console.log(name,'PASS');await page.locator('#clear').click();};
 await check('two-colors.pdf','application/pdf');await check('pdf-compatible-candidate.ai','application/octet-stream');await check('composite.psd','application/octet-stream');await check('rgb.tiff','image/tiff');await check('binary-preview.eps','application/postscript');await check('vector.eps','application/postscript');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,32,64);ctx.fillStyle='#00f';ctx.fillRect(32,0,32,64);return c.toDataURL().split(',')[1];});
 f['native.png']=Buffer.from(png,'base64');await check('native.png','image/png');
 await page.locator('#pick').setInputFiles({name:'truncated.psd',mimeType:'application/octet-stream',buffer:f['truncated.psd']});await page.locator('#status[data-error=true]').waitFor();await page.locator('#clear').click();
 await page.setViewportSize({width:320,height:640});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(external,[]);
}finally{await browser.close();}
