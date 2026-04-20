'use strict';

require('dotenv').config();
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TT_BASE = 'https://t222.trooptrack.com';
const DOB_FETCH_DELAY_MS = 400; // polite delay between profile page requests
// Exact URL as provided — Rails checkbox pattern sends 0 then 1 for checked boxes
const PRINT_URL =
  `${TT_BASE}/communicate/users/print_directory` +
  `?check_all=1` +
  `&custom_directory%5Bleadership%5D=0&custom_directory%5Bleadership%5D=1` +
  `&custom_directory%5Bpatrol_ids%5D%5B%5D=` +
  `&custom_directory%5Ball_members%5D=0&custom_directory%5Ball_members%5D=1` +
  `&custom_directory%5Bphotos%5D=0` +
  `&printable_html=true` +
  `&commit=Print`;

const ROLE_NAMES = { 1: 'Admin', 2: 'QM', 3: 'Basic' };

// ---------------------------------------------------------------------------
// HTTP client with cookie jar
// ---------------------------------------------------------------------------
function makeClient() {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; gear-sync/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
  );
  return client;
}

// ---------------------------------------------------------------------------
// TroopTrack auth
// ---------------------------------------------------------------------------
async function login(client) {
  const username = process.env.TROOPTRACK_USERNAME;
  const password = process.env.TROOPTRACK_PASSWORD;
  if (!username || !password) {
    throw new Error('TROOPTRACK_USERNAME and TROOPTRACK_PASSWORD must be set in .env');
  }

  // 1. GET login page → extract CSRF token
  let loginPage;
  try {
    loginPage = await client.get(`${TT_BASE}/user_account_session/new`);
  } catch (err) {
    throw new Error(`Failed to reach TroopTrack login page (HTTP ${err.response?.status}): ${err.message}`);
  }
  const $ = cheerio.load(loginPage.data);
  const csrfToken = $('input[name="authenticity_token"]').first().val();
  if (!csrfToken) throw new Error('Could not find authenticity_token on login page');

  // 2. POST credentials (Rails method override: form POSTs but sends _method=put)
  const params = new URLSearchParams();
  params.append('_method', 'put');
  params.append('authenticity_token', csrfToken);
  params.append('user_account_session[login]', username);
  params.append('user_account_session[password]', password);
  params.append('user_account_session[remember_me]', '0');
  params.append('commit', 'Log In');

  const resp = await client.post(`${TT_BASE}/user_account_session`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 5,
    validateStatus: s => s < 400,
  });

  // On failure TroopTrack redirects back to the login page
  const finalPath = resp.request?.path ?? '';
  if (finalPath.includes('user_account_session')) {
    const $r = cheerio.load(resp.data);
    const alert = $r('.alert, .flash, [class*="error"], [class*="alert"]').first().text().trim();
    throw new Error(`TroopTrack login failed. ${alert || 'Check credentials.'}`);
  }

  console.log('Logged in to TroopTrack.');
}

