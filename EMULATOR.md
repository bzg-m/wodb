# Firebase Auth Emulator (local development)

This project supports using the Firebase Auth emulator for local development and testing. The emulator lets you create users and custom claims (for example `isAdmin`) without touching production Firebase services.

Overview
- The repository centralizes emulator configuration in the root `.env` file (`FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_PROJECT_ID`).
- Frontend Vite builds map these values into client envs so the client connects to the emulator in development.
- The backend will use the emulator when `FIREBASE_AUTH_EMULATOR_HOST` is set and `NODE_ENV` is not `production`.

Start the Auth emulator
1. Install the Firebase CLI if you don't have it:

```bash
# install globally
npm install -g firebase-tools
# or use npx (no global install required):
# npx firebase-tools
```

2. From the repository root, start the Auth emulator (the `emulator:start` script reads the root `.env`):

```bash
npm run emulator:start
```

By default this starts the Auth emulator on port `9099` (configured in `firebase.json`). The emulator UI is enabled on port `4100` by default.

Configure the development environment
- Backend: start the backend in development with the root `.env` loaded automatically:

```bash
npm --prefix backend run dev
```

- Frontend: the frontend dev server reads client envs from Vite (the Vite config maps root `FIREBASE_*` envs into `import.meta.env.VITE_FIREBASE_*`). If you need to provide real Firebase client keys for other flows (email-link, etc.), keep them in `frontend/.env.local` as usual. For local emulator use, the root `.env` is sufficient.

Creating users and custom claims
You can create users and set custom claims against the Auth emulator's REST endpoints. Example — create a user (replace host/port if different):

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"localId":"u1","email":"u1@example.com","password":"pass123"}' \
  "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts"
```

Set custom claims for a user (example marks user `u1` as admin):

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"localId":"u1","customAttributes":"{\"isAdmin\":true}"}' \
  "http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/demo-project/accounts:update"
```

Signing in from the client
- When the client connects to the emulator, sign-in methods (email/password, email-link, custom tokens) behave the same as against real Firebase. In the client code the token returned from sign-in can be inspected with `getIdTokenResult()` to read custom claims (e.g. `isAdmin`).

Safety notes
- The Admin SDK will be initialized without credentials when the emulator is used. This is appropriate for local development only — do not run the server in production with the emulator enabled.
- The backend code includes a guard that ignores `FIREBASE_AUTH_EMULATOR_HOST` when `NODE_ENV=production` to help prevent accidental emulator usage in production.
