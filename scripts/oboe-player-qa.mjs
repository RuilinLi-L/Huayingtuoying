/** Real MindAR recognition using a generated test-card camera stream, not synthetic target events.
 * Run against dev or production: OBOE_BASE_URL=http://127.0.0.1:4173 npm run test:oboe-player
 * Requires Playwright + Chrome, or the Codex bundled Playwright runtime.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const output = resolve('.runtime/oboe-qa');
await mkdir(output, { recursive: true });
const base = process.env.OBOE_BASE_URL ?? 'http://127.0.0.1:4173';
const width = 640, height = 480;
const card = await sharp('public/assets/markers/default-card.png').resize({ width: 420, height: 290, fit: 'inside' }).png().toBuffer();
const cardInfo = await sharp(card).metadata();
const frame = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
  .composite([{ input: card, left: Math.floor((width-cardInfo.width)/2), top: Math.floor((height-cardInfo.height)/2) }]).removeAlpha().raw().toBuffer();
const blank = Buffer.alloc(width*height*3,255);
function yuv(rgb) {
  const y=Buffer.alloc(width*height), u=Buffer.alloc(width*height/4), v=Buffer.alloc(width*height/4);
  for(let row=0;row<height;row++) for(let col=0;col<width;col++) {
    const i=(row*width+col)*3, r=rgb[i], g=rgb[i+1], b=rgb[i+2];
    y[row*width+col]=Math.round(16+.257*r+.504*g+.098*b);
    if(row%2===0&&col%2===0) { const j=row/2*(width/2)+col/2; u[j]=Math.round(128-.148*r-.291*g+.439*b);v[j]=Math.round(128+.439*r-.368*g-.071*b); }
  }
  return Buffer.concat([y,u,v]);
}
const yes=yuv(frame), no=yuv(blank);
await writeFile(join(output,'card.y4m'),Buffer.concat([Buffer.from('YUV4MPEG2 W640 H480 F15:1 Ip A1:1 C420jpeg\n'),
  ...Array.from({length:180},(_,i)=>Buffer.concat([Buffer.from('FRAME\n'),i<120?yes:no]))]));
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-video-capture=${join(output,'card.y4m')}`] });
const results=[];
async function check(label,task) { const start=Date.now(); await task(); results.push({label,passed:true,ms:Date.now()-start}); console.log('PASS',label); }
const context=await browser.newContext({viewport:{width:393,height:852}});
await context.addInitScript(() => {
  if (window === window.top) { window.__streams=[]; window.__states=[]; window.__audioContexts=[];
    const NativeAudioContext=window.AudioContext;
    window.AudioContext=new Proxy(NativeAudioContext,{construct(Target,args){const context=new Target(...args);window.__audioContexts.push(context);return context;}}); window.addEventListener('message',event=>{if(event.data?.channel==='orchestra-ar')window.__states.push(event.data);}); }
  if (navigator.mediaDevices?.getUserMedia) {
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);window.top.__streams.push(stream);return stream;};
  }
});
const page=await context.newPage(), errors=[];
page.on('pageerror',error=>errors.push(error.message));
const modelPath='/assets/models/characters/oboe/scene.mobile.glb';
let modelRequests=0, audioRequests=0;
page.on('request',request=>{if(request.url().includes(modelPath))modelRequests++;if(/\.(mp3|m4a|wav)(\?|$)/.test(request.url()))audioRequests++;});
try {
  await check('Published model, target, runtime and vendors are served as actual assets',async()=>{
    for(const path of [modelPath,'/assets/markers/default-card.mind','/assets/markers/default-card.png','/ar/scene.html','/ar/scene.js','/vendor/mindar/mindar-image.prod.js']) {
      const response=await page.request.get(base+path);assert.equal(response.status(),200,path);
      if(!path.endsWith('.html'))assert.ok(!response.headers()['content-type']?.includes('text/html'),path);
    }
    const data=await readFile('public/assets/models/characters/oboe/scene.mobile.glb');
    const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
    assert.ok(data.length<10_000_000);assert.deepEqual(gltf.extensionsRequired??[],[]);
    const triangles=gltf.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0);
    assert.ok(triangles<=50000);
  });
  await check('Stage loads model only on demand, including NFC deep links without hidden camera',async()=>{
    await page.goto(base+'/stage?source=nfc');await page.getByRole('button',{name:'双簧管 3D',exact:true}).waitFor();
    assert.equal(modelRequests,0);assert.equal(await page.evaluate(()=>window.__streams.length),0);
    await page.getByRole('button',{name:'双簧管 3D',exact:true}).click();
    await page.getByRole('button',{name:'恢复视角'}).waitFor({timeout:30000});assert.equal(modelRequests,1);
    const canvas=page.locator('.instrument-model canvas');const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+20,{steps:10});await page.mouse.up();
    await page.getByRole('button',{name:'恢复视角'}).click();await page.screenshot({path:join(output,'stage.png')});
    await page.getByRole('button',{name:'乐团',exact:true}).click();assert.equal(await canvas.count(),0);
    await page.getByRole('button',{name:'双簧管 3D',exact:true}).click();await page.getByRole('button',{name:'恢复视角'}).waitFor();
    await page.getByRole('link',{name:'扫描体验',exact:true}).click();await page.getByRole('button',{name:'开始扫描',exact:true}).waitFor();
    await page.screenshot({path:join(output,'entry.png'),fullPage:true});assert.equal(audioRequests,0);
  });
  await check('Actual tracker recognizes card, loses blank frames, and reacquires',async()=>{
    await page.getByRole('button',{name:'开始扫描',exact:true}).click();
    await page.waitForFunction(()=>window.__states.some(item=>item.type==='status'&&item.value==='found'),{},{timeout:45000});
    await page.screenshot({path:join(output,'ar.png'),fullPage:true});
    await page.waitForFunction(()=>window.__states.some(item=>item.type==='status'&&item.value==='lost'),{},{timeout:30000});
    await page.waitForFunction(()=>{const states=window.__states.filter(i=>i.type==='status').map(i=>i.value);return states.slice(states.indexOf('lost')+1).includes('found');},{},{timeout:30000});
    assert.equal(audioRequests,0);assert.equal(await page.locator('iframe').count(),1);
  });
  await check('Five enter/exit cycles release every video track and remove every AR frame',async()=>{
    for(let i=0;i<5;i++) {
      if(i>0) {await page.getByRole('button',{name:'开始扫描',exact:true}).click();await page.frameLocator('iframe').locator('video').waitFor({timeout:30000});
        await page.waitForFunction(()=>window.__streams.some(s=>s.getTracks().some(t=>t.readyState==='live')));}
      await page.getByRole('button',{name:'关闭相机',exact:true}).click();assert.equal(await page.locator('iframe').count(),0);
      await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')),{},{timeout:10000});
    }
  });
  await check('AR model download failure offers retry and ordinary 3D fallback',async()=>{
    await page.route('**'+modelPath,route=>route.fulfill({status:404,body:'missing'}));
    await page.getByRole('button',{name:'开始扫描',exact:true}).click();await page.getByRole('button',{name:'重新启动相机'}).waitFor({timeout:45000});
    assert.equal(await page.locator('iframe').count(),0);await page.unroute('**'+modelPath);
    await page.getByRole('button',{name:'普通 3D 预览',exact:true}).click();await page.getByRole('button',{name:'恢复视角'}).waitFor();
  });
  await check('Viewer download failure retries successfully',async()=>{
    await page.goto(base+'/experience/oboe-player');await page.route('**'+modelPath,route=>route.fulfill({status:404,body:'missing'}));
    await page.getByRole('button',{name:'普通 3D 预览',exact:true}).click();await page.getByRole('button',{name:'重新加载模型'}).waitFor();
    await page.unroute('**'+modelPath);await page.getByRole('button',{name:'重新加载模型'}).click();await page.getByRole('button',{name:'恢复视角'}).waitFor();
  });
  await check('Camera permission denial is recoverable',async()=>{
    const denied=await browser.newContext({viewport:{width:393,height:852}});
    await denied.addInitScript(()=>{if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
    const p=await denied.newPage();await p.goto(base+'/experience/oboe-player');await p.getByRole('button',{name:'开始扫描',exact:true}).click();
    await p.getByText('相机权限未开启',{exact:false}).waitFor({timeout:30000});await p.getByRole('button',{name:'普通 3D 预览',exact:true}).click();await p.getByRole('button',{name:'恢复视角'}).waitFor();await denied.close();
  });
  await check('No-camera fallback, WeChat guidance, and mobile layout',async()=>{
    const fallback=await browser.newContext({viewport:{width:393,height:852},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MicroMessenger/8.0'});
    await fallback.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true}));
    const p=await fallback.newPage();await p.goto(base+'/experience/oboe-player');await p.getByText('在 Safari 中打开',{exact:false}).waitFor();
    assert.equal(await p.getByRole('button',{name:'开始扫描',exact:true}).count(),0);
    await p.getByRole('button',{name:'普通 3D 预览',exact:true}).click();await p.getByRole('button',{name:'恢复视角'}).waitFor();
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await fallback.close();
  });
  await check('Manual audio survives target loss and stops on leaving the page',async()=>{
    await page.goto(base+'/experience/oboe-player');
    await page.getByRole('button',{name:'双簧管试听',exact:true}).click();
    await page.getByRole('button',{name:'暂停试听',exact:true}).waitFor({timeout:30000});
    assert.ok(audioRequests>0);
    await page.getByRole('button',{name:'开始扫描',exact:true}).click();
    await page.waitForFunction(()=>window.__states.some(item=>item.type==='status'&&item.value==='lost'),{},{timeout:45000});
    assert.ok(await page.getByRole('button',{name:'暂停试听',exact:true}).isVisible());
    await page.getByRole('button',{name:'暂停试听',exact:true}).click();
    await page.getByRole('button',{name:'双簧管试听',exact:true}).click();
    await page.getByRole('button',{name:'暂停试听',exact:true}).waitFor();
    const oldContexts=await page.evaluate(()=>window.__audioContexts.length);
    await page.getByRole('link',{name:'← 返回舞台',exact:true}).click();
    await page.waitForFunction(count=>window.__audioContexts.slice(0,count).every(context=>context.state==='closed'),oldContexts);
    assert.equal(await page.locator('iframe').count(),0);
    await page.waitForFunction(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  });
  await check('Original orchestra selection and playback, plus encyclopedia model',async()=>{
    await page.goto(base+'/stage');
    const oboe=page.locator('[data-musician-id="oboe"]');
    assert.equal(await oboe.getAttribute('aria-pressed'),'true');await oboe.click();assert.equal(await oboe.getAttribute('aria-pressed'),'false');
    await oboe.click();await page.getByRole('button',{name:'播放演奏',exact:true}).click();
    await page.getByRole('button',{name:'暂停演奏',exact:true}).waitFor({timeout:90000});
    await page.getByRole('button',{name:'暂停演奏',exact:true}).click();
    await page.goto(base+'/knowledge/instruments/oboe');
    await page.getByRole('button',{name:'查看 3D 模型',exact:true}).click();
    await page.locator('.instrument-model').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'恢复视角'}).waitFor({timeout:30000});
    await page.screenshot({path:join(output,'encyclopedia.png'),fullPage:true});
  });
  assert.deepEqual(errors,[]);
  await writeFile(join(output,'results.json'),JSON.stringify({base,results,errors,limitations:'Desktop Chrome synthetic camera. Physical iPhone Safari/Android Chrome, lighting and performance require device QA.'},null,2));
} finally { await browser.close(); }
