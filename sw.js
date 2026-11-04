// Offline cache of the app shell ONLY. Financial data lives encrypted in IndexedDB and never touches this cache.
const CACHE = "vaultbudget-shell-v1";
const SHELL = ["./", "index.html", "styles.css", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "src/main.js", "src/ui.js", "src/store.js", "src/storage.js", "src/crypto.js", "src/model.js", "src/ics.js", "src/reminders.js",
  "src/views/auth.js", "src/views/dashboard.js", "src/views/transactions.js", "src/views/bills.js", "src/views/settings.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // never touch cross-origin
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
