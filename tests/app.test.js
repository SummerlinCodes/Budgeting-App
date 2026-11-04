import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const { deriveKey, encryptJSON, decryptJSON, randomBytes, b64 } = await import("../src/crypto.js");
const M = await import("../src/model.js");
const { buildICS } = await import("../src/ics.js");

test("encrypt/decrypt round trip; ciphertext hides plaintext", async () => {
  const salt = randomBytes(16), key = await deriveKey("correct horse battery", salt, 1000);
  const rec = await encryptJSON(key, { secret: "rent 1500" });
  assert.ok(!Buffer.from(rec.ct, "base64").toString("latin1").includes("rent"));
  assert.deepEqual(await decryptJSON(key, rec), { secret: "rent 1500" });
});
test("wrong passphrase fails", async () => {
  const salt = randomBytes(16), k1 = await deriveKey("aaaaaaaaaa", salt, 1000), k2 = await deriveKey("bbbbbbbbbb", salt, 1000);
  await assert.rejects(decryptJSON(k2, await encryptJSON(k1, { a: 1 })));
});
test("tampered ciphertext fails (GCM auth)", async () => {
  const key = await deriveKey("aaaaaaaaaa", randomBytes(16), 1000), rec = await encryptJSON(key, { a: 1 });
  const bytes = Buffer.from(rec.ct, "base64"); bytes[0] ^= 1;
  await assert.rejects(decryptJSON(key, { ...rec, ct: bytes.toString("base64") }));
});
test("IV is unique per encryption", async () => {
  const key = await deriveKey("aaaaaaaaaa", randomBytes(16), 1000);
  assert.notEqual((await encryptJSON(key, {})).iv, (await encryptJSON(key, {})).iv);
});
test("key is non-extractable", async () => {
  const key = await deriveKey("aaaaaaaaaa", randomBytes(16), 1000);
  await assert.rejects(crypto.subtle.exportKey("raw", key));
});
test("monthly recurrence clamps to month end", () => {
  const it = { id: "1", type: "expense", name: "x", amount: 5, category: "c", date: "2026-01-31", recur: "monthly" };
  assert.deepEqual(M.occurrences(it, new Date(2026, 1, 1), new Date(2026, 2, 31)), ["2026-02-28", "2026-03-31"]);
});
test("biweekly + yearly", () => {
  const bw = { date: "2026-11-01", recur: "biweekly" };
  assert.deepEqual(M.occurrences(bw, new Date(2026, 10, 1), new Date(2026, 10, 30)), ["2026-11-01", "2026-11-15", "2026-11-29"]);
  const y = { date: "2025-12-25", recur: "yearly" };
  assert.deepEqual(M.occurrences(y, new Date(2026, 0, 1), new Date(2026, 11, 31)), ["2026-12-25"]);
});
test("reminder fires exactly one day before, not if paid", () => {
  const it = { id: "1", type: "expense", name: "Rent", amount: 100, category: "h", date: "2026-11-05", recur: "none", paid: [] };
  const today = new Date(2026, 10, 4);
  assert.equal(M.dueTomorrow([it], today).length, 1);
  assert.equal(M.dueTomorrow([it], new Date(2026, 10, 3)).length, 0);
  assert.equal(M.dueTomorrow([{ ...it, paid: ["2026-11-05"] }], today).length, 0);
});
test("totals and category spend", () => {
  const items = [{ id: "a", type: "income", name: "Pay", amount: 1000, category: "job", date: "2026-11-01", recur: "none", paid: [] },
    { id: "b", type: "expense", name: "Rent", amount: 400, category: "home", date: "2026-11-02", recur: "none", paid: ["2026-11-02"] },
    { id: "c", type: "expense", name: "Gas", amount: 50, category: "car", date: "2026-11-03", recur: "none", paid: [] }];
  const tx = M.monthTransactions(items, 2026, 10);
  assert.deepEqual(M.totals(tx), { income: 1000, expenses: 450, net: 550, remaining: 50 });
  assert.equal(M.spentByCategory(tx).home, 400);
});
test("sanitizeData drops malformed items", () => {
  const d = M.sanitizeData({ items: [{ id: "1", type: "expense", name: "ok", amount: 5, category: "c", date: "2026-01-01", recur: "none" }, { id: "2", type: "evil", name: "<img onerror=1>", amount: -1 }], budgets: { a: "x", b: 5 } });
  assert.equal(d.items.length, 1); assert.deepEqual(d.budgets, { b: 5 });
});
test("ICS has alarm and recurrence", () => {
  const s = buildICS([{ id: "1", type: "expense", name: "Rent", amount: 10, category: "h", date: "2026-11-05", recur: "monthly" }]);
  assert.match(s, /RRULE:FREQ=MONTHLY/); assert.match(s, /TRIGGER:-PT15H/);
});
