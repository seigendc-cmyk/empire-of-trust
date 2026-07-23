import { describe, it, expect } from 'vitest';
import { createBookDataPack, verifyAndExtractBookDataPack, stableStringify, renewBookDataPackJson, calculateBindingToken } from '../lib/dataPack';
import { Book, RenewalAuthorization, BookDataPack } from '../types';

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  chapters: [
    {
      id: 'chap_1',
      bookId: 'book_test_001',
      title: 'Chapter 1',
      chapterNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'blk_1',
          chapterId: 'chap_1',
          type: 'paragraph',
          content: 'Hello world',
          meta: {},
          orderIndex: 0,
        },
      ],
    },
  ],
  references: [],
  accessCodes: ['POP-TEST123', 'VIP-2026'],
  tags: ['test'],
  language: 'English (US)',
};

function makeFreshPack(bookOverrides: Partial<Book> = {}, packOverrides: Partial<BookDataPack> = {}): BookDataPack {
  const book = { ...baseBook, ...bookOverrides } as Book;
  const pack = createBookDataPack(book, '+263700000000', 'DEVICE-ABC-123');
  return { ...pack, ...packOverrides } as BookDataPack;
}

function recalcHash(pack: BookDataPack): string {
  return calculateBindingToken(
    pack.packVersion,
    pack.appSignature,
    pack.book.id,
    pack.boundPhoneNumber,
    pack.boundDeviceId,
    pack.exportTimestamp,
    pack.expiresAt || new Date(new Date(pack.exportTimestamp).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stableStringify(pack.book)
  );
}

describe('stableStringify', () => {
  it('14. stable serialization produces the same output regardless of object key insertion order', () => {
    const a = { z: 3, a: 1, nested: { b: 4, a: 2 } };
    const b = { a: 1, z: 3, nested: { a: 2, b: 4 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });
});

describe('data pack verification', () => {
  it('1. untouched package verifies successfully', () => {
    const pack = makeFreshPack();
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(true);
  });

  it('2. changed expiry date fails verification', () => {
    const pack = makeFreshPack();
    pack.expiresAt = new Date(Date.now() + 61 * 24 * 60 * 60 * 1000).toISOString();
    pack.securityHash = recalcHash(pack);
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Licence duration exceeds allowed maximum/);
  });

  it('3. changed book title fails verification', () => {
    const pack = makeFreshPack();
    pack.book.title = 'Changed Title';
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/security token mismatch/i);
  });

  it('4. changed bound phone fails verification', () => {
    const pack = makeFreshPack();
    pack.boundPhoneNumber = '+260000000000';
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/security token mismatch/i);
  });

  it('5. changed device ID fails verification', () => {
    const pack = makeFreshPack();
    pack.boundDeviceId = 'DEVICE-XYZ-999';
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/security token mismatch/i);
  });

  it('6. invalid app signature fails', () => {
    const pack = makeFreshPack({}, { appSignature: 'BAD_SIG' });
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Invalid application signature/);
  });

  it('7. unsupported pack version fails', () => {
    const pack = makeFreshPack({}, { packVersion: '9.9.9' });
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Unsupported data pack version/);
  });

  it('8. expiry earlier than export date fails', () => {
    const pack = makeFreshPack();
    pack.expiresAt = pack.exportTimestamp;
    pack.securityHash = recalcHash(pack);
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/expiry must be later than export date/);
  });

  it('9. expired package fails', () => {
    const exportDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(exportDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const pack = makeFreshPack({
      createdAt: exportDate.toISOString(),
      updatedAt: exportDate.toISOString(),
    });
    pack.exportTimestamp = exportDate.toISOString();
    pack.expiresAt = expiryDate.toISOString();
    pack.downloadedAt = exportDate.toISOString();
    pack.securityHash = recalcHash(pack);
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.message).toMatch(/Data Pack Expired/);
  });

  it('10. correct phone/device package succeeds', () => {
    const pack = makeFreshPack();
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263700000000', 'DEVICE-ABC-123');
    expect(result.success).toBe(true);
  });

  it('11. demo bypass no longer succeeds', () => {
    const pack = makeFreshPack({}, { boundPhoneNumber: '+10000000000' });
    const result = verifyAndExtractBookDataPack(JSON.stringify(pack), '+263000000000', 'DEVICE-XYZ-999');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/security token mismatch/i);
  });
});

describe('data pack renewal', () => {
  it('12. renewal without valid authorization fails', () => {
    const pack = makeFreshPack();
    const auth = {
      activationCode: 'INVALID',
      bookId: baseBook.id,
      boundPhoneNumber: '+263700000000',
      issuedAt: new Date().toISOString(),
      extensionDays: 30,
    } as RenewalAuthorization;
    expect(() => renewBookDataPackJson(JSON.stringify(pack), auth, 30)).toThrow(/temporarily unavailable/);
  });

  it('13. valid renewal updates expiry and produces a verifiable package', () => {
    const bookWithCode = { ...baseBook, accessCodes: ['POP-RENEW'] };
    const pack = createBookDataPack(bookWithCode, '+263700000000', 'DEVICE-ABC-123');
    const auth = {
      activationCode: 'POP-RENEW',
      bookId: bookWithCode.id,
      boundPhoneNumber: '+263700000000',
      issuedAt: new Date().toISOString(),
      extensionDays: 30,
    } as RenewalAuthorization;
    const result = renewBookDataPackJson(JSON.stringify(pack), auth, 30);
    const verification = verifyAndExtractBookDataPack(result.updatedJson, '+263700000000', 'DEVICE-ABC-123');
    expect(verification.success).toBe(true);
  });
});
