import JSZip from 'jszip';
import { Book, BookDataPack, SignedBookDataPack, SignedBookManifest, SignatureMetadata, LicenceBindingMode, RenewalAuthorization } from '../types';

const DEVICE_ID_KEY = 'publisher_pwa_device_id';
const READER_PHONE_KEY = 'publisher_pwa_reader_phone';

export const SIGNED_DATA_PACK_VERSION = '3.0.0' as const;
export const LEGACY_DATA_PACK_VERSION = '2.5.0' as const;
export const DATA_PACK_SIGNATURE_ALGORITHM = 'ECDSA-P256-SHA256' as const;
const SIGNED_APP_SIGNATURE = 'EMPIRE_OF_TRUST_MY_LIBRARY_V3' as const;
const MAX_LICENCE_DAYS = 30;
const MAX_EXPORT_SKEW_MS = 60_000;
const SUPPORTED_BINDING_MODES = new Set<LicenceBindingMode>(['phone', 'device', 'phone-and-device']);

export type DataPackPublicKeyRegistry = Readonly<Record<string, string>>;
export type DataPackVerificationResult = {
  success: boolean;
  message: string;
  book?: Book;
  pack?: BookDataPack | SignedBookDataPack;
  isExpired?: boolean;
  isLegacy?: boolean;
};

/**
 * Deterministic JSON serializer. Object keys are sorted recursively and values
 * follow JSON.stringify semantics (including omitted undefined object fields).
 */
export function stableStringify(value: unknown): string {
  const serialize = (current: unknown, inArray: boolean): string | undefined => {
    if (current === null) return 'null';

    if (typeof current === 'string' || typeof current === 'boolean') {
      return JSON.stringify(current);
    }

    if (typeof current === 'number') {
      return Number.isFinite(current) ? JSON.stringify(current) : 'null';
    }

    if (typeof current === 'undefined' || typeof current === 'function' || typeof current === 'symbol') {
      return inArray ? 'null' : undefined;
    }

    if (typeof current === 'bigint') {
      throw new TypeError('BigInt values are not supported in canonical JSON.');
    }

    if (Array.isArray(current)) {
      return '[' + current.map(item => serialize(item, true) ?? 'null').join(',') + ']';
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      const entries = Object.keys(record)
        .sort()
        .flatMap(key => {
          const serialized = serialize(record[key], false);
          return serialized === undefined ? [] : [`${JSON.stringify(key)}:${serialized}`];
        });
      return '{' + entries.join(',') + '}';
    }

    return undefined;
  };

  const result = serialize(value, false);
  if (result === undefined) {
    throw new TypeError('Value cannot be represented as canonical JSON.');
  }
  return result;
}

/**
 * Get or generate persistent unique device ID
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    try {
      deviceId = crypto.randomUUID();
    } catch {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      deviceId = 'DEV-' + Array.from(bytes, b => b.toString(36).toUpperCase()).join('');
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get or set reader phone number
 */
export function getSavedPhoneNumber(): string {
  return localStorage.getItem(READER_PHONE_KEY) || '';
}

export function savePhoneNumber(phone: string): void {
  localStorage.setItem(READER_PHONE_KEY, phone.trim());
}

/**
 * Compute SHA-256 hash of a buffer and return as hex string.
 */
export async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of a string (UTF-8 encoded).
 */
export async function hashString(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  return hashBuffer(encoded.buffer);
}

/**
 * Canonicalize a manifest for signing/verification.
 */
export function canonicalizeManifest(manifest: SignedBookManifest): string {
  const ordered: Record<string, unknown> = {
    packVersion: manifest.packVersion,
    appSignature: manifest.appSignature,
    packageId: manifest.packageId,
    bookId: manifest.bookId,
    bookVersion: manifest.bookVersion,
    issuedAt: manifest.issuedAt,
    expiresAt: manifest.expiresAt,
    bindingMode: manifest.bindingMode,
    boundPhoneHash: manifest.boundPhoneHash || '',
    boundDeviceHash: manifest.boundDeviceHash || '',
    contentHash: manifest.contentHash,
    licenceId: manifest.licenceId,
    issuer: manifest.issuer,
    signatureAlgorithm: manifest.signatureAlgorithm,
  };
  return stableStringify(ordered);
}

/**
 * Hash phone or device value for manifest inclusion.
 */
