# Join Meeting frontend · DevTZ

**Connect anywhere. Meet everyone.** React/Vite/TypeScript client for the [Join Meeting Laravel API](https://github.com/beastcodes27/join-backend).

## Run locally

Use Node 24 (22.19+ also supports Vite; the direct TypeScript test command requires a Node release with type stripping). Run `npm install`, copy `.env.example` to `.env`, fill the public Firebase web-app configuration, then `npm run dev`. Vite proxies `/api` and `/sanctum` to Laravel on localhost:8000. Use the printed localhost:5173 URL consistently, since cookies are hostname-sensitive. The backend must have matching `FRONTEND_URL` and Firebase project settings.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Empty for same-origin/Vite-proxied API; otherwise the exact credentialed API origin |
| `VITE_FIREBASE_API_KEY` | Firebase public web-app API key, restricted to the intended project/domains |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Google sign-in handler domain |
| `VITE_FIREBASE_PROJECT_ID` | Same Firebase project verified by the backend |
| `VITE_FIREBASE_APP_ID` | Firebase web-app identifier |

Vite variables become public browser assets. Never add Firebase Admin credentials, LiveKit API secrets, Redis passwords, or database credentials here. LiveKit server URLs and short-lived meeting tokens come from the backend after admission; they are kept in React memory, not persistent browser storage. Every non-host requires host approval, including signed-in users.

Pages: `/` landing, `/login` Google sign-in, `/dashboard` authenticated meeting history/creation, `/m/:code` prejoin and live room, `/privacy`, `/terms`. Camera and microphone start off; the prejoin lets users preview/select devices. In-room chat is live and not stored by the app. SDK controls handle media and reconnection; the host can admit/reject, lock, remove, or end through server-authorized API calls.

## Checks

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:smoke
python3 scripts-check-secrets.py
```

Browser smoke tests use the real running backend; they do not substitute mock APIs. To exercise guest admission, set `SMOKE_MEETING_URL` to a fresh meeting created by a real signed-in host. `SMOKE_BASE_URL` selects an existing staging site; otherwise Playwright starts Vite. Automated Google popup login and real cross-network media tests are not included; run the backend deployment guide's acceptance checklist with actual devices.

In the restricted implementation environment, package-registry DNS access was unavailable. Full npm installation, lint, production build, and Playwright execution could not run. Three pure meeting-code tests and TypeScript syntax checks passed. Full SDK typing and browser behavior remain unverified. No complete npm lockfile could be generated: resolve dependencies, run all checks, audit, and commit a lockfile before deployment.

Production uses `npm run build` and serves `dist/` through the backend repository's Nginx template. Use HTTPS, same-origin APIs, secure cookies, and a WSS/TURN deployment. See the backend's `docs/` directory for API, environment, architecture, SQLite backup, and VPS instructions, including the self-hosted LiveKit token-revocation limitation. Legal notices are private-beta drafts pending operator review.
