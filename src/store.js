// Encrypted vault state. Plaintext exists only in memory while unlocked.
import { deriveKey, encryptJSON, decryptJSON, randomBytes, b64, unb64, KDF_ITERATIONS } from "./crypto.js";
import { kvGet, kvPut, kvDel } from "./storage.js";
import { emptyData, sanitizeData } from "./model.js";

let key = null, data = null, rec = null, timer = null, hiddenAt = 0, failures = 0, lockedUntil = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const isUnlocked = () => !!key;
export const getData = () => data;
export const hasVault = async () => !!(await kvGet("vault"));

async function persist() {
  const { iv, ct } = await encryptJSON(key, data);
  rec = { ...rec, iv, ct };
  await kvPut("vault", rec);
}

export async function createVault(passphrase) {
  const salt = randomBytes(16);
  key = await deriveKey(passphrase, salt, KDF_ITERATIONS);
  data = emptyData();
  rec = { v: 1, kdf: "PBKDF2-SHA256", iter: KDF_ITERATIONS, salt: b64(salt) };
  await persist();
  armAutoLock(); emit();
}

export async function unlock(passphrase) {
  const wait = lockedUntil - Date.now();
  if (wait > 0) throw new Error(`Too many attempts. Wait ${Math.ceil(wait / 1000)}s.`);
  const r = await kvGet("vault");
  if (!r) throw new Error("No vault found.");
  try {
    const k = await deriveKey(passphrase, unb64(r.salt), r.iter);
    data = sanitizeData(await decryptJSON(k, r));
    key = k; rec = r; failures = 0;
  } catch {
    failures++; lockedUntil = Date.now() + Math.min(2 ** failures * 500, 60_000); // exponential backoff
    throw new Error("Wrong passphrase.");
  }
  armAutoLock(); emit();
}

export function lock() { key = null; data = null; rec = null; clearTimeout(timer); emit(); }

export async function mutate(fn) { fn(data); await persist(); emit(); armAutoLock(); }

export async function changePassphrase(oldP, newP) {
  const k = await deriveKey(oldP, unb64(rec.salt), rec.iter);
  try { await decryptJSON(k, rec); } catch { throw new Error("Current passphrase is wrong."); }
  const salt = randomBytes(16);
  key = await deriveKey(newP, salt, KDF_ITERATIONS);
  rec = { v: 1, kdf: "PBKDF2-SHA256", iter: KDF_ITERATIONS, salt: b64(salt) };
  await persist();
}

/** Encrypted backup = the vault record itself. Safe to store anywhere; useless without the passphrase. */
export const exportEncrypted = () => JSON.stringify(rec, null, 2);

export async function importEncrypted(text, passphrase) {
  const r = JSON.parse(text);
  if (!r?.salt || !r?.iv || !r?.ct || !Number.isInteger(r.iter) || r.iter < 100_000) throw new Error("Not a VaultBudget backup.");
  const k = await deriveKey(passphrase, unb64(r.salt), r.iter);
  const d = sanitizeData(await decryptJSON(k, r)); // throws on wrong passphrase / tampering
  key = k; rec = r; data = d;
  await persist(); emit();
}

export async function wipe() { lock(); await kvDel("vault"); emit(); }

// ---- auto-lock: inactivity timer + lock if the app was hidden longer than the timeout ----
function armAutoLock() {
  clearTimeout(timer);
  if (!key) return;
  timer = setTimeout(lock, data.settings.autoLockMin * 60_000);
}
export function initAutoLock() {
  for (const ev of ["pointerdown", "keydown", "touchstart"]) addEventListener(ev, () => key && armAutoLock(), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (key && hiddenAt && Date.now() - hiddenAt > data.settings.autoLockMin * 60_000) lock();
  });
}