async function hashBindingValue(value: string): Promise<string> {
  return hashString(value.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function validateCreationInput(params: {
  book: Book;
  phoneNumber: string;
  deviceId: string;
  bindingMode: LicenceBindingMode;
  issuedAt: string;
  expiresAt: string;
  packageId: string;
  licenceId: string;
  issuer: string;
}): void {
  if (!params.book?.id?.trim() || !params.book?.title?.trim() || !params.book?.version?.trim()) {
    throw new Error('Required licence fields are missing: book id, title, and version are required.');
  }
  if (!params.packageId.trim() || !params.licenceId.trim() || !params.issuer.trim()) {
    throw new Error('Required licence fields are missing: packageId, licenceId, and issuer are required.');
  }
  if (!SUPPORTED_BINDING_MODES.has(params.bindingMode)) {
    throw new Error(`Unsupported binding mode: ${String(params.bindingMode)}.`);
  }
  if ((params.bindingMode === 'phone' || params.bindingMode === 'phone-and-device') && !params.phoneNumber.trim()) {
    throw new Error('Required licence fields are missing: phone binding value is required.');
  }
  if ((params.bindingMode === 'device' || params.bindingMode === 'phone-and-device') && !params.deviceId.trim()) {
    throw new Error('Required licence fields are missing: device binding value is required.');
  }
  if (!isIsoDate(params.issuedAt) || !isIsoDate(params.expiresAt)) {
    throw new Error('Invalid licence dates: issuedAt and expiresAt must be ISO-8601 timestamps.');
  }

  const issuedAt = new Date(params.issuedAt).getTime();
  const expiresAt = new Date(params.expiresAt).getTime();
  if (expiresAt <= issuedAt) {
    throw new Error('Invalid licence dates: expiresAt must be later than issuedAt.');
  }
  if (expiresAt - issuedAt > MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error(`Invalid licence dates: signed licences cannot exceed ${MAX_LICENCE_DAYS} days.`);
  }
}

/**
 * Build integrity token from all licence-critical fields (legacy 2.5.0).
 */
export function calculateBindingToken(
  packVersion: string,
  appSignature: string,
  bookId: string,
  phone: string,
  deviceId: string,
  exportTimestamp: string,
  expiresAt: string,
  bookContent: string
): string {
  const raw = [
    'VER',
    packVersion,
    'SIG',
    appSignature,
    'BID',
    bookId,
    'PHN',
    phone.trim(),
    'DEV',
    deviceId.trim(),
    'EXP',
    exportTimestamp,
    'XPD',
    expiresAt,
    'BOOK',
    bookContent,
    'SECURE_PUBLISHER_KEY_2026',
  ].join('::');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `SIG_${Math.abs(hash).toString(16).toUpperCase()}_${exportTimestamp}`;
}

/**
 * Create an unsigned manifest for v3.0.0 packages.
 */
export async function createUnsignedManifest(params: {
  book: Book;
  phoneNumber: string;
  deviceId: string;
  bindingMode: LicenceBindingMode;
  issuedAt?: string;
  expiresAt?: string;
  packageId?: string;
  licenceId?: string;
  issuer?: string;
  bookVersion?: string;
}): Promise<SignedBookManifest> {
  const now = new Date();
  const issuedAt = params.issuedAt || now.toISOString();
  const expiresAt = params.expiresAt || new Date(now.getTime() + MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const uniqueId = crypto.randomUUID();
  const packageId = params.packageId || `PKG-${params.book.id}-${uniqueId}`;
  const licenceId = params.licenceId || `LIC-${params.book.id}-${uniqueId}`;
  const bookVersion = params.bookVersion || params.book.version || '1.0.0';
  const issuer = params.issuer || 'Empire Of Trust Publisher';

  validateCreationInput({
    ...params,
    issuedAt,
    expiresAt,
    packageId,
    licenceId,
    issuer,
  });

  let contentHash: string;
  try {
    contentHash = await hashString(stableStringify(params.book));
  } catch (error) {
    throw new Error(`Book content hash could not be generated: ${error instanceof Error ? error.message : String(error)}`);
  }

  const manifest: SignedBookManifest = {
    packVersion: SIGNED_DATA_PACK_VERSION,
    appSignature: SIGNED_APP_SIGNATURE,
    packageId,
    bookId: params.book.id,
    bookVersion,
    issuedAt,
    expiresAt,
    bindingMode: params.bindingMode,
    contentHash,
    licenceId,
    issuer,
    signatureAlgorithm: DATA_PACK_SIGNATURE_ALGORITHM,
  };

  if (params.bindingMode === 'phone' || params.bindingMode === 'phone-and-device') {
    manifest.boundPhoneHash = await hashBindingValue(params.phoneNumber);
  }

  if (params.bindingMode === 'device' || params.bindingMode === 'phone-and-device') {
    manifest.boundDeviceHash = await hashBindingValue(params.deviceId);
  }

  return manifest;
}

/**
 * Sign a canonical manifest string using ECDSA P-256 with SHA-256.
 */
export async function signManifest(manifest: SignedBookManifest, privateKey: CryptoKey, keyId: string): Promise<SignatureMetadata> {
  const keyAlgorithm = privateKey?.algorithm as EcKeyAlgorithm | undefined;
  if (
    !privateKey ||
    privateKey.type !== 'private' ||
    !privateKey.usages.includes('sign') ||
    keyAlgorithm?.name !== 'ECDSA' ||
    keyAlgorithm.namedCurve !== 'P-256'
  ) {
    throw new Error('Signing key is unavailable or is not an ECDSA private signing key.');
  }
  if (!keyId.trim()) {
    throw new Error('Required licence fields are missing: keyId is required.');
  }
  if (manifest.signatureAlgorithm !== DATA_PACK_SIGNATURE_ALGORITHM) {
    throw new Error(`Unsupported signature algorithm: ${manifest.signatureAlgorithm}.`);
  }

  const canonical = canonicalizeManifest(manifest);
  const encoded = new TextEncoder().encode(canonical);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoded);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return {
    algorithm: DATA_PACK_SIGNATURE_ALGORITHM,
    keyId,
    signature: signatureBase64,
  };
}

/**
 * Create a complete signed v3.0.0 data pack.
 */
export async function createSignedBookDataPack(params: {
  book: Book;
  phoneNumber: string;
  deviceId: string;
  bindingMode: LicenceBindingMode;
  privateKey: CryptoKey;
  keyId: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  packageId?: string;
  licenceId?: string;
  bookVersion?: string;
}): Promise<SignedBookDataPack> {
  if (!params.privateKey) {
    throw new Error('Signing key is unavailable.');
  }

  const manifest = await createUnsignedManifest({
    book: params.book,
    phoneNumber: params.phoneNumber,
    deviceId: params.deviceId,
    bindingMode: params.bindingMode,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    packageId: params.packageId,
    licenceId: params.licenceId,
    issuer: params.issuer,
    bookVersion: params.bookVersion,
  });
  const signature = await signManifest(manifest, params.privateKey, params.keyId);

  return {
    manifest,
    signature,
    book: params.book,
  };
}

/**
 * Export a CryptoKey as PEM for storage / distribution.
 */
export async function exportPublicKeyPem(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  const pem = '-----BEGIN PUBLIC KEY-----\n' +
    btoa(String.fromCharCode(...new Uint8Array(exported))).match(/.{1,64}/g)!.join('\n') +
    '\n-----END PUBLIC KEY-----';
  return pem;
}

/**
 * Import a PEM public key for signature verification.
 */
export async function importPublicKeyPem(pem: string): Promise<CryptoKey> {
  const pemBody = pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
  if (!pemBody || !/^[A-Za-z0-9+/]+={0,2}$/.test(pemBody)) {
    throw new Error('Configured public key is malformed.');
  }
  const binary = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', binary.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

/**
 * Verify a v3 signed package and return the book if valid.
 */
export async function verifySignedBookDataPack(
  input: unknown,
  readerPhone: string,
  readerDeviceId: string,
  publicKeys: DataPackPublicKeyRegistry
): Promise<DataPackVerificationResult> {
  try {
    // 1-2. Parse is performed by verifyImportedBookDataPack; validate schema/version here.
    if (!isRecord(input) || !isRecord(input.manifest) || !isRecord(input.signature) || !isRecord(input.book)) {
      return { success: false, message: 'Malformed signed data pack: manifest, book, and signature objects are required.' };
    }

    const manifest = input.manifest;
    const signature = input.signature;
    const requiredManifestStrings = [
      'packVersion', 'appSignature', 'packageId', 'bookId', 'bookVersion', 'issuedAt',
      'expiresAt', 'bindingMode', 'contentHash', 'licenceId', 'issuer', 'signatureAlgorithm',
    ] as const;
    if (requiredManifestStrings.some(field => typeof manifest[field] !== 'string' || !(manifest[field] as string).trim())) {
      return { success: false, message: 'Malformed signed data pack: required manifest fields are missing.' };
    }
    if (typeof signature.algorithm !== 'string' || typeof signature.keyId !== 'string' || typeof signature.signature !== 'string') {
      return { success: false, message: 'Malformed signed data pack: signature metadata is incomplete.' };
    }
    if (manifest.packVersion !== SIGNED_DATA_PACK_VERSION) {
      return { success: false, message: `Unsupported signed package version: ${String(manifest.packVersion)}` };
    }
    if (manifest.appSignature !== SIGNED_APP_SIGNATURE) {
      return { success: false, message: 'Invalid application signature in signed manifest.' };
    }
    if (
      input.book.id !== manifest.bookId ||
      input.book.version !== manifest.bookVersion ||
      typeof input.book.title !== 'string'
    ) {
      return { success: false, message: 'Malformed signed data pack: book identity does not match the manifest.' };
    }
    if (
      manifest.signatureAlgorithm !== DATA_PACK_SIGNATURE_ALGORITHM ||
      signature.algorithm !== DATA_PACK_SIGNATURE_ALGORITHM ||
      signature.algorithm !== manifest.signatureAlgorithm
    ) {
      return { success: false, message: 'Unsupported signature algorithm.' };
    }

    // 3. Validate dates without treating expiry as a schema failure.
    if (!isIsoDate(manifest.issuedAt as string) || !isIsoDate(manifest.expiresAt as string)) {
      return { success: false, message: 'Invalid dates in signed manifest.' };
    }
    const now = new Date();
    const issued = new Date(manifest.issuedAt as string);
    const expires = new Date(manifest.expiresAt as string);
    if (issued.getTime() > now.getTime() + MAX_EXPORT_SKEW_MS) {
      return { success: false, message: 'Impossible issued-at timestamp detected in signed manifest.' };
    }
    if (expires.getTime() <= issued.getTime()) {
      return { success: false, message: 'Invalid licence chronology: expiry must be later than issued date.' };
    }
    if (expires.getTime() - issued.getTime() > MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000) {
      return { success: false, message: 'Licence duration exceeds allowed maximum.' };
    }

    // 4-5. Resolve keyId exactly, then import only that public key.
    const keyId = signature.keyId as string;
    const publicKeyPem = publicKeys[keyId];
    if (!publicKeyPem) {
      return { success: false, message: `Unknown or unsupported signing key: ${keyId}` };
    }
    let publicKey: CryptoKey;
    try {
      publicKey = await importPublicKeyPem(publicKeyPem);
    } catch {
      return { success: false, message: `Configured public key could not be imported: ${keyId}` };
    }

    // 6. Recalculate the content hash before trusting book content.
    const contentHash = await hashString(stableStringify(input.book));
    if (contentHash !== manifest.contentHash || !/^[0-9a-f]{64}$/.test(manifest.contentHash as string)) {
      return { success: false, message: 'Content hash mismatch: book content has been altered.' };
    }

    // 7. Verify the signature over the canonical manifest.
    let signatureBytes: Uint8Array;
    try {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature.signature as string)) throw new Error('invalid base64');
      signatureBytes = Uint8Array.from(atob(signature.signature as string), char => char.charCodeAt(0));
    } catch {
      return { success: false, message: 'Invalid signature encoding.' };
    }
    const pack = input as unknown as SignedBookDataPack;
    let valid = false;
    try {
      valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureBytes,
        new TextEncoder().encode(canonicalizeManifest(pack.manifest)),
      );
    } catch {
      valid = false;
    }
    if (!valid) {
      return { success: false, message: 'Invalid signature: manifest has been tampered with or signed by another key.' };
    }

    // 8. Validate binding mode and the values required by that mode.
    const bindingMode = manifest.bindingMode as LicenceBindingMode;
    if (!SUPPORTED_BINDING_MODES.has(bindingMode)) {
      return { success: false, message: `Unsupported binding mode: ${String(manifest.bindingMode)}.` };
    }
    const currentPhone = readerPhone.trim();
    const currentDevice = readerDeviceId.trim();
    if (bindingMode === 'phone') {
      if (typeof manifest.boundPhoneHash !== 'string' || !currentPhone || manifest.boundPhoneHash !== await hashBindingValue(currentPhone)) {
        return { success: false, message: 'Phone binding mismatch.' };
      }
    } else if (bindingMode === 'device') {
      if (typeof manifest.boundDeviceHash !== 'string' || !currentDevice || manifest.boundDeviceHash !== await hashBindingValue(currentDevice)) {
        return { success: false, message: 'Device binding mismatch.' };
      }
    } else {
      const phoneOk = typeof manifest.boundPhoneHash === 'string' && currentPhone && manifest.boundPhoneHash === await hashBindingValue(currentPhone);
      const deviceOk = typeof manifest.boundDeviceHash === 'string' && currentDevice && manifest.boundDeviceHash === await hashBindingValue(currentDevice);
      if (!phoneOk || !deviceOk) {
        return { success: false, message: 'Phone and device binding mismatch.' };
      }
    }

    // 9. A valid but expired signature remains untrusted for reading.
    if (now.getTime() > expires.getTime()) {
      return {
        success: false,
        isExpired: true,
        message: `Signed Data Pack Expired! This licence expired on ${expires.toLocaleDateString()}. Renewal requires a newly signed v3.0.0 package.`,
        pack,
      };
    }

    // 10. Return book only after every trust check succeeds.
    const daysRemaining = Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      success: true,
      message: `Signed book "${pack.book.title}" verified successfully. Valid for ${daysRemaining} more days (expires ${expires.toLocaleDateString()}).`,
      book: pack.book,
      pack,
    };
  } catch {
    return { success: false, message: 'Malformed signed data pack: verification could not be completed.' };
  }
}

