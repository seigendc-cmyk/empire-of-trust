/**
 * Development-only ECDSA P-256 key generation utility.
 *
 * Usage:
 *   npm run datapack:generate-keys -- --key-id dev-202607
 *
 * Private output is written beneath keys/private/ (gitignored). Public output is
 * written beneath keys/public/ and can be copied into config/keys.ts.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function toPem(bytes: ArrayBuffer): string {
  const base64 = Buffer.from(bytes).toString('base64');
  return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}

async function generateKeys(): Promise<void> {
  const requestedKeyId = readArgument('--key-id');
  const keyId = requestedKeyId || `dev-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  if (!/^[A-Za-z0-9._-]+$/.test(keyId)) {
    throw new Error('keyId may contain only letters, numbers, dot, underscore, and hyphen.');
  }

  const privateDirectory = join(process.cwd(), 'keys', 'private');
  const publicDirectory = join(process.cwd(), 'keys', 'public');
  const privatePath = join(privateDirectory, `${keyId}.private.jwk`);
  const publicPath = join(publicDirectory, `${keyId}.public.pem`);
  if (existsSync(privatePath) || existsSync(publicPath)) {
    throw new Error(`Refusing to overwrite existing key material for keyId "${keyId}".`);
  }

  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicSpki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicPem = toPem(publicSpki);

  mkdirSync(privateDirectory, { recursive: true });
  mkdirSync(publicDirectory, { recursive: true });
  writeFileSync(privatePath, `${JSON.stringify(privateJwk, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  writeFileSync(publicPath, `${publicPem}\n`, 'utf8');

  console.log(`Generated development signing key: ${keyId}`);
  console.log(`Private key (never commit): ${privatePath}`);
  console.log(`Public key: ${publicPath}`);
  console.log(`Add the public PEM to config/keys.ts under keyId "${keyId}" before testing verification.`);
}

generateKeys().catch((error: unknown) => {
  console.error(`Key generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
