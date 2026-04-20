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
    ├── pregen-images.sh              # Pre-generate WebP/LQIP from PNGs
    ├── restart-servers.sh            # Kill and restart frontend + backend locally
    ├── keep-alive.sh                 # Curl /api/ping to prevent Render cold start
    ├── sync-trooptrack-users.sh      # One-way TT→Supabase user sync
    └── sync-trooptrack-events.sh     # One-way TT→Supabase event sync (today+60d window)
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

### `events` — scout outings and meetings
- `id`, `name` (VARCHAR 255, used as human-readable label)
- `event_type_id` (FK → event_types), `start_date` (TIMESTAMPTZ UTC), `end_date` (TIMESTAMPTZ UTC), `timezone` (IANA, default `America/Los_Angeles`)
- `event_spl`, `event_aspl`, `adult_leader` (all FK → users — managed in gear app, NOT overwritten by TT sync)
- `tt_event_id` (INTEGER UNIQUE) — TroopTrack event ID; used as upsert key during sync
- `description` (TEXT) — synced from TroopTrack; images stripped
- `created_at`

### `event_types` — event category lookup
- `id`, `type` (VARCHAR 50, UNIQUE), `color` (hex)
- Current rows: Day Outing (1), Overnight Outing (2), Meeting (3), Court of Honor (4), Service Project (5), Patrol Leader Council (6)

### `event_types_mapping` — TroopTrack → gear event type mapping
- `tt_event_type` (TEXT PK) — TroopTrack event type string (e.g. "Campout", "Meeting")
- `event_id` (FK → event_types) — corresponding gear event type ID
- Used by `sync-trooptrack-events.js` to translate TT types; unknown types fall back to Day Outing

### `rsvp_types` — RSVP response lookup
- `id`, `response` (TEXT UNIQUE)
- Rows: 1=Going, 2=Not Going, 3=No Response

### `rsvp` — event attendance (synced from TroopTrack)
- `id`, `user_id` (FK → users), `event_id` (FK → events), `rsvp_type_id` (FK → rsvp_types)
- UNIQUE on (user_id, event_id)
- Sync writes only `rsvp_type_id=1` (Going); full replace per event on each sync run

### `users` / `roles` — user roster
- `id`, `email`, `first_name`, `last_name`, `role_id` → `roles(name)`
- `tt_user_id` (TEXT, nullable) — TroopTrack profile ID from `/manage/users/{id}`; used to match RSVP attendees

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

## Sync Scripts (shell, run from repo root)
- `scripts/sync-trooptrack-users.sh` — one-way TT→Supabase user sync; upserts users by email with name-match fallback for placeholder emails
- `scripts/sync-trooptrack-events.sh` — one-way TT→Supabase event sync; scrapes today+60d window; upserts events by `tt_event_id` (name-match fallback for pre-existing events); fully replaces RSVPs (Going only) per event; interactive confirm before writing; requires `TROOPTRACK_USERNAME` + `TROOPTRACK_PASSWORD` in `backend/.env`

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

## Routes

HashRouter (`#/`). All authenticated routes are wrapped in `ProtectedRoute > DesktopLayoutRoute` in `App.jsx`.

| Path | Component | Auth |
|------|-----------|------|
| `/` | `SmartRoot` → `/home` if authed, else `LoginPage` | public |
| `/auth/verify` | `VerifyPage` | public |
| `/home` | `HomePage` | any |
| `/gear` | `Landing` | any |
| `/events` | `OutingsPage` | any |
| `/calendar` | `CalendarPage` | any |
| `/categories` | `Categories` | checkout |
| `/items/:category` | `Items` | checkout |
| `/cart` | `Cart` | checkout |
| `/outing-selection` | `OutingSelection` | checkout |
| `/checkout-options` | `CheckoutOptions` | checkout |
| `/success` | `Success` | checkout |
| `/checkin` | `Checkin` | checkin |
| `/reservations` | `Reservations` | any |
| `/reservation-success` | `ReservationSuccess` | any |
| `/manage` | `ManageTables` | any |
| `/manage/members` | `ManageMembers` | admin |
| `/manage-inventory` | `ManageInventoryDashboard` | QM |
| `/manage-inventory/view` | `ViewInventory` | QM |
| `/manage-inventory/view-logs` | `ViewTransactionLog` | QM |
| `/manage-inventory/item-log/:itemId` | `ItemTransactionLog` | QM |
| `/manage-inventory/categories` | `ManageCategories` | QM |
| `/manage-inventory/add-category` | `AddCategory` | QM |
| `/manage-inventory/edit-category/:classCode` | `EditCategory` | QM |

