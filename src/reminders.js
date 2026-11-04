// Reminders: banner + local notification the day before a bill is due.
// Limits (by design, no server): notifications only fire while the app is open/backgrounded and unlocked.
// For reliable closed-app alerts, use the calendar export in Settings.
import { dueTomorrow, startOfToday, iso } from "./model.js";
import { money } from "./ui.js";

export const notifSupported = () => "Notification" in window;
export const requestNotifications = () => (notifSupported() ? Notification.requestPermission() : Promise.resolve("denied"));

export function checkReminders(data) {
  const today = startOfToday();
  const due = dueTomorrow(data.items, today);
  if (due.length && notifSupported() && Notification.permission === "granted" && new Date().getHours() >= data.settings.remindHour) {
    const key = "vb-notified-" + iso(today); // stores only a date flag, no financial data
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      const body = due.map((b) => `${b.item.name} ${money(b.item.amount)}`).join("\n");
      navigator.serviceWorker?.ready.then((r) => r.showNotification("Bills due tomorrow", { body, tag: "vb-due", icon: "icons/icon-192.png" }))
        .catch(() => new Notification("Bills due tomorrow", { body }));
    }
  }
  return due;
}
