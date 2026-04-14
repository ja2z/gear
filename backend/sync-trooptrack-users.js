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
// Scrape Members page → Map<normalizedName, troopTrackUserId>
// ---------------------------------------------------------------------------
async function scrapeMembersPage(client) {
  // The /plan page has a Quick Nav link labelled "Members"
  let planResp;
  try {
    planResp = await client.get(`${TT_BASE}/plan`);
  } catch (err) {
    console.warn('Warning: Could not fetch /plan — DOBs will not be scraped');
    return new Map();
  }
  const $plan = cheerio.load(planResp.data);

  let membersUrl = null;
  $plan('a').each((_, el) => {
    if (/^members$/i.test($plan(el).text().trim())) {
      membersUrl = $plan(el).attr('href');
    }
  });

  if (!membersUrl) {
    console.warn('Warning: Could not find Members link on /plan — DOBs will not be scraped');
    return new Map();
  }
  if (!membersUrl.startsWith('http')) membersUrl = TT_BASE + membersUrl;

  console.log('Fetching members page...');
  let membersResp;
  try {
    membersResp = await client.get(membersUrl);
  } catch (err) {
    console.warn(`Warning: Could not fetch members page (${err.message}) — DOBs will not be scraped`);
    return new Map();
  }
  const $m = cheerio.load(membersResp.data);

  const nameToId = new Map();
  $m('a[href*="/manage/users/"]').each((_, el) => {
    const href = $m(el).attr('href') || '';
    const match = href.match(/\/manage\/users\/(\d+)/);
    if (!match) return;
    const userId = match[1];
    const name = $m(el).text().replace(/\s+/g, ' ').trim().toLowerCase();
    if (name && !nameToId.has(name)) {
      nameToId.set(name, userId);
    }
  });

  console.log(`Found ${nameToId.size} scout(s) on members page.`);
  return nameToId;
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

  // 3. Scrape Members page to identify scouts and get their TroopTrack user IDs
  const scoutNameToId = await scrapeMembersPage(client);

  // 4. Fetch DOBs for each scout found in the directory
  const dobByNormName = new Map(); // normalizedName → 'YYYY-MM-DD' | null
  const scoutMatches = []; // { normName, userId } for progress reporting

  for (const u of ttUsers.values()) {
    const normName = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    const userId = scoutNameToId.get(normName);
    if (userId) scoutMatches.push({ normName, userId });
  }

  if (scoutMatches.length > 0) {
    console.log(`Fetching DOBs for ${scoutMatches.length} scout(s)...`);
    for (let i = 0; i < scoutMatches.length; i++) {
      const { normName, userId } = scoutMatches[i];
      const dob = await scrapeUserDob(client, userId);
      dobByNormName.set(normName, dob);
      process.stdout.write(`\r  ${i + 1}/${scoutMatches.length} done`);
      if (i < scoutMatches.length - 1) await sleep(DOB_FETCH_DELAY_MS);
    }
    process.stdout.write('\n');
  }

  // 5. Fetch existing Supabase users
  const { data: dbUsers, error: dbErr } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role_id');
  if (dbErr) throw new Error(`Supabase fetch failed: ${dbErr.message}`);

  // Primary match index: email → db row
  const existingByEmail = new Map(dbUsers.map(u => [u.email.toLowerCase().trim(), u]));

  // Secondary match index: full name → db row, for placeholder emails only
  const normName = u => `${u.first_name} ${u.last_name}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const placeholderByName = new Map(
    dbUsers
      .filter(u => u.email.toLowerCase().endsWith('@placeholder.t222.org'))
      .map(u => [normName(u), u])
  );

  const ttEmails = new Set(ttUsers.keys()); // already lowercased during scrape

  // 6. Classify each TroopTrack user
  const toInsert   = []; // new — no match in DB
  const toUpdate   = []; // matched by email
  const toFixEmail = []; // matched by name to a placeholder row → email will change

  for (const u of ttUsers.values()) {
    if (existingByEmail.has(u.email)) {
      toUpdate.push({ tt: u, db: existingByEmail.get(u.email) });
    } else {
      const key = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
      const dbMatch = placeholderByName.get(key);
      if (dbMatch) {
        toFixEmail.push({ tt: u, db: dbMatch });
      } else {
        toInsert.push(u);
      }
    }
  }

  // DB-only: not matched by email and not matched by name (placeholder)
  const fixedDbIds = new Set(toFixEmail.map(({ db }) => db.id));
  const dbOnly = dbUsers.filter(u => {
    if (ttEmails.has(u.email.toLowerCase().trim())) return false; // matched by email
    if (fixedDbIds.has(u.id)) return false;                       // matched by name
    return true;
  });

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
  console.log(`EXISTING (update name, preserve role) : ${toUpdate.length}`);
  for (const { tt, db } of toUpdate) {
    const roleName = ROLE_NAMES[db.role_id] ?? db.role_id;
    console.log(`  ~ ${(tt.firstName + ' ' + tt.lastName).padEnd(PAD)} ${tt.email}  [role: ${roleName}]`);
  }

  console.log('');
  console.log(`PLACEHOLDER EMAIL FIX (name-matched, email will update) : ${toFixEmail.length}`);
  for (const { tt, db } of toFixEmail) {
    const roleName = ROLE_NAMES[db.role_id] ?? db.role_id;
    console.log(`  * ${(tt.firstName + ' ' + tt.lastName).padEnd(PAD)} ${db.email}  →  ${tt.email}  [role: ${roleName}]`);
  }

  console.log('');
  console.log(`IN SUPABASE ONLY (not in TroopTrack — no action) : ${dbOnly.length}`);
  for (const u of dbOnly) {
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
    const normName = `${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (scoutNameToId.has(normName)) {
      // Scout: use scraped DOB if we got one; otherwise omit (preserves existing DB value)
      return dobByNormName.get(normName) ?? undefined;
    }
    return '1970-01-01'; // Adult
  };

  // 9a. Batch upsert: new inserts + email-matched updates
  const upsertRows = [
    ...toInsert.map(u => {
      const dob = resolveDob(u.firstName, u.lastName);
      const row = { first_name: u.firstName, last_name: u.lastName, email: u.email, role_id: 3 };
      if (dob !== undefined) row.dob = dob;
      return row;
    }),
    ...toUpdate.map(({ tt, db }) => {
      const dob = resolveDob(tt.firstName, tt.lastName);
      const row = { first_name: tt.firstName, last_name: tt.lastName, email: tt.email, role_id: db.role_id };
      if (dob !== undefined) row.dob = dob;
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
    const update = { first_name: tt.firstName, last_name: tt.lastName, email: tt.email };
    if (dob !== undefined) update.dob = dob;
    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', db.id);
    if (error) throw new Error(`Failed to fix email for ${tt.firstName} ${tt.lastName}: ${error.message}`);
  }

  console.log(`\nDone. Inserted: ${toInsert.length}, Updated: ${toUpdate.length}, Email fixed: ${toFixEmail.length}`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