// ---------------------------------------------------------------------------
// Scrape directory
// ---------------------------------------------------------------------------
function scrapeDirectory(html) {
  const $ = cheerio.load(html);
  const seen = new Map(); // email (lowercase) → { firstName, lastName, email }
  let skippedCount = 0;

  $('.roster_entry').each((_, el) => {
    // Only process left_320 entries (the All Adults / All Scouts sections).
    // The Adult Leadership fieldset uses left_300 — skip those entirely.
    const cols = $(el).find('.left_320');
    if (!cols.length) return;

    const rawName = $(cols[0]).find('.name').text().replace(/\s+/g, ' ').trim();
    const email = $(cols[1]).find('.value').text().trim().toLowerCase();

    if (!email || !rawName.includes(' ')) {
      skippedCount++;
      return;
    }

    const spaceIdx = rawName.indexOf(' ');
    const firstName = rawName.substring(0, spaceIdx).trim();
    const lastName = rawName.substring(spaceIdx + 1).trim();

    if (!seen.has(email)) {
      seen.set(email, { firstName, lastName, email });
    }
  });

  return { users: seen, skippedCount };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Convert TroopTrack date strings to YYYY-MM-DD. Returns null if unrecognised. */
function parseTtDate(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  // MM/DD/YYYY or M/D/YYYY
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, month, day, year] = mdy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

// ---------------------------------------------------------------------------
// Scrape Members modal → { nameToId: Map<normalizedName, ttUserId>, scoutNames: Set }
// Quick Nav "Members" uses data-remote=true → /powerbars/user returns JS that
// injects modal HTML via $('#the_modal').html("..."). We fetch it as AJAX.
// Names in the modal are "Last, First" — we normalize to "first last".
// ---------------------------------------------------------------------------
async function scrapeMembersPage(client) {
  let jsResp;
  try {
    jsResp = await client.get(`${TT_BASE}/powerbars/user`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: '*/*' },
    });
  } catch (err) {
    console.warn(`Warning: Could not fetch members modal (${err.message}) — TT IDs and DOBs will not be scraped`);
    return { nameToId: new Map(), scoutNames: new Set() };
  }

  // Extract the HTML string from inside: $('#the_modal').html("...escaped HTML...");
  const js = typeof jsResp.data === 'string' ? jsResp.data : JSON.stringify(jsResp.data);
  const htmlMatch = js.match(/\$\('#the_modal'\)\.html\("([\s\S]+?)"\)/);
  if (!htmlMatch) {
    console.warn('Warning: Unexpected members modal format — TT IDs and DOBs will not be scraped');
    return { nameToId: new Map(), scoutNames: new Set() };
  }

  const rawHtml = htmlMatch[1]
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

  const $ = cheerio.load(rawHtml);

  const nameToId = new Map();  // normalized "first last" → tt_user_id (all members)
  const scoutNames = new Set(); // normalized names of scouts only

  let currentSection = null;
  $('h3, a[href*="/manage/users/"]').each((_, el) => {
    if (el.tagName === 'h3') {
      currentSection = $(el).text().trim().toLowerCase();
      return;
    }
    const href = $(el).attr('href') || '';
    const match = href.match(/\/manage\/users\/(\d+)/);
    if (!match) return;
    const ttId = match[1];
    const raw = $(el).text().replace(/\s+/g, ' ').trim();
    const commaIdx = raw.indexOf(',');
    let normName;
    if (commaIdx !== -1) {
      const last = raw.substring(0, commaIdx).trim();
      const first = raw.substring(commaIdx + 1).trim();
      normName = `${first} ${last}`.toLowerCase().replace(/\s+/g, ' ');
    } else {
      normName = raw.toLowerCase().replace(/\s+/g, ' ');
    }
    if (!normName || nameToId.has(normName)) return;
    nameToId.set(normName, ttId);
    if (currentSection === 'scouts') scoutNames.add(normName);
  });

  console.log(`Found ${nameToId.size} member(s) on members modal (${scoutNames.size} scouts, ${nameToId.size - scoutNames.size} adults).`);
  return { nameToId, scoutNames };
}

// ---------------------------------------------------------------------------
// Scrape DOB from a single user profile page
// ---------------------------------------------------------------------------
async function scrapeUserDob(client, userId) {
  let resp;
  try {
    resp = await client.get(`${TT_BASE}/manage/users/${userId}`);
  } catch (err) {
    return null;
  }
  const $ = cheerio.load(resp.data);

  let raw = null;

  // Pattern 1: <dt>Birth Date</dt><dd>…</dd>
  $('dt').each((_, el) => {
    if (raw) return;
    if ($(el).text().toLowerCase().includes('birth')) {
      raw = $(el).next('dd').text().trim() || null;
    }
  });

  // Pattern 2: table cell label next to value
  if (!raw) {
    $('th, td').each((_, el) => {
      if (raw) return;
      if ($(el).text().toLowerCase().includes('birth')) {
        raw = $(el).next('td').text().trim() || $(el).siblings('td').first().text().trim() || null;
      }
    });
  }

  // Pattern 3: any element whose text is exactly "DOB" or "Date of Birth"
  if (!raw) {
    $('*').each((_, el) => {
      if (raw) return;
      const t = $(el).clone().children().remove().end().text().trim().toLowerCase();
      if (t === 'dob' || t === 'date of birth') {
        raw = $(el).next().text().trim() || null;
      }
    });
  }

  return parseTtDate(raw);
}

