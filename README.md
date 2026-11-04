# VaultBudget
Encrypted, local-first budget PWA. No backend, no accounts, no API keys, no `.env`.

## Run / test
- `npm test` (11 tests)  |  `python -m http.server 8080` -> http://localhost:8080

## Deploy (free HTTPS via GitHub Pages)
1. Push to a GitHub repo, Settings > Pages > Source: GitHub Actions.
2. `.github/workflows/deploy.yml` tests then deploys on push to `main`. It uses GitHub's short-lived per-run token; nothing stored.
3. On phone open the Pages URL: iPhone Safari > Share > Add to Home Screen; Android Chrome > Install app.

## Security
- AES-256-GCM, key from passphrase via PBKDF2-SHA256 (600k iterations), non-extractable WebCrypto key, random IV per write.
- Passphrase never stored; only ciphertext + salt in IndexedDB. Auto-lock, brute-force backoff.
- Strict CSP (no inline script, no external requests), no innerHTML, imports sanitized.
- Service worker caches app shell only, never data.
- Forgotten passphrase = unrecoverable. Keep an encrypted backup (Settings).
