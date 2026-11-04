// Pure budgeting logic (no DOM, no storage) so it is unit-testable.
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfToday = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate());
export const daysBetween = (a, b) => Math.round((b - a) / 864e5);

export const emptyData = () => ({ v: 1, items: [], budgets: {}, settings: { autoLockMin: 5, remindHour: 9 } });

/** ISO dates on which `item` occurs within [a, b] (inclusive). */
export function occurrences(item, a, b) {
  const out = [], s = parseDate(item.date);
  if (item.recur === "none") return s >= a && s <= b ? [iso(s)] : out;
  if (item.recur === "weekly" || item.recur === "biweekly") {
    const step = item.recur === "weekly" ? 7 : 14;
    let d = new Date(s);
    if (d < a) d = addDays(d, Math.ceil(daysBetween(d, a) / step) * step);
    for (; d <= b; d = addDays(d, step)) out.push(iso(d));
    return out;
  }
  const dom = s.getDate();
  for (let y = a.getFullYear(); y <= b.getFullYear(); y++) {
    for (let m = 0; m < 12; m++) {
      if (item.recur === "yearly" && m !== s.getMonth()) continue;
      const d = new Date(y, m, Math.min(dom, new Date(y, m + 1, 0).getDate()));
      if (d >= s && d >= a && d <= b) out.push(iso(d));
    }
  }
  return out;
}

export const isPaid = (item, date) => (item.paid || []).includes(date);

export function monthRange(year, month) { return [new Date(year, month, 1), new Date(year, month + 1, 0)]; }

export function monthTransactions(items, year, month) {
  const [a, b] = monthRange(year, month), out = [];
  for (const item of items) for (const date of occurrences(item, a, b)) out.push({ item, date });
  return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

export function totals(txs) {
  let income = 0, expenses = 0, paidExpenses = 0;
  for (const { item, date } of txs) {
    if (item.type === "income") income += item.amount;
    else { expenses += item.amount; if (isPaid(item, date)) paidExpenses += item.amount; }
  }
  return { income, expenses, net: income - expenses, remaining: expenses - paidExpenses };
}

export function spentByCategory(txs) {
  const m = {};
  for (const { item } of txs) if (item.type === "expense") m[item.category] = (m[item.category] || 0) + item.amount;
  return m;
}

/** Unpaid expenses from `back` days ago to `ahead` days from `today`. */
export function upcomingBills(items, today, ahead = 30, back = 14) {
  const out = [];
  for (const item of items) {
    if (item.type !== "expense") continue;
    for (const date of occurrences(item, addDays(today, -back), addDays(today, ahead)))
      if (!isPaid(item, date)) out.push({ item, date, days: daysBetween(today, parseDate(date)) });
  }
  return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

/** Unpaid expenses due exactly tomorrow (the 1-day-before reminder). */
export const dueTomorrow = (items, today) => upcomingBills(items, today, 1, 0).filter((b) => b.days === 1);

export function validateItem(f) {
  const amount = Number(f.amount);
  if (!f.name?.trim() || f.name.length > 80) return "Name required (max 80).";
  if (!f.category?.trim() || f.category.length > 40) return "Category required (max 40).";
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return "Enter a valid amount.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || "")) return "Pick a date.";
  if (!["income", "expense"].includes(f.type)) return "Bad type.";
  if (!["none", "weekly", "biweekly", "monthly", "yearly"].includes(f.recur)) return "Bad repeat.";
  return "";
}

/** Defensive check on imported data before it is trusted. */
export function sanitizeData(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.items)) throw new Error("Invalid vault data");
  const items = d.items.filter((i) => !validateItem(i) && typeof i.id === "string").map((i) => ({
    id: i.id, type: i.type, name: i.name.trim(), amount: Number(i.amount), category: i.category.trim(),
    date: i.date, recur: i.recur, paid: Array.isArray(i.paid) ? i.paid.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) : [],
  }));
  const budgets = {};
  for (const [k, v] of Object.entries(d.budgets || {})) if (Number.isFinite(+v) && +v >= 0) budgets[String(k).slice(0, 40)] = +v;
  const st = d.settings || {};
  return { v: 1, items, budgets, settings: { autoLockMin: [1, 5, 15, 30].includes(st.autoLockMin) ? st.autoLockMin : 5, remindHour: Number.isInteger(st.remindHour) ? st.remindHour : 9 } };
}
