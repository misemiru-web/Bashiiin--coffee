import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../index.mjs';
import { createContactHandler } from './api.mjs';
import { readJson, validatePayload, MAX_BODY_BYTES, validEmail } from './validation.mjs';
import { SITEVERIFY, verifyTurnstile } from './turnstile.mjs';
import { notification, sendNotification } from './mail.mjs';

// Reserved .test addresses, opaque non-credential strings, and in-memory mocks only.
const ORIGIN = 'https://unit.test';
const valid = () => ({ name: 'テスト担当', email: 'visitor@unit.test', message: 'テスト本文\n2行目', turnstileToken: 'opaque-unit-token' });
const request = (payload = valid(), options = {}) => new Request(ORIGIN + '/api/contact', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify(payload), ...options,
});
function setup() {
  const calls = { rate: [], verify: [], mail: [] };
  const env = {
    CONTACT_API_ENABLED: 'true', EMAIL_SENDING_ENABLED: 'true',
    CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: 'unit.test', TURNSTILE_SECRET_KEY: 'opaque-unit-secret-not-a-real-key',
    CONTACT_FROM: 'sender@unit.test', CONTACT_TO: 'store@unit.test',
    CONTACT_RATE_LIMITER: { limit: async value => { calls.rate.push(value); return { success: true }; } },
    EMAIL: { send: async value => { calls.mail.push(value); return { messageId: 'unit-receipt' }; } },
  };
  const fetchImpl = async (url, init) => {
    calls.verify.push({ url, init });
    return Response.json({ success: true, hostname: 'unit.test', action: 'contact' });
  };
  return { env, calls, handler: createContactHandler({ fetchImpl }) };
}
async function expectStatus(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('Content-Type'), /^application\/json/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  const body = await response.json();
  assert.equal(body.ok, status === 200);
  if (code) assert.equal(body.code, code);
  return body;
}

