#!/usr/bin/env node

/**
 * Test script for checkout/checkin endpoints using the full UI path
 * Usage: node test-bulk-checkout.js [options]
 *
 * Options:
 *   --action "checkout|checkin"  Action to perform (default: "checkout")
 *   --scout-name "Name"          Scout name (for checkout only, default: "Test Scout")
 *   --outing-name "Name"         Outing name (required for both actions, default: "API Test Outing")
 *   --target-count "Number"      Target number of items (for checkout only, default: 95)
 *   --processed-by "Name"        QM name (default: "Test QM")
 *   --notes "Notes"              Notes (default: "Bulk test checkout/checkin")
 *   --url "URL"                  API URL (default: "http://localhost:3001")
 */

const http = require('http');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  action: 'checkout',
  scoutName: 'Test Scout',
  outingName: 'API Test Outing',
  targetCount: 95,
  processedBy: 'Test QM',
  notes: 'Bulk test checkout',
  url: 'http://localhost:3001'
};

for (let i = 0; i < args.length; i += 2) {
  const flag = args[i];
  const value = args[i + 1];
  
  switch (flag) {
    case '--action':
      if (value !== 'checkout' && value !== 'checkin') {
        console.log('Action must be "checkout" or "checkin"');
        process.exit(1);
      }
      options.action = value;
      options.notes = value === 'checkin' ? 'Bulk test checkin' : 'Bulk test checkout';
      break;
    case '--scout-name':
      options.scoutName = value;
      break;
    case '--outing-name':
      options.outingName = value;
      break;
    case '--target-count':
      const count = parseInt(value, 10);
      if (isNaN(count) || count <= 0) {
        console.log('Target count must be a positive number');
        process.exit(1);
      }
      options.targetCount = count;
      break;
    case '--processed-by':
      options.processedBy = value;
      break;
    case '--notes':
      options.notes = value;
      break;
    case '--url':
      options.url = value;
      break;
    default:
      console.log(`Unknown flag: ${flag}`);
      process.exit(1);
  }
}

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(url, requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: result });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function getInventory() {
  console.log('📋 Fetching inventory...');
  const url = new URL(`${options.url}/api/inventory`);
  const result = await makeRequest(url);
  
  if (result.statusCode !== 200) {
    throw new Error(`Failed to fetch inventory: ${result.statusCode}`);
  }
  
  return result.data;
}

async function getCheckedOutItems(outingName) {
  console.log(`📋 Fetching checked out items for outing: ${outingName}...`);
  const url = new URL(`${options.url}/api/inventory/checked-out/${encodeURIComponent(outingName)}`);
  const result = await makeRequest(url);
  
  if (result.statusCode !== 200) {
    throw new Error(`Failed to fetch checked out items: ${result.statusCode}`);
  }
  
  return result.data;
}

async function performCheckout(itemIds) {
  console.log(`🛒 Performing checkout for ${itemIds.length} items...`);
  const url = new URL(`${options.url}/api/checkout`);
  const data = JSON.stringify({
    itemIds,
    scoutName: options.scoutName,
    outingName: options.outingName,
    processedBy: options.processedBy,
    notes: options.notes
  });
  
  const result = await makeRequest(url, 'POST', data);
  return result;
}

async function performCheckin(itemIds, conditions) {
  console.log(`📥 Performing checkin for ${itemIds.length} items...`);
  const url = new URL(`${options.url}/api/checkin`);
  const data = JSON.stringify({
    itemIds,
    conditions,
    processedBy: options.processedBy,
    notes: options.notes
  });
  
  const result = await makeRequest(url, 'POST', data);
  return result;
}

async function main() {
  const actionText = options.action === 'checkin' ? 'checkin' : 'checkout';
  console.log(`🧪 Testing ${actionText} endpoint (full UI path)...`);
  console.log(`📡 Base URL: ${options.url}`);
  
  if (options.action === 'checkout') {
    console.log(`👤 Scout: ${options.scoutName}`);
    console.log(`🏕️  Outing: ${options.outingName}`);
    console.log(`🎯 Target Count: ${options.targetCount}`);
  } else {
    console.log(`🏕️  Outing: ${options.outingName}`);
  }
  console.log(`👨‍💼 QM: ${options.processedBy}`);
  console.log(`📝 Notes: ${options.notes}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    if (options.action === 'checkout') {
      // Get available items
      const inventory = await getInventory();
      const availableItems = inventory.filter(item =>
        item.status === 'In shed' && 
        (item.condition === 'Usable' || item.condition === 'Unknown')
      );
      
      console.log(`📊 Found ${availableItems.length} available items`);
      
      if (availableItems.length < options.targetCount) {
        console.log(`❌ Not enough available items. Found ${availableItems.length}, need ${options.targetCount}`);
        process.exit(1);
      }
      
      // Take first targetCount items
      const itemsToCheckout = availableItems.slice(0, options.targetCount);
      const itemIds = itemsToCheckout.map(item => item.itemId);
      
      console.log(`🎯 Attempting to checkout ${itemIds.length} items:`, itemIds.slice(0, 5), '...');
      
      // Perform checkout
      const result = await performCheckout(itemIds);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📊 Status: ${result.statusCode}`);
      console.log('');

      if (result.statusCode === 200) {
        console.log('✅ SUCCESS!');
        console.log(`📦 Total Requested: ${options.targetCount}`);
        console.log(`✅ Successful: ${result.data.successful || itemIds.length}`);
        console.log(`❌ Failed: ${result.data.failed || 0}`);
        console.log(`💬 Message: ${result.data.message || 'Checkout completed'}`);
        console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
      } else {
        console.log('❌ FAILED!');
        console.log('Response:', result.data);
      }
      
    } else {
      // Get checked out items for the outing
      const checkedOutItems = await getCheckedOutItems(options.outingName);
      
      console.log(`📊 Found ${checkedOutItems.length} checked out items for outing: ${options.outingName}`);
      
      if (checkedOutItems.length === 0) {
        console.log(`❌ No checked out items found for outing: ${options.outingName}`);
        process.exit(1);
      }
      
      // Checkin all available items for this outing
      const itemIds = checkedOutItems.map(item => item.itemId);
      const conditions = itemIds.map(() => 'Usable'); // Default all to 'Usable'
      
      console.log(`🎯 Attempting to checkin ${itemIds.length} items:`, itemIds.slice(0, 5), '...');
      
      // Perform checkin
      const result = await performCheckin(itemIds, conditions);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📊 Status: ${result.statusCode}`);
      console.log('');

      if (result.statusCode === 200) {
        console.log('✅ SUCCESS!');
        console.log(`📦 Total Requested: ${itemIds.length}`);
        console.log(`✅ Successful: ${result.data.successful || itemIds.length}`);
        console.log(`❌ Failed: ${result.data.failed || 0}`);
        console.log(`💬 Message: ${result.data.message || 'Checkin completed'}`);
        console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
      } else {
        console.log('❌ FAILED!');
        console.log('Response:', result.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();