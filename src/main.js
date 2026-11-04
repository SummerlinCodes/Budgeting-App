import { h } from "./ui.js";
import { subscribe, isUnlocked, getData, lock, initAutoLock } from "./store.js";
import { authView } from "./views/auth.js";
import { dashboardView } from "./views/dashboard.js";
import { transactionsView } from "./views/transactions.js";
import { billsView } from "./views/bills.js";
import { settingsView } from "./views/settings.js";
import { checkReminders } from "./reminders.js";

// Modular: add a feature by dropping a view in /views and registering it here.
const TABS = [
  { id: "home", label: "Home", icon: "📊", view: dashboardView },
  { id: "tx", label: "Money", icon: "💸", view: transactionsView },
  { id: "bills", label: "Bills", icon: "🔔", view: billsView },
  { id: "settings", label: "Settings", icon: "⚙️", view: settingsView },
];
const now = new Date();
const ctx = { year: now.getFullYear(), month: now.getMonth(), tab: "home" };
const app = document.getElementById("app");

async function render() {
  if (!isUnlocked()) { app.replaceChildren(await authView()); return; }
  const data = getData(), due = checkReminders(data);
  const tab = TABS.find((t) => t.id === ctx.tab);
  const label = new Date(ctx.year, ctx.month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  const step = (n) => { const d = new Date(ctx.year, ctx.month + n, 1); ctx.year = d.getFullYear(); ctx.month = d.getMonth(); render(); };
  app.replaceChildren(
    h("header", { class: "top" }, h("h1", {}, "VaultBudget"), h("button", { class: "btn g s", onclick: lock, "aria-label": "Lock" }, "🔒 Lock")),
    due.length ? h("div", { class: "banner", role: "status" }, "⏰ Due tomorrow: " + due.map((b) => b.item.name).join(", ")) : null,
    h("main", { id: "view" },
      ctx.tab === "home" || ctx.tab === "tx" ? h("div", { class: "card month" }, h("button", { class: "btn g s", onclick: () => step(-1), "aria-label": "Previous month" }, "◀"), h("b", {}, label), h("button", { class: "btn g s", onclick: () => step(1), "aria-label": "Next month" }, "▶")) : null,
      tab.view(data, ctx)),
    h("nav", { class: "tabs" }, TABS.map((t) => h("button", { "aria-current": t.id === ctx.tab ? "page" : null, onclick: () => { ctx.tab = t.id; render(); } }, h("span", { class: "i" }, t.icon), t.label))));
}

// Re-render only on state changes, not while the user is typing in a form.
subscribe(() => render());
initAutoLock();
setInterval(() => isUnlocked() && render(), 5 * 60_000);
render();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
