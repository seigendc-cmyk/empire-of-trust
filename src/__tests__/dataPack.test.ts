import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DATA_PACK_SIGNATURE_ALGORITHM,
  LEGACY_DATA_PACK_VERSION,
  calculateBindingToken,
  canonicalizeManifest,
  checkDataPackExpiration,
  createSignedBookDataPack,
  createSignedBookDataPackArchive,
  createUnsignedManifest,
  exportPublicKeyPem,
  extractDataPackFromFile,
  hashString,
  renewBookDataPackJson,
  signManifest,
  stableStringify,
  verifyAndExtractBookDataPack,
  verifyImportedBookDataPack,
  verifySignedBookDataPack,
} from '../lib/dataPack';
import type {
  Book,
  BookDataPack,
  LicenceBindingMode,
  SignedBookDataPack,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const baseBook: Book = {
  id: 'book_test_001',
  title: 'Test Book',
  subtitle: 'A Test',
  author: 'Test Author',
  publisherId: 'pub_001',
  description: 'Test description',
  category: 'Software & Code Scripts',
  price: 0,
  currency: 'USD',
  isPublished: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  version: '1.0.0',
  coverFront: {
    title: 'Test Book',
    author: 'Test Author',
    bgType: 'gradient',
    bgColor: '#ea580c',
    gradientStart: '#ea580c',
    gradientEnd: '#9a3412',
    titleColor: '#ffffff',
    authorColor: '#fed7aa',
    layoutStyle: 'classic',
  },
  coverBack: {
    synopsis: 'Synopsis',
    publisherName: 'Test Press',
    bgColor: '#1f2125',
    textColor: '#ffffff',
  },
  chapters: [{
    id: 'chap_1',
    bookId: 'book_test_001',
    title: 'Chapter 1',
    chapterNumber: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    blocks: [{
      id: 'blk_1',
      chapterId: 'chap_1',
      type: 'paragraph',
      content: 'Hello world',
      meta: {},
      orderIndex: 0,
    }],
  }],
  references: [],
  accessCodes: ['POP-TEST123'],
  tags: ['test'],
  language: 'English (US)',
};

function makeLegacyPack(
  bookOverrides: Partial<Book> = {},
  packOverrides: Partial<BookDataPack> = {},
): BookDataPack {
  const book = { ...baseBook, ...bookOverrides } as Book;
  const exportTimestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * DAY_MS).toISOString();
  const pack: BookDataPack = {
    packVersion: LEGACY_DATA_PACK_VERSION,
    exportTimestamp,
    downloadedAt: exportTimestamp,
    expiresAt,
    appSignature: 'EMPIRE_OF_TRUST_MY_LIBRARY_V2',
    boundPhoneNumber: '+263700000000',
    boundDeviceId: 'DEVICE-ABC-123',
    securityHash: '',
    book,
    ...packOverrides,
  };
  pack.securityHash = calculateBindingToken(
    pack.packVersion,
    pack.appSignature || '',
    pack.book.id,
    pack.boundPhoneNumber,
    pack.boundDeviceId,
    pack.exportTimestamp,
    pack.expiresAt || expiresAt,
    stableStringify(pack.book),
  );
  return pack;
}

function resignLegacyPack(pack: BookDataPack): void {
  pack.securityHash = calculateBindingToken(
    pack.packVersion,
    pack.appSignature || '',
    pack.book.id,
    pack.boundPhoneNumber,
    pack.boundDeviceId,
    pack.exportTimestamp,
    pack.expiresAt || '',
    stableStringify(pack.book),
  );
}

