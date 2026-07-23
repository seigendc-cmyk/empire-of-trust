import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const workspace = process.cwd();
const distDirectory = join(workspace, 'dist');
const installedWasmPath = join(workspace, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const minimumWasmBytes = 100_000;
const wasmMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

function findWasmFiles(directory) {
  const matches = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) matches.push(...findWasmFiles(path));
    else if (name.endsWith('.wasm')) matches.push(path);
  }
  return matches;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const emittedWasmFiles = findWasmFiles(distDirectory);
if (emittedWasmFiles.length !== 1) {
  throw new Error(`Expected exactly one emitted WASM file in dist, found ${emittedWasmFiles.length}.`);
}

const emittedPath = emittedWasmFiles[0];
const emittedName = basename(emittedPath);
if (!/^sql-wasm-[A-Za-z0-9_-]{6,}\.wasm$/.test(emittedName)) {
  throw new Error(`WASM filename is not content-hashed: ${emittedName}`);
}

const emittedBytes = readFileSync(emittedPath);
if (emittedBytes.byteLength < minimumWasmBytes) {
  throw new Error(`Emitted WASM is suspiciously small: ${emittedBytes.byteLength} bytes.`);
}
if (!emittedBytes.subarray(0, 4).equals(wasmMagic)) {
  throw new Error('Emitted WASM does not begin with the WebAssembly magic bytes 00 61 73 6d.');
}

const installedBytes = readFileSync(installedWasmPath);
if (sha256(emittedBytes) !== sha256(installedBytes)) {
  throw new Error('Emitted WASM does not match the installed sql.js package binary.');
}

console.log(`Verified ${emittedName} (${emittedBytes.byteLength} bytes, valid magic, installed sql.js match).`);
