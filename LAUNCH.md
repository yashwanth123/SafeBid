# Launch SafeBid on a real domain (web + iOS + Android)

This repo is ready to host. I cannot buy a domain, log into Vercel/Render, or publish to the App Store / Play Store from this environment — those accounts have to be yours. Once you have them, this is the exact path.

## What 10 friends can use

| Surface | How they install | When |
| --- | --- | --- |
| **Web app (PWA)** | Safari / Chrome → Add to Home Screen | As soon as `safebid.app` (or your domain) is live |
| **iOS native** | TestFlight (then App Store) | After Apple Developer ($99/year) + EAS build |
| **Android native** | Internal testing track (then Play) | After Google Play ($25) + EAS build |

For the first 10 users, **PWA on a real domain is the live product**. Native store listings take Apple/Google review (often 1–7 days) on top of accounts.

## 1. Buy a domain

Pick one name and stick to it, e.g. `safebid.app` or `joinsafebid.com`.

Buy it at Cloudflare Registrar, Namecheap, or Google Domains. You will point DNS in step 4.

## 2. Host the API (Render)

1. Create a Render account and connect GitHub repo `yashwanth123/SafeBid`.
2. Use `render.yaml` (API + Postgres). Set:
   - `FRONTEND_URL=https://YOUR_DOMAIN,https://www.YOUR_DOMAIN`
   - `INVITE_CODE=BLOCKPARTY` (or a new code)
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (Render can generate)
   - `MOCK_PAYMENTS=true` and `MOCK_IDENTITY=true` until Stripe is live
3. After first deploy, SSH/shell or a one-off job: `npx prisma migrate deploy && npm run prisma:seed` (seed is optional; friends should register themselves).
4. Add custom domain `api.YOUR_DOMAIN` in Render and create the DNS CNAME Render shows you.

## 3. Host the web app (Vercel)

1. Create a Vercel account, import the same GitHub repo.
2. **Root Directory:** `frontend`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL=` (leave empty — same-origin `/api` proxy)
   - `API_INTERNAL_URL=https://api.YOUR_DOMAIN`
   - `NEXT_PUBLIC_MOCK_PAYMENTS=true`
4. Add custom domain `YOUR_DOMAIN` and `www.YOUR_DOMAIN`.

## 4. DNS (example for `safebid.app`)

| Name | Type | Target |
| --- | --- | --- |
| `@` | A / ALIAS | Vercel (as shown in Vercel DNS) |
| `www` | CNAME | `cname.vercel-dns.com` |
| `api` | CNAME | Render hostname (e.g. `safebid-api.onrender.com`) |

Wait for HTTPS certificates (usually minutes).

## 5. Point the native apps at that API

In `mobile/.env` (do not commit secrets):

```
EXPO_PUBLIC_API_URL=https://api.YOUR_DOMAIN
```

Then:

```bash
cd mobile
npm install
npx expo login          # Expo account
npx eas login
npx eas build:configure # writes a projectId into app.json
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
```

- **iOS preview:** upload the `.ipa` to TestFlight (Apple Developer + App Store Connect app record with bundle id `com.safebid.app`).
- **Android preview:** `eas.json` preview profile produces an **APK** you can send to friends, or an AAB for Play internal testing (`com.safebid.app`).

Store listing assets: use `mobile/assets/icon.png`. Privacy policy URL should be `https://YOUR_DOMAIN` (add a `/privacy` page before store submit).

## 6. What is still simulated

Until you add Stripe keys and set `MOCK_PAYMENTS=false` / `MOCK_IDENTITY=false`:

- Card charges do not hit a real bank
- ID verification is a demo pass/fail

Do **not** take real jobs for money until Stripe Connect + Identity are on.

## Send me these and I can finish the deploy

1. The domain you bought (or want to buy)
2. Vercel + Render logged in (or API tokens)
3. Whether you have Apple Developer and Google Play accounts yet

I will then attach DNS, set production env, and run the first EAS builds.
