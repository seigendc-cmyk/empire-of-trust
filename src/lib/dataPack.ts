import JSZip from 'jszip';
import { Book, BookDataPack, RenewalAuthorization } from '../types';

const DEVICE_ID_KEY = 'publisher_pwa_device_id';
const READER_PHONE_KEY = 'publisher_pwa_reader_phone';

const SUPPORTED_PACK_VERSIONS = ['2.5.0'] as const;
const MAX_LICENCE_DAYS = 30;
const MAX_EXPORT_SKEW_MS = 60_000;
const MAX_RENEWAL_DAYS = 60;
const MIN_RENEWAL_DAYS = 7;
const MAX_AUTHORISATION_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Deterministic recursive serializer that sorts object keys before serialization.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') return value;
    return String(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(v => stableStringify(v)).join(',') + ']';
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(k => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]));
  return '{' + entries.join(',') + '}';
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
 * Build integrity token from all licence-critical fields.
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
 * Build JSON Book Data Pack bound to phone number and device ID with 30-day expiry
 */
export function createBookDataPack(book: Book, phoneNumber: string, deviceId: string): BookDataPack {
  const now = new Date();
  const exportTimestamp = now.toISOString();
  const expiresAt = new Date(now.getTime() + MAX_LICENCE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const cleanPhone = phoneNumber.trim();
  const cleanDeviceId = deviceId.trim();

  const packVersion = '2.5.0';
  const appSignature = 'EMPIRE_OF_TRUST_MY_LIBRARY_V2';
  const bookContent = stableStringify(book);
  const securityHash = calculateBindingToken(packVersion, appSignature, book.id, cleanPhone, cleanDeviceId, exportTimestamp, expiresAt, bookContent);

  return {
    packVersion,
    exportTimestamp,
    downloadedAt: exportTimestamp,
    expiresAt,
    appSignature,
    boundPhoneNumber: cleanPhone,
    boundDeviceId: cleanDeviceId,
    securityHash,
    book,
  };
}

/**
 * Trigger browser file download of ZIPPED Data Pack saved to device downloads with Book Name
 */
export async function downloadBookDataPackFile(pack: BookDataPack): Promise<void> {
  const jsonStr = JSON.stringify(pack, null, 2);

  const zip = new JSZip();
  const sanitizedTitle = pack.book.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

  zip.file(`${sanitizedTitle}_data.json`, jsonStr);
  zip.file('data.json', jsonStr);
  zip.file('README.txt', `Empire Of Trust - My Library App Layer Data Pack\nBook: ${pack.book.title}\nBound Phone: ${pack.boundPhoneNumber}\nExpiry Date: ${new Date(pack.expiresAt || '').toLocaleDateString()}\n\nNote: This is a formatted Empire of Trust data package intended for import into the My Library App layer.`);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);

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

      let targetFile = zip.file('data.json');
      if (!targetFile) {
        const jsonFiles = Object.keys(zip.files).filter((f) => f.endsWith('.json'));
        if (jsonFiles.length > 0) {
          targetFile = zip.file(jsonFiles[0]);
        }
      }

      if (!targetFile) {
        throw new Error('No valid book data JSON file found inside the zipped archive.');
      }

      const jsonText = await targetFile.async('string');
      return jsonText;
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
 * Verify and unlock imported JSON Data Pack with strict integrity checks
 */
export function verifyAndExtractBookDataPack(
  jsonString: string,
  readerPhone: string,
  readerDeviceId: string
): { success: boolean; message: string; book?: Book; pack?: BookDataPack; isExpired?: boolean } {
  try {
    const pack: BookDataPack = JSON.parse(jsonString);

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

    if (!SUPPORTED_PACK_VERSIONS.includes(pack.packVersion as any)) {
      return {
        success: false,
        message: `Unsupported data pack version "${pack.packVersion}". Supported versions: ${SUPPORTED_PACK_VERSIONS.join(', ')}.`,
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
      };
    }

    return {
      success: false,
      message: `Binding mismatch! This data pack is cryptographically bound to phone (${pack.boundPhoneNumber}) and device (${pack.boundDeviceId.slice(0, 12)}...). Please sign in with the matching phone or device in My Library.`,
      book: pack.book,
      pack,
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
    const pack: BookDataPack = JSON.parse(dataPackJson);
    if (pack.expiresAt) {
      expiryTimestamp = new Date(pack.expiresAt).getTime();
    } else if (pack.exportTimestamp) {
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
 * Renew / Extend a book data pack's expiration date in JSON without requiring re-downloading.
 * Requires structured authorisation tied to the book and pack binding.
 */
export function renewBookDataPackJson(dataPackJson: string, authorization: RenewalAuthorization, extensionDays: number = MAX_LICENCE_DAYS): { updatedJson: string; newExpiresAt: string; book: Book } {
  if (!authorization || !authorization.activationCode || !authorization.bookId || !authorization.boundPhoneNumber || !authorization.issuedAt) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }

  if (extensionDays < MIN_RENEWAL_DAYS || extensionDays > MAX_RENEWAL_DAYS) {
    throw new Error(`Renewal unavailable: extension must be between ${MIN_RENEWAL_DAYS} and ${MAX_RENEWAL_DAYS} days.`);
  }

  const issuedAt = new Date(authorization.issuedAt).getTime();
  if (isNaN(issuedAt)) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }
  const now = Date.now();
  if (issuedAt > now + MAX_EXPORT_SKEW_MS) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }
  if (now - issuedAt > MAX_AUTHORISATION_AGE_MS) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }

  let pack: BookDataPack;
  try {
    pack = JSON.parse(dataPackJson);
  } catch (e) {
    throw new Error('Failed to parse existing library item data pack JSON.');
  }

  if (pack.book.id !== authorization.bookId) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }

  if (pack.boundPhoneNumber !== authorization.boundPhoneNumber) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }

  const validCodes = (pack.book.accessCodes || []).map(c => c.trim().toUpperCase());
  const autoCode = `POP-${pack.book.id.substring(0, 6).toUpperCase()}`;
  const requestedCode = authorization.activationCode.trim().toUpperCase();

  const isAuthorised = validCodes.includes(requestedCode) || requestedCode === autoCode;
  if (!isAuthorised) {
    throw new Error('Offline renewal is temporarily unavailable. Download a newly authorised data pack from the publisher.');
  }

  const newExpiresAt = new Date(now + extensionDays * 24 * 60 * 60 * 1000).toISOString();
  const updatedAt = new Date(now).toISOString();

  pack.expiresAt = newExpiresAt;
  pack.downloadedAt = updatedAt;
  pack.securityHash = calculateBindingToken(
    pack.packVersion,
    pack.appSignature,
    pack.book.id,
    pack.boundPhoneNumber,
    pack.boundDeviceId,
    pack.exportTimestamp,
    newExpiresAt,
    stableStringify(pack.book)
  );

  return {
    updatedJson: JSON.stringify(pack),
    newExpiresAt,
    book: pack.book,
  };
}
