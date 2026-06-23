# PWA — Progressive Web App

## Overview

Hotel Smart Concierge uses a **scoped PWA** that is installable **only from the client room pages** (`/room`). Staff pages, admin dashboards, login, and check-in pages are NOT installable and do NOT show any install prompt.

---

## Scope

### Installable (PWA) — Client Room Only

These pages are part of the PWA scope and may show an install prompt:

| Route | Purpose |
|---|---|
| `/room` | Guest room home |
| `/room/complaint` | Submit a complaint |
| `/room/complaints` | Track complaints |
| `/room/messages` | Chat with reception |
| `/room/hotel-info` | View hotel info |
| `/room/events` | View hotel events |
| `/room/currency` | Currency converter |

### NOT Installable — Staff/Admin Pages

These pages will **never** show an install prompt:

| Route | Purpose |
|---|---|
| `/login` | Staff login |
| `/checkin?token=...` | Guest QR check-in |
| `/dashboard/reception` | Reception dashboard |
| `/dashboard/manager` | Manager dashboard |
| `/dashboard/admin` | Admin dashboard |

---

## How It Works

### QR Code Scanning → Opens Browser First

When a guest scans a QR code, the URL opens in the **default browser**. **This is expected behavior**, not a bug. QR codes always open links in the browser because:
- The PWA might not be installed yet
- QR scanners don't know about installed PWAs
- The browser is the universal fallback

### Installing the PWA

After opening `/room?token=...` in the browser, users may see a subtle "Install app" banner at the bottom of the screen.

1. **On Android Chrome**: Tap "Install" in the banner, or use browser menu → "Add to Home Screen"
2. **On iOS Safari**: Tap the Share button → "Add to Home Screen"
3. **On Desktop Chrome/Edge**: Click the install icon in the address bar

### After Installation

Once installed:
- The app opens in **standalone mode** (no browser address bar)
- It appears on the home screen with the Hotel Smart Concierge icon
- Navigation within `/room/*` works seamlessly
- It only covers the guest room area — not staff pages

### QR Codes Still Open in Browser

Even after installing the PWA, scanning a QR code will still open in the browser. This is a platform limitation, not a bug.

---

## Technical Configuration

### Manifest

| Property | Value |
|---|---|
| `name` | Hotel Smart Concierge |
| `short_name` | Hotel Concierge |
| `start_url` | `/room` |
| `scope` | `/room` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `theme_color` | `#1a1f36` |
| `background_color` | `#0f1117` |

### Service Worker

- **Registration**: Manual, only triggered when user navigates to `/room`
- **Scope**: `/room` (does not control `/login`, `/dashboard`, `/checkin`, etc.)
- **Strategy**: Auto-update in background
- **Caching**: Static assets cached for offline UI; API calls always fetch from network

### Install Banner

The `PwaInstallBanner` component is rendered **only inside `RoomLayout`**. It:
- Listens for `beforeinstallprompt` event
- Shows a subtle, dismissible banner
- Dismisses per session (won't reappear until next session)
- Is completely invisible on staff/admin/check-in pages

### Limitation

The Vite PWA plugin generates the service worker at build time for the entire app bundle. We use `injectRegister: false` to prevent automatic registration, then manually register with `scope: '/room'` only inside `RoomLayout`. The manifest `scope` and `start_url` are both set to `/room`, which tells the browser this PWA only covers the `/room/*` area.

---

## FAQ

**Q: Why don't staff pages show "Install app"?**
A: The service worker is only registered when visiting `/room`, and the manifest scope is `/room`. The browser won't prompt installation on other pages.

**Q: Can the PWA work offline?**
A: The UI loads offline from cache, but API features (complaints, messages) need internet.

**Q: Is HTTPS required?**
A: Yes. PWAs require HTTPS. Vercel provides this automatically.
