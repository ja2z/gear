# Scout Troop Gear Management System

## Background
Assistant scout master (ASM) managing troop gear as quartermaster mentor. This app replaces a paper-based gear tracking process with a digital checkout/checkin system.

## Stack
- **Frontend:** Vite + React (mobile-first, Tailwind CSS)
- **Backend:** Express.js / Node.js
- **Database:** Supabase (PostgreSQL) — single source of truth for all reads and writes
- **Hosting:** Render

## Key Constraints
- Mobile-first design is critical — scouts primarily use phones
- No authentication required (future enhancement)
- Budget-conscious; runs on troop's own server

## Data Model

### `items` table — master inventory (one row per unique item)
- `item_id` — unique identifier e.g. `TENT-001`, `BRCAN-032`
- `item_class` — category code e.g. `TENT`, `BRCAN`
- `item_desc` — category long name e.g. "Bear Can"
- `item_num` — 3-digit sequence within class e.g. `001`
- `description` — human-readable item description e.g. "Half Dome 2+"
- `is_tagged` — boolean, true if item has a physical tag
- `condition` — `Usable`, `Not usable`, `Unknown`
- `status` — `In shed`, `Checked out`, `Reserved`, `Missing`, `Out for repair`, `Removed from inventory`
- `in_app` — boolean, whether item appears in checkout flow
- `purchase_date`, `cost`, `notes`
- `checked_out_to`, `checked_out_by`, `check_out_date`, `outing_name`

### `transactions` table — append-only audit trail
- `transaction_id`, `timestamp`, `action` (Check in / Check out)
- `item_id`, `outing_name`, `condition`, `processed_by`, `notes`

### `reservations` table — active gear reservations
- `outing_name` — PRIMARY KEY (links to `items.outing_name` where `status='Reserved'`)
- `reserved_by` — name of person who made the reservation
- `reserved_email` — email for confirmation
- `created_at`

### `metadata` table — gear categories
- `class` — category code (PRIMARY KEY, immutable)
- `class_desc` — display name (UNIQUE, max 22 chars)

## Architecture Decisions

**All reads and writes go directly to Supabase** via `backend/services/supabase-api.js`. There is no sync layer, no SQLite cache, no Google Sheets integration. This replaced an older dual-source architecture.

**Soft delete**: Items are never hard-deleted. Deleting sets `status = "Removed from inventory"`. All inventory queries must filter `WHERE status != 'Removed from inventory'`.

**Immutable identifiers**: `item_class`, `item_num`, and `item_id` cannot be changed after creation. Changing them would break transaction history. Similarly, `class` (category code) in the `metadata` table cannot be changed.

**Item ID generation**: `{CLASS}-{padded 3-digit num}` — next num is derived from `MAX(item_num)` for that class.

## Checkout Flow
Landing → Category Selection → Item Selection → Cart → Scout Info Form → Confirmation

## Manage Inventory Feature
Quartermaster-only section (no auth) accessible from landing page. Supports:
- View inventory (by category with aggregate stats, or by item)
- Add / Edit items
- Soft-delete items (requires typing "delete item" to confirm)
- Add / Edit categories

## Hero Image Optimization

Source PNGs live in `frontend/public/images/`. Pre-generated WebP and LQIP files are committed alongside them (e.g. `IMG_0406.webp`, `IMG_0406.lqip.webp`).

**When adding or replacing images:**
```bash
scripts/pregen-images.sh
```
Then commit the new `.webp` and `.lqip.webp` files. During `vite build`, the plugin copies these pre-generated files instead of running sharp, making Render deploys fast. If a PNG has no committed WebP, the plugin falls back to generating it on the fly (slower but safe).

`npm run dev` does **not** run image optimization at all (`apply: 'build'`).

## Testing Locally
If backend changes are made, restart servers: `scripts/restart-servers.sh`

## Direct Database Access (Supabase)
When DDL or raw SQL is needed (creating tables, indexes, migrations), `psql` is not available in this environment. Use the `pg` npm package from `backend/` with the `DATABASE_URL` from `backend/.env`:

```bash
cd backend
node -e "
const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  await client.query(\`/* your SQL here */\`);
  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
"
```

`pg` may need to be installed first: `npm install pg --save-dev`
