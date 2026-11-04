// Calendar export: gives reliable phone reminders even when the app is closed.
// Each bill gets an alarm 15h before its all-day date = 9:00 AM the day before.
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
const fold = (l) => (l.length <= 73 ? l : l.match(/.{1,73}/g).join("\r\n "));
const RULE = { none: "", weekly: "RRULE:FREQ=WEEKLY", biweekly: "RRULE:FREQ=WEEKLY;INTERVAL=2", monthly: "RRULE:FREQ=MONTHLY", yearly: "RRULE:FREQ=YEARLY" };

export function buildICS(items, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VaultBudget//EN", "CALSCALE:GREGORIAN"];
  for (const i of items.filter((x) => x.type === "expense")) {
    L.push("BEGIN:VEVENT", `UID:${i.id}@vaultbudget`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${i.date.replaceAll("-", "")}`,
      `SUMMARY:${esc(`Bill: ${i.name} ($${i.amount.toFixed(2)})`)}`);
    if (RULE[i.recur]) L.push(RULE[i.recur]);
    L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(i.name)} due tomorrow`, "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}
