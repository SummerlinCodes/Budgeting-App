import { h, money, field, formData } from "../ui.js";
import { monthTransactions, isPaid, validateItem } from "../model.js";
import { mutate } from "../store.js";

const uid = () => crypto.randomUUID();

export function transactionsView(data, ctx) {
  const txs = monthTransactions(data.items, ctx.year, ctx.month);
  const err = h("div", { class: "err", role: "alert" });
  const cats = h("datalist", { id: "cats" }, [...new Set(data.items.map((i) => i.category))].map((c) => h("option", { value: c })));
  const form = h("form", { class: "f", onsubmit: async (e) => {
    e.preventDefault();
    const f = formData(e.target), m = validateItem(f);
    if (m) { err.textContent = m; return; }
    await mutate((d) => d.items.push({ id: uid(), type: f.type, name: f.name.trim(), amount: +f.amount, category: f.category.trim(), date: f.date, recur: f.recur, paid: [] }));
  } },
    h("div", { class: "seg" }, field("Type", h("select", { name: "type" }, h("option", { value: "expense" }, "Expense"), h("option", { value: "income" }, "Income"))),
      field("Repeats", h("select", { name: "recur" }, [["none", "One-time"], ["weekly", "Weekly"], ["biweekly", "Every 2 weeks"], ["monthly", "Monthly"], ["yearly", "Yearly"]].map(([v, l]) => h("option", { value: v }, l))))),
    field("Name", h("input", { name: "name", maxlength: 80, required: true })),
    h("div", { class: "seg" }, field("Amount", h("input", { name: "amount", type: "number", step: "0.01", min: "0.01", inputmode: "decimal", required: true })),
      field("Date", h("input", { name: "date", type: "date", required: true }))),
    field("Category", h("input", { name: "category", list: "cats", maxlength: 40, required: true })), cats, err,
    h("button", { class: "btn" }, "Add"));

  return h("div", { style: "display:contents" },
    h("details", { class: "card" }, h("summary", {}, "＋ Add income / expense"), form),
    h("div", { class: "card" }, h("h2", {}, "This month"),
      txs.length ? txs.map(({ item, date }) => h("div", { class: "row" },
        h("input", { type: "checkbox", checked: isPaid(item, date), "aria-label": "Mark done", onchange: () => mutate((d) => {
          const it = d.items.find((x) => x.id === item.id); it.paid = it.paid || [];
          const i = it.paid.indexOf(date); i < 0 ? it.paid.push(date) : it.paid.splice(i, 1); }) }),
        h("div", { class: "grow" }, h("div", {}, item.name), h("small", {}, `${date} · ${item.category}${item.recur !== "none" ? " · " + item.recur : ""}`)),
        h("b", { class: item.type === "income" ? "in" : "out" }, (item.type === "income" ? "+" : "-") + money(item.amount)),
        h("button", { class: "btn g s", "aria-label": "Delete", onclick: () => confirm(`Delete "${item.name}" and all its repeats?`) && mutate((d) => { d.items = d.items.filter((x) => x.id !== item.id); }) }, "✕")))
        : h("p", { class: "mut" }, "Nothing this month.")));
}
