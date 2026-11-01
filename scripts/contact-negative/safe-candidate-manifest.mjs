// Local validation only. No CLI, environment reads, writer, transport or deployment integration.
// Expected hashes copied verbatim from the existing STEP AX audit record:
// /tmp/bashiiin-ax-baseline.json -> protected.outputs["scripts/contact-negative/.generated/safe"].
// They are NOT derived from current Assets. The external audit file is not needed at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { types } from 'node:util';

const WORKER = 'bashiiin-coffee-contact-negative';
const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ASSET_ROOT = path.join(ROOT, 'scripts/contact-negative/.generated/safe');
const ALLOWLIST_FILE = path.join(ROOT, 'scripts/public-files.json');
const ALLOWLIST_SHA256 = "6ef54aed162430334ead7bd4c9effbad7b41c80c05212573d9573b95d81b3c38";
export const SAFE_ASSET_BASELINE = Object.freeze([
  {
    "path": "about/index.html",
    "sha256": "f81759cb34fedb006804f73985e4e83641d3a9f917b071a02a176901f0a03fca"
  },
  {
    "path": "access/index.html",
    "sha256": "ce9adb623ba848c5c1ddbf7d154e2bbe80f603c2896ba5290fad2caf31679a5b"
  },
  {
    "path": "coffee/index.html",
    "sha256": "5df59fa9cd2b4d429231472bde52bb9eebf7d6bfa5e91c3846cb7782818dd9c3"
  },
  {
    "path": "contact/index.html",
    "sha256": "f61a604c8bc5eec92bb3c85c2f737b31503ea2a84e6260520e499d177ea87fcc"
  },
  {
    "path": "images/web/coffee/coffee-preparation-1206.webp",
    "sha256": "ea5096ea05f9151f54f6f19edfa81170426fff883dfd2ec980c003b73c0df3e2"
  },
  {
    "path": "images/web/coffee/coffee-preparation-400.webp",
    "sha256": "5e79cc6cc90facc98137f2820534e38c89711573e8d4e953060e10c9eee4b433"
  },
  {
    "path": "images/web/coffee/coffee-preparation-800.webp",
    "sha256": "0b528abb7c0ed4f4e360ed57d93a7ed5b20926ce5c56c30eb7967346b350ab9f"
  },
  {
    "path": "images/web/culture/DSC_0165-1450.webp",
    "sha256": "1a11b29071ec03ab7f71d5f0c258c49655418f897336cc42560fb39492227ca5"
  },
  {
    "path": "images/web/culture/DSC_0165-400.webp",
    "sha256": "3424ea38ab2b3579713d19c7942d336d27f576ed5032668be9a75b85a80d0020"
  },
  {
    "path": "images/web/culture/DSC_0165-800.webp",
    "sha256": "8b62fc14aa5ff6a415679ce5141bf1df0a1eb11560755406e17d632d439c5e6f"
  },
  {
    "path": "images/web/favicon.png",
    "sha256": "39af60ccdf6f682058f14926411c4be2df41186b48ce4e06955687b2c3d50b3c"
  },
  {
    "path": "images/web/hero/DSC_0052-1450.webp",
    "sha256": "10c6100da509869a7478f4a3d81ea687288ddd7815b86b96b6189aac0ad69454"
  },
  {
    "path": "images/web/hero/DSC_0052-400.webp",
    "sha256": "463b1b65140bfda05f159e0aa8ac43dede6968dbc2230f30de887a1259cf8c77"
  },
  {
    "path": "images/web/hero/DSC_0052-800.webp",
    "sha256": "62e8a2f74d071545e7a32b09ae8a1a42b3d224ee6b860753de8ff9e8df2bd2cd"
  },
  {
    "path": "images/web/hero/coffee-packages-1206.webp",
    "sha256": "cf92f7f1461228e988d7b5e83fbb5ad76bd37491a95edc751f354f78de13f74d"
  },
  {
    "path": "images/web/hero/coffee-packages-400.webp",
    "sha256": "58a03b50b8d9d835e6afd9b7b8f78369e7218e30e4bd026146aa49edb9e70a52"
  },
  {
    "path": "images/web/hero/coffee-packages-800.webp",
    "sha256": "f668ee3cbe0570b8071b5c122798dab1662ad1d81aae002f9027f00d461b52fb"
  },
  {
    "path": "images/web/hero/entrance-sign-1206.webp",
    "sha256": "7b9a5b565e02340f49288368e670960bb9c7d82fd29103fbf83a8a3dd5a0618e"
  },
  {
    "path": "images/web/hero/entrance-sign-400.webp",
    "sha256": "f76f7883a9e0c789342d63ac803c5cccb57630ff125dd617fbb48ce634ed9bd9"
  },
  {
    "path": "images/web/hero/entrance-sign-800.webp",
    "sha256": "47fc5b15de362bc706205d9f607d32087761fb6eda0cce002dbb7e472b89a4a3"
  },
  {
    "path": "images/web/journal/DSC_0132-1450.webp",
    "sha256": "b73351144d4ee0662fc4668b6c7052427b3d8f7a553b3ed15752a4d5910f0e21"
  },
  {
    "path": "images/web/journal/DSC_0132-400.webp",
    "sha256": "0f1de82a5a86bf59af77c778b80b6bf4b67c5d4d5c82bf4ca652745bb58d847a"
  },
  {
    "path": "images/web/journal/DSC_0132-800.webp",
    "sha256": "a0ea0a1f3269a81b251bb39889642d425ff6d8090fc678c653fdf7e74f84727b"
  },
  {
    "path": "images/web/journal/coffee-pouring-1206.webp",
    "sha256": "11db6ad38c0f1c2c7359fd2ceddf8fcbdeed9f29ac2c425c6c372511b359aa2e"
  },
  {
    "path": "images/web/journal/coffee-pouring-400.webp",
    "sha256": "1c9c0f329604ec59c4b5b1ff33050ea2156a1efd3a5d70508c3a5d7010084dbf"
  },
  {
    "path": "images/web/journal/coffee-pouring-800.webp",
    "sha256": "9656d05322a90bebec043e5ba4d62a9c73eb7a0624398b4629f3190ee95fa224"
  },
  {
    "path": "images/web/journal/spoon-1206.webp",
    "sha256": "17dd3f9662d9cf8d296a1ffa890af5c7b6e95d16c6bd690a787ed5f564e43d4c"
  },
  {
    "path": "images/web/journal/spoon-400.webp",
    "sha256": "2a45b5b70f369cd516ab945b7588a1f8eac06c2611f4f75f255f13b382d1f4f1"
  },
  {
    "path": "images/web/journal/spoon-800.webp",
    "sha256": "0b9ff6ab8939c30fc0fdcfc499cdf470d42f023d2e23c580f70753fca3753afd"
  },
  {
    "path": "images/web/logo-header.png",
    "sha256": "8b906c2463522ac765433fb9f5158937d508dcf64aeea1a76aeb0a3079793248"
  },
  {
    "path": "images/web/space/DSC_0167-1450.webp",
    "sha256": "f57db9278afdd2f36f39a614ffd7e452e5497c2aecc4537178a34c011933a24c"
  },
  {
    "path": "images/web/space/DSC_0167-400.webp",
    "sha256": "fe672caf5bc8de220cb86fd77224fde505ff1318858edce906dbf4b20b5e483b"
  },
  {
    "path": "images/web/space/DSC_0167-800.webp",
    "sha256": "e69c8bcb6208e37b53dc142e9a902d944e10f02558cdcf8a0339d05299ae2a51"
  },
  {
    "path": "images/web/sweets/R0000476-1920.webp",
    "sha256": "fcf712bb12f0db69b2d177bd07fed4b4c0b03f9f1282b6c088845df2b0d5aede"
  },
  {
    "path": "images/web/sweets/R0000476-400.webp",
    "sha256": "b9ec97330dbd29a61774fc822feb336015051338d20b7a0917c96e0629f8f2b7"
  },
  {
    "path": "images/web/sweets/R0000476-800.webp",
    "sha256": "28d2f0ad718a96a4574fe0701b733b16f807843733294da77022fc02bb9222b3"
  },
  {
    "path": "index.html",
    "sha256": "22414f02f633c24e715475c11d80cffa63b82d3caffd8433be1890b3faa1b823"
  },
  {
    "path": "script.js",
    "sha256": "62cfdebf5a5b496847fc4e22bb60eb747f971e1dd5f194e80de594d986e116f7"
  },
  {
    "path": "styles.css",
    "sha256": "5b7c88714593627197e6dc8756d676639b33d3fab242462790a91945b9d055da"
  }
].map(row => Object.freeze(row)));
const expected = new Map(SAFE_ASSET_BASELINE.map(row => [row.path, row.sha256]));
const limitations = Object.freeze(['LOCAL_MANIFEST_ONLY', 'NO_CLOUDFLARE_STATE_PROOF', 'NO_SERVER_INHERITANCE_GUARANTEE']);
const result = (classification, code) => Object.freeze({ classification, code, limitations });
const sha = value => createHash('sha256').update(value).digest('hex');