describe('legacy v2.5 integrity (read-only import)', () => {
  it('keeps deterministic serialization independent of insertion order', () => {
    expect(stableStringify({ z: 3, a: { y: 2, x: 1 } }))
      .toBe(stableStringify({ a: { x: 1, y: 2 }, z: 3 }));
    expect(stableStringify({ present: 1, absent: undefined })).toBe('{"present":1}');
  });

  it('accepts an untouched, unexpired legacy package by either bound value', () => {
    const pack = makeLegacyPack();
    expect(verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'OTHER').success).toBe(true);
    expect(verifyAndExtractBookDataPack(JSON.stringify(pack), 'OTHER', 'DEVICE-ABC-123').success).toBe(true);
  });

  it.each([
    ['expiry', (pack: BookDataPack) => { pack.expiresAt = new Date(Date.now() + 5 * DAY_MS).toISOString(); }],
    ['book content', (pack: BookDataPack) => { pack.book.title = 'Changed'; }],
    ['phone', (pack: BookDataPack) => { pack.boundPhoneNumber = '+260000000000'; }],
    ['device', (pack: BookDataPack) => { pack.boundDeviceId = 'OTHER'; }],
  ])('rejects changed %s without a matching legacy token', (_label, mutate) => {
    const pack = makeLegacyPack();
    mutate(pack);
    expect(verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123').success).toBe(false);
  });

  it('retains chronology and maximum-duration checks even with a recomputed token', () => {
    const invalidChronology = makeLegacyPack();
    invalidChronology.expiresAt = invalidChronology.exportTimestamp;
    resignLegacyPack(invalidChronology);
    expect(verifyAndExtractBookDataPack(JSON.stringify(invalidChronology), '+263700000000', 'DEVICE-ABC-123').message)
      .toMatch(/expiry must be later/);

    const excessive = makeLegacyPack();
    excessive.expiresAt = new Date(new Date(excessive.exportTimestamp).getTime() + 61 * DAY_MS).toISOString();
    resignLegacyPack(excessive);
    expect(verifyAndExtractBookDataPack(JSON.stringify(excessive), '+263700000000', 'DEVICE-ABC-123').message)
      .toMatch(/duration exceeds/);
  });

  it('rejects invalid app signatures, versions, timestamps, expiry, and bindings', () => {
    const invalidSignature = makeLegacyPack({}, { appSignature: 'BAD' });
    expect(verifyAndExtractBookDataPack(JSON.stringify(invalidSignature), '+263700000000', 'DEVICE-ABC-123').message)
      .toMatch(/Invalid application signature/);

    const invalidVersion = makeLegacyPack({}, { packVersion: '9.9.9' });
    expect(verifyAndExtractBookDataPack(JSON.stringify(invalidVersion), '+263700000000', 'DEVICE-ABC-123').message)
      .toMatch(/Unsupported data pack version/);

    const invalidTimestamp = makeLegacyPack({}, { exportTimestamp: 'not-a-date' });
    expect(verifyAndExtractBookDataPack(JSON.stringify(invalidTimestamp), '+263700000000', 'DEVICE-ABC-123').message)
      .toMatch(/Invalid export timestamp/);

    const mismatch = makeLegacyPack();
    expect(verifyAndExtractBookDataPack(JSON.stringify(mismatch), 'OTHER', 'OTHER').message)
      .toMatch(/Binding mismatch/);
  });

  it('rejects expired legacy packs and reports them as legacy', () => {
    const exportTimestamp = new Date(Date.now() - 29 * DAY_MS).toISOString();
    const pack = makeLegacyPack({}, {
      exportTimestamp,
      downloadedAt: exportTimestamp,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    resignLegacyPack(pack);
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.isLegacy).toBe(true);
  });

  it('requires legacy renewal to be converted and re-issued as v3', () => {
    const pack = makeLegacyPack();
    expect(() => renewBookDataPackJson(JSON.stringify(pack), {
      activationCode: 'POP-TEST123',
      bookId: baseBook.id,
      boundPhoneNumber: '+263700000000',
      issuedAt: new Date().toISOString(),
      extensionDays: 30,
    })).toThrow(/conversion.*v3\.0\.0/i);
  });
});

describe('signed data-pack v3.0.0', () => {
  let privateKey: CryptoKey;
  let publicKeyPem: string;
  let keyId: string;
  let registry: Record<string, string>;

  beforeEach(async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    privateKey = keyPair.privateKey;
    publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
    keyId = `test-key-${crypto.randomUUID()}`;
    registry = { [keyId]: publicKeyPem };
  });

  afterEach(() => {
    registry = {};
  });

  const createPack = (bindingMode: LicenceBindingMode = 'phone-and-device', overrides = {}) =>
    createSignedBookDataPack({
      book: structuredClone(baseBook),
      phoneNumber: '+263700000000',
      deviceId: 'DEVICE-ABC-123',
      bindingMode,
      privateKey,
      keyId,
      packageId: 'PKG-TEST',
      licenceId: 'LIC-TEST',
      ...overrides,
    });

  it('1. valid signed package verifies', async () => {
    const result = await verifySignedBookDataPack(await createPack(), '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(true);
    expect(result.book?.id).toBe(baseBook.id);
  });

  it('2. modified book content fails', async () => {
    const pack = await createPack();
    pack.book.title = 'Tampered title';
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/content hash mismatch/i);
  });

  it('3. modified expiry fails', async () => {
    const pack = await createPack();
    pack.manifest.expiresAt = new Date(Date.now() + 5 * DAY_MS).toISOString();
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid signature/i);
  });

  it('4. modified phone binding fails', async () => {
    const pack = await createPack();
    pack.manifest.boundPhoneHash = '0'.repeat(64);
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid signature/i);
  });

  it('5. modified device binding fails', async () => {
    const pack = await createPack();
    pack.manifest.boundDeviceHash = '0'.repeat(64);
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid signature/i);
  });

  it('6. invalid signature fails', async () => {
    const pack = await createPack();
    pack.signature.signature = btoa('invalid-signature');
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid signature/i);
  });

  it('7. wrong public key fails', async () => {
    const wrongPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const pack = await createPack();
    const result = await verifySignedBookDataPack(
      pack,
      '+263700000000',
      'DEVICE-ABC-123',
      { [keyId]: await exportPublicKeyPem(wrongPair.publicKey) },
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid signature/i);
  });

  it('8. unknown keyId fails before key import', async () => {
    const pack = await createPack();
    pack.signature.keyId = 'unknown-key';
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unknown or unsupported signing key/i);
  });

  it('9. unsupported version fails', async () => {
    const pack = await createPack();
    (pack.manifest as { packVersion: string }).packVersion = '9.9.9';
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unsupported signed package version/i);
  });

  it('10. expired signed package fails', async () => {
    const pack = await createPack('phone-and-device', {
      issuedAt: new Date(Date.now() - 29 * DAY_MS).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await verifySignedBookDataPack(pack, '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(false);
    expect(result.isExpired).toBe(true);
  });

  it('11. valid phone-only binding passes', async () => {
    const result = await verifySignedBookDataPack(await createPack('phone'), '+263700000000', 'OTHER', registry);
    expect(result.success).toBe(true);
  });

  it('12. valid device-only binding passes', async () => {
    const result = await verifySignedBookDataPack(await createPack('device'), 'OTHER', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(true);
  });

  it('13. strict phone-and-device binding passes', async () => {
    const result = await verifySignedBookDataPack(await createPack(), '+263700000000', 'DEVICE-ABC-123', registry);
    expect(result.success).toBe(true);
  });

  it('14. strict binding fails when one value differs', async () => {
    const result = await verifySignedBookDataPack(await createPack(), '+263700000000', 'OTHER', registry);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/phone and device binding mismatch/i);
  });

  it('15. legacy 2.5.0 package imports as legacy', async () => {
    const result = await verifyImportedBookDataPack(
      JSON.stringify(makeLegacyPack()),
      '+263700000000',
      'DEVICE-ABC-123',
      registry,
    );
    expect(result.success).toBe(true);
    expect(result.isLegacy).toBe(true);
  });

  it('16. new package creation never emits 2.5.0', async () => {
    const pack = await createPack();
    expect(pack.manifest.packVersion).toBe('3.0.0');
    expect(JSON.stringify(pack)).not.toContain('"packVersion":"2.5.0"');
  });

  it('17. deterministic manifest serialization is stable', async () => {
    const issuedAt = '2026-07-23T00:00:00.000Z';
    const expiresAt = '2026-08-22T00:00:00.000Z';
    const shared = {
      phoneNumber: '+263700000000',
      deviceId: 'DEVICE-ABC-123',
      bindingMode: 'phone-and-device' as const,
      issuedAt,
      expiresAt,
      packageId: 'PKG-STABLE',
      licenceId: 'LIC-STABLE',
    };
    const a = await createUnsignedManifest({ ...shared, book: structuredClone(baseBook) });
    const b = await createUnsignedManifest({ book: structuredClone(baseBook), ...shared });
    expect(canonicalizeManifest(a)).toBe(canonicalizeManifest(b));
    expect(a.signatureAlgorithm).toBe(DATA_PACK_SIGNATURE_ALGORITHM);
  });

  it('18. content hash is stable', async () => {
    const hashA = await hashString(stableStringify(baseBook));
    const hashB = await hashString(stableStringify(structuredClone(baseBook)));
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
  });

  it('19. key rotation supports multiple public keys by exact keyId', async () => {
    const oldPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const oldKeyId = 'old-key';
    const oldPack = await createSignedBookDataPack({
      book: structuredClone(baseBook),
      phoneNumber: '+263700000000',
      deviceId: 'DEVICE-ABC-123',
      bindingMode: 'phone-and-device',
      privateKey: oldPair.privateKey,
      keyId: oldKeyId,
      packageId: 'PKG-OLD',
      licenceId: 'LIC-OLD',
    });
    const rotatedRegistry = {
      [oldKeyId]: await exportPublicKeyPem(oldPair.publicKey),
      [keyId]: publicKeyPem,
    };
    expect((await verifySignedBookDataPack(oldPack, '+263700000000', 'DEVICE-ABC-123', rotatedRegistry)).success).toBe(true);
    expect((await verifySignedBookDataPack(await createPack(), '+263700000000', 'DEVICE-ABC-123', rotatedRegistry)).success).toBe(true);
  });

  it('20. real private key material is not present in frontend inputs', () => {
    const roots = [join(process.cwd(), 'src'), join(process.cwd(), 'public'), join(process.cwd(), 'config')];
    const files: string[] = [];
    const visit = (path: string) => {
      for (const name of readdirSync(path)) {
        const child = join(path, name);
        if (statSync(child).isDirectory()) visit(child);
        else files.push(child);
      }
    };
    roots.forEach(visit);
    const frontend = files.map(path => readFileSync(path, 'utf8')).join('\n');
    expect(frontend).not.toMatch(/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/);
    expect(files.some(path => path.endsWith('.private.jwk'))).toBe(false);
  });

  it('creates and imports the required four-file ZIP package', async () => {
    const pack = await createPack();
    const bytes = await createSignedBookDataPackArchive(pack);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).sort()).toEqual([
      'README.txt',
      'book.json',
      'manifest.json',
      'signature.json',
    ]);
    const file = new File([bytes], 'book.datapack.zip', { type: 'application/zip' });
    const extracted = await extractDataPackFromFile(file);
    expect((await verifyImportedBookDataPack(extracted, '+263700000000', 'DEVICE-ABC-123', registry)).success).toBe(true);
  });

  it('rejects malformed signed packages clearly', async () => {
    const result = await verifyImportedBookDataPack(
      JSON.stringify({ manifest: { packVersion: '3.0.0' }, signature: {} }),
      '+263700000000',
      'DEVICE-ABC-123',
      registry,
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/malformed/i);
  });

  it('fails creation for unsupported binding, missing binding data, invalid dates, and unavailable signing key', async () => {
    await expect(createPack('unsupported' as LicenceBindingMode)).rejects.toThrow(/unsupported binding/i);
    await expect(createPack('phone', { phoneNumber: '' })).rejects.toThrow(/phone binding value/i);
    await expect(createPack('device', { deviceId: '' })).rejects.toThrow(/device binding value/i);
    await expect(createPack('phone', { issuedAt: 'bad-date' })).rejects.toThrow(/invalid licence dates/i);
    await expect(createPack('phone', { privateKey: undefined })).rejects.toThrow(/signing key is unavailable/i);
  });

  it('binds the signature algorithm into the canonical manifest', async () => {
    const pack = await createPack();
    const original = pack.signature.signature;
    pack.manifest.signatureAlgorithm = DATA_PACK_SIGNATURE_ALGORITHM;
    expect(pack.signature.signature).toBe(original);

    const unsupported = { ...pack.manifest, signatureAlgorithm: 'OTHER' } as unknown as typeof pack.manifest;
    await expect(signManifest(unsupported, privateKey, keyId)).rejects.toThrow(/unsupported signature algorithm/i);
  });

  it('uses signed expiry metadata when checking stored library items', async () => {
    const pack = await createPack();
    const expiry = checkDataPackExpiration(JSON.stringify(pack));
    expect(expiry.isExpired).toBe(false);
    expect(expiry.expiryDate.toISOString()).toBe(pack.manifest.expiresAt);
  });
});
