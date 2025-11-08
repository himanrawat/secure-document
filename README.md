## AegisDocs Secure Viewer

Camera-locked, OTP-gated, real-time monitored document sharing now runs end-to-end:

- **Screen & display controls:** fullscreen enforcement, focus/blur overlays, screenshot & devtools traps, multi-monitor blocking toggles, Ctrl+P interception, and PDF rendering that hides browser toolbars.
- **Camera guardianship:** continuous presence detection, obstruction scoring, external phone/camera detection, and still-frame capture for audit proof—without exposing a preview to the reader.
- **Identity gating:** owners can require reader name/phone (and optionally enforce a match). After OTP, receivers must complete the verification screen before the document unlocks. Owners see the submitted identity + photo in the dashboard events feed.
- **Content protection:** file uploads + rich text are stored in encrypted blobs on disk, rendered through a custom PDF canvas, watermarked inside the viewer, and never exposed through the native PDF controls.
- **Access governance:** per-document permissions JSON (expiry, max views, session limits) plus optional device/IP restrictions, identity requirements, and live revoke switches. Destroyed sessions cannot be reloaded.
- **Monitoring:** heartbeats fire every 5 seconds, and owners stream events (document creation, OTP verification, identity capture, presence, violations) into the dashboard via `/api/events`.

### Run locally

```bash
npm install
npm run dev
# owner dashboard -> http://localhost:3000/dashboard
# receiver landing -> http://localhost:3000/
```

Documents, uploads, and viewer sessions are persisted under `storage/` (see `src/lib/server/paths.ts`). Delete that folder to reset the environment.

### Sender workflow

1. Open `/dashboard`, stay on the **Builder** tab.
2. Upload a file and/or craft rich text, configure permissions + security toggles, set up the identity requirement (optional) and **generate an OTP** (required).
3. Publish – the document JSON and uploaded file are written to `storage/` and appear under the **Documents** tab with copy buttons for link + OTP.
4. Watch live activity under **Events**; identity submissions, heartbeats, violations, and camera proofs flow in real time.

### Receiver workflow

1. Visit `/` and enter the OTP. `/api/otp/verify` validates the code, issues a viewer-session cookie, and routes to `/viewer/:id/verify` when identity is required (otherwise directly to `/viewer/:id`).
2. The verification screen collects name/phone (matching the owner’s expectations when enforced) and reminds the viewer that a photo + location will be captured.
3. Once verified, the viewer forces fullscreen, blocks print/download, captures geolocation + camera snapshot, and sends heartbeats every 5 seconds. Leaving fullscreen or obstructing the camera revokes the session and clears the cookie.

### Key folders

| Path | Purpose |
| --- | --- |
| `src/app/dashboard/` | Owner dashboard entry + multi-tab UI. |
| `src/components/dashboard/*` | Document builder, live event stream, and snippets (rich text editor, lists). |
| `src/app/api/documents/*` | Create/list documents and serve uploaded files. |
| `src/app/api/otp/verify` | Validates OTP, sets secure viewer session cookie, returns identity requirement flag. |
| `src/app/viewer/[documentId]/verify` | Reader identity collection screen. |
| `src/app/api/viewer/identity` | Stores reader name/phone and emits dashboard events. |
| `src/app/api/events` / `src/app/api/presence` | Server-sent events + telemetry ingestion (camera photos, location, revoke notices). |
| `src/components/security/*` | Viewer shell, fullscreen enforcement, watermarking, camera sentinel, screen shield, secure PDF canvas. |
| `src/lib/services/documentService.ts` | File-system backed document/session CRUD helpers. |
