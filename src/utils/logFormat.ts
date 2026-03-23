/**
 * LeapOne Mission File (.lp1) binary format implementation.
 * 
 * Structure V1:
 * - 0-4: MAGIC Bytes "LEAP1"
 * - 5: VERSION (0x01)
 * - 6-9: RESERVED (null bytes)
 * - 10+: ENCRYPTED PAYLOAD (Rolling XOR)
 */

const MAGIC = "LEAP1";
const VERSION = 0x01;
const SECRET_KEY = "ARIES_MCC_SECURE_LOG_2026_LEAPONE";

/**
 * Encrypts a string into a LeapOne Mission File binary blob.
 */
export const encryptLog = (content: string): Uint8Array => {
  const encoder = new TextEncoder();
  const payload = encoder.encode(content);
  const keyCodes = encoder.encode(SECRET_KEY);
  
  // Create final buffer: MAGIC(5) + VERSION(1) + RESERVED(4) + PAYLOAD
  const headerSize = 10;
  const result = new Uint8Array(headerSize + payload.length);
  
  // Header: Magic
  for (let i = 0; i < MAGIC.length; i++) {
    result[i] = MAGIC.charCodeAt(i);
  }
  
  // Header: Version & Reserved
  result[5] = VERSION;
  // bytes 6-9 are already 0
  
  // Payload: Rolling XOR
  for (let i = 0; i < payload.length; i++) {
    const keyByte = keyCodes[i % keyCodes.length];
    // Use position-based rolling XOR for added complexity
    result[headerSize + i] = payload[i] ^ (keyByte + i) % 256;
  }
  
  return result;
};

/**
 * Decrypts a LeapOne Mission File binary blob back into a string.
 */
export const decryptLog = (buffer: ArrayBuffer): { text: string; isLeapOne: boolean } => {
  const data = new Uint8Array(buffer);
  
  // Check for MAGIC "LEAP1"
  let isLeapOne = true;
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC.charCodeAt(i)) {
      isLeapOne = false;
      break;
    }
  }

  if (!isLeapOne) {
    // Fallback: This might be a standard CSV file (plain text)
    try {
      const text = new TextDecoder().decode(data);
      // Basic check if it looks like a CSV (e.g., contains commas or specific headers)
      if (text.includes(",") || text.includes("\n")) {
         return { text, isLeapOne: false };
      }
    } catch (e) {
      // Not text
    }
    throw new Error("Invalid format: The file is neither a valid LeapOne Mission File (.lp1) nor a standard CSV.");
  }

  // Validate Version
  const version = data[5];
  if (version !== VERSION) {
    throw new Error(`Unsupported version: 0x${version.toString(16)}. This data analyser requires LeapOne V${VERSION}.`);
  }
  
  const headerSize = 10;
  const payload = new Uint8Array(data.length - headerSize);
  const keyCodes = new TextEncoder().encode(SECRET_KEY);
  
  // Decrypt Payload (Rolling XOR)
  for (let i = 0; i < payload.length; i++) {
    const keyByte = keyCodes[i % keyCodes.length];
    payload[i] = data[headerSize + i] ^ (keyByte + i) % 256;
  }
  
  return { 
    text: new TextDecoder().decode(payload), 
    isLeapOne: true 
  };
};
