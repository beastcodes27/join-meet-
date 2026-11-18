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

The production build, lint, and Node tests run with the installed dependencies. Browser smoke tests still require a normal terminal with socket access and reachable Laravel/LiveKit services. See the backend verification report for the latest results and external-service limitations.

Production uses `npm run build` and serves `dist/` through the backend repository's Nginx template. Use HTTPS, same-origin APIs, secure cookies, and a WSS/TURN deployment. See the backend's `docs/` directory for API, environment, architecture, SQLite backup, and VPS instructions, including the self-hosted LiveKit token-revocation limitation. Legal notices are private-beta drafts pending operator review.

## In-call messaging and recovery

Chat uses the LiveKit SDK and stays in room memory. The chat button shows unread remote messages while the panel or browser tab is hidden. Drafts and failed messages survive panel toggles. Enter sends, Shift+Enter inserts a newline, and IME composition is respected. Messages support timestamps, copy, quick emoji, safe HTTP(S) links, a 2,000-character limit, pending/sent/failed states and explicit retry. Retried streams retain a client ID to avoid duplicate display. “Sent” means accepted by the connection, not a recipient read receipt. Chat is not recorded or persisted; refreshing or leaving the room loses its history.

The room now uses a stable SDK instance with serialized connect/disconnect work. Temporary meeting-metadata failures keep the call mounted. Final disconnects show a reason (including duplicate-tab identities and media transport failures); recoverable cases offer a fresh, backend-authorized join. Removed participants and ended rooms never offer a reconnect bypass. One identity per signed-in account/guest session still applies: use a separate browser profile or private window for the guest when testing on one computer.

Run `npm run test:call` for the optional real two-browser meeting/chat acceptance test. It requires `SMOKE_HOST_STORAGE_STATE` pointing to a local, untracked Playwright storage-state file for a signed-in test host and a running backend/LiveKit. The test creates its own private meeting. Keep storage-state files out of Git.

## Scheduled meetings and reminders

Use **Schedule for later** on the dashboard to choose a title, local date/time and duration. Times are sent to the API as UTC; the local timezone is displayed before submission. The host is automatically booked and can copy the invitation or cancel a future meeting. Signed-in invitees can book from the invitation page, cancel their own booking, and see their booked meetings on the dashboard. The room opens at the scheduled time and booking does not bypass host admission.

The notification bell shows personal in-app reminders, which can be marked read by opening them. Booked users receive reminders one hour before the start; a booking made within the final hour queues one immediately. Keep the backend scheduler/worker running. Development emails are captured at **http://localhost:8027** by Mailpit; this does not send to external inboxes. Production email requires SMTP configuration in the backend. The UI distinguishes preview and unavailable delivery modes.

`npm run test:smoke` includes an optional scheduled-meeting creation/booking/cancellation flow when `SMOKE_HOST_STORAGE_STATE` is set to a local test-host authentication state file. No mock backend replaces the real API in these browser specs. Node tests cover timezone conversion, invalid/DST local times and safe return-to-meeting login redirects.
