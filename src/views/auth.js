import { h, field } from "../ui.js";
import { createVault, unlock, hasVault, importEncrypted } from "../store.js";
import { checkPassphrase } from "../crypto.js";

export async function authView() {
  const exists = await hasVault();
  const err = h("div", { class: "err", role: "alert" });
  const busy = (b, on) => { b.disabled = on; b.textContent = on ? "Working…" : b.dataset.label; };
  const pass = h("input", { type: "password", autocomplete: exists ? "current-password" : "new-password", required: true, minlength: exists ? 1 : 10 });
  const pass2 = h("input", { type: "password", autocomplete: "new-password", required: true });
  const btn = h("button", { class: "btn", "data-label": exists ? "Unlock" : "Create vault" }, exists ? "Unlock" : "Create vault");
  const form = h("form", { class: "f", onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ""; busy(btn, true);
    try {
      if (exists) await unlock(pass.value);
      else {
        const m = checkPassphrase(pass.value);
        if (m) throw new Error(m);
        if (pass.value !== pass2.value) throw new Error("Passphrases don't match.");
        await createVault(pass.value);
      }
    } catch (x) { err.textContent = x.message; busy(btn, false); }
  } },
  field(exists ? "Passphrase" : "Choose a passphrase", pass), exists ? null : field("Confirm passphrase", pass2), err, btn);

  const restoreInput = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const p = prompt("Passphrase for this backup:"); if (!p) return;
    try { await importEncrypted(await f.text(), p); } catch (x) { err.textContent = x.message || "Restore failed."; }
  } });

  return h("section", { class: "auth" },
    h("h1", {}, "🔐 VaultBudget"),
    h("p", { class: "mut" }, exists ? "Your data is encrypted on this device." : "Create a passphrase. It encrypts everything on this device and is never stored or sent anywhere. If you forget it, the data cannot be recovered."),
    form,
    h("button", { class: "btn g", onclick: () => restoreInput.click() }, "Restore from encrypted backup"), restoreInput);
}
