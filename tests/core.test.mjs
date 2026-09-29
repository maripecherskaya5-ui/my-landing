import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, submitLead } from '../public/core.js';
const values = { contact: '@maria', task: 'Нужен сайт для консультаций' };
test('validatesBoundaries', () => {
  for (const n of [2,3,200,201]) assert.equal(validateLead({ ...values, contact:'а'.repeat(n) }).valid,n>=3 && n<=200);
  for (const n of [9,10,3000,3001]) assert.equal(validateLead({ ...values, task:'я'.repeat(n) }).valid,n>=10 && n<=3000);
  assert.equal(validateLead({...values,contact:'😀'.repeat(200)}).valid,true);
  assert.equal(validateLead({...values,contact:'😀'.repeat(201)}).valid,false);
});
test('rejectsWhitespaceAndNonStrings', () => {
  for (const contact of ['   ',null,42,{},[]]) assert.equal(validateLead({...values,contact}).valid,false);
  assert.equal(validateLead(null).valid,false);
  assert.equal(validateLead({...values,task:' '.repeat(40)}).valid,false);
});
test('acceptsContactFormats', () => { for (const contact of ['hello@example.com','@username','+375 (29) 123-45-67']) assert.equal(validateLead({...values,contact}).valid,true); assert.equal(validateLead({...values,contact:'  @maria  '}).values.contact,'@maria'); });
test('preview never sends', async () => { let sent=0; const res=await submitLead(values,{endpoint:'',fetchImpl:async()=>{sent++;}});assert.equal(res.status,'preview');assert.equal(sent,0); });
test('invalid endpoints and invalid payload never send',async()=>{for(const endpoint of ['https://example.com','//example.com','/\\example.com','/api\nlead','/%2f%2fexample.com']){let sent=0;assert.equal((await submitLead(values,{endpoint,fetchImpl:async()=>{sent++;}})).status,'error');assert.equal(sent,0);} let sent=0;assert.equal((await submitLead({...values,task:''},{endpoint:'/api/lead',fetchImpl:async()=>{sent++;}})).status,'error');assert.equal(sent,0);});
test('success requires explicit acceptance and sends trimmed fields only',async()=>{
  let received;
  const res=await submitLead({...values,contact:' @maria ',secret:'omit'},{endpoint:'/api/lead',fetchImpl:async(url,options)=>{received={url,options};return Response.json({ok:true});}});
  assert.equal(res.status,'success');assert.equal(received.url,'/api/lead');assert.deepEqual(JSON.parse(received.options.body),values);assert.equal(received.options.redirect,'error');
});
test('malformed or negative responses never succeed',async()=>{
  for(const response of [Response.json({ok:false}),new Response(null,{status:204}),new Response('<html>error</html>'),Response.json({ok:true},{status:400}),Response.json({ok:true},{status:500}),Response.json({ok:'true'}),Response.json(null)]) assert.equal((await submitLead(values,{endpoint:'/api/lead',fetchImpl:async()=>response})).status,'error');
});
test('rate limit is distinct',async()=>assert.equal((await submitLead(values,{endpoint:'/api/lead',fetchImpl:async()=>new Response('',{status:429})})).status,'rate_limited'));
test('network failure is safe',async()=>assert.equal((await submitLead(values,{endpoint:'/api/lead',fetchImpl:async()=>{throw new Error('internal secret');}})).status,'error'));
test('timeout aborts request',async()=>{
  let aborted=false;
  const res=await submitLead(values,{endpoint:'/api/lead',timeoutMs:10,fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('abort'));}))});
  assert.equal(res.status,'error');assert.equal(aborted,true);
});
