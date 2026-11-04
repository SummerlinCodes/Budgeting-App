import { h, money } from "../ui.js";
import { monthTransactions, totals, spentByCategory } from "../model.js";

export function dashboardView(data, ctx) {
  const txs = monthTransactions(data.items, ctx.year, ctx.month);
  const t = totals(txs), spent = spentByCategory(txs);
  const cats = [...new Set([...Object.keys(data.budgets), ...Object.keys(spent)])];
  return h("div", { style: "display:contents" },
    h("div", { class: "card" }, h("div", { class: "grid2" },
      stat("Income", money(t.income), "in"), stat("Expenses", money(t.expenses), "out"),
      stat("Net", money(t.net), t.net >= 0 ? "in" : "out"), stat("Left to pay", money(t.remaining), ""))),
    h("div", { class: "card" }, h("h2", {}, "Category budgets"),
      cats.length ? cats.map((c) => {
        const lim = data.budgets[c], sp = spent[c] || 0, pct = lim ? sp / lim : 0;
        return h("div", { style: "margin-bottom:10px" },
          h("div", { class: "row", style: "border:0;padding:0 0 4px" }, h("div", { class: "grow" }, c),
            h("span", { class: lim && sp > lim ? "out" : "mut" }, money(sp) + (lim ? " / " + money(lim) : ""))),
          lim ? h("progress", { max: 1, value: Math.min(pct, 1), class: pct >= 1 ? "o" : pct >= 0.8 ? "w" : "" }) : null);
      }) : h("p", { class: "mut" }, "Add expenses and set budgets in Settings."))
  );
}
const stat = (l, v, c) => h("div", { class: "stat" }, h("small", {}, l), h("b", { class: c }, v));
