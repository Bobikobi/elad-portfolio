// Flight rig (Elad items 2+11): records camera + planet probes per frame over 12 focus changes.
// Usage: BASE=http://localhost:3102 OUT=.harness-out/flight/x.json [W=390 H=844] node scripts/harness/flight.mjs
// then: python3 scripts/harness/flight.py .harness-out/flight/x.json
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
const BYPASS=(()=>{try{return fs.readFileSync(os.homedir()+'/.claude/secrets/vercel-bypass.txt','utf8').trim()||null}catch{return null}})();
const BASE=process.env.BASE, W=+(process.env.W||1440), H=+(process.env.H||900), MOB=W<700, OUT=process.env.OUT;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',pipe:true,userDataDir:fs.mkdtempSync(os.tmpdir()+'/flight-'),args:['--use-gl=angle','--use-angle=vulkan','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars']});
console.log('PID',browser.process().pid);
const page=await browser.newPage(); const c=await page.createCDPSession();
await c.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:MOB?3:1,mobile:MOB});
// A phone is a touch device: without this the page reads `pointer: fine`, never enters the
// mobile orrery (tour mode) and flies the desktop shots in a portrait window (#70).
if(MOB) await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
const KEYS=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
await c.send('Page.enable');
if(BYPASS&&/vercel\.app/.test(BASE)){await c.send('Network.enable');await c.send('Network.setExtraHTTPHeaders',{headers:{'x-vercel-protection-bypass':BYPASS}});}
await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__rec=[];(function tick(){const T=window.__three;if(T&&window.__labelProbe){const cm=T.camera,q=cm.quaternion,p=cm.position;const b={};for(const k of ${JSON.stringify(KEYS)}){const r=window.__labelProbe(k,0);if(r)b[k]=[+r.x.toFixed(1),+r.y.toFixed(1),+r.rPx.toFixed(2),r.off?1:0,r.behind?1:0];}let rg=null;if(!window.__ringMesh||!window.__ringMesh.parent){window.__ringMesh=null;T.scene.traverse(o=>{if(!window.__ringMesh&&o.isMesh&&o.geometry&&o.geometry.type==='RingGeometry'&&o.geometry.parameters.thetaSegments>=128)window.__ringMesh=o;});}const RM=window.__ringMesh;if(RM){RM.updateWorldMatrix(true,false);const c=new T.THREE.Vector3().setFromMatrixPosition(RM.matrixWorld);const n=new T.THREE.Vector3(0,0,1).transformDirection(RM.matrixWorld);const v=p.clone().sub(c);rg=[+(Math.asin(Math.max(-1,Math.min(1,v.dot(n)/v.length())))*57.2958).toFixed(3),+v.length().toFixed(3)];}const f=window.__flight;window.__rec.push({t:+performance.now().toFixed(1),path:location.pathname,p:[p.x,p.y,p.z],q:[q.x,q.y,q.z,q.w],fov:cm.fov,b,rg,fl:f?[f.on?1:0,+f.el.toFixed(3),+f.dur.toFixed(3),f.act,f.fr]:null});}requestAnimationFrame(tick)})();`});
const ev=async(e)=>(await c.send('Runtime.evaluate',{expression:e,returnByValue:true})).result.value;
const marks=[];
// Each mark also carries the bodies' world positions, so the analysis can tell how far the view
// has to turn before the destination can be in frame at all (#70).
const mark=async(label)=>{marks.push({label,t:await ev('performance.now()'),bodies:await ev("window.__flight?Object.fromEntries([...window.__flight.bodies].map(([k,v])=>[k,[v.x,v.y,v.z]])):null")});};
const nav=async(slug)=>ev(`(()=>{const a=[...document.querySelectorAll('a')].find(a=>new RegExp('/${slug}$').test(a.getAttribute('href')||''));if(a){a.click();return true}return false})()`);
const back=async()=>ev(`(()=>{const a=document.querySelector('[data-world-back]');if(a){a.click();return true}return false})()`);
const pill=async(k)=>ev(`(()=>{const a=document.querySelector('[data-planet-label="${k}"]');if(a){a.click();return true}return false})()`);
const WAIT=+(process.env.WAIT||5000);
try{
  await c.send('Page.navigate',{url:`${BASE}/about`}); await sleep(12000);
  await ev('window.__rec.length=0');
  for(const [label,fn] of [
    ['earth>jupiter',()=>nav('services')],['jupiter>saturn',()=>nav('projects')],['saturn>mars',()=>nav('contact')],
    ['mars>belt',()=>nav('technologies')],['belt>earth',()=>nav('about')],['earth>overview',back],
    ['overview>saturn',()=>pill('saturn')],['saturn>overview',back],['overview>mars',()=>pill('mars')],
    ['mars>jupiter',()=>nav('services')],['jupiter>overview',back],['overview>earth',()=>pill('earth')],
  ]){ await mark(label); const ok=await fn(); if(!ok) console.log('NOCLICK',label); await sleep(WAIT); }
  await mark('end');
  const rec=await ev('window.__rec');
  fs.writeFileSync(OUT,JSON.stringify({W,H,marks,rec}));
  console.log('frames',rec.length);
}finally{await browser.close();}
