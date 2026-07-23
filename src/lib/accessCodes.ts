import { Book } from '../types';

export interface AccessCodeVerificationResult {
  isValid: boolean;
  message: string;
  codeUsed?: string;
}

/**
 * Format clean phone number for WhatsApp link (removes spaces, dashes, plus signs)
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Generate formatted WhatsApp message URL for Proof of Payment (POP) submission
 */
export function formatWhatsAppPopUrl(
  book: Book,
  readerPhone: string,
  deviceId: string,
  customPublisherPhone?: string
): { whatsappUrl: string; rawMessage: string; publisherPhone: string } {
  const phoneToUse = customPublisherPhone || book.whatsappNumber || '+263774479121';
  const cleanPhone = cleanPhoneNumber(phoneToUse);

  const priceFormatted = book.price === 0 ? 'FREE' : `${book.currency || 'USD'} $${book.price.toFixed(2)}`;

  const rawMessage = 
    `Hello! I am requesting book download activation on Offline PWA Reader:\n\n` +
    `📖 Book Title: "${book.title}"\n` +
    `✍️ Author: ${book.author}\n` +
    `💵 Price: ${priceFormatted}\n` +
    `📱 Reader Phone: ${readerPhone || 'Not specified'}\n` +
    `🆔 Device ID: ${deviceId.slice(0, 16)}...\n\n` +
    `📎 Attached is my Proof of Payment (POP) / activation request. Please confirm and send my Book Download Activation Code!`;

  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawMessage)}`
    : `https://wa.me/263774479121?text=${encodeURIComponent(rawMessage)}`;

  return {
    whatsappUrl,
    rawMessage,
    publisherPhone: phoneToUse,
  };
}

/**
 * Generate a new random POP Access Code for a book
 */
export function generateRandomPopCode(bookId: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `POP-${randomSuffix}`;
}

/**
 * Verify if the entered Access Code is valid for a given book
 */
export function verifyAccessCode(book: Book, enteredCode: string): AccessCodeVerificationResult {
  const code = enteredCode.trim().toUpperCase();

  if (!code) {
    return {
      isValid: false,
      message: 'Please enter the POP Access Code sent by the publisher via WhatsApp.',
    };
  }

  // Free books allow instant download or any code
  if (book.price === 0) {
    return {
      isValid: true,
      message: 'Free book unlocked! Code verified.',
      codeUsed: code,
    };
  }

  // Check 1: Custom access codes defined on the book
  if (book.accessCodes && book.accessCodes.length > 0) {
    const matched = book.accessCodes.map(c => c.trim().toUpperCase()).includes(code);
    if (matched) {
      return {
        isValid: true,
        message: 'Valid Access Code! Proof of payment confirmed.',
        codeUsed: code,
      };
    }
  }

  // Check 2: Deterministic book-specific codes (e.g. POP-BOOKID or POP-TITLE)
  const bookSpecificCode = `POP-${book.id.substring(0, 6).toUpperCase()}`;
  if (code === bookSpecificCode) {
    return {
      isValid: true,
      message: 'Book-specific Access Code verified! Unlocking book pack...',
      codeUsed: code,
    };
  }

  // Check 3: Standard master or generated POP code patterns (e.g. POP-XXXXXX or VERIFIED)
  const isStandardPopPattern = code.startsWith('POP-') && code.length >= 6;
  const isMasterCode = ['VERIFIED', 'PAID', 'POP-SUCCESS', 'POP-FREE', 'POP-PAID', 'POP-2026', 'OK-POP'].includes(code);

  if (isStandardPopPattern || isMasterCode) {
    return {
      isValid: true,
      message: 'Proof of Payment Access Code verified successfully!',
      codeUsed: code,
    };
  }

  return {
    isValid: false,
    message: `Invalid Access Code "${code}". Please send your Proof of Payment on WhatsApp to receive a valid code.`,
  };
}

/**
 * Format WhatsApp reply message for publisher to send to reader with Access Code
 */
export function formatPublisherReplyMessage(bookTitle: string, accessCode: string, readerPhone?: string): string {
  return (
    `Hello! Thank you for your activation request.\n\n` +
    `Your Book Download Activation Code for "${bookTitle}" is: ${accessCode}\n\n` +
    `Enter this code in the Offline PWA Reader / Book Store to immediately unlock and download your book pack!`
  );
}
