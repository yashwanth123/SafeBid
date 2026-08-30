# SafeBid mobile (Expo)

Native iOS + Android client for the same SafeBid API as the web app.

```bash
cd mobile
cp .env.example .env   # set EXPO_PUBLIC_API_URL=https://api.YOUR_DOMAIN
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS) for a device preview.

Production / TestFlight / Play internal builds: see [../LAUNCH.md](../LAUNCH.md). Bundle ID / application id is `com.safebid.app`.
