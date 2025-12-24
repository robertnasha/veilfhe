const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(address: string) {
  const normalized = address.toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptWithAddress(address: string, plaintext: string) {
  const key = await deriveKey(address);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const payload = `v1:${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
  return payload;
}

export async function decryptWithAddress(address: string, payload: string) {
  const [version, ivBase64, dataBase64] = payload.split(':');
  if (version !== 'v1' || !ivBase64 || !dataBase64) {
    throw new Error('Invalid encrypted payload format');
  }

  const key = await deriveKey(address);
  const iv = fromBase64(ivBase64);
  const data = fromBase64(dataBase64);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
}
