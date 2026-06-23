# PWA — Progressive Web App

## Overview

Hotel Smart Concierge is configured as a **Progressive Web App** (PWA), meaning it can be installed on mobile devices and desktops like a native app.

---

## How It Works

### QR Code Scanning → Opens Browser First

When a guest scans a QR code (for check-in or room access), the URL opens in the **default browser** — not in a standalone app window. **This is expected behavior**, not a bug.

QR codes always open links in the browser because:
- The PWA might not be installed yet
- QR scanners don't know about installed PWAs
- The browser is the universal fallback

### Installing the PWA

Users can install the app from the browser:

1. **On Android Chrome**: Tap the "Install" banner at the bottom, or use the browser menu → "Add to Home Screen"
2. **On iOS Safari**: Tap the Share button → "Add to Home Screen"
3. **On Desktop Chrome/Edge**: Click the install icon in the address bar

### After Installation

Once installed:
- The app opens in **standalone mode** (no browser address bar)
- It appears on the home screen with the Hotel Smart Concierge icon
- It feels like a native app
- Navigation between `/login`, `/dashboard`, `/room`, etc. works seamlessly

### Important: QR Codes Still Open in Browser

Even after installing the PWA, scanning a QR code will still open in the browser — not in the installed PWA. This is a platform limitation, not a bug. The user can then switch to the installed app.

---

## Technical Configuration

### Manifest (`vite.config.ts`)

| Property | Value |
|---|---|
| `name` | Hotel Smart Concierge |
| `short_name` | Hotel Concierge |
| `start_url` | `/` |
| `scope` | `/` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `theme_color` | `#1a1f36` |
| `background_color` | `#0f1117` |

### Icons

- `public/pwa-192x192.png` — Standard icon
- `public/pwa-512x512.png` — Large icon + maskable icon

### Service Worker

- **Plugin**: `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- **Strategy**: Auto-update in the background
- **Caching**: Static assets (JS, CSS, HTML, images, fonts) are cached for offline use
- **API calls**: NOT cached (always fetch from network)

### Install Banner

A subtle, non-intrusive install banner appears at the bottom of the screen when:
- The browser fires the `beforeinstallprompt` event
- The app is not already installed
- The user hasn't dismissed the banner in this session

The banner can be dismissed with the ✕ button and won't reappear until the next session.

---

## Routes That Work in PWA Mode

All React Router routes work in standalone mode:

| Route | Purpose |
|---|---|
| `/login` | Staff login |
| `/dashboard/reception` | Reception dashboard |
| `/dashboard/manager` | Manager dashboard |
| `/dashboard/admin` | Admin dashboard |
| `/checkin?token=...` | Guest QR check-in |
| `/room?token=...` | Guest room interface |

---

## FAQ

**Q: Why does scanning the QR code not open the installed PWA?**
A: This is standard browser/OS behavior. QR codes open URLs in the browser. The PWA is a separate installed app instance.

**Q: Can the PWA work offline?**
A: Static pages (UI) are cached and will load offline. However, features requiring API calls (complaints, messages, check-in) need an internet connection.

**Q: Is HTTPS required?**
A: Yes. PWAs require HTTPS. The Vercel deployment at `hotel-smart-concierge.vercel.app` uses HTTPS automatically.