/**
 * Serialize a signed v3 package to the required four-file ZIP structure.
 */
export async function createSignedBookDataPackArchive(pack: SignedBookDataPack): Promise<Uint8Array> {
  if (pack.manifest.packVersion !== SIGNED_DATA_PACK_VERSION) {
    throw new Error(`Only signed ${SIGNED_DATA_PACK_VERSION} packages can be exported.`);
  }

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(pack.manifest, null, 2));
  zip.file('book.json', JSON.stringify(pack.book, null, 2));
  zip.file('signature.json', JSON.stringify(pack.signature, null, 2));
  zip.file(
    'README.txt',
    `Empire Of Trust signed data pack v${SIGNED_DATA_PACK_VERSION}\n` +
    `Book: ${pack.book.title}\nBinding: ${pack.manifest.bindingMode}\n` +
    `Expiry: ${pack.manifest.expiresAt}\nKey ID: ${pack.signature.keyId}\n\n` +
    'This package is digitally signed for integrity and licence verification. It is not encrypted.',
  );
  return zip.generateAsync({ type: 'uint8array' });
}

/**
 * Trigger a browser download for an already-signed package. Signing is performed
 * by publisher tooling outside the browser application.
 */
export async function downloadBookDataPackFile(pack: SignedBookDataPack): Promise<void> {
  const zipBytes = await createSignedBookDataPackArchive(pack);
  const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(zipBlob);
  const sanitizedTitle = pack.book.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  const filename = `${sanitizedTitle || 'book_datapack'}.datapack.zip`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extract Data Pack JSON from uploaded File (supports .zip, .datapack.zip and .json)
 */
export async function extractDataPackFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.zip') || filename.endsWith('.datapack') || file.type.includes('zip')) {
    try {
      const zip = await JSZip.loadAsync(file);

      const manifestFile = zip.file('manifest.json');
      const bookFile = zip.file('book.json');
      const signatureFile = zip.file('signature.json');
      const readmeFile = zip.file('README.txt');
      const hasAnyV3File = Boolean(manifestFile || bookFile || signatureFile);

      if (hasAnyV3File) {
        if (!manifestFile || !bookFile || !signatureFile || !readmeFile) {
          throw new Error('Malformed signed package: manifest.json, book.json, signature.json, and README.txt are required.');
        }
        const [manifestText, bookText, signatureText] = await Promise.all([
          manifestFile.async('string'),
          bookFile.async('string'),
          signatureFile.async('string'),
        ]);
        return JSON.stringify({
          manifest: JSON.parse(manifestText),
          book: JSON.parse(bookText),
          signature: JSON.parse(signatureText),
        });
      }

      // Legacy 2.5.0 archives remain read-only import inputs.
      const legacyFile = zip.file('data.json');
      if (!legacyFile) {
        throw new Error('No supported data-pack files were found in the archive.');
      }
      return legacyFile.async('string');
    } catch (err: any) {
      throw new Error(`Failed to extract zipped book data pack: ${err.message || err}`);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as string) || '');
    };
    reader.onerror = () => reject(new Error('Failed to read data pack file content.'));
    reader.readAsText(file);
  });
}