// ---------------------------------------------------------------------------
// Prompt helper
// ---------------------------------------------------------------------------
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  // 1. Login + fetch directory
  const client = makeClient();
  await login(client);

  console.log('Fetching directory...');
  let html;
  try {
    const resp = await client.get(PRINT_URL);
    html = resp.data;
  } catch (err) {
    const status = err.response?.status;
    const url = err.config?.url ?? PRINT_URL;
    throw new Error(`Failed to fetch directory (HTTP ${status}): ${url}`);
  }

  // 2. Parse directory
  const { users: ttUsers, skippedCount } = scrapeDirectory(html);

  // 3. Scrape Members modal — get TT user IDs for all members + identify scouts
  const { nameToId, scoutNames } = await scrapeMembersPage(client);

  // 4. Fetch DOBs for each scout found in the directory
  const dobByNormName = new Map(); // normalizedName → 'YYYY-MM-DD' | null
  const scoutMatches = []; // { normName, userId } for progress reporting

  for (const u of ttUsers.values()) {
    const normName = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    const userId = nameToId.get(normName);
    if (userId && scoutNames.has(normName)) scoutMatches.push({ normName, userId });
  }

  if (scoutMatches.length > 0) {
    const DOB_CONCURRENCY = 4;
    console.log(`Fetching DOBs for ${scoutMatches.length} scout(s) (${DOB_CONCURRENCY} at a time)...`);
    let doneCount = 0;
    for (let i = 0; i < scoutMatches.length; i += DOB_CONCURRENCY) {
      const batch = scoutMatches.slice(i, i + DOB_CONCURRENCY);
      const results = await Promise.all(batch.map(({ userId }) => scrapeUserDob(client, userId)));
      batch.forEach(({ normName }, j) => dobByNormName.set(normName, results[j]));
      doneCount += batch.length;
      process.stdout.write(`\r  ${doneCount}/${scoutMatches.length} done`);
      if (i + DOB_CONCURRENCY < scoutMatches.length) await sleep(DOB_FETCH_DELAY_MS);
    }
    process.stdout.write('\n');
  }

  // 5. Fetch existing Supabase users
  const { data: dbUsers, error: dbErr } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role_id, tt_user_id');
  if (dbErr) throw new Error(`Supabase fetch failed: ${dbErr.message}`);

  // Match indexes
  const existingByTtId  = new Map(dbUsers.filter(u => u.tt_user_id).map(u => [u.tt_user_id, u]));
  const existingByEmail = new Map(dbUsers.map(u => [u.email.toLowerCase().trim(), u]));
  const dbNormName = u => `${u.first_name} ${u.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const placeholderByName = new Map(
    dbUsers
      .filter(u => u.email.toLowerCase().endsWith('@placeholder.t222.org'))
      .map(u => [dbNormName(u), u])
  );

  // 6. Classify each TroopTrack user
  // Match priority: tt_user_id → email → placeholder name → insert
  const toInsert   = []; // new — no match in DB
  const toUpdate   = []; // matched; email unchanged → batch upsert on email conflict
  const toFixEmail = []; // matched; email will change → update by id

  const EXCLUDED_EMAILS = new Set([
    'medforms@t222.org',
    'rzghosh@gmail.com',
    'williampknox@gmail.com',
    'krisdelislecpa@gmail.com',
    'aawaitzjr@gmail.com',
  ]);

  for (const u of ttUsers.values()) {
    if (EXCLUDED_EMAILS.has(u.email)) continue;
    const key = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    const ttId = nameToId.get(key);

    const dbByTtId = ttId ? existingByTtId.get(ttId) : undefined;
    if (dbByTtId) {
      // Matched by tt_user_id — check if email also matches or has drifted
      if (dbByTtId.email.toLowerCase().trim() === u.email) {
        toUpdate.push({ tt: u, db: dbByTtId, via: 'tt_id' });
      } else {
        toFixEmail.push({ tt: u, db: dbByTtId, via: 'tt_id' }); // email changed
      }
    } else if (existingByEmail.has(u.email)) {
      toUpdate.push({ tt: u, db: existingByEmail.get(u.email), via: 'email' });
    } else {
      const dbMatch = placeholderByName.get(key);
      if (dbMatch) {
        toFixEmail.push({ tt: u, db: dbMatch, via: 'name' });
      } else {
        toInsert.push(u);
      }
    }
  }

  // Second pass: stamp tt_user_id on DB users that the main loop never reached
  // because they have no email in TroopTrack (e.g. scouts without an email address).
  // These appear in the members modal with a tt_user_id but not in the print directory.
  const alreadyMatchedDbIds = new Set([...toUpdate, ...toFixEmail].map(({ db }) => db.id));
  const toStampTtId = [];
  for (const [normName, ttId] of nameToId) {
    if (existingByTtId.has(ttId)) continue; // already has tt_user_id in DB
    const dbMatch = dbUsers.find(u =>
      !alreadyMatchedDbIds.has(u.id) &&
      !u.tt_user_id &&
      `${u.first_name} ${u.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim() === normName
    );
    if (dbMatch) toStampTtId.push({ db: dbMatch, ttId, normName });
  }

  // DB-only: any row not matched by any path.
  // Also exclude users who already have a tt_user_id that's still in the modal
  // (e.g. not in print directory but previously synced) — they're accounted for.
  const modalTtIds = new Set(nameToId.values());
  const matchedDbIds = new Set([
    ...[...toUpdate, ...toFixEmail, ...toStampTtId].map(({ db }) => db.id),
    ...dbUsers.filter(u => u.tt_user_id && modalTtIds.has(u.tt_user_id)).map(u => u.id),
  ]);
  const dbOnly = dbUsers.filter(u => !matchedDbIds.has(u.id));

  // 7. Reconciliation report
  const PAD = 28;
  console.log('\n=== TroopTrack → Supabase Reconciliation ===\n');
  console.log(`Scraped from TroopTrack  : ${ttUsers.size + skippedCount}`);
  console.log(`Skipped (no email/name)  : ${skippedCount}`);
  console.log('');

  console.log(`NEW  (will insert)       : ${toInsert.length}`);
  for (const u of toInsert) {
    console.log(`  + ${(u.firstName + ' ' + u.lastName).padEnd(PAD)} ${u.email}`);
  }

  console.log('');
  console.log(`EXISTING (update, preserve role) : ${toUpdate.length}`);
  for (const { tt, db, via } of toUpdate) {
    const roleName = ROLE_NAMES[db.role_id] ?? db.role_id;
    console.log(`  ~ ${(tt.firstName + ' ' + tt.lastName).padEnd(PAD)} ${tt.email}  [role: ${roleName}]  [via: ${via}]`);
  }

  console.log('');
  console.log(`EMAIL FIX (matched by ${[...new Set(toFixEmail.map(x => x.via))].join('/')}, email will update) : ${toFixEmail.length}`);
  for (const { tt, db, via } of toFixEmail) {
    const roleName = ROLE_NAMES[db.role_id] ?? db.role_id;
    console.log(`  * ${(tt.firstName + ' ' + tt.lastName).padEnd(PAD)} ${db.email}  →  ${tt.email}  [role: ${roleName}]  [via: ${via}]`);
  }

  console.log('');
  console.log(`TT ID STAMP (in modal, no email, matched by name) : ${toStampTtId.length}`);
  for (const { db, ttId } of toStampTtId) {
    const roleName = ROLE_NAMES[db.role_id] ?? db.role_id;
    const displayName = `${db.first_name} ${db.last_name}`;
    console.log(`  # ${displayName.padEnd(PAD)} tt_user_id=${ttId}  [role: ${roleName}]`);
  }

  // Split dbOnly into duplicates (same name as a matched user → stale row from email case drift)
  // vs genuine orphans (no TT presence at all).
  const matchedNormNames = new Set([
    ...[...toUpdate].map(({ tt }) => `${tt.firstName} ${tt.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim()),
    ...[...toFixEmail].map(({ tt }) => `${tt.firstName} ${tt.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim()),
    ...[...toStampTtId].map(({ db }) => `${db.first_name} ${db.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim()),
  ]);
  const dbDuplicates = dbOnly.filter(u =>
    matchedNormNames.has(`${u.first_name} ${u.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim())
  );
  const dbOrphans = dbOnly.filter(u =>
    !matchedNormNames.has(`${u.first_name} ${u.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim())
  );

  console.log('');
  if (dbDuplicates.length > 0) {
    console.log(`DUPLICATE ROWS (stale email — same name already matched above) : ${dbDuplicates.length}`);
    console.log('  These rows exist because email case drifted between TT and DB. Safe to delete manually.');
    for (const u of dbDuplicates) {
      const roleName = ROLE_NAMES[u.role_id] ?? u.role_id;
      console.log(`  ! ${(u.first_name + ' ' + u.last_name).padEnd(PAD)} ${u.email}  [role: ${roleName}]  [db id: ${u.id}]`);
    }
    console.log('');
  }

  console.log(`IN SUPABASE ONLY (no TroopTrack match — no action) : ${dbOrphans.length}`);
  for (const u of dbOrphans) {
    const roleName = ROLE_NAMES[u.role_id] ?? u.role_id;
    console.log(`  ? ${(u.first_name + ' ' + u.last_name).padEnd(PAD)} ${u.email}  [role: ${roleName}]`);
  }

  console.log('\n============================================\n');

  // 8. Interactive confirm
  const answer = await prompt('Proceed with upsert? (y/N): ');
  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted. No changes written.');
    process.exit(0);
  }

  // Helper: resolve DOB for a user — scouts get scraped DOB (if found), adults get 1970-01-01
  const resolveDob = (firstName, lastName) => {
    const key = `${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (scoutNames.has(key)) {
      return dobByNormName.get(key) ?? undefined;
    }
    return '1970-01-01'; // Adult
  };

  // Helper: resolve TroopTrack user ID
  const resolveTtId = (firstName, lastName) => {
    const key = `${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    return nameToId.get(key) ?? undefined;
  };

  // 9a. Batch upsert: new inserts + email-matched updates
  const upsertRows = [
    ...toInsert.map(u => {
      const dob = resolveDob(u.firstName, u.lastName);
      const ttId = resolveTtId(u.firstName, u.lastName);
      const row = { first_name: u.firstName, last_name: u.lastName, email: u.email, role_id: 3 };
      if (dob !== undefined) row.dob = dob;
      if (ttId !== undefined) row.tt_user_id = ttId;
      return row;
    }),
    ...toUpdate.map(({ tt, db }) => {
      const dob = resolveDob(tt.firstName, tt.lastName);
      const ttId = resolveTtId(tt.firstName, tt.lastName);
      const row = { first_name: tt.firstName, last_name: tt.lastName, email: tt.email, role_id: db.role_id };
      if (dob !== undefined) row.dob = dob;
      if (ttId !== undefined) row.tt_user_id = ttId;
      return row;
    }),
  ];

  if (upsertRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from('users')
      .upsert(upsertRows, { onConflict: 'email' });
    if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
  }

  // 9b. Placeholder email fixes: update by id (email changes so can't upsert on email)
  for (const { tt, db } of toFixEmail) {
    const dob = resolveDob(tt.firstName, tt.lastName);
    const ttId = resolveTtId(tt.firstName, tt.lastName);
    const update = { first_name: tt.firstName, last_name: tt.lastName, email: tt.email };
    if (dob !== undefined) update.dob = dob;
    if (ttId !== undefined) update.tt_user_id = ttId;
    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', db.id);
    if (error) throw new Error(`Failed to fix email for ${tt.firstName} ${tt.lastName}: ${error.message}`);
  }

  // 9c. Stamp tt_user_id for no-email scouts matched by name from modal
  for (const { db, ttId } of toStampTtId) {
    const { error } = await supabase
      .from('users')
      .update({ tt_user_id: ttId })
      .eq('id', db.id);
    if (error) console.error(`Failed to stamp tt_user_id for ${db.first_name} ${db.last_name}: ${error.message}`);
  }

  console.log(`\nDone. Inserted: ${toInsert.length}, Updated: ${toUpdate.length}, Email fixed: ${toFixEmail.length}, TT ID stamped: ${toStampTtId.length}`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