## Roles & Permissions (`frontend/src/utils/permissions.js`)

Roles: `Admin` (role_id 1), `QM` (role_id 2), `Basic` (role_id 3).

| Permission | Roles |
|------------|-------|
| `canCheckout` | Admin, QM |
| `canCheckin` | Admin, QM |
| `canManageInventory` | Admin, QM |
| `canManageMembers` | Admin only |

## Theme Colors (`frontend/src/index.css` `@theme`)

| Token | Hex | Use |
|-------|-----|-----|
| `scout-blue` | `#1E398A` | Primary — headers, buttons, today indicator |
| `scout-green` | `#28a745` | Success, check-in |
| `scout-red` | `#DB364C` | Destructive actions |
| `scout-orange` | `#ff6b35` | Reserve flow |
| `scout-teal` | `#0f766e` | Calendar / schedule |
| `scout-purple` | `#7c3aed` | Admin / manage |

## Custom CSS Classes (`frontend/src/index.css`)

**Layout**
- `.h-screen-small` — `100dvh` (dynamic viewport, safe for mobile browser chrome)
- `.header` — sticky top bar (glassy blue tint, flex row, safe-area padding)
- `.header .back-button` — circular glassy back arrow

**Buttons / inputs**
- `.form-input` — standard text/select/date field (2px border, 0.75rem padding, 44px min-height)
- `.search-input` — pill-shaped search field
- `.touch-target` — min 44×44px touch area
- `.btn-primary` / `.btn-secondary` / `.btn-success` / `.btn-danger` — glassy color variants
- `.btn-primary-pill` — rounded-full scout-blue pill (Save / Create actions)

**Modals** (see pattern below)
- `.modal-dialog-overlay-root` — `fixed inset-0 z-100`
- `.modal-dialog-backdrop-surface` — dimmed backdrop (rgba 0.45)
- `.modal-dialog-backdrop-enter` / `.modal-dialog-backdrop-exit` — fade in/out
- `.modal-dialog-panel-enter` / `.modal-dialog-panel-exit` — slide+scale in/out (0.28–0.34s)
- `.modal-dialog-panel-exit-added` — special lift+green-glow exit (category "add to cart")

**Animation**
- `.page-main-animate` — page content fade+slide in (used by `AnimateMain`)
- `.cart-badge-bump-animate` — cart badge bounce when item added
- `.fly-to-cart-tag-animate` — "+N" flies toward cart badge (uses `--fly-dx`/`--fly-dy` CSS vars set from JS)

## Patterns

### Standard mobile page layout
```jsx
<div className="h-screen-small flex flex-col bg-gray-100">
  <div className="header">
    <Link to="/home" className="back-button no-underline">←</Link>
    <h1>Page Title</h1>
    <HeaderProfileMenu />
  </div>
  <AnimateMain className="flex min-h-0 flex-1 flex-col overflow-hidden">
    {/* scrollable content */}
  </AnimateMain>
</div>
```
Desktop pages use `useDesktopHeader({ title, subtitle })` instead of the header div, and skip `AnimateMain`. Check `useIsDesktop()` to branch.

