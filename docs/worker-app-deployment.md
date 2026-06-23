# Worker App — Deployment Guide

## Overview

The worker app is a Flutter mobile application for hotel employees (maintenance, housekeeping). It connects to the backend API on Render.

---

## Environment Configuration

All URLs are configured in a single file:

```
worker-app/lib/core/constants/env.dart
```

### How to Switch Environments

Edit `env.dart` and change the `current` line:

```dart
// For production (Render backend):
static const Env current = Env.production;

// For local development (Android emulator):
static const Env current = Env.development;

// For local development (real device on same Wi-Fi):
static const Env current = Env.localNetwork;
```

### Environment URLs

| Environment | API URL | Socket URL |
|---|---|---|
| **production** | `https://hotel-backend-4x7b.onrender.com/api` | `https://hotel-backend-4x7b.onrender.com` |
| development | `http://10.0.2.2:5000/api` | `http://10.0.2.2:5000` |
| localNetwork | `http://<YOUR_IP>:5000/api` | `http://<YOUR_IP>:5000` |

### Changing the Local Network IP

If using `localNetwork`, update `_localNetworkIp` in `env.dart`:

```dart
static const String _localNetworkIp = '192.168.0.150'; // ← your PC's IP
```

---

## Building the APK

### Prerequisites

- Flutter SDK installed
- Android SDK installed
- Java 17+

### Release Build

```bash
cd worker-app
flutter build apk --release
```

The APK is generated at:
```
worker-app/build/app/outputs/flutter-apk/app-release.apk
```

### Debug Build (for testing)

```bash
flutter build apk --debug
```

---

## HTTPS

The production build uses HTTPS exclusively:
- `android:usesCleartextTraffic="false"` is set in AndroidManifest.xml
- The Render backend URL uses HTTPS
- No cleartext HTTP traffic is allowed in release mode

---

## Login

The app only accepts **EMPLOYEE** role login. Staff with other roles (ADMIN, RECEPTIONIST, MANAGER) cannot log in to the worker app.

Test credentials should be created via the admin dashboard or database seeds.

---

## Architecture

```
lib/
├── core/
│   ├── api/           # Dio HTTP client + heartbeat service
│   ├── constants/
│   │   ├── env.dart           # ← Environment URLs (change here)
│   │   ├── api_constants.dart # API route paths
│   │   └── app_colors.dart    # Theme colors
│   ├── router/        # GoRouter navigation
│   └── storage/       # Secure token storage
├── features/
│   ├── auth/          # Login screen + auth service
│   ├── home/          # Employee dashboard
│   ├── tasks/         # Task list + detail
│   ├── scanner/       # QR code scanner
│   ├── messages/      # In-task messaging
│   └── splash/        # Splash/loading screen
└── shared/            # Shared widgets
```
