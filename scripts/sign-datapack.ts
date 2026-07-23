/**
 * Development/package-issuer CLI. This is not imported by the browser app.
 *
 * Usage:
 *   npm run datapack:sign -- --book book.json --private-key keys/private/dev.private.jwk \
 *     --key-id dev --binding phone-and-device --phone +263... --device DEVICE-ID \
 *     --licence-id LIC-123 --output signed-book.datapack.zip
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import {
  createSignedBookDataPack,
  createSignedBookDataPackArchive,
} from '../src/lib/dataPack';
import type { Book, LicenceBindingMode } from '../src/types';

function argument(name: string, required = false): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (required && !value) throw new Error(`Missing required argument: ${name}`);
  return value;
}

async function importPrivateKey(path: string): Promise<CryptoKey> {
  const resolvedPath = resolve(path);
  const forbiddenRoots = ['src', 'public', 'config', 'dist'].map(directory => resolve(process.cwd(), directory));
  const normalizedPath = resolvedPath.toLowerCase();
  if (forbiddenRoots.some(root => normalizedPath === root.toLowerCase() || normalizedPath.startsWith(`${root.toLowerCase()}${sep}`))) {
    throw new Error('Private signing keys cannot be loaded from frontend source, configuration, public, or build directories.');
  }
  const jwk = JSON.parse(readFileSync(resolvedPath, 'utf8')) as JsonWebKey;
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function signPackage(): Promise<void> {
  const bookPath = argument('--book', true)!;
  const privateKeyPath = argument('--private-key', true)!;
  const keyId = argument('--key-id', true)!;
  const bindingMode = argument('--binding', true)! as LicenceBindingMode;
  const licenceId = argument('--licence-id', true)!;
  const book = JSON.parse(readFileSync(bookPath, 'utf8')) as Book;
  const privateKey = await importPrivateKey(privateKeyPath);
  const outputPath = argument('--output') || join(
    process.cwd(),
    `${basename(bookPath, '.json')}.datapack.zip`,
  );

  const pack = await createSignedBookDataPack({
    book,
    phoneNumber: argument('--phone') || '',
    deviceId: argument('--device') || '',
    bindingMode,
    privateKey,
    keyId,
    licenceId,
    packageId: argument('--package-id'),
    issuer: argument('--issuer'),
    issuedAt: argument('--issued-at'),
    expiresAt: argument('--expires-at'),
    bookVersion: argument('--book-version'),
  });
  const archive = await createSignedBookDataPackArchive(pack);
  writeFileSync(outputPath, archive);
  console.log(`Created signed data pack: ${outputPath}`);
  console.log(`Version: ${pack.manifest.packVersion}; keyId: ${pack.signature.keyId}`);
}

signPackage().catch((error: unknown) => {
  console.error(`Data-pack signing failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
