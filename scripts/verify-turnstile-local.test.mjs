import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { checkToken, mockFetch, readHidden, main, HOSTNAME } from './verify-turnstile-local.mjs';
import { SITEVERIFY } from '../worker/contact/turnstile.mjs';

const secret = 'synthetic-private-secret', token = 'synthetic-private-token';
const output = () => ({ text: '', isTTY: true, write(text) { this.text += text; } });
function terminal() {
  const input = new EventEmitter(), signals = new EventEmitter(), sink = output();
  Object.assign(input, { isTTY: true, isRaw: false, modes: [], setRawMode(value) { this.isRaw = value; this.modes.push(value); }, pause() {}, resume() {} });
  return { input, signals, output: sink };
}
for (const [kind, type] of [['success','VERIFIED'], ['invalid','INVALID_TOKEN'], ['expired','TIMEOUT_OR_DUPLICATE'],
  ['hostname','HOSTNAME_MISMATCH'], ['action','ACTION_MISMATCH'], ['network','VERIFICATION_UNAVAILABLE'],
  ['timeout','VERIFICATION_UNAVAILABLE'], ['http','VERIFICATION_UNAVAILABLE'], ['json','VERIFICATION_UNAVAILABLE']]) {
  test(`isolated verifier ${kind}`, async () => {
    let calls = 0;
    const transport = mockFetch(kind);
    const result = await checkToken(token, secret, async (url, init) => {
      calls++; assert.equal(url, SITEVERIFY); assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'manual');
      assert.equal(init.body.get('secret'), secret); assert.equal(init.body.get('response'), token);
      return transport(url, init);
    }, 10);
    assert.equal(calls, 1); assert.equal(result.type, type); assert.equal(result.ok, kind === 'success');
    assert.equal(JSON.stringify(result).includes(secret), false); assert.equal(JSON.stringify(result).includes(token), false);
  });
}
test('replay uses same token twice and receives an explicit rejection', async () => {
  const transport = mockFetch('replay');
  assert.equal((await checkToken(token, secret, transport)).ok, true);
  assert.equal((await checkToken(token, secret, transport)).type, 'TIMEOUT_OR_DUPLICATE');
});
test('no injected transport means offline failure, never ambient fetch', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw Error('ambient fetch must not run'); };
  try { assert.equal((await checkToken(token, secret)).type, 'VERIFICATION_UNAVAILABLE'); }
  finally { globalThis.fetch = original; }
});
for (const [t, s] of [['',secret], [token,''], [' ',secret], ['x'.repeat(2049),secret], [null,secret]]) {
  test('empty/malformed input stops before transport', async () => {
    let calls = 0; const result = await checkToken(t,s,async()=>{calls++;});
    assert.equal(result.type, 'INPUT_REJECTED'); assert.equal(calls,0);
  });
}
test('untrusted response fields and exceptions never escape diagnostic allowlist', async () => {
  const result = await checkToken(token,secret,async()=>Response.json({ success:false,hostname:secret,action:token,'error-codes':[secret,token] }));
  assert.deepEqual(result,{ok:false,hostname:false,action:false,type:'VERIFICATION_FAILED'});
});
test('non-TTY stops without prompting or contacting any service', async () => {
  const sink=output(); let calls=0;
  const code=await main(['--live'],{input:{isTTY:false},output:sink,ttyOutput:sink,liveFetch:async()=>{calls++;},prompt:async()=>{throw Error('must not prompt');}});
  assert.equal(code,1); assert.equal(calls,0); assert.match(sink.text,/TTY_REQUIRED/);
});
test('empty secret stops without asking for token', async () => {
  const tty=terminal(), sink=output(); let prompts=0,calls=0;
  const code=await main(['--live'],{...tty,ttyOutput:tty.output,output:sink,prompt:async()=>{prompts++;return '';},liveFetch:async()=>{calls++;}});
  assert.equal(code,1); assert.equal(prompts,1); assert.equal(calls,0);
});
test('mock default never reads TTY or uses live transport', async () => {
  const sink=output();
  assert.equal(await main([],{output:sink,prompt:async()=>{throw Error('no input');},liveFetch:async()=>{throw Error('no live fetch');}}),0);
  assert.equal((sink.text.match(/PASS/g)||[]).length,10); assert.equal(sink.text.includes(secret),false);
});
for (const args of [['--secret',secret], ['--token='+token], ['--replay'], ['--live','--live']]) {
  test('unexpected arguments are rejected without echoing their contents', async () => {
    const sink=output(); assert.equal(await main(args,{output:sink}),1);
    assert.equal(sink.text,'FAIL type=ARGUMENTS_REJECTED\n');
  });
}
test('mocked live path only emits sanitized result; replay is opt-in', async () => {
  for (const replay of [false,true]) {
    const tty=terminal(), sink=output(); let calls=0, answers=[secret,token]; const transport=mockFetch('replay');
    assert.equal(await main(replay?['--live','--replay']:['--live'],{
      ...tty,ttyOutput:tty.output,output:sink,prompt:async()=>answers.shift(),liveFetch:async(...args)=>{calls++;return transport(...args);},
    }),0);
    assert.equal(calls,replay?2:1); assert.equal(sink.text.includes(secret),false); assert.equal(sink.text.includes(token),false);
    assert.match(sink.text,/hostname=MATCH action=MATCH/);
  }
});
test('failure in replay mode is not automatically retried', async () => {
  const tty=terminal(),sink=output();let calls=0,answers=[secret,token];
  const code=await main(['--live','--replay'],{...tty,ttyOutput:tty.output,output:sink,prompt:async()=>answers.shift(),liveFetch:async()=>{calls++;throw Error(secret+token);}});
  assert.equal(code,1);assert.equal(calls,1);assert.equal(sink.text.includes(secret),false);assert.equal(sink.text.includes(token),false);
});
test('TTY input never echoes data, supports backspace, and restores normal mode', async () => {
  const tty=terminal(); const pending=readHidden('Hidden: ',tty);
  tty.input.emit('data',Buffer.from('synthetic-x\x7fvalue\r'));
  assert.equal(await pending,'synthetic-value'); assert.deepEqual(tty.input.modes,[true,false]);
  assert.equal(tty.output.text,'Hidden: \n'); assert.equal(tty.input.listenerCount('data'),0);
});
for (const signal of ['SIGINT','SIGTERM','SIGHUP','SIGTSTP']) {
  test(`TTY restores on ${signal}`, async () => {
    const tty=terminal(); const pending=readHidden('Hidden: ',tty); tty.input.emit('data',Buffer.from(secret));tty.signals.emit(signal);
    await assert.rejects(pending,e=>e.code==='CANCELLED');assert.equal(tty.input.isRaw,false);
    assert.equal(tty.output.text.includes(secret),false);assert.equal(tty.signals.listenerCount(signal),0);
  });
}
for (const char of ['\x03','\x04','\x1a','\x1b','\nextra','x'.repeat(4097)]) {
  test('TTY rejects cancellation, control sequences and multiline/oversized paste safely', async () => {
    const tty=terminal();const pending=readHidden('Hidden: ',tty);tty.input.emit('data',Buffer.from(char));
    await assert.rejects(pending);assert.equal(tty.input.isRaw,false);assert.equal(tty.output.text,'Hidden: \n');
  });
}
test('TTY restores on input exception and output exception', async () => {
  for (const kind of ['input','output']) {
    const tty=terminal(); if(kind==='output')tty.output.write=()=>{throw Error(secret);};
    const pending=readHidden('Hidden: ',tty);if(kind==='input')tty.input.emit('error',Error(secret));
    await assert.rejects(pending);assert.equal(tty.input.isRaw,false);
  }
});
test('TTY refuses redirected output and existing raw input', async () => {
  for(const patch of [{isTTY:false},{isRaw:true}]){
    const tty=terminal();Object.assign(tty.input,patch);await assert.rejects(readHidden('Hidden: ',tty),e=>e.code==='TTY_REQUIRED');
  }
  const tty=terminal();tty.output.isTTY=false;await assert.rejects(readHidden('Hidden: ',tty),e=>e.code==='TTY_REQUIRED');
});
test('CLI imports no mail/API/Workers launcher and is absent from static manifest', () => {
  const source=fs.readFileSync(new URL('./verify-turnstile-local.mjs',import.meta.url),'utf8');
  const imports=[...source.matchAll(/import .*? from ['"]([^'"]+)['"]/g)].map(m=>m[1]);
  assert.deepEqual(imports,['node:url','node:path','../worker/contact/turnstile.mjs']);
  assert.equal(source.includes('process.env'),false);
  const manifest=JSON.parse(fs.readFileSync(new URL('./public-files.json',import.meta.url)));
  assert.equal(manifest.files.length,39);assert.equal(manifest.files.some(f=>f.startsWith('scripts/')),false);
  assert.equal(HOSTNAME,'bashiiin-coffee-staging.misemiruweb.workers.dev');
});
test('real CLI entry defaults to mock and refuses non-TTY live, without credentials', () => {
  const filename=new URL('./verify-turnstile-local.mjs',import.meta.url);
  for(const args of [[],['--live']]){
    const run=spawnSync(process.execPath,[filename.pathname,...args],{encoding:'utf8',timeout:5000});
    assert.equal(run.status,args.length?1:0);assert.equal(run.stdout.includes(secret),false);assert.equal(run.stderr.includes(token),false);
    assert.match(run.stdout,args.length?/TTY_REQUIRED/:/MOCK success PASS/);
  }
});
