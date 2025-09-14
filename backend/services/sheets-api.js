const { GoogleSpreadsheet } = require('google-spreadsheet');

class SheetsAPI {
  constructor() {
    this.doc = null;
    this.inventorySheet = null;
    this.transactionSheet = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Check if we have valid credentials
    if (!process.env.GOOGLE_SHEET_ID || 
        !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY ||
        process.env.GOOGLE_SHEET_ID === 'placeholder_sheet_id') {
      console.log('⚠️  Google Sheets credentials not configured, using mock data');
      this.initialized = true;
      return;
    }

    try {
      this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
      
      await this.doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });

      await this.doc.loadInfo();
      
      this.inventorySheet = this.doc.sheetsByTitle['Master Inventory'];
      this.transactionSheet = this.doc.sheetsByTitle['Transaction Log'];
      
      this.initialized = true;
      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets API:', error);
      console.log('⚠️  Falling back to mock data');
      this.initialized = true;
    }
  }

  async getInventory() {
    await this.initialize();
    
    // Return mock data if Google Sheets not configured
    if (!this.doc) {
      return this.getMockInventory();
    }
    
    const rows = await this.inventorySheet.getRows();
    return rows.map(row => ({
      itemClass: row.get('Item Class'),
      itemDesc: row.get('Item Desc'),
      itemNum: row.get('Item Num'),
      itemId: row.get('Item ID'),
      description: row.get('Description'),
      isTagged: row.get('Is Tagged') === 'TRUE',
      condition: row.get('Condition'),
      status: row.get('Status'),
      purchaseDate: row.get('Purchase Date'),
      cost: row.get('Cost'),
      checkedOutTo: row.get('Checked Out To'),
      checkedOutBy: row.get('Checked Out By'),
      checkOutDate: row.get('Check Out Date'),
      outingName: row.get('Outing Name'),
      notes: row.get('Notes')
    }));
  }

  getMockInventory() {
    return [
      { itemClass: 'TENT', itemDesc: 'Tents', itemNum: '001', itemId: 'TENT-001', description: 'Zephyr 3', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'TENT', itemDesc: 'Tents', itemNum: '002', itemId: 'TENT-002', description: 'Half Dome 2+', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'TENT', itemDesc: 'Tents', itemNum: '003', itemId: 'TENT-003', description: 'Big Agnes Fly Creek', isTagged: true, condition: 'Usable', status: 'Not available', checkedOutTo: 'John Smith', checkedOutBy: 'System', checkOutDate: '2024-09-01', outingName: 'Fall Camping', notes: '' },
      { itemClass: 'SLEEP', itemDesc: 'Sleeping Bags', itemNum: '001', itemId: 'SLEEP-001', description: 'Mummy Bag -20°F', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'SLEEP', itemDesc: 'Sleeping Bags', itemNum: '002', itemId: 'SLEEP-002', description: 'Rectangular Bag 30°F', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'COOK', itemDesc: 'Cooking Equipment', itemNum: '001', itemId: 'COOK-001', description: 'Camp Stove', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'COOK', itemDesc: 'Cooking Equipment', itemNum: '002', itemId: 'COOK-002', description: 'Cook Set', isTagged: false, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'WATER', itemDesc: 'Water Treatment', itemNum: '001', itemId: 'WATER-001', description: 'Water Filter', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'NAV', itemDesc: 'Navigation', itemNum: '001', itemId: 'NAV-001', description: 'Compass', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
      { itemClass: 'FIRST', itemDesc: 'First Aid', itemNum: '001', itemId: 'FIRST-001', description: 'First Aid Kit', isTagged: true, condition: 'Usable', status: 'Available', checkedOutTo: '', checkedOutBy: '', checkOutDate: '', outingName: '', notes: '' },
    ];
  }

  async getCategories() {
    const inventory = await this.getInventory();
    const categories = {};
    
    inventory.forEach(item => {
      if (!categories[item.itemClass]) {
        categories[item.itemClass] = {
          name: item.itemClass,
          description: item.itemDesc,
          availableCount: 0,
          totalCount: 0
        };
      }
      
      categories[item.itemClass].totalCount++;
      if (item.status === 'Available' && item.condition === 'Usable') {
        categories[item.itemClass].availableCount++;
      }
    });
    
    return Object.values(categories);
  }

  async getItemsByCategory(category) {
    const inventory = await this.getInventory();
    return inventory.filter(item => item.itemClass === category);
  }

  async checkoutItems(itemIds, scoutName, outingName, processedBy, notes = '') {
    await this.initialize();
    const inventory = await this.getInventory();
    const checkoutDate = new Date().toISOString().split('T')[0];
    
    const results = [];
    
    // If using mock data, just simulate the checkout
    if (!this.doc) {
      for (const itemId of itemIds) {
        const item = inventory.find(i => i.itemId === itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }
        
        if (item.status !== 'Available' || item.condition !== 'Usable') {
          results.push({ itemId, success: false, error: 'Item not available' });
          continue;
        }
        
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        results.push({ itemId, success: true, transactionId });
      }
      return results;
    }
    
    for (const itemId of itemIds) {
      const item = inventory.find(i => i.itemId === itemId);
      if (!item) {
        results.push({ itemId, success: false, error: 'Item not found' });
        continue;
      }
      
      if (item.status !== 'Available' || item.condition !== 'Usable') {
        results.push({ itemId, success: false, error: 'Item not available' });
        continue;
      }
      
      // Update inventory sheet
      const row = await this.inventorySheet.getRows({
        query: `Item ID = "${itemId}"`
      });
      
      if (row.length > 0) {
        row[0].set('Status', 'Not available');
        row[0].set('Checked Out To', scoutName);
        row[0].set('Checked Out By', processedBy);
        row[0].set('Check Out Date', checkoutDate);
        row[0].set('Outing Name', outingName);
        row[0].set('Notes', notes);
        await row[0].save();
      }
      
      // Add to transaction log
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.transactionSheet.addRow({
        'Transaction ID': transactionId,
        'Timestamp': new Date().toISOString(),
        'Action': 'Check out',
        'Item ID': itemId,
        'Outing Name': outingName,
        'Condition': item.condition,
        'Processed By': processedBy,
        'Notes': notes
      });
      
      results.push({ itemId, success: true, transactionId });
    }
    
    return results;
  }

  async checkinItems(itemIds, conditions, processedBy, notes = '') {
    await this.initialize();
    const inventory = await this.getInventory();
    
    const results = [];
    
    // If using mock data, just simulate the checkin
    if (!this.doc) {
      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const condition = conditions[i] || 'Usable';
        
        const item = inventory.find(item => item.itemId === itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }
        
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        results.push({ itemId, success: true, transactionId });
      }
      return results;
    }
    
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const condition = conditions[i] || 'Usable';
      
      const item = inventory.find(item => item.itemId === itemId);
      if (!item) {
        results.push({ itemId, success: false, error: 'Item not found' });
        continue;
      }
      
      // Update inventory sheet
      const row = await this.inventorySheet.getRows({
        query: `Item ID = "${itemId}"`
      });
      
      if (row.length > 0) {
        row[0].set('Status', 'Available');
        row[0].set('Checked Out To', '');
        row[0].set('Checked Out By', '');
        row[0].set('Check Out Date', '');
        row[0].set('Outing Name', '');
        row[0].set('Condition', condition);
        row[0].set('Notes', notes);
        await row[0].save();
      }
      
      // Add to transaction log
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.transactionSheet.addRow({
        'Transaction ID': transactionId,
        'Timestamp': new Date().toISOString(),
        'Action': 'Check in',
        'Item ID': itemId,
        'Outing Name': item.outingName || '',
        'Condition': condition,
        'Processed By': processedBy,
        'Notes': notes
      });
      
      results.push({ itemId, success: true, transactionId });
    }
    
    return results;
  }
}

module.exports = new SheetsAPI();
