const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { webcrypto } = require('node:crypto');
const vm = require('node:vm');

test('encrypted unlock, missing observations, filters, scale, and relock', async () => {
  const fixture = {updated:'2026-10-29',months:['2026-03','2026-07','2026-08','2026-09'],platforms:[
    {name:'First.ai',visits:[10,20,15,12]},
    {name:'Later.ai',visits:[null,null,null,0.5]},
    {name:'<unsafe>',visits:[1,2,3,4]}
  ]};
  const password = 'Fixture-only-123!';
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const iterations = 600000;
  const material = await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
  const ciphertext = await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(fixture)));
  const payload = {salt:Buffer.from(salt).toString('base64'),iv:Buffer.from(iv).toString('base64'),iterations,ciphertext:Buffer.from(ciphertext).toString('base64')};
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',value:'',hidden:id==='dashboard' || id==='chart-tooltip',style:{},offsetWidth:220,offsetHeight:100,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},querySelector(){return get(`${id}-button`);},querySelectorAll(){return [];},focus(){this.focused=true;},replaceChildren(){this.innerHTML='';this.textContent='';}});
    return elements.get(id);
  };
  const context = {document:{getElementById:get,addEventListener:(type,fn)=>get('document').addEventListener(type,fn)},window:{crypto:webcrypto,innerWidth:1000,innerHeight:700,addEventListener:(type,fn)=>get('window').addEventListener(type,fn)},crypto:webcrypto,fetch:async()=>({ok:true,json:async()=>payload}),TextEncoder,TextDecoder,Uint8Array,atob:(s)=>Buffer.from(s,'base64').toString('binary'),Intl,Date};
  vm.runInNewContext(readFileSync('companion-analytics.js','utf8'),context);
  get('chart-scale').value='linear';
  const unlock = async (value) => {get('dashboard-password').value=value;await get('unlock-form').handlers.submit({preventDefault(){},currentTarget:get('unlock-form')});};
  await unlock('incorrect');
  assert.equal(get('dashboard').hidden,true);
  assert.match(get('access-message').textContent,/Check your password/);
  await unlock(password);
  assert.equal(get('dashboard').hidden,false);
  assert.equal(get('access-gate').hidden,true);
  assert.equal(get('access-screen').hidden,true);
  assert.equal(get('dashboard-password').value,'');
  assert.match(get('summary-cards').innerHTML,/16.500M/);
  assert.match(get('summary-cards').innerHTML,/\+45.5%/); // same two platforms: 11 → 16
  assert.match(get('traffic-table').innerHTML,/Not recorded/);
  assert.match(get('traffic-table').innerHTML,/&lt;unsafe&gt;/);
  assert.equal((get('traffic-chart').innerHTML.match(/<circle /g)||[]).length,9);
  assert.match(get('traffic-chart').innerHTML,/stroke-dasharray/);
  assert.doesNotMatch(get('traffic-chart').innerHTML,/NaN|Infinity/);
  const point = {dataset:{platform:'1',month:'3'},attributes:{},closest(){return this;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},getBoundingClientRect(){return {left:970,width:10,top:20,bottom:30};}};
  get('traffic-chart').handlers.pointerover({target:point});
  assert.equal(get('chart-tooltip').hidden,false);
  assert.match(get('chart-tooltip').innerHTML,/Later.ai/);
  assert.match(get('chart-tooltip').innerHTML,/September 2026/);
  assert.match(get('chart-tooltip').innerHTML,/500,000 visits/);
  assert.equal(point.attributes['aria-describedby'],'chart-tooltip');
  assert.equal(get('chart-tooltip').style.left,'768px'); // stay within the viewport
  assert.equal(get('chart-tooltip').style.top,'42px'); // flip below points at the top
  get('document').handlers.keydown({key:'Escape'});
  assert.equal(get('chart-tooltip').hidden,true);
  assert.equal(point.attributes['aria-describedby'],undefined);
  point.dataset.platform='2';
  get('traffic-chart').handlers.focusin({target:point});
  assert.match(get('chart-tooltip').innerHTML,/&lt;unsafe&gt;/);
  assert.match(get('chart-tooltip').innerHTML,/4,000,000 visits/);
  get('traffic-chart').handlers.focusout({target:point});
  assert.equal(get('chart-tooltip').hidden,true);
  get('chart-scale').value='log';get('chart-scale').handlers.change();
  assert.match(get('traffic-chart').innerHTML,/Logarithmic/);
  assert.doesNotMatch(get('traffic-chart').innerHTML,/NaN|Infinity/);
  get('select-none').handlers.click();
  assert.match(get('traffic-chart').innerHTML,/Select a platform/);
  get('select-all').handlers.click();
  assert.equal((get('traffic-chart').innerHTML.match(/<circle /g)||[]).length,9);
  get('lock-dashboard').handlers.click();
  assert.equal(get('chart-tooltip').hidden,true);
  assert.equal(get('chart-tooltip').innerHTML,'');
  assert.equal(get('dashboard').hidden,true);
  assert.equal(get('access-gate').hidden,false);
  assert.equal(get('access-screen').hidden,false);
  assert.equal(get('traffic-table').innerHTML,'');
  assert.equal(get('traffic-chart').innerHTML,'');
  assert.equal(get('select-top').onclick,null);
});
