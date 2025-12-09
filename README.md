# Which One Doesn't Belong (WODB)

A small Preact + Vite single-page app prototype for classroom math discussion: users annotate which of four items "doesn't belong", request review, and reflect on accepted annotations.

This repository contains an early demo MVP. More documentation, deployment notes, and backend integration details will be added to this README shortly.

## Quick commands

- **Recommended (full stack):** `npm run dev:full` — start both backend and frontend dev servers concurrently (recommended for local development).
- **Frontend-only:** `npm run dev` — start the frontend dev server (proxy to `frontend` package).
- **Backend-only:** `npm --prefix backend run dev` — start the backend dev server (nodemon + ts-node/esm).
- `npm run build` — build frontend production assets (`frontend` package).
- `npm run preview` — preview the built frontend locally.

Additional dev commands
- Start Firebase Auth emulator (reads root `.env`): `npm run emulator:start`.
- Backend development (loads root `.env` automatically): `npm --prefix backend run dev`.
- Production backend start (does not load root `.env`): `npm --prefix backend run start` (set production envs explicitly).

If you're doing feature work that touches both frontend and backend, use `npm run dev:full`. For quick UI changes you can run the frontend-only command, and for backend-only work (API changes, DB migrations, seeding) use the backend command shown above.

Important notes about `dev:full` and serving the frontend
- The `dev:full` script now waits for the backend readiness endpoint before starting the frontend dev server. It waits on `http://localhost:4000/health` so the frontend's dev proxy has a healthy backend target.
- For local emulator development the repository centralizes emulator configuration in the root `.env` (e.g. `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` and `FIREBASE_PROJECT_ID=demo-project`). The frontend Vite config maps these into `import.meta.env.VITE_FIREBASE_*` so the client connects to the emulator in development.
 - Authentication uses popup-based Google sign-in (no redirect flow). The popup flow works with both the Auth emulator and production Firebase projects, so there's no redirect setup required for local testing.
- By default the backend will NOT serve `frontend/dist` while developing (to avoid accidentally serving stale built files). Static serving is enabled only when `NODE_ENV=production` or when you set `SERVE_STATIC=1`.
- If a `frontend/dist` build exists from a previous run, `dev:full` will not serve it unless you explicitly enable static serving. This prevents the backend from serving older built assets instead of the live Vite dev server.

Typical workflows
- Development with HMR (recommended):

```bash
# start everything (backend + frontend dev server with HMR)
npm run dev:full
```

- Previewing a production build (backend serves built assets):

```bash
# build frontend
npm --prefix frontend run build

# start backend and serve the built frontend
NODE_ENV=production npm --prefix backend run start
```

- Force the backend to serve an existing `frontend/dist` during development (not recommended for HMR):

```bash
# set the flag and start dev:full
SERVE_STATIC=1 npm run dev:full
```

## Running the backend with MongoDB (local development)

The backend uses MongoDB for persistence. For local development you have two convenient options:

1) Run MongoDB in Docker (recommended)

```bash
# start MongoDB (use current stable tag, e.g. 8.2)
docker run -d --name wodb-mongo -p 27017:27017 mongo:8.2

# install backend deps (only needed once or when deps change)
npm --prefix backend install

# seed the DB with sample data
npm --prefix backend run seed

# stop/remove when finished
docker stop wodb-mongo && docker rm wodb-mongo
```

2) Use a hosted MongoDB or local mongod installation

Set the `MONGODB_URI` environment variable to point to your MongoDB instance before running the seed or starting the backend. Example:

```bash
export MONGODB_URI="mongodb://127.0.0.1:27017/wodb"
npm --prefix backend run seed
```

Inspecting the data

- Use `mongosh` to connect and inspect collections:

```bash
mongosh "mongodb://127.0.0.1:27017/wodb"
> show collections
> db.wodbsets.find().pretty()
> db.annotations.find().pretty()
```

- Or use the backend API (if the server is running on port 4000):

```bash
curl -s http://localhost:4000/api/sets | jq
curl -s "http://localhost:4000/api/sets/set1/annotations" | jq
```

Notes

- The seed script will populate the `wodbsets` and `annotations` collections. Annotations are stored with MongoDB ObjectIds (returned as `id` strings by the API).
- The repository ships a dev-friendly seed script at `backend/scripts/seed.ts` and a DB helper at `backend/src/db.ts`.
- If you prefer not to run a local MongoDB, I can add an automatic in-memory fallback using `mongodb-memory-server` so `npm --prefix backend run seed` works without Docker.

## License

This project is available under the MIT License (see `LICENSE`).
