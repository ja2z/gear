# Scout Troop Gear Management System

## Background
Assistant scout master (ASM) managing troop gear as quartermaster mentor. This app replaces a paper-based gear tracking process with a digital checkout/checkin system for Scouts BSA Troop 222.

## Stack
- **Frontend:** Vite + React 19, React Router v7, Tailwind CSS v4 (mobile-first)
- **Backend:** Express.js v5 / Node.js
- **Database:** Supabase (PostgreSQL) — single source of truth for all reads and writes
- **Email:** Resend API (magic links + reservation confirmation PDFs via PDFKit)
- **Hosting:** Render.com — separate static site (frontend) + web service (backend)

## Key Constraints
- Mobile-first design is critical — scouts primarily use phones
- Budget-conscious; free tier Render services (subject to cold starts)

## Project Structure

```
gear/
├── backend/
│   ├── server.js              # Express entry point
│   ├── routes/                # auth, checkout, checkin, inventory, metadata, manage-inventory, reservations
│   ├── middleware/            # auth.js (requireAuth + session renewal), dev-security.js (IP filter)
│   ├── services/              # supabase-api.js, auth-service.js, email-service.js
│   ├── database/              # supabase-schema.sql, migrate.js
│   └── .env                   # Local env vars (never committed — see below)
├── frontend/
│   ├── src/
│   │   ├── pages/             # Route components (gear, checkin, reservations, manage-inventory, etc.)
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # useInventory.js (all data fetching), useToast, useOptimizedImage
│   │   ├── context/           # AuthContext.jsx, CartContext.jsx
│   │   └── config/
│   │       ├── apiBaseUrl.js  # Dynamic API URL resolution (see below)
│   │       └── devAuthBypass.js
│   ├── public/images/         # Source PNGs + pre-generated .webp and .lqip.webp
│   └── plugins/               # imageOptimization.js (Vite plugin, build-only)
└── scripts/
    ├── pregen-images.sh       # Pre-generate WebP/LQIP from PNGs
    ├── restart-servers.sh     # Kill and restart frontend + backend locally
    └── keep-alive.sh          # Curl /api/ping to prevent Render cold start
```

## Data Model

### `items` — master inventory
- `item_id` — unique identifier e.g. `TENT-001`, `BRCAN-032`
- `item_class` — category code e.g. `TENT`, `BRCAN`
- `item_desc` — category long name e.g. "Bear Can"
- `item_num` — 3-digit sequence within class e.g. `001`
- `description` — human-readable item description
- `is_tagged` — boolean, has physical tag
- `condition` — `Usable` | `Not usable` | `Unknown`
- `status` — `In shed` | `Checked out` | `Reserved` | `Missing` | `Out for repair` | `Removed from inventory`
- `in_app` — boolean, appears in checkout flow
- `checked_out_to`, `checked_out_by`, `check_out_date`, `outing_name`
- `purchase_date`, `cost`, `notes`

### `transactions` — append-only audit trail
- `transaction_id`, `timestamp`, `action` (`Check in` / `Check out`)
- `item_id`, `outing_name`, `condition`, `processed_by`, `notes`

### `reservations` — active gear reservations
- `outing_name` (PK), `reserved_by`, `reserved_email`, `created_at`

### `metadata` — gear categories
- `class` (PK, immutable), `class_desc` (UNIQUE, max 22 chars)

### `users` / `roles` — user roster
- `id`, `email`, `first_name`, `last_name`, `role_id` → `roles(name)`

### `sessions` — active login sessions
- `user_id` (FK), `token_hash` (UNIQUE), `expires_at`, `created_at`, `updated_at`

### `magic_links` — one-time login tokens
- `user_id` (FK), `token_hash` (UNIQUE), `expires_at` (15 min TTL), `used` (boolean)

## Architecture Decisions

**All reads and writes go directly to Supabase** via `backend/services/supabase-api.js`. No sync layer, no cache, no Google Sheets.

**Soft delete:** Items are never hard-deleted. Deleting sets `status = "Removed from inventory"`. All inventory queries must filter this out.

**Immutable identifiers:** `item_class`, `item_num`, `item_id`, and `metadata.class` cannot be changed after creation — doing so breaks transaction history.

**Item ID generation:** `{CLASS}-{padded 3-digit num}` — next num derived from `MAX(item_num)` for that class.

**CORS:** Backend uses `cors({ origin: true, credentials: true })`. The `origin: true` option reflects the request's `Origin` header back (instead of `*`), which is required because all fetches use `credentials: 'include'`. Using `cors()` with no config (which returns `*`) breaks credentialed requests in browsers.