// Accept plain data objects, never invoke input accessors or accept Proxy traps.
function descriptors(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  const desc = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(desc).some(k => typeof k !== 'string' || !Object.hasOwn(desc[k], 'value') || !desc[k].enumerable)) return null;
  return desc;
}
const exact = (desc, keys) => desc && Reflect.ownKeys(desc).length === keys.length && keys.every(k => Object.hasOwn(desc, k));
function arrayValues(value, count) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const desc = Object.getOwnPropertyDescriptors(value);
  if (desc.length.value !== count || Reflect.ownKeys(desc).length !== count + 1) return null;
  const values = [];
  for (let i = 0; i < count; i++) {
    const d = desc[String(i)];
    if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) return null;
    values.push(d.value);
  }
  return values;
}
function safePath(value) {
  return typeof value === 'string' && value.length > 0 && !path.isAbsolute(value)
    && !/[\\\0]/.test(value) && !value.split('/').some(p => !p || p === '.' || p === '..');
}
function regularPath(file, directory) {
  const absolute = path.resolve(file);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('ASSETS_UNVERIFIED');
  }
  const stat = fs.lstatSync(absolute);
  if (directory ? !stat.isDirectory() : !stat.isFile()) throw Error('ASSETS_UNVERIFIED');
  return absolute;
}
function readRegular(file) {
  regularPath(file, false);
  if (typeof fs.constants.O_NOFOLLOW !== 'number') throw Error('ASSETS_UNVERIFIED');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!fs.fstatSync(fd).isFile()) throw Error('ASSETS_UNVERIFIED');
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}
function assetsMatchDisk() {
  const manifest = readRegular(ALLOWLIST_FILE);
  if (sha(manifest) !== ALLOWLIST_SHA256) return false;
  const allow = descriptors(JSON.parse(manifest.toString('utf8')));
  if (!exact(allow, ['files'])) return false;
  const files = arrayValues(allow.files.value, 39);
  if (!files || new Set(files).size !== 39 || files.some(f => !expected.has(f))) return false;
  regularPath(ASSET_ROOT, true);
  const found = new Set();
  function walk(folder, relative = '') {
    regularPath(folder, true);
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      const file = path.join(folder, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) return false;
      if (stat.isDirectory()) {
        if (!SAFE_ASSET_BASELINE.some(row => row.path.startsWith(name + '/')) || !walk(file, name)) return false;
      } else {
        if (!stat.isFile() || !expected.has(name) || found.has(name)) return false;
        if (sha(readRegular(file)) !== expected.get(name)) return false;
        found.add(name);
      }
    }
    return true;
  }
  return walk(ASSET_ROOT) && found.size === 39;
}

