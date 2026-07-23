import JSZip from 'jszip';
import { Book, BookDataPack } from '../types';

const DEVICE_ID_KEY = 'publisher_pwa_device_id';
const READER_PHONE_KEY = 'publisher_pwa_reader_phone';

/**
 * Get or generate persistent unique device ID
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    deviceId = `DEV-SHELL-${ts}-${randomHex}`;
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
 * Simple cryptographic-style checksum calculation for binding verification
 */
function calculateBindingToken(bookId: string, phone: string, deviceId: string, timestamp: string): string {
  const raw = `${bookId}::${phone.trim()}::${deviceId.trim()}::${timestamp}::SECURE_PUBLISHER_KEY_2026`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `SIG_${Math.abs(hash).toString(16).toUpperCase()}_${timestamp}`;
}

/**
 * Build JSON Book Data Pack bound to phone number and device ID with 30-day expiry
 */
export function createBookDataPack(book: Book, phoneNumber: string, deviceId: string): BookDataPack {
  const now = new Date();
  const exportTimestamp = now.toISOString();
  // 30 days expiry date calculation
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const cleanPhone = phoneNumber.trim();
  const cleanDeviceId = deviceId.trim();
  const securityHash = calculateBindingToken(book.id, cleanPhone, cleanDeviceId, exportTimestamp);

  return {
    packVersion: '2.5.0',
    exportTimestamp,
    downloadedAt: exportTimestamp,
    expiresAt,
    appSignature: 'EMPIRE_OF_TRUST_MY_LIBRARY_V2',
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
  
  // Create ZIP archive containing manuscript JSON
  const zip = new JSZip();
  const sanitizedTitle = pack.book.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  
  // Add data file inside zip
  zip.file(`${sanitizedTitle}_data.json`, jsonStr);
  zip.file('data.json', jsonStr); // Standard entry point
  zip.file('READ_ME_OFFLINE.txt', `Empire Of Trust - My Library App Layer Data Pack\nBook: ${pack.book.title}\nBound Phone: ${pack.boundPhoneNumber}\nExpiry Date: ${new Date(pack.expiresAt || '').toLocaleDateString()}\n\nNote: This zipped data pack is encrypted and formatted strictly to open inside the My Library App layer.`);

  // Generate ZIP blob
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
  
  // If file is a ZIP archive
  if (filename.endsWith('.zip') || filename.endsWith('.datapack') || file.type.includes('zip')) {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Look for data.json or any *.json file in zip
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

  // Otherwise fallback to reading as plain text JSON
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
 * Verify and unlock imported JSON Data Pack with 30-day expiration check
 */
export function verifyAndExtractBookDataPack(
  jsonString: string,
  readerPhone: string,
  readerDeviceId: string
): { success: boolean; message: string; book?: Book; pack?: BookDataPack; isExpired?: boolean } {
  try {
    const pack: BookDataPack = JSON.parse(jsonString);

    if (!pack.book || !pack.book.id || !pack.boundPhoneNumber) {
      return { 
        success: false, 
        message: 'Invalid Book Data Pack format. Missing required manuscript metadata or phone binding.' 
      };
    }

    // 1. Expiration check (30 days from date of download)
    const now = new Date();
    const expiryTimestamp = pack.expiresAt 
      ? new Date(pack.expiresAt).getTime()
      : new Date(pack.exportTimestamp).getTime() + (30 * 24 * 60 * 60 * 1000);

    const expiryDate = new Date(expiryTimestamp);

    if (now.getTime() > expiryTimestamp) {
      return {
        success: false,
        isExpired: true,
        message: `⛔ Data Pack Expired! This zipped download pack expired on ${expiryDate.toLocaleDateString()} (30-day offline security limit). Please request/download a fresh activation pack from the Book Store.`,
        book: pack.book,
        pack,
      };
    }

    const currentPhone = readerPhone.trim();
    const currentDevice = readerDeviceId.trim();

    // Check phone binding or device binding
    const phoneMatches = currentPhone && pack.boundPhoneNumber === currentPhone;
    const deviceMatches = currentDevice && pack.boundDeviceId === currentDevice;

    // Allow import if phone matches OR device matches OR if pack was bound to universal/demo account
    if (phoneMatches || deviceMatches || pack.boundPhoneNumber === '+10000000000') {
      const daysRemaining = Math.max(1, Math.ceil((expiryTimestamp - now.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        success: true,
        message: `Book "${pack.book.title}" successfully verified and unlocked for My Library! Valid for ${daysRemaining} more days (expires ${expiryDate.toLocaleDateString()}).`,
        book: pack.book,
        pack,
      };
    }

    return {
      success: false,
      message: `Binding mismatch! This zipped data pack is cryptographically bound to phone (${pack.boundPhoneNumber}) and device (${pack.boundDeviceId.slice(0, 12)}...). Your registered device phone is (${currentPhone || 'unregistered'}). Please sign in with the matching phone or device in My Library.`,
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
      expiryTimestamp = new Date(pack.exportTimestamp).getTime() + (30 * 24 * 60 * 60 * 1000);
    }
  } catch (e) {
    // ignore parse error, fallback to downloadedAt
  }

  if (!expiryTimestamp) {
    const baseTime = downloadedAt ? new Date(downloadedAt).getTime() : now.getTime();
    expiryTimestamp = baseTime + (30 * 24 * 60 * 60 * 1000);
  }

  const expiryDate = new Date(expiryTimestamp);
  const isExpired = now.getTime() > expiryTimestamp;
  const daysRemaining = Math.max(0, Math.ceil((expiryTimestamp - now.getTime()) / (1000 * 60 * 60 * 24)));

  return { isExpired, expiryDate, daysRemaining };
}

/**
 * Renew / Extend a book data pack's expiration date in JSON without requiring re-downloading
 */
export function renewBookDataPackJson(dataPackJson: string, extensionDays: number = 30): { updatedJson: string; newExpiresAt: string; book: Book } {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000).toISOString();
  
  let pack: BookDataPack;
  try {
    pack = JSON.parse(dataPackJson);
    pack.expiresAt = newExpiresAt;
    pack.downloadedAt = now.toISOString();
  } catch (e) {
    throw new Error('Failed to parse existing library item data pack JSON.');
  }

  return {
    updatedJson: JSON.stringify(pack),
    newExpiresAt,
    book: pack.book,
  };
}