/**
 * Parse and verify either a signed v3 package or a legacy v2.5 import.
 */
export async function verifyImportedBookDataPack(
  jsonString: string,
  readerPhone: string,
  readerDeviceId: string,
  publicKeys: DataPackPublicKeyRegistry,
): Promise<DataPackVerificationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, message: 'Malformed data pack: package JSON could not be parsed.' };
  }

  if (isRecord(parsed) && ('manifest' in parsed || 'signature' in parsed)) {
    return verifySignedBookDataPack(parsed, readerPhone, readerDeviceId, publicKeys);
  }
  return verifyAndExtractBookDataPack(jsonString, readerPhone, readerDeviceId);
}

/**
 * Verify and unlock imported JSON Data Pack with strict integrity checks (legacy 2.5.0 support)
 */
export function verifyAndExtractBookDataPack(
  jsonString: string,
  readerPhone: string,
  readerDeviceId: string
): DataPackVerificationResult {
  try {
    const parsed = JSON.parse(jsonString);

    if (parsed.manifest || parsed.signature) {
      return {
        success: false,
        message: 'Signed packages must be verified with the configured public-key registry.',
      };
    }

    const pack: BookDataPack = parsed;

    if (!pack.book || !pack.book.id || !pack.boundPhoneNumber || !pack.boundDeviceId || !pack.exportTimestamp) {
      return {
        success: false,
        message: 'Invalid Book Data Pack format. Missing required manuscript metadata or binding fields.',
      };
    }

    if (!pack.appSignature || pack.appSignature !== 'EMPIRE_OF_TRUST_MY_LIBRARY_V2') {
      return {
        success: false,
        message: 'Invalid application signature in data pack.',
        book: pack.book,
        pack,
      };
    }

    if (pack.packVersion !== LEGACY_DATA_PACK_VERSION) {
      return {
        success: false,
        message: `Unsupported data pack version "${pack.packVersion}". Only 2.5.0 (legacy) and 3.0.0 (signed) are supported.`,
        book: pack.book,
        pack,
      };
    }

    const exportDate = new Date(pack.exportTimestamp);
    if (isNaN(exportDate.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(pack.exportTimestamp)) {
      return {
        success: false,
        message: 'Invalid export timestamp in data pack.',
        book: pack.book,
        pack,
      };
    }

    if (pack.expiresAt) {
      const expiryDateVal = new Date(pack.expiresAt);
      if (isNaN(expiryDateVal.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(pack.expiresAt)) {
        return {
          success: false,
          message: 'Invalid expiry date in data pack.',
          book: pack.book,
          pack,
        };
      }
    }

    const now = new Date();
    const exportTimestamp = exportDate.getTime();

    if (exportTimestamp > now.getTime() + MAX_EXPORT_SKEW_MS) {
      return {
        success: false,
        message: 'Impossible export timestamp detected in data pack.',
        book: pack.book,
        pack,
      };
    }

    const expiryTimestamp = pack.expiresAt ? new Date(pack.expiresAt).getTime() : exportTimestamp + (MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000);
    if (isNaN(expiryTimestamp)) {
      return {
        success: false,
        message: 'Invalid expiry date in data pack.',
        book: pack.book,
        pack,
      };
    }

    if (expiryTimestamp <= exportTimestamp) {
      return {
        success: false,
        message: 'Invalid licence chronology: expiry must be later than export date.',
        book: pack.book,
        pack,
      };
    }

    if (expiryTimestamp - exportTimestamp > (MAX_LICENCE_DAYS + 30) * 24 * 60 * 60 * 1000) {
      return {
        success: false,
        message: 'Licence duration exceeds allowed maximum. The pack may be tampered or unauthorised.',
        book: pack.book,
        pack,
      };
    }

    const bookContent = stableStringify(pack.book);
    const recalculatedToken = calculateBindingToken(
      pack.packVersion,
      pack.appSignature,
      pack.book.id,
      pack.boundPhoneNumber,
      pack.boundDeviceId,
      pack.exportTimestamp,
      pack.expiresAt || new Date(exportTimestamp + MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      bookContent
    );

    if (recalculatedToken !== pack.securityHash) {
      return {
        success: false,
        message: 'Tampered data pack detected: security token mismatch.',
        book: pack.book,
        pack,
      };
    }

    if (now.getTime() > expiryTimestamp) {
      const expiryDate = new Date(expiryTimestamp);
      return {
        success: false,
        isExpired: true,
        message: `Data Pack Expired! This download pack expired on ${expiryDate.toLocaleDateString()} (30-day offline security limit). Please request/download a fresh activation pack from the Book Store.`,
        book: pack.book,
        pack,
        isLegacy: true,
      };
    }

    const currentPhone = readerPhone.trim();
    const currentDevice = readerDeviceId.trim();

    const phoneMatches = currentPhone && pack.boundPhoneNumber === currentPhone;
    const deviceMatches = currentDevice && pack.boundDeviceId === currentDevice;

    if (phoneMatches || deviceMatches) {
      const daysRemaining = Math.max(1, Math.ceil((expiryTimestamp - now.getTime()) / (1000 * 60 * 60 * 24)));
      const expiryDate = new Date(expiryTimestamp);
      return {
        success: true,
        message: `Book "${pack.book.title}" successfully verified and unlocked for My Library! Valid for ${daysRemaining} more days (expires ${expiryDate.toLocaleDateString()}).`,
        book: pack.book,
        pack,
        isLegacy: true,
      };
    }

    return {
      success: false,
      message: `Binding mismatch! This data pack is cryptographically bound to phone (${pack.boundPhoneNumber}) and device (${pack.boundDeviceId.slice(0, 12)}...). Please sign in with the matching phone or device in My Library.`,
      book: pack.book,
      pack,
      isLegacy: true,
    };
  } catch (err: any) {
    return { success: false, message: 'Failed to parse book data pack. Please ensure it is a valid zipped .datapack.zip file generated for My Library.' };
  }
}

/**
 * Check if a library item or data pack JSON string is expired
 */
export function checkDataPackExpiration(dataPackJson: string, downloadedAt?: string): { isExpired: boolean; expiryDate: Date; daysRemaining: number } {
  const now = new Date();
  let expiryTimestamp = 0;

  try {
    const pack = JSON.parse(dataPackJson) as BookDataPack | SignedBookDataPack;
    if ('manifest' in pack && pack.manifest?.expiresAt) {
      expiryTimestamp = new Date(pack.manifest.expiresAt).getTime();
    } else if ('expiresAt' in pack && pack.expiresAt) {
      expiryTimestamp = new Date(pack.expiresAt).getTime();
    } else if ('exportTimestamp' in pack && pack.exportTimestamp) {
      expiryTimestamp = new Date(pack.exportTimestamp).getTime() + (MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000);
    }
  } catch (e) {
    // ignore parse error, fallback to downloadedAt
  }

  if (!expiryTimestamp) {
    const baseTime = downloadedAt ? new Date(downloadedAt).getTime() : now.getTime();
    expiryTimestamp = baseTime + (MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000);
  }

  const expiryDate = new Date(expiryTimestamp);
  const isExpired = now.getTime() > expiryTimestamp;
  const daysRemaining = Math.max(0, Math.ceil((expiryTimestamp - now.getTime()) / (1000 * 60 * 60 * 24)));

  return { isExpired, expiryDate, daysRemaining };
}

/**
 * Renewal always requires conversion/re-issuance as a signed v3.0.0 package.
 */
export function renewBookDataPackJson(dataPackJson: string, authorization: RenewalAuthorization, extensionDays: number = MAX_LICENCE_DAYS): { updatedJson: string; newExpiresAt: string; book: Book } {
  void authorization;
  void extensionDays;
  try {
    JSON.parse(dataPackJson);
  } catch {
    throw new Error('Failed to parse existing library item data pack JSON.');
  }
  throw new Error('Renewal requires conversion and re-issuance as a signed v3.0.0 package from the publisher.');
}