/**
 * Plain object schema: {worker, bindings:[{name,type,value?}], compatibility_date,
 * compatibility_flags:[], assets:[{path,sha256}]}.
 * Not Wrangler config. Secret values and all undeclared properties are rejected.
 * PASS proves only the local data and fixed, existing safe Assets matched the recorded baseline.
 * Filesystem checks reject observed links; concurrent ancestor replacement is not atomically prevented.
 */
export function validateSafeCandidateManifest(input) {
  try {
    const data = descriptors(input);
    if (!data) return result('INVALID_INPUT', 'INVALID_STRUCTURE');
    if (!exact(data, ['worker', 'bindings', 'compatibility_date', 'compatibility_flags', 'assets'])) return result('REJECT', 'UNEXPECTED_STRUCTURE');
    if (data.worker.value !== WORKER) return result('REJECT', 'WORKER_MISMATCH');
    if (data.compatibility_date.value !== '2026-10-28' || !arrayValues(data.compatibility_flags.value, 0)) return result('REJECT', 'COMPATIBILITY_MISMATCH');
    const bindings = arrayValues(data.bindings.value, 5);
    if (!bindings) return result('REJECT', 'BINDINGS_REJECTED');
    const names = new Set();
    for (const binding of bindings) {
      const d = descriptors(binding);
      if (!d || !Object.hasOwn(d, 'name') || !Object.hasOwn(d, 'type')) return result('REJECT', 'BINDINGS_REJECTED');
      const name = d.name.value;
      if (typeof name !== 'string' || names.has(name)) return result('REJECT', 'BINDINGS_REJECTED');
      names.add(name);
      if (['E2E_MODE', 'CONTACT_API_ENABLED', 'EMAIL_SENDING_ENABLED'].includes(name)) {
        if (!exact(d, ['name', 'type', 'value']) || d.type.value !== 'plain_text'
          || d.value.value !== (name === 'E2E_MODE' ? 'safe' : 'false')) return result('REJECT', 'BINDINGS_REJECTED');
      } else if (name === 'ASSETS' || name === 'TURNSTILE_SECRET_KEY') {
        // In particular, do not inspect a Secret value/text property: reject it by shape first.
        if (!exact(d, ['name', 'type']) || d.type.value !== (name === 'ASSETS' ? 'assets' : 'secret_text')) return result('REJECT', 'BINDINGS_REJECTED');
      } else return result('REJECT', 'BINDINGS_REJECTED');
    }
    const assets = arrayValues(data.assets.value, 39);
    if (!assets) return result('REJECT', 'ASSETS_REJECTED');
    const seen = new Set();
    for (const asset of assets) {
      const d = descriptors(asset);
      if (!exact(d, ['path', 'sha256']) || !safePath(d.path.value) || seen.has(d.path.value)
        || !expected.has(d.path.value) || typeof d.sha256.value !== 'string'
        || d.sha256.value !== expected.get(d.path.value)) return result('REJECT', 'ASSETS_REJECTED');
      seen.add(d.path.value);
    }
    if (!assetsMatchDisk()) return result('REJECT', 'ASSETS_UNVERIFIED');
    return result('PASS', 'LOCAL_CANDIDATE_MATCH');
  } catch { return result('REJECT', 'UNVERIFIED_INPUT_OR_ASSETS'); }
}
