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
const FETCH_DELAY_MS = 400;
const SYNC_DAYS_AHEAD = 60;
const TZ = 'America/Los_Angeles';

const MONTH_NAMES = {
  January:1, February:2, March:3, April:4, May:5, June:6,
  July:7, August:8, September:9, October:10, November:11, December:12,
};

// ---------------------------------------------------------------------------
// HTTP client with cookie jar
// ---------------------------------------------------------------------------
function makeClient() {
  const jar = new CookieJar();
  return wrapper(
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

  let loginPage;
  try {
    loginPage = await client.get(`${TT_BASE}/user_account_session/new`);
  } catch (err) {
    throw new Error(`Failed to reach TroopTrack login page (HTTP ${err.response?.status}): ${err.message}`);
  }
  const $ = cheerio.load(loginPage.data);
  const csrfToken = $('input[name="authenticity_token"]').first().val();
  if (!csrfToken) throw new Error('Could not find authenticity_token on login page');

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

  const finalPath = resp.request?.path ?? '';
  if (finalPath.includes('user_account_session')) {
    const $r = cheerio.load(resp.data);
    const alert = $r('.alert, .flash, [class*="error"], [class*="alert"]').first().text().trim();
    throw new Error(`TroopTrack login failed. ${alert || 'Check credentials.'}`);
  }

  console.log('Logged in to TroopTrack.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Convert a local YYYY-MM-DD + HH:MM (24h) in America/Los_Angeles to UTC ISO string.
 * Mirrors the logic in backend/services/supabase-api.js.
 */
function localToUTC(dateStr, timeStr) {
  if (!dateStr) return null;
  const localDateTimeStr = `${dateStr}T${timeStr || '00:00'}:00`;
  const asUTC = new Date(localDateTimeStr + 'Z');
  if (isNaN(asUTC.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(asUTC);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const h = p.hour === '24' ? '00' : p.hour;
  const localAsUTC = new Date(`${p.year}-${p.month}-${p.day}T${h}:${p.minute}:${p.second}Z`);
  const offsetMs = asUTC.getTime() - localAsUTC.getTime();
  return new Date(asUTC.getTime() + offsetMs).toISOString();
}

/**
 * Parse permission-slip option text into { name, startDate, startTime }.
 * Format: "{name} - {DayName}, {Month} {DD}, {YYYY} at {H}:{MM}{AM|PM}"
 * Returns null if text doesn't match (i.e., it's a user entry, not an event).
 */
function parsePermissionSlipOption(text) {
  // Match from the right: " - Weekday, Month D, YYYY at H:MM(AM|PM)"
  const dateRx = / - (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Za-z]+) (\d{1,2}), (\d{4}) at (\d{1,2}):(\d{2})(AM|PM)$/i;
  const m = text.match(dateRx);
  if (!m) return null;

  const name = text.slice(0, text.length - m[0].length).trim();
  const [, monthName, day, year, hour12str, minute, ampm] = m;
  const month = MONTH_NAMES[monthName];
  if (!month) return null;

  let hour = parseInt(hour12str, 10);
  if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

  const startDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const startTime = `${String(hour).padStart(2,'0')}:${minute}`;
  return { name, startDate, startTime };
}

// ---------------------------------------------------------------------------
// Scraping: permission slip page → event list with IDs
// ---------------------------------------------------------------------------
async function scrapeEventList(client) {
  let resp;
  try {
    resp = await client.get(`${TT_BASE}/plan/permission_slip`);
  } catch (err) {
    throw new Error(`Failed to fetch permission slip page: ${err.message}`);
  }
  const $ = cheerio.load(resp.data);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + SYNC_DAYS_AHEAD);

  const events = [];
  $('select option').each((_, el) => {
    const value = $(el).val();
    const text = $(el).text().trim();
    if (!value || !text) return;

    const parsed = parsePermissionSlipOption(text);
    if (!parsed) return; // user entry, not an event

    const eventDate = new Date(parsed.startDate + 'T00:00:00');
    if (eventDate < today || eventDate > cutoff) return;

    events.push({ ttEventId: parseInt(value, 10), ...parsed });
  });

  return events;
}

// ---------------------------------------------------------------------------
// Scraping: event edit page → endDate, endTime, eventType
// ---------------------------------------------------------------------------
async function scrapeEventEdit(client, ttEventId) {
  let resp;
  try {
    resp = await client.get(`${TT_BASE}/plan/events/${ttEventId}/edit`, {
      validateStatus: s => s < 500,
    });
  } catch (err) {
    return null;
  }
  if (resp.status === 403 || resp.status === 404) return null;

  const $ = cheerio.load(resp.data);

  function fieldVal(...selectors) {
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length) {
        const val = el.val() || el.text().trim();
        if (val) return val.trim();
      }
    }
    return null;
  }

  const endDate = fieldVal(
    'input[name="event[end_date]"]',
    'input[id*="end_date"]',
    'input[name*="end_date"]'
  );

  const endTime = fieldVal(
    'input[name="event[end_time]"]',
    'input[id*="end_time"]',
    'input[name*="end_time"]',
    'select[name*="end_time"]',
    'select[id*="end_time"]'
  ) || assembleTimeFromSelects($, 'end');

  let ttEventType = null;
  const typeSelects = [
    'select[name*="event_type"]',
    'select[name*="activity_type"]',
    'select[id*="event_type"]',
  ];
  for (const sel of typeSelects) {
    const selected = $(`${sel} option:selected`).first().text().trim();
    if (selected) { ttEventType = selected; break; }
  }

  return { endDate, endTime, ttEventType };
}

function assembleTimeFromSelects($, prefix) {
  const hourSel = $(`select[id*="${prefix}"][id*="hour"], select[name*="${prefix}"][name*="hour"]`).first();
  const minSel = $(`select[id*="${prefix}"][id*="minute"], select[name*="${prefix}"][name*="minute"]`).first();
  if (!hourSel.length || !minSel.length) return null;
  const h = (hourSel.find('option:selected').val() || '').toString().padStart(2, '0');
  const m = (minSel.find('option:selected').val() || '').toString().padStart(2, '0');
  return h && m ? `${h}:${m}` : null;
}

// ---------------------------------------------------------------------------
// Scraping: event detail page → description
// ---------------------------------------------------------------------------
async function scrapeEventDescription(client, ttEventId) {
  let resp;
  try {
    resp = await client.get(`${TT_BASE}/plan/events/${ttEventId}`);
  } catch (err) {
    return null;
  }
  const $ = cheerio.load(resp.data);
  $('img').remove();

  // TroopTrack renders description in a Froala editor view inside a card.
  // Structure: h5.card-title "Description" → parent .card-header → sibling .card-body → .fr-view
  let description = null;

  $('h5.card-title, .card-title').each((_, el) => {
    if (description) return;
    if ($(el).text().trim().toLowerCase() === 'description') {
      const body = $(el).closest('.card').find('.card-body').first();
      const text = body.text().replace(/\s+/g, ' ').trim();
      if (text) description = text;
    }
  });

  // Fallback: .fr-view is the Froala editor read-only class
  if (!description) {
    const text = $('.fr-view').first().text().replace(/\s+/g, ' ').trim();
    if (text) description = text;
  }

  return description || null;
}

// ---------------------------------------------------------------------------
// Scraping: user profile page → display name (for debugging unknown IDs)
// ---------------------------------------------------------------------------
async function scrapeUserName(client, ttUserId) {
  try {
    const resp = await client.get(`${TT_BASE}/manage/users/${ttUserId}`, {
      validateStatus: s => s < 500,
    });
    if (resp.status === 403 || resp.status === 404) return `(profile ${resp.status})`;
    const $ = cheerio.load(resp.data);
    // Try h1/h2 heading first, then page title
    const heading = $('h1, h2').first().text().replace(/\s+/g, ' ').trim();
    if (heading && heading.length < 80) return heading;
    return $('title').text().replace(/\s+/g, ' ').trim() || '(unknown)';
  } catch {
    return '(fetch error)';
  }
}

// ---------------------------------------------------------------------------
// Scraping: event_trackers page → confirmed-going tt_user_ids
// ---------------------------------------------------------------------------
async function scrapeEventTrackers(client, ttEventId) {
  let resp;
  try {
    resp = await client.get(`${TT_BASE}/plan/events/${ttEventId}/event_trackers`, {
      validateStatus: s => s < 500,
    });
  } catch (err) {
    console.warn(`Warning: Could not fetch event_trackers for ${ttEventId} — ${err.message}`);
    return [];
  }
  if (resp.status === 403 || resp.status === 404) return [];

  const $ = cheerio.load(resp.data);
  const ttUserIds = new Set();
  const nameByTtId = new Map();
  // Scope to main content only — the nav header contains "Your Profile" links
  // for the logged-in user which are not attendees.
  const content = $('#content-wrapper, #content-container, #main-content, main').first();
  const scope = content.length ? content : $('body');
  scope.find('a[href*="/manage/users/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (text === 'Your Profile') return; // nav link for logged-in user
    const match = href.match(/\/manage\/users\/(\d+)/);
    if (match) {
      ttUserIds.add(match[1]);
      if (text && !nameByTtId.has(match[1])) nameByTtId.set(match[1], text);
    }
  });
  return { ids: Array.from(ttUserIds), nameByTtId };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const client = makeClient();
  await login(client);

  // 1. Get event list from permission slip dropdown (has tt_event_id + name + start date/time)
  console.log('Fetching event list from TroopTrack...');
  const eventStubs = await scrapeEventList(client);
  console.log(`Found ${eventStubs.length} event(s) in today+${SYNC_DAYS_AHEAD}d window.`);
  if (eventStubs.length === 0) {
    console.log('Nothing to sync.');
    process.exit(0);
  }

  // 2. Fetch event type mapping
  const { data: mappingRows, error: mappingErr } = await supabase
    .from('event_types_mapping')
    .select('tt_event_type, event_id');
  if (mappingErr) throw new Error(`Failed to fetch event_types_mapping: ${mappingErr.message}`);
  const typeMapping = new Map(mappingRows.map(r => [r.tt_event_type.toLowerCase().trim(), r.event_id]));

  // 3. Scrape each event's edit page + description + trackers (4 events at a time)
  const SCRAPE_CONCURRENCY = 4;
  const ttEvents = [];
  let doneCount = 0;
  for (let i = 0; i < eventStubs.length; i += SCRAPE_CONCURRENCY) {
    const batch = eventStubs.slice(i, i + SCRAPE_CONCURRENCY);
    const batchResults = await Promise.all(batch.map(stub =>
      Promise.all([
        scrapeEventEdit(client, stub.ttEventId),
        scrapeEventDescription(client, stub.ttEventId),
        scrapeEventTrackers(client, stub.ttEventId),
      ]).then(([editData, description, trackersResult]) => ({ stub, editData, description, trackersResult }))
    ));
    doneCount += batch.length;
    process.stdout.write(`\r  Scraping event details ${doneCount}/${eventStubs.length}...`);
    if (i + SCRAPE_CONCURRENCY < eventStubs.length) await sleep(FETCH_DELAY_MS);

    for (const { stub, editData, description, trackersResult } of batchResults) {
      const goingTtUserIds = trackersResult.ids;
      const trackerNames = trackersResult.nameByTtId;

      if (!editData) {
        console.warn(`\nWarning: Could not fetch edit page for event ${stub.ttEventId} (${stub.name}) — skipping.`);
        continue;
      }

      const ttTypeLower = (editData.ttEventType || '').toLowerCase().trim();
      let eventTypeId = typeMapping.get(ttTypeLower);
      if (!eventTypeId) {
        console.warn(`\nWarning: Unknown TT event type "${editData.ttEventType}" for "${stub.name}" — defaulting to Day Outing.`);
        eventTypeId = 1;
      }

    ttEvents.push({
      ttEventId: stub.ttEventId,
      name: stub.name,
      description,
      startDate: stub.startDate,
      startTime: stub.startTime,
      endDate: editData.endDate,
      endTime: editData.endTime,
      eventTypeId,
      goingTtUserIds,
      trackerNames,
    });
    }
  }
  process.stdout.write('\n');

  // 4. Fetch existing DB state
  const { data: dbEvents, error: dbEventsErr } = await supabase
    .from('events')
    .select('id, name, tt_event_id');
  if (dbEventsErr) throw new Error(`Failed to fetch events: ${dbEventsErr.message}`);

  const byTtId = new Map(dbEvents.filter(e => e.tt_event_id).map(e => [e.tt_event_id, e]));
  const byName = new Map(dbEvents.map(e => [e.name.toLowerCase().trim(), e]));

  const { data: dbUsers, error: dbUsersErr } = await supabase
    .from('users')
    .select('id, tt_user_id')
    .not('tt_user_id', 'is', null);
  if (dbUsersErr) throw new Error(`Failed to fetch users: ${dbUsersErr.message}`);
  const userByTtId = new Map(dbUsers.map(u => [u.tt_user_id, u.id]));

  // 5. Classify events
  const toInsert = [];
  const toUpdate = [];

  for (const ev of ttEvents) {
    let dbMatch = byTtId.get(ev.ttEventId);
    let nameMatched = false;
    if (!dbMatch) {
      dbMatch = byName.get(ev.name.toLowerCase().trim());
      if (dbMatch) nameMatched = true;
    }
    if (dbMatch) {
      toUpdate.push({ tt: ev, db: dbMatch, nameMatched });
    } else {
      toInsert.push(ev);
    }
  }

  // 6. Reconciliation report
  const PAD = 36;
  console.log('\n=== TroopTrack → Gear Event Sync ===\n');
  console.log(`Window            : today + ${SYNC_DAYS_AHEAD} days`);
  console.log(`Scraped events    : ${ttEvents.length}`);
  console.log('');

  console.log(`NEW  (will insert): ${toInsert.length}`);
  for (const ev of toInsert) {
    console.log(`  + ${ev.name.padEnd(PAD)} ${ev.startDate}  [type_id: ${ev.eventTypeId}]  ${ev.goingTtUserIds.length} going`);
  }

  console.log('');
  console.log(`EXISTING (update) : ${toUpdate.length}`);
  for (const { tt, db, nameMatched } of toUpdate) {
    const tag = nameMatched ? ' [name-matched → stamping tt_event_id]' : '';
    console.log(`  ~ ${tt.name.padEnd(PAD)} ${tt.startDate}  [db id: ${db.id}]  ${tt.goingTtUserIds.length} going${tag}`);
  }

  const totalGoing = ttEvents.reduce((n, ev) => n + ev.goingTtUserIds.length, 0);
  // Collect unknown IDs with their display name from the event_trackers page
  const unknownTtIds = new Map(); // ttId → display name
  for (const ev of ttEvents) {
    for (const ttId of ev.goingTtUserIds) {
      if (!userByTtId.has(ttId) && !unknownTtIds.has(ttId)) {
        unknownTtIds.set(ttId, ev.trackerNames.get(ttId) || '(name unavailable)');
      }
    }
  }
  console.log('');
  console.log(`RSVP (Going)      : ${totalGoing} total across ${ttEvents.length} events`);
  if (unknownTtIds.size > 0) {
    console.log(`  Warning: ${unknownTtIds.size} tt_user_id(s) not in users table — will skip:`);
    for (const [id, name] of unknownTtIds) {
      console.log(`    tt_user_id=${id}  →  ${name}`);
    }
    console.log('  Run sync-trooptrack-users.sh first if these are troop members, then re-run this script.');
  }

  console.log('\n=====================================\n');

  // 7. Interactive confirm
  const answer = await prompt('Proceed with upsert? (y/N): ');
  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted. No changes written.');
    process.exit(0);
  }

  // 8a. Insert new events
  let insertedCount = 0;
  for (const ev of toInsert) {
    const startUTC = localToUTC(ev.startDate, ev.startTime);
    const endUTC = localToUTC(ev.endDate, ev.endTime);
    const { error } = await supabase.from('events').insert({
      name: ev.name,
      tt_event_id: ev.ttEventId,
      description: ev.description,
      event_type_id: ev.eventTypeId,
      start_date: startUTC,
      end_date: endUTC,
      timezone: TZ,
    });
    if (error) console.error(`Failed to insert "${ev.name}": ${error.message}`);
    else insertedCount++;
  }

  // 8b. Update existing events
  let updatedCount = 0;
  for (const { tt, db } of toUpdate) {
    const startUTC = localToUTC(tt.startDate, tt.startTime);
    const endUTC = localToUTC(tt.endDate, tt.endTime);
    const { error } = await supabase.from('events').update({
      name: tt.name,
      tt_event_id: tt.ttEventId,
      description: tt.description,
      event_type_id: tt.eventTypeId,
      start_date: startUTC,
      end_date: endUTC,
      timezone: TZ,
    }).eq('id', db.id);
    if (error) console.error(`Failed to update "${tt.name}" (id=${db.id}): ${error.message}`);
    else updatedCount++;
  }

  // 8c. Refresh event lookup
  const { data: freshEvents } = await supabase
    .from('events')
    .select('id, tt_event_id')
    .not('tt_event_id', 'is', null);
  const eventIdByTtId = new Map((freshEvents || []).map(e => [e.tt_event_id, e.id]));

  // 8d. Replace RSVPs
  let rsvpWritten = 0;
  let rsvpSkipped = 0;
  for (const ev of ttEvents) {
    const gearEventId = eventIdByTtId.get(ev.ttEventId);
    if (!gearEventId) continue;

    await supabase.from('rsvp').delete().eq('event_id', gearEventId);

    const goingRows = [];
    for (const ttId of ev.goingTtUserIds) {
      const userId = userByTtId.get(ttId);
      if (!userId) { rsvpSkipped++; continue; }
      goingRows.push({ user_id: userId, event_id: gearEventId, rsvp_type_id: 1 });
    }
    if (goingRows.length > 0) {
      const { error } = await supabase.from('rsvp').insert(goingRows);
      if (error) console.error(`Failed to insert RSVPs for tt_event_id=${ev.ttEventId}: ${error.message}`);
      else rsvpWritten += goingRows.length;
    }
  }

  console.log(`\nDone. Inserted: ${insertedCount}, Updated: ${updatedCount}, RSVP rows written: ${rsvpWritten}, RSVP skipped (unknown user): ${rsvpSkipped}`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
