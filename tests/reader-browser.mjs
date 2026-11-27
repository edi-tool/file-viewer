import {chromium,firefox,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {makeReaderPdf,makeTiff} from '../scripts/fixtures.mjs';
const profiles=[['desktop-chromium',chromium,{viewport:{width:1440,height:900}}],['desktop-firefox',firefox,{viewport:{width:1280,height:800}}],['mobile-webkit',webkit,{...devices['iPhone 13']}],['mobile-chromium',chromium,{...devices['Pixel 7']}]];
const selection=process.env.READER_PROFILE;
for(const [name,type,opts] of profiles.filter(p=>!selection||p[0]===selection)){
 const browser=await type.launch({headless:true});try{
 const page=await browser.newPage(opts),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{const u=new URL(r.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!=='http://127.0.0.1:8000'){external.push(u.href);return r.abort();}return r.continue();});
 await page.goto('http://127.0.0.1:8000/');
 const checkLayout=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');
 const wait=async(n)=>{await page.waitForFunction(n=>document.querySelector('#page').textContent===n+' / 12'&&document.querySelector('#preview canvas')&&document.querySelector('#preview').getAttribute('aria-busy')==='false',n,{timeout:20000});const rgb=await page.locator('#preview canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data));assert.deepEqual(rgb,n%2?[255,0,0,255]:[0,0,255,255]);};
 await page.locator('#pick').setInputFiles([{name:'reader.pdf',mimeType:'application/pdf',buffer:makeReaderPdf()},{name:'figure.tiff',mimeType:'image/tiff',buffer:makeTiff()}]);await wait(1);await checkLayout();
 assert.ok(await page.evaluate(()=>document.querySelector('.page-nav').getBoundingClientRect().top>=document.querySelector('#preview').getBoundingClientRect().bottom));
 await page.locator('#next').click();await wait(2);await page.locator('#last').click();await wait(12);await page.locator('#first').click();await wait(1);
 await page.locator('#page-number').fill('9');await page.locator('#jump-go').click();await wait(9);
 await page.locator('#page-number').fill('99');await page.locator('#jump-go').click();assert.equal(await page.locator('#page').textContent(),'9 / 12');await page.locator('#page-number').fill('9');
 await page.locator('#page-range').evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'));});await wait(4);
 await page.locator('#zoom').selectOption('1.5');assert.equal(await page.locator('#percent').textContent(),'150%');
 await page.locator('#file-next').click();await page.waitForFunction(()=>document.querySelector('#filename').textContent==='figure.tiff'&&document.querySelector('#preview canvas'));await page.locator('#file-prev').click();await wait(4);assert.equal(await page.locator('#percent').textContent(),'150%');
 await page.locator('#zoom').selectOption('fit');await page.locator('#expand').click();await checkLayout();
 assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'true');
 const view=await page.locator('#preview').boundingBox();assert.ok(view.height>80);
 await page.locator('#next').click();await wait(5);await page.locator('#preview').focus();await page.keyboard.press('PageDown');await wait(6);await page.keyboard.press('Home');await wait(1);await page.keyboard.press('End');await wait(12);
 await page.locator('#first').click();await wait(1);
 // Synthetic touch events verify gesture routing, not native device scrolling.
 await page.locator('#preview').evaluate(e=>{const a={clientX:180,clientY:100},b={clientX:70,clientY:105};for(const [type,props] of [['touchstart',{touches:[a]}],['touchend',{changedTouches:[b],touches:[]}]]){const event=new Event(type,{bubbles:true,cancelable:true});for(const [k,v] of Object.entries(props))Object.defineProperty(event,k,{value:v});e.dispatchEvent(event);}});
 await wait(2);
 await page.locator('#reading-direction').selectOption('rtl');await page.locator('#preview').evaluate(e=>{const a={clientX:70,clientY:100},b={clientX:180,clientY:102};for(const [type,props] of [['touchstart',{touches:[a]}],['touchend',{changedTouches:[b],touches:[]}]]){const event=new Event(type,{bubbles:true,cancelable:true});for(const [k,v] of Object.entries(props))Object.defineProperty(event,k,{value:v});e.dispatchEvent(event);}});await wait(3);
 if(name.startsWith('mobile')){await page.setViewportSize({width:844,height:390});await checkLayout();assert.ok((await page.locator('#preview').boundingBox()).height>60);await page.setViewportSize({width:390,height:844});}
 await page.locator('#expand').click();await page.locator('#files .file-remove').last().click();assert.equal(await page.locator('#count').textContent(),'1');await page.locator('#files .file-remove').first().click();assert.equal(await page.locator('#count').textContent(),'0');await checkLayout();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(name,'reader navigation PASS');
 }finally{await browser.close();}
}
