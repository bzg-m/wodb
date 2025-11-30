# Which One Doesn't Belong (WODB)

A small Preact + Vite single-page app prototype for classroom math discussion: users annotate which of four items "doesn't belong", request review, and reflect on accepted annotations.

This repository contains an early demo MVP. More documentation, deployment notes, and backend integration details will be added to this README shortly.

## Quick commands

- **Recommended (full stack):** `npm run dev:full` — start both backend and frontend dev servers concurrently (recommended for local development).
- **Frontend-only:** `npm run dev` — start the frontend dev server (proxy to `frontend` package).
- **Backend-only:** `npm --prefix backend run dev` — start the backend dev server (nodemon + ts-node/esm).
- `npm run build` — build frontend production assets (`frontend` package).
- `npm run preview` — preview the built frontend locally.

If you're doing feature work that touches both frontend and backend, use `npm run dev:full`. For quick UI changes you can run the frontend-only command, and for backend-only work (API changes, DB migrations, seeding) use the backend command shown above.

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