**Cart persistence:** Stored in `localStorage` with 72-hour expiration (key: `scout_gear_cart`).

## Authentication

Passwordless magic-link flow, session cookies, no passwords.

### Flow
1. User POSTs email to `/api/auth/request-link` → backend generates token hash, stores in `magic_links`, emails link `{APP_URL}/#/auth/verify?token={rawToken}`
2. User clicks link → frontend hits `/api/auth/verify?token=...` → token validated, marked used, session created, `session` cookie set (httpOnly, secure in prod)
3. On every page load, `AuthContext` calls `/api/auth/me` to restore session
4. Sessions expire after 14 days; renewed automatically if < 7 days remain (sliding window)

### Cookie config
```js
httpOnly: true,
secure: NODE_ENV === 'production',
sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
maxAge: 14 * 24 * 60 * 60 * 1000
```

`sameSite: 'none'` + `secure: true` is required in production because the frontend static site and backend web service are on different origins on Render.

### Dev auth bypass
In `npm run dev`, a "Continue without signing in" button appears on the login page. This sets a `sessionStorage` flag (`scout_gear_dev_auth_bypass`) and injects a mock user without hitting the backend. Stripped from production builds via `import.meta.env.DEV`.

### Rate limiting
`/api/auth/request-link` is limited to 5 requests per IP per minute.

## Frontend–Backend Connection

### Dev (local)
Vite proxies `/api/*` → `http://localhost:3001` (see `vite.config.js`). Frontend uses relative `/api` path. No `VITE_API_URL` needed.

### Production (Render)
Frontend and backend are **separate Render services** on different domains. The frontend static site must have `VITE_API_URL` set (build-time env var) pointing to the backend.

**`src/config/apiBaseUrl.js`** resolves the right URL at runtime:
- Prod: uses `VITE_API_URL` (required), falls back to relative `/api`
- Dev: uses relative `/api` (Vite proxy), or a remote `VITE_API_URL` if it's on a different origin

### Required Render environment variables

**Backend web service:**
| Var | Description |
|-----|-------------|
| `APP_URL` | Frontend URL — used to build magic link in email (e.g. `https://gear.t222.org`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM` | From address (e.g. `qm@t222.org`) |
| `NODE_ENV` | Set to `production` |

**Frontend static site:**
| Var | Description |
|-----|-------------|
| `VITE_API_URL` | Backend URL ending in `/api` (e.g. `https://gear-backend-pgoe.onrender.com/api`) |

### Local `.env` (backend only, never committed)
```
PORT=3001
APP_URL=http://localhost:5173
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
DATABASE_URL=...
RESEND_API_KEY=...
RESEND_FROM=qm@t222.org
```

## Checkout Flow
Landing → Category Selection → Item Selection → Cart → Scout Info Form → Confirmation

## Manage Inventory Feature
Quartermaster-only section accessible from landing. Supports:
- View inventory (by category with aggregate stats, or by item)
- View transaction log
- Add / Edit items
- Soft-delete items (requires typing "delete item" to confirm)
- Add / Edit categories

## Backend Scripts (npm)
- `npm run dev` — nodemon server.js
- `npm run build` — builds frontend (installs deps + vite build)
- `npm start` — build + node server.js (used by Render)
- `npm run migrate` — run database migrations

## Hero Image Optimization

Source PNGs live in `frontend/public/images/`. Pre-generated `.webp` and `.lqip.webp` files are committed alongside them.

**When adding or replacing images:**
```bash
scripts/pregen-images.sh
```
Then commit the new `.webp` and `.lqip.webp` files. The Vite plugin copies pre-generated files at build time (fast). Falls back to generating on the fly if missing (slower). `npm run dev` skips image optimization entirely (`apply: 'build'`).

## Testing Locally
Always start or restart local servers using:
```bash
scripts/restart-servers.sh
```
This kills any running frontend/backend processes and restarts both. Use it any time you make backend changes or need a clean local environment. Logs are written to `backend/server.log` and `frontend/dev.log` — check them after restart to confirm clean startup.

## Direct Database Access (Supabase)

Use `psql` with the `DATABASE_URL` from `backend/.env`. `libpq` is installed at `/usr/local/opt/libpq/bin/psql`.

```bash
cd backend
source <(grep -v '^#' .env | grep DATABASE_URL)
psql "$DATABASE_URL" -c "/* your SQL here */"
```

For multi-statement or file-based SQL:
```bash
psql "$DATABASE_URL" -f your-migration.sql
```

For interactive session:
```bash
psql "$DATABASE_URL"
```

The `DATABASE_URL` in `.env` is the DEV Supabase instance. For prod, use `PROD_DATABASE_URL` instead.