### Modal pattern (enter + exit animation)
All modals follow this pattern — the parent keeps the modal mounted until `onClose()` fires after the exit animation completes:
```jsx
const [exiting, setExiting] = useState(false);
const exitHandledRef = useRef(false);

const finishClose = useCallback(() => {
  if (exitHandledRef.current) return;
  exitHandledRef.current = true;
  onClose();
}, [onClose]);

const requestClose = useCallback(() => {
  if (exiting) return;
  exitHandledRef.current = false;
  setExiting(true);
}, [exiting]);

// Fallback timer in case animationend doesn't fire
useEffect(() => {
  if (!exiting) return;
  const id = setTimeout(finishClose, 450);
  return () => clearTimeout(id);
}, [exiting, finishClose]);

// JSX
<div className="modal-dialog-overlay-root">
  <div className={`modal-dialog-backdrop-surface ${exiting ? 'modal-dialog-backdrop-exit' : 'modal-dialog-backdrop-enter'}`}
       onPointerDown={requestClose} />
  <div className={`modal-dialog-panel-enter ... ${exiting ? 'modal-dialog-panel-exit' : 'modal-dialog-panel-enter'}`}
       onAnimationEnd={(e) => { if (exiting && e.target === e.currentTarget) finishClose(); }}>
    {/* content */}
  </div>
</div>
```

### API fetch pattern
```js
const { getData, postData, patchData } = useInventory();
// GET
const items = await getData('/inventory');
// POST — raw fetch is used for mutations in pages that need full control:
const resp = await fetch(`${getApiBaseUrl()}/events`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error); }
```
`getData` deduplicates in-flight requests via a module-level promise cache. Always use `credentials: 'include'` on every fetch.

### Date handling
- All dates stored and passed as `YYYY-MM-DD` strings
- Parse to local `Date` with `parseTroopApiDateToLocalDate(s)` from `utils/outingFormat.js` (handles both `DATE` and ISO strings from the API)
- `OutingDatePicker` is a thin `<input type="date">` wrapper — value/onChange use `YYYY-MM-DD`

## Key Files

### Frontend pages (`frontend/src/pages/`)
| File | Purpose |
|------|---------|
| `App.jsx` | Router setup — all route definitions live here |
| `Landing.jsx` | App entry / landing screen |
| `LoginPage.jsx` | Magic-link email form |
| `VerifyPage.jsx` | Token verification after clicking email link |
| `home/HomeDashboard.jsx` | Main home dashboard after login |
| `Categories.jsx` | Category picker (checkout flow step 1) |
| `Items.jsx` | Item picker within a category (checkout flow step 2) |
| `Cart.jsx` | Cart + scout info form (checkout flow step 3) |
| `Checkout.jsx` | Checkout confirmation screen |
| `CheckoutOptions.jsx` | Checkout vs. reserve selector |
| `OutingSelection.jsx` | Outing picker during checkout |
| `Checkin.jsx` | Check-in flow |
| `Reservations.jsx` | Reservation flow |
| `CalendarPage.jsx` | Monthly calendar view — renders event pills, today indicator (filled blue circle) |
| `OutingsPage.jsx` | Events list + create/edit/delete form modal; `handleFormChange` clamps start↔end dates |
| `manage-inventory/ManageInventoryDashboard.jsx` | QM hub — links to inventory, transactions, categories |
| `manage-inventory/ViewInventory.jsx` | All items grouped by category with stats |
| `manage-inventory/ViewTransactionLog.jsx` | Transaction history table |
| `manage-inventory/AddItemForm.jsx` / `EditItemForm.jsx` | Item CRUD forms |
| `manage-inventory/AddCategory.jsx` / `EditCategory.jsx` / `ManageCategories.jsx` | Category CRUD |
| `manage-inventory/SelectCategory.jsx` | Category picker for item forms |
| `manage-inventory/ItemTransactionLog.jsx` | Per-item transaction history |
| `manage-members/ManageMembers.jsx` / `AddMember.jsx` / `EditMember.jsx` | Roster management |

