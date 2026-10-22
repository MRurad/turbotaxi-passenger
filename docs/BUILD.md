# Builds (EAS) — from Windows

Expo Go is fine for daily work, but it can't show **Google Maps on iOS** (it falls back to
Apple Maps) and can't be published. EAS builds the real app in the cloud: no Mac needed.

| Profile | What it is | Who can install |
|---|---|---|
| `development` | Your app + dev menu; loads JS from your PC (`npx expo start --dev-client`) | Registered devices (iOS), anyone with the APK (Android) |
| `preview` | Standalone app with the JS inside, for testers | Registered devices (iOS), APK (Android) |
| `production` | Store build (IPA / AAB), build number auto-incremented | App Store / Google Play |

Profiles live in `eas.json`. App name, ids, version, icons and permission texts live in
`app.config.ts`.

## What you need

- An Expo account (free): https://expo.dev/signup
- **iOS device builds need a paid Apple Developer Program membership** ($99/year,
  https://developer.apple.com/programs/). Without it you can only use Expo Go on the iPhone.
- Android needs nothing extra for `development` / `preview` (APK). Publishing needs a Google Play
  developer account ($25 once).

## One-time setup

Run these in PowerShell or Git Bash, in the project folder.

```bash
npm install -g eas-cli        # or prefix every command with: npx eas-cli@latest
eas login
eas init                      # creates the project on expo.dev
```

`eas init` can't edit `app.config.ts` (it's code, not JSON). It prints a **project id**: paste it
into `app.config.ts` → `const EAS_PROJECT_ID = '…';` and commit. It's not a secret.

### Environment variables

`.env` is git-ignored, so **EAS does not see it**. The build gets its variables from two places:

1. **`eas.json` → `build.base.env`**: non-secret values, committed. `EXPO_PUBLIC_API_URL` is set
   there for every profile.
2. **EAS environment variables**, for the Google key (kept out of git). Create it once for all
   three environments:

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_KEY" --environment development --environment preview --environment production --visibility sensitive
eas env:list --environment development     # check
```

Each profile picks its set through `"environment"` in `eas.json`. Notes:

- `EXPO_PUBLIC_*` values are compiled into the app, so anyone with the app can read them. That's
  normal for a Maps key; protect it with restrictions in Google Cloud instead (below).
  `sensitive` only hides it in build logs (`secret` isn't allowed for `EXPO_PUBLIC_*`).
- To change a value: `eas env:update`. Then rebuild (or, for JS-only values in a dev build,
  just restart Metro: local runs read your `.env`).
- `app.config.ts` also reads the Maps key at build time for the native map SDKs.

### Google Maps in the native builds

The dev / preview / production builds use the **Google** map on iOS and Android
(`src/features/map/constants.ts`). In Google Cloud (the key's project):

- Enable **Maps SDK for iOS** and **Maps SDK for Android**. Map loads in the mobile SDKs are free,
  but Google requires **billing to be enabled** on the project for the key to work at all.
- Restrict the key: iOS apps → bundle id `az.turbotaxi.passenger`; Android apps → package
  `az.turbotaxi.passenger` + the SHA-1 from `eas credentials -p android` (shown after the first
  Android build).
- Place search doesn't use Google right now (Photon / OpenStreetMap, `src/constants/places.ts`),
  so search works even without Places billing.

## iPhone: development build

```bash
eas device:create
```

Choose "Website", open the link (or QR) **on the iPhone in Safari**, install the profile:
Settings → General → VPN & Device Management → install. This registers the iPhone's UDID.

```bash
eas build -p ios --profile development
```

- First time: sign in with your Apple Developer account when asked and let EAS create the
  certificate and provisioning profile ("Yes" to the defaults).
- A device registered **after** a build isn't in that build's profile: run the build again and
  let EAS update the profile.
- The build takes ~10–20 min. When it's done, open the build link / QR on the iPhone and
  install.
- iOS 16+: the first launch asks for **Developer Mode**: Settings → Privacy & Security →
  Developer Mode → On, restart, confirm.

Then start the dev server on the PC and open the TurboTaxi app on the phone:

```bash
npx expo start --dev-client -c       # or: npm run start:dev
```

The app lists servers on the same network; otherwise scan the terminal QR with the Camera
app. The phone and PC must reach each other (see the Wi-Fi note below).

You only rebuild when **native** things change (a new native library, `app.config.ts` plugins,
permissions, the Maps key, icons). JS / TS changes just reload.

## Android: development build

```bash
eas build -p android --profile development
```

Open the link on the phone, download the APK, allow "install unknown apps" for the browser,
install. Then `npx expo start --dev-client`.

## Expo Go still works

With `expo-dev-client` installed, `npx expo start` opens in **development-build** mode. For Expo
Go use:

```bash
npx expo start --go -c               # or: npm run start:go
```

(or press `s` in the terminal to switch). In Expo Go the iPhone map is Apple Maps.

### Wi-Fi note

Some networks block the phone ↔ PC connection Metro needs (e.g. the office "HRA 2" Wi-Fi).
Use the iPhone hotspot for both, or `npx expo start --dev-client --tunnel`.

## Preview builds (testers)

```bash
eas build -p ios --profile preview        # registered iPhones only (ad hoc)
eas build -p android --profile preview    # APK, any Android phone
```

Testers install from the build link. No dev server needed.

## Production and store submission

Bump the user-facing version in `app.config.ts` (`APP_VERSION`) for a new release. Build
numbers are managed by EAS (`appVersionSource: "remote"`, `autoIncrement`); check them with
`eas build:version:get`.

```bash
eas build -p all --profile production
```

**iOS → App Store Connect / TestFlight**

1. Create the app in App Store Connect (bundle id `az.turbotaxi.passenger`).
2. `eas submit -p ios --latest`: sign in with your Apple ID; EAS uploads the IPA to TestFlight.
   (To skip the questions later, add `"ascAppId": "<App Store Connect app id>"` under
   `submit.production.ios` in `eas.json`.)
3. Before review: privacy policy URL, the location permission texts (already in en / az / ru),
   and **in-app account deletion** (Settings → Delete account; see BACKEND_REQUESTS #30).

**Android → Google Play**

1. Create the app in Play Console. Upload the **first** AAB by hand (Play's rule), from the
   production build page.
2. Create a Google service account with Play access and download its JSON key (keep it out of
   git), then: `eas submit -p android --latest` and point it to the key when asked.

## Useful commands

```bash
eas build:list                 # recent builds and their links
eas credentials                # certificates, profiles, Android keystore + SHA-1
eas device:list                # registered iPhones
eas env:list --environment production
npx expo-doctor                # checks dependency versions / config
```