test('initial/default API is 503; no input read, Siteverify or email', async () => {
  const { env, calls, handler } = setup(); env.CONTACT_API_ENABLED = 'false';
  let reads = 0;
  const req = { method: 'POST', get body() { reads++; throw Error('must not read'); } };
  await expectStatus(await handler(req, env), 503, 'SERVICE_UNAVAILABLE');
  assert.equal(reads, 0); assert.deepEqual(calls, { rate: [], verify: [], mail: [] });
  await expectStatus(await worker.fetch(request(), {}), 503);
});
for (const key of ['CONTACT_API_ENABLED', 'EMAIL_SENDING_ENABLED', 'TURNSTILE_SECRET_KEY', 'CONTACT_ORIGIN', 'TURNSTILE_HOSTNAME', 'CONTACT_FROM', 'CONTACT_TO', 'EMAIL', 'CONTACT_RATE_LIMITER']) {
  test(`missing ${key} fails closed before upstreams`, async () => {
    const { env, calls, handler } = setup(); delete env[key];
    await expectStatus(await handler(request(), env), 503); assert.equal(calls.verify.length + calls.mail.length, 0);
  });
}
for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']) {
  test(`${method} cannot submit`, async () => {
    const { env, calls, handler } = setup();
    const r = await handler(new Request(ORIGIN + '/api/contact', { method }), env);
    assert.equal(r.headers.get('Allow'), 'POST'); await expectStatus(r, 405, 'METHOD_NOT_ALLOWED');
    assert.equal(calls.verify.length + calls.mail.length, 0);
  });
}
test('headers/query cannot enable disabled API', async () => {
  const { env, calls, handler } = setup(); env.CONTACT_API_ENABLED = 'false';
  await expectStatus(await handler(new Request(ORIGIN + '/api/contact?CONTACT_API_ENABLED=true&EMAIL_SENDING_ENABLED=true', {
    method: 'POST', headers: { 'X-Test-Mode': 'true', 'CONTACT_API_ENABLED': 'true' }, body: '{}',
  }), env), 503); assert.equal(calls.verify.length + calls.mail.length, 0);
});
for (const origin of [null, 'null', 'https://other.test', 'https://unit.test.evil.test']) {
  test(`Origin policy rejects ${origin}`, async () => {
    const { env, calls, handler } = setup(); const req = request();
    if (origin === null) req.headers.delete('Origin'); else req.headers.set('Origin', origin);
    await expectStatus(await handler(req, env), 403); assert.equal(calls.verify.length + calls.mail.length, 0);
  });
}
test('cross-site metadata rejected even with matching Origin', async () => {
  const { env, handler } = setup(); const r = request(); r.headers.set('Sec-Fetch-Site', 'cross-site');
  await expectStatus(await handler(r, env), 403);
});
for (const [key, value] of [['CONTACT_API_ENABLED', true], ['EMAIL_SENDING_ENABLED', 'TRUE'], ['CONTACT_ORIGIN', 'http://unit.test'], ['TURNSTILE_HOSTNAME', 'other.test'], ['CONTACT_FROM', 'sender@unit.test\r\nBcc: victim@other.test']]) {
  test(`invalid server setting ${key} rejected`, async () => {
    const { env, handler } = setup(); env[key] = value; await expectStatus(await handler(request(), env), 503);
  });
}
test('rate limit deny returns 429; no verification or mail', async () => {
  const { env, calls, handler } = setup(); env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
  await expectStatus(await handler(request(), env), 429, 'RATE_LIMITED'); assert.equal(calls.verify.length + calls.mail.length, 0);
});
test('rate service error fails closed', async () => {
  const { env, handler } = setup(); env.CONTACT_RATE_LIMITER.limit = async () => { throw Error('private error'); };
  await expectStatus(await handler(request(), env), 503);
});
for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/json; charset=shift_jis']) {
  test(`unsupported content type ${type}`, async () => {
    const { env, handler } = setup(); const r = request(); r.headers.set('Content-Type', type);
    await expectStatus(await handler(r, env), 415);
  });
}
for (const text of ['{', '', 'NaN', '{"name":']) {
  test(`malformed JSON length ${text.length}`, async () => {
    const { env, handler } = setup(); await expectStatus(await handler(request(undefined, { body: text }), env), 400, 'INVALID_JSON');
  });
}
for (const payload of [null, [], 'string', 1, { ...valid(), to: 'attacker@other.test' }, { ...valid(), extra: {} }]) {
  test(`invalid structure ${JSON.stringify(payload).length}`, async () => {
    const { env, calls, handler } = setup(); await expectStatus(await handler(request(payload), env), 400, 'INVALID_STRUCTURE');
    assert.equal(calls.verify.length + calls.mail.length, 0);
  });
}
for (const key of ['name', 'email', 'message', 'turnstileToken']) {
  for (const value of [undefined, '', ' \n\t ', 123, {}]) {
    test(`${key} rejects missing/blank/type ${String(value)}`, async () => {
      const { env, calls, handler } = setup(); const data = { ...valid(), [key]: value };
      const body = await expectStatus(await handler(request(data), env), 400, 'VALIDATION_FAILED');
      assert.ok(body.fields[key]); assert.equal(calls.verify.length + calls.mail.length, 0);
    });
  }
}
for (const email of ['bad', 'a@@b.test', 'a b@unit.test', 'a@-unit.test', 'a@unit.test\r\nBcc:x@y.test', 'a@unit.test\n']) {
  test('invalid email/header characters rejected', () => assert.equal(validEmail(email), false));
}
test('UTF-16 boundaries match frontend; raw length checked before trimming', () => {
  for (const [key, max] of [['name',100],['message',5000],['turnstileToken',2048]]) {
    assert.equal(validatePayload({ ...valid(), [key]: 'あ'.repeat(max) })[key].length, max);
    assert.throws(() => validatePayload({ ...valid(), [key]: 'あ'.repeat(max + 1) }));
  }
  assert.equal(validatePayload({ ...valid(), name: '😀'.repeat(50) }).name.length, 100);
  assert.throws(() => validatePayload({ ...valid(), name: '😀'.repeat(51) }));
  const email = 'a'.repeat(64) + '@' + ['b'.repeat(63),'c'.repeat(63),'d'.repeat(61)].join('.');
  assert.equal(email.length, 254); assert.equal(validatePayload({ ...valid(), email }).email, email);
  assert.throws(() => validatePayload({ ...valid(), email: email + 'x' }));
});
test('header injection and control bytes rejected; message line breaks retained', () => {
  assert.throws(() => validatePayload({ ...valid(), name: 'A\r\nBcc: x@y.test' }));
  assert.throws(() => validatePayload({ ...valid(), message: 'A\0B' }));
  assert.equal(validatePayload(valid()).message, valid().message);
});
test('declared oversized body is rejected without reading', async () => {
  const { env, handler } = setup(); const r = request(); r.headers.set('Content-Length', String(MAX_BODY_BYTES + 1));
  await expectStatus(await handler(r, env), 413);
});
test('streaming limit stops reading before EOF even with no Content-Length', async () => {
  const { env, calls, handler } = setup(); let reads = 0, cancelled = false;
  const stream = new ReadableStream({ pull(c) { reads++; c.enqueue(new Uint8Array(16384)); }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
  const r = request(undefined, { body: stream, duplex: 'half' });
  await expectStatus(await handler(r, env), 413); assert.ok(reads <= 4); assert.ok(cancelled); assert.equal(calls.verify.length + calls.mail.length, 0);
});
test('stalled body times out and cancels', async () => {
  let cancelled = false;
  const r = request(undefined, { body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: 'half' });
  await assert.rejects(() => readJson(r, 10), e => e.code === 'REQUEST_TIMEOUT'); assert.ok(cancelled);
});
test('invalid UTF-8 rejected', async () => {
  await assert.rejects(() => readJson(request(undefined, { body: new Uint8Array([0xff]) })), e => e.code === 'INVALID_JSON');
});
test('successful notification uses fixed destination and safe replyTo after Siteverify', async () => {
  const { env, calls, handler } = setup(); await expectStatus(await handler(request(), env), 200);
  assert.equal(calls.verify[0].url, SITEVERIFY); assert.equal(calls.verify[0].init.redirect, 'manual');
  assert.equal(calls.verify[0].init.body.get('response'), valid().turnstileToken);
  assert.deepEqual(calls.mail[0], { from: env.CONTACT_FROM, to: env.CONTACT_TO, replyTo: valid().email,
    subject: 'Bashiiin! coffee お問い合わせ', text: `お名前：${valid().name}\nメールアドレス：${valid().email}\n\nお問い合わせ内容：\n${valid().message}` });
  assert.equal(calls.mail.length, 1); assert.deepEqual(calls.rate, [{ key: 'contact:submission' }]);
});
for (const result of [{ success:false, 'error-codes':['timeout-or-duplicate'] }, { success: true, hostname:'other.test', action:'contact' }, { success:true, hostname:'unit.test', action:'other' }, {success:'true'}, null]) {
  test('failed/expired/reused/hostname/action mismatch blocks mail', async () => {
    const { env, calls } = setup(); const handler = createContactHandler({ fetchImpl: async () => Response.json(result) });
    await expectStatus(await handler(request(), env), 400, 'VERIFICATION_FAILED'); assert.equal(calls.mail.length, 0);
  });
}
for (const fetchImpl of [async()=>{throw Error('token/private');},async()=>new Response('bad'),async()=>new Response('{}',{status:500})]) {
  test('Siteverify outage or malformed response fails closed', async () => {
    const { env, calls } = setup(); await expectStatus(await createContactHandler({fetchImpl})(request(),env),503,'VERIFICATION_UNAVAILABLE');assert.equal(calls.mail.length,0);
  });
}
test('Siteverify timeout aborts network', async () => {
  let signal;
  await assert.rejects(()=>verifyTurnstile('opaque','opaque','unit.test',async(_url,init)=>{signal=init.signal;return new Promise(()=>{});},10),e=>e.code==='VERIFICATION_UNAVAILABLE');
  assert.equal(signal.aborted,true);
});
test('concurrent replay: Siteverify single-use mock permits one mail only', async () => {
  const { env, calls } = setup(); const tokens = new Set();
  const handler = createContactHandler({fetchImpl:async(_url,init)=>{
    const token=init.body.get('response');const success=!tokens.has(token);tokens.add(token);
    return Response.json({success,hostname:'unit.test',action:'contact'});
  }});
  const responses=await Promise.all([handler(request(),env),handler(request(),env)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal(calls.mail.length,1);
});
for (const send of [async()=>{throw Error('private provider body');},async()=>undefined,async()=>({messageId:''})]) {
  test('mail must be accepted before ok:true; failures return no PII',async()=>{
    const {env,handler}=setup();env.EMAIL.send=send;const r=await handler(request(),env);await expectStatus(r,503,'MAIL_UNAVAILABLE');
  });
}
test('mail timeout never reports success and does not retry',async()=>{
  let calls=0;await assert.rejects(()=>sendNotification({send:()=>{calls++;return new Promise(()=>{});}}, {},10),e=>e.code==='MAIL_UNAVAILABLE');assert.equal(calls,1);
});
test('notification rejects configured destination/header injection',()=>{
  assert.throws(()=>notification(valid(),{from:'a@unit.test',to:'b@unit.test\r\nBcc:c@other.test'}));
});
test('responses/logs never expose input, tokens, secrets or upstream errors',async()=>{
  const {env,handler}=setup();const logs=[];const previous={...console};
  for(const name of ['log','info','warn','error','debug']) console[name]=(...args)=>logs.push(args);
  try {
    const r=await handler(request({...valid(),name:123,message:'private-sentinel',turnstileToken:'token-sentinel'}),env);
    const text=await r.text();for(const s of ['private-sentinel','token-sentinel',env.TURNSTILE_SECRET_KEY])assert.ok(!text.includes(s));assert.deepEqual(logs,[]);
  } finally {for(const name of ['log','info','warn','error','debug'])console[name]=previous[name];}
});
test('unknown API is JSON 404; non-API fallback uses ASSETS',async()=>{
  await expectStatus(await worker.fetch(new Request(ORIGIN+'/api/unknown'),{}),404,'NOT_FOUND');
  await expectStatus(await worker.fetch(new Request(ORIGIN+'/api/contact/'),{}),404);
  let called=false;const r=await worker.fetch(new Request(ORIGIN+'/about/'),{ASSETS:{fetch:async()=>{called=true;return new Response('asset');}}});
  assert.equal(await r.text(),'asset');assert.ok(called);
});
test('invalid email is a field code only at HTTP boundary',async()=>{
  const {env,handler,calls}=setup();const r=await handler(request({...valid(),email:'private-invalid-value'}),env);
  const body=await expectStatus(r,400,'VALIDATION_FAILED');assert.deepEqual(body.fields,{email:'INVALID_FORMAT'});assert.equal(calls.mail.length,0);
});
test('exact body-byte boundary accepted; one byte over rejected',async()=>{
  const {env,handler}=setup();const base=JSON.stringify(valid());
  const body=base+' '.repeat(MAX_BODY_BYTES-new TextEncoder().encode(base).length);
  await expectStatus(await handler(request(undefined,{body}),env),200);
  await expectStatus(await handler(request(undefined,{body:body+' '}),env),413);
});
test('declared small Content-Length does not bypass streaming size limit',async()=>{
  const {env,handler}=setup();const r=request(undefined,{body:' '.repeat(MAX_BODY_BYTES+1)});r.headers.set('Content-Length','1');
  await expectStatus(await handler(r,env),413);
});
test('compressed body is not accepted',async()=>{
  const {env,handler}=setup();const r=request();r.headers.set('Content-Encoding','gzip');await expectStatus(await handler(r,env),415);
});
test('same Origin header on a different request origin is rejected',async()=>{
  const {env,handler}=setup();const r=new Request('https://other.test/api/contact',request());await expectStatus(await handler(r,env),403);
});
test('blank secret and malformed binding results fail closed',async()=>{
  for(const patch of [{TURNSTILE_SECRET_KEY:' '},{EMAIL:{}},{CONTACT_RATE_LIMITER:{}},{CONTACT_RATE_LIMITER:{limit:async()=>({})}}]){
    const {env,handler,calls}=setup();Object.assign(env,patch);await expectStatus(await handler(request(),env),503);assert.equal(calls.mail.length+calls.verify.length,0);
  }
});

for (const status of [300, 301, 302, 303, 304, 307, 308, 399]) {
  test(`Siteverify redirect ${status} rejects success-shaped JSON without reading or following`, async () => {
    const { env, calls } = setup(); let requests = 0, jsonReads = 0;
    const handler = createContactHandler({ fetchImpl: async (url, init) => {
      requests++; assert.equal(url, SITEVERIFY); assert.equal(init.redirect, 'manual');
      return { status, ok: true, headers: new Headers({ Location: 'https://redirect-target.invalid/' }),
        json: async () => { jsonReads++; return { success: true, hostname: 'unit.test', action: 'contact' }; } };
    } });
    await expectStatus(await handler(request(), env), 503, 'VERIFICATION_UNAVAILABLE');
    assert.equal(requests, 1); assert.equal(jsonReads, 0); assert.equal(calls.mail.length, 0);
  });
}