### Frontend components (`frontend/src/components/`)
| File | Purpose |
|------|---------|
| `CalendarEventModal.jsx` | Event detail bottom sheet (gear checked out, leaders, coming-soon sections) |
| `CalendarDayModal.jsx` | Day tap → list of events for that day |
| `OutingDatePicker.jsx` | Thin `<input type="date">` wrapper (YYYY-MM-DD ↔ native picker) |
| `OutingListCard.jsx` | Event card in the outings list; edit/delete actions |
| `CartCheckoutModal.jsx` | Checkout confirmation modal |
| `CartCheckinModal.jsx` | Check-in confirmation modal |
| `CartReserveModal.jsx` | Reserve confirmation modal |
| `CheckoutOutingModal.jsx` | Outing picker used during checkout flow |
| `CheckinOutingModal.jsx` | Outing picker used during check-in flow |
| `ReservationPickerModal.jsx` | Outing picker for reservations |
| `CategoryItemsPanel.jsx` | Item list within a category (expandable panel) |
| `RosterSearchField.jsx` | Searchable user picker (used in event form, check-in, etc.) |
| `HomeHeroCarousel.jsx` | Landing hero image carousel |
| `AnimateMain.jsx` | Page transition wrapper (`<AnimateMain>`) |
| `DesktopShell.jsx` | Desktop sidebar + main layout shell |
| `DesktopLayoutRoute.jsx` | Route wrapper that activates desktop shell |
| `SegmentedControl.jsx` | Tab/segment switcher (Upcoming / Past, etc.) |
| `SearchableSegmentedToolbar.jsx` | Toolbar combining search + segmented control |
| `Toast.jsx` | Toast notification component |
| `TransactionCard.jsx` | Single transaction history card |
| `UpcomingEvents.jsx` | Upcoming events widget for dashboard |
| `HeaderProfileMenu.jsx` | Profile avatar + logout dropdown in mobile header |
| `ProtectedRoute.jsx` | Auth gate — redirects unauthenticated users to login |
| `ConnectionError.jsx` | Network/API error display |

### Frontend context (`frontend/src/context/`)
| File | Purpose |
|------|---------|
| `AuthContext.jsx` | User auth state, `useAuth()` hook, login/logout |
| `CartContext.jsx` | Cart items, `checkoutEvent`, `reservationMeta` |
| `DesktopHeaderContext.jsx` | Per-page desktop header title/subtitle via `useDesktopHeader()` |

### Frontend utilities
| File | Purpose |
|------|---------|
| `hooks/useInventory.js` | All API fetching via `getData()` / `postData()` etc. |
| `hooks/useIsDesktop.js` | Breakpoint hook — returns true on sm+ |
| `utils/outingFormat.js` | `parseTroopApiDateToLocalDate()` — DATE/ISO → local Date |
| `utils/outingFilters.js` | `filterAndSortOutings()` — upcoming vs. past logic |
| `utils/eventLabels.js` | Leader label helpers (`primaryLeaderLabel`, etc.) |
| `config/apiBaseUrl.js` | `getApiBaseUrl()` — resolves API URL for dev vs. prod |

### Backend routes (`backend/routes/`)
| File | Prefix | Notes |
|------|--------|-------|
| `auth.js` | `/api/auth` | request-link, verify, me, logout |
| `events.js` | `/api/events` | CRUD for outings/events + event types + users list |
| `checkout.js` | `/api/checkout` | Checkout items to a scout |
| `checkin.js` | `/api/checkin` | Check items back in |
| `reservations.js` | `/api/reservations` | Create/list/delete reservations |
| `inventory.js` | `/api/inventory` | Read inventory (public read, auth for write) |
| `manage-inventory.js` | `/api/manage-inventory` | QM-only item/category mutations |
| `manage-members.js` | `/api/manage-members` | QM-only roster mutations |
| `metadata.js` | `/api/metadata` | Category list for UI dropdowns |
