# Doctor Appointment Booking System — Backend

**Day 1 progress:** Prisma schema (full DB design, with indexes) + complete Auth API
(register, login, refresh, logout) with httpOnly refresh-token cookies, bcrypt password
hashing, Zod validation, centralized error handling, and rate limiting.

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set your real DATABASE_URL and two different long random strings
# for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (e.g. openssl rand -hex 32)

npx prisma migrate dev --name init   # creates tables in PostgreSQL
npx prisma generate                  # generates the Prisma client

npm run dev                          # starts on http://localhost:5000
```

> **Note:** `npx prisma generate` needs to download a query-engine binary from
> `binaries.prisma.sh`. It works fine on a normal machine/CI — it only fails in network-
> restricted sandboxes. If it fails, check your internet connection / firewall.

## Test it's alive

```bash
curl http://localhost:5000/health
```

## Auth API (Day 1)

| Method | Endpoint             | Body                                  | Notes                                   |
|--------|----------------------|----------------------------------------|------------------------------------------|
| POST   | /api/auth/register   | `{ name, email, password, phone?, role }` | `role`: `PATIENT` or `DOCTOR`          |
| POST   | /api/auth/login      | `{ email, password }`                  | Sets `refreshToken` httpOnly cookie, returns `accessToken` in body |
| POST   | /api/auth/refresh     | — (reads cookie)                       | Rotates refresh token, returns new `accessToken` |
| POST   | /api/auth/logout      | — (reads cookie)                       | Revokes the refresh token                |

### Example: register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Rafiul Islam","email":"rafi@example.com","password":"secret123","role":"PATIENT"}'
```

### Example: login

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rafi@example.com","password":"secret123"}' \
  -c cookies.txt
```

### Example: refresh (uses the cookie saved above)

```bash
curl -X POST http://localhost:5000/api/auth/refresh -b cookies.txt
```

## What's implemented vs. what's next

**Done (Day 1):**
- Full Prisma schema — User, DoctorProfile, Availability, Appointment, Review, RefreshToken
- Composite indexes + `@@unique([doctorId, startTime])` double-booking guard
- Soft-delete fields on `User`
- Register / Login / Refresh / Logout with token rotation
- httpOnly, sameSite=strict refresh cookie (XSS-safe)
- Refresh tokens hashed before storing in DB
- Zod request validation → standard `{ success, message, errors }` error shape
- Centralized error handler (maps Prisma/JWT errors to correct HTTP codes)
- express-rate-limit on `/login` and `/register`
- helmet, cors (credentials), morgan request logging, winston error logging

**Next (Day 2):** Doctor profile CRUD + availability API, `protect`/`allowRoles`
middleware (already scaffolded in `src/middlewares/auth.js`) wired into real routes.

## Folder structure

```
src/
├── config/db.js          Prisma client singleton
├── constants/             Role enum, cookie name
├── controllers/           auth.controller.js
├── middlewares/           auth, validate, errorHandler, rateLimiter
├── routes/                auth.routes.js, index.js
├── services/               auth.service.js (business logic)
├── utils/                   ApiError, asyncHandler, token, logger
└── app.js / server.js
prisma/schema.prisma
```
