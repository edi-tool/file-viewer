import {chromium} from 'playwright';import assert from 'node:assert/strict';import {fixtures} from '../scripts/fixtures.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 const external=[],errors=[],failures=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('BROWSER',m.type(),m.text());});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:8000'){external.push(url.href);return route.abort();}return route.continue();});
 await page.goto('http://127.0.0.1:8000/');const f=fixtures();
 const check=async(name,mime)=>{try{
  await page.locator('#pick').setInputFiles({name,mimeType:mime,buffer:f[name]});
  await page.waitForFunction(()=>document.querySelector('#preview canvas')||document.querySelector('#status').dataset.error==='true',{},{timeout:20000});
  const status=await page.locator('#status').textContent();
  if(await page.locator('#status[data-error=true]').count())throw Error(status);
  const colors=await page.locator('#preview canvas').evaluate(c=>{const ctx=c.getContext('2d');return {width:c.width,height:c.height,colors:[Array.from(ctx.getImageData(Math.floor(c.width/4),Math.floor(c.height/2),1,1).data),Array.from(ctx.getImageData(Math.floor(c.width*3/4),Math.floor(c.height/2),1,1).data)]};});
  assert.ok(colors.width>=64);assert.ok(colors.height>=64);assert.deepEqual(colors.colors,[[255,0,0,255],[0,0,255,255]],name);console.log(name,'PASS',status);
 }catch(e){failures.push(name+': '+e.message);console.log(name,'FAIL',await page.locator('#status').textContent(),e.message);}finally{await page.locator('#clear').click();}};
 await check('two-colors.pdf','application/pdf');await check('pdf-compatible-candidate.ai','application/octet-stream');await check('composite.psd','application/octet-stream');await check('rgb.tiff','image/tiff');await check('binary-preview.eps','application/postscript');await check('vector.eps','application/postscript');await check('shifted.eps','application/postscript');await check('positive-origin.eps','application/postscript');
 await page.locator('#pick').setInputFiles({name:'two-pages.tiff',mimeType:'image/tiff',buffer:f['two-pages.tiff']});
 await page.locator('#preview canvas').waitFor({timeout:20000});
 assert.equal(await page.locator('#page').textContent(),'1 / 2');
 await page.locator('#next').click();await page.locator('#preview canvas').waitFor({timeout:20000});
 assert.equal(await page.locator('#page').textContent(),'2 / 2');
 assert.deepEqual(await page.locator('#preview canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(16,32,1,1).data)),[0,0,255,255]);
 await page.locator('#prev').click();await page.locator('#preview canvas').waitFor({timeout:20000});
 assert.deepEqual(await page.locator('#preview canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(16,32,1,1).data)),[255,0,0,255]);
 await page.locator('#clear').click();console.log('TIFF page navigation PASS');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,32,64);ctx.fillStyle='#00f';ctx.fillRect(32,0,32,64);return c.toDataURL().split(',')[1];});
 f['native.png']=Buffer.from(png,'base64');await check('native.png','image/png');
 for(const name of ['truncated.psd','invalid-preview.eps']){await page.locator('#pick').setInputFiles({name,mimeType:'application/octet-stream',buffer:f[name]});await page.locator('#status[data-error=true]').waitFor();await page.locator('#clear').click();}
 await page.locator('#pick').setInputFiles({name:'native.png',mimeType:'image/png',buffer:f['native.png']});await page.locator('#preview canvas').waitFor();
 assert.ok(await page.evaluate(()=>document.querySelector('.files-panel').getBoundingClientRect().top>=document.querySelector('#viewer').getBoundingClientRect().bottom));
 await page.locator('#zoom').selectOption('1');assert.equal(await page.locator('#percent').textContent(),'100%');await page.locator('#plus').click();assert.equal(await page.locator('#percent').textContent(),'125%');
 await page.locator('#expand').click();assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'false');
 await page.locator('#clear').click();console.log('Viewer layout and controls PASS');
 await page.setViewportSize({width:320,height:640});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
}finally{await browser.close();}
