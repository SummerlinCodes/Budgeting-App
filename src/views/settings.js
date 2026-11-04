import { h, field, formData, download } from "../ui.js";
import { mutate, lock, wipe, exportEncrypted, changePassphrase } from "../store.js";
import { checkPassphrase } from "../crypto.js";
import { buildICS } from "../ics.js";
import { requestNotifications, notifSupported } from "../reminders.js";

export function settingsView(data, ctx) {
  const msg = h("div", { class: "mut", role: "status" });
  const say = (t) => (msg.textContent = t);
  const budgetForm = h("form", { class: "f", onsubmit: async (e) => {
    e.preventDefault(); const f = formData(e.target); const lim = +f.lim;
    if (!f.cat.trim() || !(lim >= 0)) return say("Enter a category and limit.");
    await mutate((d) => { d.budgets[f.cat.trim().slice(0, 40)] = lim; });
  } }, h("div", { class: "seg" }, field("Category", h("input", { name: "cat", list: "cats", required: true, maxlength: 40 })),
      field("Monthly limit", h("input", { name: "lim", type: "number", min: "0", step: "1", required: true }))), h("button", { class: "btn g" }, "Set budget"));
  const budgets = Object.entries(data.budgets).map(([c, v]) => h("div", { class: "row" }, h("div", { class: "grow" }, c), h("span", {}, "$" + v),
    h("button", { class: "btn g s", onclick: () => mutate((d) => { delete d.budgets[c]; }) }, "✕")));

  const pf = h("form", { class: "f", onsubmit: async (e) => {
    e.preventDefault(); const f = formData(e.target);
    const bad = checkPassphrase(f.n); if (bad) return say(bad);
    try { await changePassphrase(f.o, f.n); e.target.reset(); say("Passphrase changed and data re-encrypted."); } catch (x) { say(x.message); }
  } }, field("Current passphrase", h("input", { name: "o", type: "password", autocomplete: "current-password", required: true })),
    field("New passphrase", h("input", { name: "n", type: "password", autocomplete: "new-password", required: true })), h("button", { class: "btn g" }, "Change passphrase"));

  return h("div", { style: "display:contents" },
    h("div", { class: "card" }, h("h2", {}, "Budgets"), budgetForm, budgets),
    h("div", { class: "card" }, h("h2", {}, "Reminders"),
      h("p", { class: "mut" }, "In-app alert the day before a bill is due. For alerts when the app is closed, add your bills to your phone calendar (each has a 9 AM alarm the day before)."),
      h("div", { class: "seg" },
        notifSupported() ? h("button", { class: "btn g", onclick: async () => say("Notifications: " + await requestNotifications()) }, "Enable notifications") : null,
        h("button", { class: "btn g", onclick: () => { download("bills.ics", buildICS(data.items), "text/calendar"); say("Calendar file created. Open it to import. Note: it contains bill names/amounts unencrypted."); } }, "Export to calendar")),
      field("Remind me after (hour of day)", h("input", { type: "number", min: 0, max: 23, value: data.settings.remindHour, onchange: (e) => mutate((d) => { d.settings.remindHour = Math.min(23, Math.max(0, +e.target.value | 0)); }) }))),
    h("div", { class: "card" }, h("h2", {}, "Security"),
      field("Auto-lock after", h("select", { onchange: (e) => mutate((d) => { d.settings.autoLockMin = +e.target.value; }) },
        [1, 5, 15, 30].map((m) => h("option", { value: m, selected: m === data.settings.autoLockMin }, m + " min")))),
      h("div", { class: "seg", style: "margin:10px 0" },
        h("button", { class: "btn g", onclick: lock }, "Lock now"),
        h("button", { class: "btn g", onclick: () => { download(`vaultbudget-backup-${new Date().toISOString().slice(0, 10)}.json`, exportEncrypted(), "application/json"); say("Encrypted backup saved."); } }, "Encrypted backup")),
      pf,
      h("button", { class: "btn d", style: "margin-top:12px", onclick: async () => { if (confirm("Permanently erase ALL data on this device?") && confirm("Really erase? This cannot be undone.")) await wipe(); } }, "Erase all data")),
    msg);
}
