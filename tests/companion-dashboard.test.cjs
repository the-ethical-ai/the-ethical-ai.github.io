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
    if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',value:'',hidden:id==='dashboard',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},querySelector(){return get(`${id}-button`);},querySelectorAll(){return [];},focus(){this.focused=true;},replaceChildren(){this.innerHTML='';this.textContent='';}});
    return elements.get(id);
  };
  const context = {document:{getElementById:get},window:{crypto:webcrypto},crypto:webcrypto,fetch:async()=>({ok:true,json:async()=>payload}),TextEncoder,TextDecoder,Uint8Array,atob:(s)=>Buffer.from(s,'base64').toString('binary'),Intl,Date};
  vm.runInNewContext(readFileSync('companion-analytics.js','utf8'),context);
  get('chart-scale').value='linear';
  const unlock = async (value) => {get('dashboard-password').value=value;await get('unlock-form').handlers.submit({preventDefault(){},currentTarget:get('unlock-form')});};
  await unlock('incorrect');
  assert.equal(get('dashboard').hidden,true);
  assert.match(get('access-message').textContent,/Check your password/);
  await unlock(password);
  assert.equal(get('dashboard').hidden,false);
  assert.equal(get('access-gate').hidden,true);
  assert.equal(get('dashboard-password').value,'');
  assert.match(get('summary-cards').innerHTML,/16.5M/);
  assert.match(get('summary-cards').innerHTML,/\+45.5%/); // same two platforms: 11 → 16
  assert.match(get('traffic-table').innerHTML,/Not recorded/);
  assert.match(get('traffic-table').innerHTML,/&lt;unsafe&gt;/);
  assert.equal((get('traffic-chart').innerHTML.match(/<circle /g)||[]).length,9);
  assert.match(get('traffic-chart').innerHTML,/stroke-dasharray/);
  assert.doesNotMatch(get('traffic-chart').innerHTML,/NaN|Infinity/);
  get('chart-scale').value='log';get('chart-scale').handlers.change();
  assert.match(get('traffic-chart').innerHTML,/Logarithmic/);
  assert.doesNotMatch(get('traffic-chart').innerHTML,/NaN|Infinity/);
  get('select-none').handlers.click();
  assert.match(get('traffic-chart').innerHTML,/Select a platform/);
  get('select-all').handlers.click();
  assert.equal((get('traffic-chart').innerHTML.match(/<circle /g)||[]).length,9);
  get('lock-dashboard').handlers.click();
  assert.equal(get('dashboard').hidden,true);
  assert.equal(get('access-gate').hidden,false);
  assert.equal(get('traffic-table').innerHTML,'');
  assert.equal(get('traffic-chart').innerHTML,'');
  assert.equal(get('select-top').onclick,null);
});
