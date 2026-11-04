import { h, money } from "../ui.js";
import { upcomingBills, startOfToday } from "../model.js";
import { mutate } from "../store.js";

export function billsView(data) {
  const bills = upcomingBills(data.items, startOfToday());
  return h("div", { class: "card" }, h("h2", {}, "Upcoming bills · next 30 days"),
    bills.length ? bills.map(({ item, date, days }) => h("div", { class: "row" },
      h("div", { class: "grow" }, h("div", {}, item.name, tag(days)), h("small", {}, date + " · " + item.category)),
      h("b", {}, money(item.amount)),
      h("button", { class: "btn s", onclick: () => mutate((d) => { const it = d.items.find((x) => x.id === item.id); (it.paid ||= []).push(date); }) }, "Paid")))
      : h("p", { class: "mut" }, "Nothing due 🎉"));
}
const tag = (d) => d < 0 ? h("span", { class: "tag o" }, "overdue") : d === 0 ? h("span", { class: "tag t" }, "today")
  : d === 1 ? h("span", { class: "tag t" }, "tomorrow") : h("span", { class: "tag" }, `in ${d}d`);
