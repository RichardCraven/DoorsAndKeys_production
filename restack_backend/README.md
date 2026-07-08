# restack_backend

This is the backend for the Restack project (Express + MongoDB using Mongoose).

## Overview
- Entry point: `index.js`
- Start script (development): `npm run start` (runs `nodemon index.js` as defined in `package.json`)
- Server framework: Express
- Database: MongoDB via Mongoose (default connection in `index.js` uses `mongodb://localhost:27017/doors_db`)
- API base path: `/api` (resources: `users`, `maps`, `dungeons`, `planes`)

## Prerequisites
- Node.js (v12+ recommended)
- npm
- MongoDB running locally (or provide your own connection string; see `index.js` / `config/database.config.json`)

## Install
From the `restack_backend` directory:

```bash
npm install
```

## Run (development)
Start MongoDB (for example with `brew services start mongodb-community` if installed via Homebrew), then:

```bash
npm run start
# which runs: nodemon index.js
```

The server listens on `process.env.PORT` or `5001` by default. CORS is configured to allow `http://localhost:3000` (the React client).

## API endpoints (quick reference)
All routes are mounted under `/api/<resource>`.

- Users: `/api/users`
	- POST `/api/users` — create user (controller expects a JSON body; currently stored fields: `username`, `password`, `isAdmin`, `metadata`)
	- GET `/api/users` — list users
	- GET `/api/users/:id` — get single user
	- PUT `/api/users/:id` — update user
	- DELETE `/api/users/:id` — delete user
	- DELETE `/api/users` — delete all users

- Maps: `/api/maps`
	- POST `/api/maps` — create map (controller expects `map` field in body; it stores it as `content`)
	- GET `/api/maps` — list maps
	- GET `/api/maps/:id` — get single map
	- PUT `/api/maps/:id` — update map (expects `map` in body)
	- DELETE `/api/maps/:id` — delete map
	- DELETE `/api/maps` — delete all maps

- Dungeons: `/api/dungeons` — same CRUD pattern; controllers expect `dungeon` in body and store as `content`.
- Planes: `/api/planes` — same CRUD pattern; controllers expect `plane` in body and store as `content`. There is also a bulk update method in the controller that expects `planesArray` in the request body (stringified JSON array of entries).

### Example (create a map)
The controllers set `req.body.content = req.body.map` before saving, so send JSON like:

```bash
curl -X POST http://localhost:5001/api/maps \
	-H "Content-Type: application/json" \
	-d '{"map": "{\"width\":10, \"height\":10, \"cells\": []}"}'
```

Note: the current controllers store the `map`/`plane`/`dungeon` payloads in a `content` string field (JSON text). If you want to query internals, consider storing as structured objects.

## Important notes & gotchas (observed while analyzing)
- Error handling / `next` usage:
	- Some controller functions call `next(error)` but the function signature lacks the `next` parameter (e.g. `exports.create = (req, res) => { ... next(error) }`). This will cause a ReferenceError at runtime. Recommend changing controller exports to `(req, res, next)` if they call `next`.
- Passwords / auth:
	- `bcryptjs` and `jsonwebtoken` are dependencies, but controllers shown do not hash passwords or implement login/auth endpoints. If you intend to store credentials, add hashing before save and add a login route that issues JWTs.
- Deprecated methods:
	- Controllers use `remove()` (e.g. `userSchema.remove({})`) — prefer `deleteMany({})` in modern Mongoose.
- Mixed dependencies:
	- `knex` and `sqlite3` are present in `package.json` but the code uses Mongoose/MongoDB. If not needed, consider removing them to reduce install footprint.
- Large payloads:
	- Body parser limits are large (`50mb`) — intentional for large maps or uploads? Keep an eye on memory.
- Schema shape:
	- `content` is declared as `String` in models. If you need to query internal fields, consider `Schema.Types.Mixed` or a nested schema.

## Recommended small fixes (low risk)
1. Update controller function signatures to `(req, res, next)` where they call `next(error)`.
2. Add a centralized Express error handler in `index.js`:

```js
// after all routes
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: err.message || err });
});
```

3. Implement password hashing (bcrypt) and add login route using JWT.
4. Replace `remove()` with `deleteMany()`.
5. Remove unused dependencies if confirmed not required (e.g. `knex`, `sqlite3`).

## Where to look next
- `index.js` — server and DB connection.
- `routes_new/` — router registration.
- `controllers/` — CRUD handlers and where `next`/`res` are used.
- `models/` — data schema decisions.

---

If you'd like, I can implement the quick fixes now (controller signatures + error handler) and run a smoke test. Do you want me to make those code changes and run the server?