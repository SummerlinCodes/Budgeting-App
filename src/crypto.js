// AES-256-GCM encryption with a PBKDF2-SHA256 derived, NON-EXTRACTABLE key (WebCrypto).
// The passphrase is never stored. A fresh random IV is used for every write.
export const KDF_ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const AAD = new TextEncoder().encode("vaultbudget:v1");

export const b64 = (u8) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKey(passphrase, salt, iterations = KDF_ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable: JS can use the key but never read its bytes
    ["encrypt", "decrypt"],
  );
}

export async function encryptJSON(key, obj) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function decryptJSON(key, { iv, ct }) {
  // Throws if the key is wrong or the data was tampered with (GCM auth tag).
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData: AAD }, key, unb64(ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

export function checkPassphrase(p) {
  if (p.length < 10) return "Use at least 10 characters.";
  if (new Set(p).size < 5) return "Too repetitive.";
  if (/^(password|12345|qwerty)/i.test(p)) return "Too common.";
  return "";
}
