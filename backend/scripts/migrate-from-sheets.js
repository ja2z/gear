/**
 * One-time migration script: Google Sheets → Supabase
 *
 * Run ONCE locally before removing Google credentials:
 *   node backend/scripts/migrate-from-sheets.js
 *
 * Prerequisites:
 *   - All Google env vars still set in backend/.env
 *   - SUPABASE_URL and SUPABASE_SECRET_KEY set in backend/.env
 *   - Supabase schema already applied (supabase-schema.sql run in dashboard)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function initSheets() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    .replace(/^""/, '')
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/\\n/g, '\n');

  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
  console.log(`Connected to spreadsheet: "${doc.title}"`);
  return doc;
}

function normalizeCost(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function migrateMetadata(doc) {
  console.log('\n--- Migrating Metadata (Categories) ---');
  const sheet = doc.sheetsByTitle['Metadata'];
  if (!sheet) throw new Error('Metadata sheet not found');

  const rows = await sheet.getRows();
  const categories = rows
    .map(row => ({ class: row.get('Class'), class_desc: row.get('Class Desc') }))
    .filter(c => c.class && c.class_desc);

  console.log(`Found ${categories.length} categories`);

  // Upsert in batches of 100
  for (let i = 0; i < categories.length; i += 100) {
    const batch = categories.slice(i, i + 100);
    const { error } = await supabase
      .from('metadata')
      .upsert(batch, { onConflict: 'class' });
    if (error) throw error;
    console.log(`  Inserted categories ${i + 1}–${i + batch.length}`);
  }

  console.log(`✅ Migrated ${categories.length} categories`);
  return categories.length;
}

async function migrateItems(doc) {
  console.log('\n--- Migrating Items (Master Inventory) ---');
  const sheet = doc.sheetsByTitle['Master Inventory'];
  if (!sheet) throw new Error('Master Inventory sheet not found');

  const rows = await sheet.getRows();
  console.log(`Found ${rows.length} raw rows`);

  const items = rows
    .map(row => ({
      item_class: (row.get('Item Class') || '').trim(),
      item_desc: (row.get('Item Desc') || '').trim(),
      item_num: (row.get('Item Num') || '').trim(),
      item_id: (row.get('Item ID') || '').trim(),
      description: (row.get('Description') || '').trim(),
      is_tagged: row.get('Is Tagged') === 'TRUE' || row.get('Is Tagged') === true,
      condition: (row.get('Condition') || 'Usable').trim(),
      status: (row.get('Status') || 'In shed').trim(),
      purchase_date: row.get('Purchase Date') || null,
      cost: normalizeCost(row.get('Cost')),
      checked_out_to: (row.get('Checked Out To') || '').trim(),
      checked_out_by: (row.get('Checked Out By') || '').trim(),
      check_out_date: row.get('Check Out Date') || null,
      outing_name: (row.get('Outing Name') || '').trim(),
      notes: (row.get('Notes') || '').trim(),
      in_app: !(row.get('In App') === 'FALSE' || row.get('In App') === false),
    }))
    .filter(item => item.item_id && item.item_class);

  // Deduplicate by item_id (keep last occurrence)
  const seen = new Map();
  items.forEach(item => seen.set(item.item_id, item));
  const deduped = Array.from(seen.values());

  if (deduped.length !== items.length) {
    console.warn(`  ⚠️ Removed ${items.length - deduped.length} duplicate item IDs`);
  }

  console.log(`Processing ${deduped.length} valid items`);

  // Upsert in batches of 100
  for (let i = 0; i < deduped.length; i += 100) {
    const batch = deduped.slice(i, i + 100);
    const { error } = await supabase
      .from('items')
      .upsert(batch, { onConflict: 'item_id' });
    if (error) throw error;
    console.log(`  Inserted items ${i + 1}–${i + batch.length}`);
  }

  console.log(`✅ Migrated ${deduped.length} items`);
  return deduped.length;
}

async function migrateTransactions(doc) {
  console.log('\n--- Migrating Transactions (Transaction Log) ---');
  const sheet = doc.sheetsByTitle['Transaction Log'];
  if (!sheet) throw new Error('Transaction Log sheet not found');

  const rows = await sheet.getRows();
  console.log(`Found ${rows.length} raw rows`);

  const transactions = rows
    .map(row => ({
      transaction_id: (row.get('Transaction ID') || '').trim(),
      timestamp: row.get('Timestamp') || new Date().toISOString(),
      action: (row.get('Action') || '').trim(),
      item_id: (row.get('Item ID') || '').trim(),
      outing_name: (row.get('Outing Name') || '').trim(),
      condition: (row.get('Condition') || '').trim(),
      processed_by: (row.get('Processed By') || '').trim(),
      notes: (row.get('Notes') || '').trim(),
    }))
    .filter(t => t.transaction_id && t.item_id && t.action);

  // Deduplicate by transaction_id
  const seen = new Map();
  transactions.forEach(t => seen.set(t.transaction_id, t));
  const deduped = Array.from(seen.values());

  if (deduped.length !== transactions.length) {
    console.warn(`  ⚠️ Removed ${transactions.length - deduped.length} duplicate transaction IDs`);
  }

  console.log(`Processing ${deduped.length} valid transactions`);

  // Upsert in batches of 100
  let skipped = 0;
  for (let i = 0; i < deduped.length; i += 100) {
    const batch = deduped.slice(i, i + 100);
    const { error } = await supabase
      .from('transactions')
      .upsert(batch, { onConflict: 'transaction_id' });
    if (error) {
      // FK violations mean the item_id doesn't exist — skip those rows
      if (error.code === '23503') {
        console.warn(`  ⚠️ Batch ${i}–${i + batch.length} had FK violations, inserting individually...`);
        for (const txn of batch) {
          const { error: singleErr } = await supabase
            .from('transactions')
            .upsert(txn, { onConflict: 'transaction_id' });
          if (singleErr) {
            console.warn(`    Skipped ${txn.transaction_id}: ${singleErr.message}`);
            skipped++;
          }
        }
      } else {
        throw error;
      }
    } else {
      console.log(`  Inserted transactions ${i + 1}–${i + batch.length}`);
    }
  }

  console.log(`✅ Migrated ${deduped.length - skipped} transactions (${skipped} skipped due to missing items)`);
  return deduped.length - skipped;
}

async function main() {
  console.log('🚀 Starting migration from Google Sheets to Supabase...\n');

  try {
    const doc = await initSheets();

    const categoryCount = await migrateMetadata(doc);
    const itemCount = await migrateItems(doc);
    const txnCount = await migrateTransactions(doc);

    console.log('\n✅ Migration complete!');
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Items:      ${itemCount}`);
    console.log(`   Transactions: ${txnCount}`);
    console.log('\nVerify the data in the Supabase dashboard before removing Google credentials.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
