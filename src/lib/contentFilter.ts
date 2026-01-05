/**
 * Content filter utility for masking sensitive information
 * Masks phone numbers and emails in messages to prevent users from 
 * sharing contact info outside the platform before payment
 */

// Phone number patterns (international and local formats)
const PHONE_PATTERNS = [
  // International with + (e.g., +33 6 12 34 56 78, +221 77 123 45 67)
  /\+\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g,
  // Numbers with country code without + (e.g., 00 33 6 12 34 56 78)
  /00\s?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g,
  // Local formats (e.g., 06 12 34 56 78, 077-123-4567)
  /\b0\d{1,2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,4}\b/g,
  // Continuous digits (10+ digits)
  /\b\d{10,15}\b/g,
  // Patterns with separators (e.g., 06.12.34.56.78)
  /\b\d{2}[.\-\s]\d{2}[.\-\s]\d{2}[.\-\s]\d{2}[.\-\s]\d{2}\b/g,
  // Written out numbers in french (six, sept, etc. - basic detection)
  /(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)(?:\s+(?:zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)){7,}/gi,
];

// Email patterns
const EMAIL_PATTERNS = [
  // Standard email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Obfuscated email attempts (e.g., "email at gmail dot com")
  /[a-zA-Z0-9._%+-]+\s*(?:@|at|chez)\s*[a-zA-Z0-9.-]+\s*(?:\.|dot|point)\s*(?:com|fr|net|org|io|co|gmail|yahoo|hotmail)/gi,
  // Partial obfuscation (e.g., "myemail [at] gmail")
  /[a-zA-Z0-9._%+-]+\s*\[?\s*(?:@|at|chez)\s*\]?\s*[a-zA-Z0-9.-]+\s*\[?\s*(?:\.|dot|point)\s*\]?\s*[a-zA-Z]{2,}/gi,
];

// Social media / messaging app handles
const SOCIAL_PATTERNS = [
  // WhatsApp mentions
  /whatsapp\s*[:\-]?\s*[\+]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/gi,
  // Telegram, Signal, etc.
  /(?:telegram|signal|viber|imo|skype)\s*[:\-]?\s*[@]?[\w\d._-]+/gi,
  // Facebook/Instagram mentions
  /(?:facebook|instagram|insta|fb|ig)\s*[:\-]?\s*[@]?[\w\d._-]+/gi,
];

const MASK_REPLACEMENT = "***";
const PHONE_MASK = "[téléphone masqué]";
const EMAIL_MASK = "[email masqué]";

/**
 * Masks sensitive contact information in a message
 * @param content - The message content to filter
 * @returns The filtered message with masked sensitive info
 */
export function maskSensitiveContent(content: string): string {
  let filtered = content;

  // Mask phone numbers
  PHONE_PATTERNS.forEach(pattern => {
    filtered = filtered.replace(pattern, PHONE_MASK);
  });

  // Mask emails
  EMAIL_PATTERNS.forEach(pattern => {
    filtered = filtered.replace(pattern, EMAIL_MASK);
  });

  // Mask social handles with numbers
  SOCIAL_PATTERNS.forEach(pattern => {
    filtered = filtered.replace(pattern, MASK_REPLACEMENT);
  });

  return filtered;
}

/**
 * Checks if content contains sensitive information
 * @param content - The message content to check
 * @returns true if content contains phone/email
 */
export function containsSensitiveContent(content: string): boolean {
  for (const pattern of [...PHONE_PATTERNS, ...EMAIL_PATTERNS, ...SOCIAL_PATTERNS]) {
    if (pattern.test(content)) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      return true;
    }
    pattern.lastIndex = 0;
  }
  return false;
}

/**
 * Masks a phone number for display when payment is not completed
 * @param phone - The phone number to mask
 * @returns Masked phone like "+33 6 ** ** ** 78"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Keep first 4 and last 2 characters visible
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length <= 6) return "** ** **";
  
  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-2);
  const middle = cleaned.slice(4, -2).replace(/\d/g, '*');
  
  return `${start} ${middle} ${end}`;
}
