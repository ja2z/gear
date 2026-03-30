const { createClient } = require('@supabase/supabase-js');
const { normalizeCost } = require('../utils/parse-cost');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function mapRowToItem(row) {
  return {
    itemClass: row.item_class,
    itemDesc: row.item_desc,
    itemNum: row.item_num,
    itemId: row.item_id,
    description: row.description,
    isTagged: Boolean(row.is_tagged),
    condition: row.condition,
    status: row.status,
    purchaseDate: row.purchase_date,
    cost: normalizeCost(row.cost),
    checkedOutTo: row.checked_out_to,
    checkedOutBy: row.checked_out_by,
    checkOutDate: row.check_out_date,
    outingName: row.outing_name,
    notes: row.notes,
    inApp: Boolean(row.in_app),
  };
}

const supabaseAPI = {
  // ========== INVENTORY ==========

  async getInventory() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('in_app', true)
      .neq('status', 'Removed from inventory')
      .order('item_class')
      .order('item_num');
    if (error) throw error;
    return data.map(mapRowToItem);
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('items')
      .select('item_class, item_desc, status, condition')
      .eq('in_app', true)
      .neq('status', 'Removed from inventory');
    if (error) throw error;

    const categoryMap = new Map();
    data.forEach(row => {
      if (!categoryMap.has(row.item_class)) {
        categoryMap.set(row.item_class, {
          name: row.item_class,
          description: row.item_desc,
          total_count: 0,
          available_count: 0,
        });
      }
      const cat = categoryMap.get(row.item_class);
      cat.total_count++;
      if (row.status === 'In shed' && row.condition === 'Usable') {
        cat.available_count++;
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getCategoriesWithItemDescriptions() {
    const { data, error } = await supabase
      .from('items')
      .select('item_class, item_desc, status, condition, description')
      .eq('in_app', true)
      .neq('status', 'Removed from inventory');
    if (error) throw error;

    const categoryMap = new Map();
    data.forEach(row => {
      if (!categoryMap.has(row.item_class)) {
        categoryMap.set(row.item_class, {
          name: row.item_class,
          description: row.item_desc,
          total_count: 0,
          available_count: 0,
          item_descriptions: [],
        });
      }
      const cat = categoryMap.get(row.item_class);
      cat.total_count++;
      if (row.status === 'In shed' && (row.condition === 'Usable' || row.condition === 'Unknown')) {
        cat.available_count++;
      }
      if (row.description) cat.item_descriptions.push(row.description);
    });

    return Array.from(categoryMap.values())
      .map(cat => ({ ...cat, item_descriptions: cat.item_descriptions.join(' ') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getItemsByCategory(category) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('item_class', category)
      .eq('in_app', true)
      .neq('status', 'Removed from inventory')
      .order('item_num');
    if (error) throw error;
    return data.map(mapRowToItem);
  },

  async getItemById(itemId) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('item_id', itemId)
      .neq('status', 'Removed from inventory')
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToItem(data) : null;
  },

  // ========== CHECKOUT / CHECKIN ==========

  async checkoutItems(itemIds, scoutName, outingName, processedBy, notes = '') {
    const checkoutDate = new Date().toISOString().split('T')[0];
    const results = [];

    for (const itemId of itemIds) {
      try {
        const item = await this.getItemById(itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }

        const isAvailable =
          (item.status === 'In shed' || item.status === 'Reserved') &&
          (item.condition === 'Usable' || item.condition === 'Unknown');
        if (!isAvailable) {
          results.push({ itemId, success: false, error: 'Item not available' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('items')
          .update({
            status: 'Checked out',
            checked_out_to: scoutName,
            checked_out_by: processedBy,
            check_out_date: checkoutDate,
            outing_name: outingName,
            notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', itemId);
        if (updateError) throw updateError;

        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.addTransaction({
          transactionId,
          action: 'Check out',
          itemId,
          outingName,
          condition: item.condition,
          processedBy,
          notes,
        });

        results.push({ itemId, success: true, transactionId, condition: item.condition });
      } catch (error) {
        console.error(`Error checking out item ${itemId}:`, error);
        results.push({ itemId, success: false, error: error.message });
      }
    }

    return results;
  },

  async checkinItems(itemIds, conditions, processedBy, notes = '') {
    const results = [];

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const condition = conditions[i] || 'Usable';

      try {
        const item = await this.getItemById(itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }

        const itemStatus = condition === 'Missing' ? 'Missing' : 'In shed';
        const itemCondition = condition === 'Missing' ? 'Unknown' : condition;

        const { error: updateError } = await supabase
          .from('items')
          .update({
            status: itemStatus,
            checked_out_to: '',
            checked_out_by: '',
            check_out_date: null,
            outing_name: '',
            condition: itemCondition,
            notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', itemId);
        if (updateError) throw updateError;

        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.addTransaction({
          transactionId,
          action: 'Check in',
          itemId,
          outingName: item.outingName || '',
          condition,
          processedBy,
          notes,
        });

        results.push({ itemId, success: true, transactionId, status: itemStatus, condition: itemCondition });
      } catch (error) {
        console.error(`Error checking in item ${itemId}:`, error);
        results.push({ itemId, success: false, error: error.message });
      }
    }

    return results;
  },

  // ========== OUTINGS ==========

  async getOutingsWithItems() {
    const { data, error } = await supabase
      .from('items')
      .select('outing_name, check_out_date')
      .eq('status', 'Checked out')
      .eq('in_app', true)
      .not('outing_name', 'is', null)
      .neq('outing_name', '');
    if (error) throw error;

    const outingMap = new Map();
    data.forEach(row => {
      const key = row.outing_name;
      if (!outingMap.has(key)) {
        outingMap.set(key, { item_count: 0, checked_out_date: row.check_out_date });
      }
      const o = outingMap.get(key);
      o.item_count++;
      if (row.check_out_date && (!o.checked_out_date || row.check_out_date < o.checked_out_date)) {
        o.checked_out_date = row.check_out_date;
      }
    });

    return Array.from(outingMap.entries())
      .map(([outingName, d]) => ({
        outingName,
        itemCount: d.item_count,
        checkedOutDate: d.checked_out_date,
      }))
      .sort((a, b) => {
        if (!a.checkedOutDate) return 1;
        if (!b.checkedOutDate) return -1;
        return b.checkedOutDate.localeCompare(a.checkedOutDate);
      });
  },

  async getCheckedOutItemsByOuting(outingName) {
    const { data, error } = await supabase
      .from('items')
      .select('item_id, item_class, item_num, description, checked_out_to, outing_name, check_out_date, condition')
      .eq('status', 'Checked out')
      .eq('outing_name', outingName)
      .eq('in_app', true)
      .order('item_class')
      .order('item_num');
    if (error) throw error;

    return data.map(row => ({
      itemId: row.item_id,
      description: row.description,
      checkedOutTo: row.checked_out_to,
      outingName: row.outing_name,
      checkOutDate: row.check_out_date,
      condition: row.condition,
    }));
  },

  async getOutingDetails(outingName) {
    const { data, error } = await supabase
      .from('items')
      .select('outing_name, checked_out_to, checked_out_by, check_out_date, notes')
      .eq('status', 'Checked out')
      .eq('outing_name', outingName)
      .eq('in_app', true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      outingName: data.outing_name,
      scoutName: data.checked_out_to,
      qmName: data.checked_out_by,
      date: data.check_out_date,
      notes: data.notes || '',
    };
  },

  // ========== TRANSACTIONS ==========

  async addTransaction(transaction) {
    const { error } = await supabase.from('transactions').insert({
      transaction_id: transaction.transactionId,
      timestamp: transaction.timestamp || new Date().toISOString(),
      action: transaction.action,
      item_id: transaction.itemId,
      outing_name: transaction.outingName,
      condition: transaction.condition,
      processed_by: transaction.processedBy,
      notes: transaction.notes,
    });
    if (error) throw error;
  },

  // Alias used by manage-inventory route
  async appendTransactionLogRow(row) {
    return this.addTransaction(row);
  },

  async getItemTransactions(itemId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('item_id', itemId.trim())
      .order('timestamp', { ascending: false });
    if (error) throw error;

    return data.map(row => ({
      timestamp: row.timestamp,
      action: row.action,
      itemId: row.item_id,
      outingName: row.outing_name || '',
      checkedOutTo: '',
      condition: row.condition || '',
      processedBy: row.processed_by || '',
      notes: row.notes || '',
    }));
  },

  async getAllTransactions(filters = {}) {
    const { dateRange, outing, itemId, limit = 50, offset = 0 } = filters;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' });

    if (dateRange && dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      if (!isNaN(daysAgo)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysAgo);
        query = query.gte('timestamp', cutoff.toISOString());
      }
    }

    if (outing && outing.trim() !== '') {
      query = query.ilike('outing_name', `%${outing.trim()}%`);
    }

    if (itemId && itemId.trim() !== '') {
      const searchId = itemId.trim();
      if (searchId.includes(',')) {
        const ids = searchId.split(',').map(id => id.trim());
        query = query.in('item_id', ids);
      } else {
        query = query.ilike('item_id', `%${searchId}%`);
      }
    }

    query = query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      transactions: data.map(row => ({
        timestamp: row.timestamp,
        action: row.action,
        itemId: row.item_id,
        outingName: row.outing_name || '',
        checkedOutTo: '',
        condition: row.condition || '',
        processedBy: row.processed_by || '',
        notes: row.notes || '',
      })),
      total: count || 0,
    };
  },

  async getAllOutingsFromTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('outing_name, timestamp')
      .not('outing_name', 'is', null)
      .neq('outing_name', '');
    if (error) throw error;

    const outingMap = new Map();
    data.forEach(row => {
      const name = row.outing_name.trim();
      if (!outingMap.has(name)) {
        outingMap.set(name, { count: 0, minTimestamp: row.timestamp });
      }
      const o = outingMap.get(name);
      o.count++;
      if (row.timestamp && (!o.minTimestamp || row.timestamp < o.minTimestamp)) {
        o.minTimestamp = row.timestamp;
      }
    });

    return Array.from(outingMap.entries())
      .map(([outingName, d]) => ({
        outingName,
        transactionCount: d.count,
        minTimestamp: d.minTimestamp,
      }))
      .sort((a, b) => {
        if (!a.minTimestamp) return 1;
        if (!b.minTimestamp) return -1;
        return b.minTimestamp.localeCompare(a.minTimestamp);
      });
  },

  async getOutingItemBreakdown(outingName) {
    const { data, error } = await supabase
      .from('transactions')
      .select('item_id, action, timestamp')
      .eq('outing_name', outingName)
      .order('timestamp');
    if (error) throw error;

    const itemLastAction = new Map();
    data.forEach(row => {
      if (row.item_id && row.action && row.timestamp) {
        if (
          !itemLastAction.has(row.item_id) ||
          new Date(row.timestamp) > new Date(itemLastAction.get(row.item_id).timestamp)
        ) {
          itemLastAction.set(row.item_id, { action: row.action, timestamp: row.timestamp });
        }
      }
    });

    const checkedOutItems = [];
    const checkedInItems = [];
    itemLastAction.forEach((d, id) => {
      if (d.action === 'Check out') checkedOutItems.push(id);
      else if (d.action === 'Check in') checkedInItems.push(id);
    });

    return {
      outingName,
      totalUniqueItems: itemLastAction.size,
      checkedOut: checkedOutItems.length,
      checkedIn: checkedInItems.length,
      checkedOutItems,
      checkedInItems,
    };
  },

  // ========== METADATA / CATEGORIES ==========

  async getMetadataCategories() {
    const { data, error } = await supabase
      .from('metadata')
      .select('class, class_desc')
      .order('class_desc');
    if (error) throw error;
    return data;
  },

  async addMetadataCategory(categoryData) {
    const { error } = await supabase.from('metadata').insert({
      class: categoryData.class,
      class_desc: categoryData.classDesc,
    });
    if (error) throw error;
  },

  // Alias — metadata.js route calls addCategory; keeps same contract as sheetsAPI
  async addCategory(categoryData) {
    return this.addMetadataCategory(categoryData);
  },

  async updateMetadataCategory(classCode, newClassDesc) {
    const { error } = await supabase
      .from('metadata')
      .update({ class_desc: newClassDesc, updated_at: new Date().toISOString() })
      .eq('class', classCode);
    if (error) throw error;
  },

  // Full category rename: updates metadata + all matching items' item_desc
  async updateCategory(classCode, newClassDesc) {
    await this.updateMetadataCategory(classCode, newClassDesc);

    const { error } = await supabase
      .from('items')
      .update({ item_desc: newClassDesc, updated_at: new Date().toISOString() })
      .eq('item_class', classCode);
    if (error) throw error;
  },

  async checkCategoryUniqueness(classCode, classDesc, excludeClass = null) {
    const { data, error } = await supabase.from('metadata').select('class, class_desc');
    if (error) throw error;

    const classUnique = !data.some(c => c.class === classCode && c.class !== excludeClass);
    const classDescUnique = !data.some(c => c.class_desc === classDesc && c.class !== excludeClass);
    return { classUnique, classDescUnique };
  },

  // ========== ITEM MANAGEMENT ==========

  async getAllItems() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .neq('status', 'Removed from inventory')
      .order('item_desc')
      .order('item_num');
    if (error) throw error;
    return data.map(mapRowToItem);
  },

  async getNextItemNum(classCode) {
    const { data, error } = await supabase
      .from('items')
      .select('item_num')
      .eq('item_class', classCode)
      .neq('status', 'Removed from inventory');
    if (error) throw error;

    if (!data || data.length === 0) {
      return { nextNum: '001', nextItemId: `${classCode}-001` };
    }

    const maxNum = Math.max(...data.map(row => parseInt(row.item_num, 10) || 0));
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return { nextNum, nextItemId: `${classCode}-${nextNum}` };
  },

  async addItem(itemData) {
    const { error } = await supabase.from('items').insert({
      item_class: itemData.itemClass,
      item_desc: itemData.itemDesc,
      item_num: itemData.itemNum,
      item_id: itemData.itemId,
      description: itemData.description,
      is_tagged: itemData.isTagged || false,
      condition: itemData.condition,
      status: itemData.status,
      purchase_date: itemData.purchaseDate || null,
      cost: itemData.cost || null,
      checked_out_to: '',
      checked_out_by: '',
      check_out_date: null,
      outing_name: '',
      notes: itemData.notes || '',
      in_app: itemData.inApp !== undefined ? itemData.inApp : true,
    });
    if (error) throw error;
  },

  async updateItem(itemId, updates, options = {}) {
    const clearCheckout = options.clearCheckout === true;

    const updateData = {
      description: updates.description,
      is_tagged: updates.isTagged,
      condition: updates.condition,
      status: updates.status,
      purchase_date: updates.purchaseDate || null,
      cost: updates.cost || null,
      notes: updates.notes || '',
      in_app: updates.inApp,
      updated_at: new Date().toISOString(),
    };

    if (clearCheckout) {
      updateData.checked_out_to = '';
      updateData.checked_out_by = '';
      updateData.check_out_date = null;
      updateData.outing_name = '';
    }

    const { error } = await supabase.from('items').update(updateData).eq('item_id', itemId);
    if (error) throw error;
  },

  // Alias used by manage-inventory route (matches sheetsAPI.updateItemInSheets signature)
  async updateItemInSheets(itemId, updates, options = {}) {
    return this.updateItem(itemId, updates, { clearCheckout: options.clearCheckoutFields });
  },

  async softDeleteItem(itemId) {
    const { error } = await supabase
      .from('items')
      .update({ status: 'Removed from inventory', updated_at: new Date().toISOString() })
      .eq('item_id', itemId);
    if (error) throw error;
  },

  async getCategoryStats() {
    const { data, error } = await supabase
      .from('items')
      .select('item_class, item_desc, status, condition, description')
      .neq('status', 'Removed from inventory');
    if (error) throw error;

    const statsMap = new Map();
    data.forEach(row => {
      if (!statsMap.has(row.item_class)) {
        statsMap.set(row.item_class, {
          class: row.item_class,
          class_desc: row.item_desc,
          total_items: 0,
          available: 0,
          checked_out: 0,
          unavailable: 0,
          item_descriptions: [],
        });
      }
      const stat = statsMap.get(row.item_class);
      stat.total_items++;
      if (row.status === 'In shed' && (row.condition === 'Usable' || row.condition === 'Unknown')) {
        stat.available++;
      }
      if (row.status === 'Checked out') stat.checked_out++;
      if (row.condition === 'Not usable' || ['Missing', 'Out for repair'].includes(row.status)) {
        stat.unavailable++;
      }
      if (row.description) stat.item_descriptions.push(row.description);
    });

    return Array.from(statsMap.values())
      .map(stat => ({ ...stat, item_descriptions: stat.item_descriptions.join(' ') }))
      .sort((a, b) => a.class_desc.localeCompare(b.class_desc));
  },

  // ========== RESERVATIONS ==========

  async createReservation(itemIds, outingName, reservedBy, reservedEmail) {
    // Upsert reservation record (allows re-reserving same outing name)
    const { error: resError } = await supabase
      .from('reservations')
      .upsert({ outing_name: outingName, reserved_by: reservedBy, reserved_email: reservedEmail, created_at: new Date().toISOString() }, { onConflict: 'outing_name' });
    if (resError) throw resError;

    // Un-reserve any items currently reserved for this outing (handles edits)
    const { error: clearError } = await supabase
      .from('items')
      .update({ status: 'In shed', outing_name: '', updated_at: new Date().toISOString() })
      .eq('status', 'Reserved')
      .eq('outing_name', outingName);
    if (clearError) throw clearError;

    const results = [];
    for (const itemId of itemIds) {
      try {
        const item = await this.getItemById(itemId);
        if (!item) {
          results.push({ itemId, success: false, error: 'Item not found' });
          continue;
        }
        const isAvailable =
          item.status === 'In shed' &&
          (item.condition === 'Usable' || item.condition === 'Unknown');
        if (!isAvailable) {
          results.push({ itemId, success: false, error: 'Item not available for reservation' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('items')
          .update({
            status: 'Reserved',
            outing_name: outingName,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', itemId);
        if (updateError) throw updateError;

        results.push({ itemId, success: true, itemId, description: item.description, itemDesc: item.itemDesc });
      } catch (err) {
        results.push({ itemId, success: false, error: err.message });
      }
    }
    return results;
  },

  async getReservations() {
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .select('outing_name, reserved_by, reserved_email, created_at')
      .order('created_at', { ascending: false });
    if (resError) throw resError;

    // For each reservation, count how many items are still reserved
    const result = [];
    for (const res of resData) {
      const { count, error: countError } = await supabase
        .from('items')
        .select('item_id', { count: 'exact', head: true })
        .eq('status', 'Reserved')
        .eq('outing_name', res.outing_name);
      if (countError) throw countError;
      if (count > 0) {
        result.push({
          outingName: res.outing_name,
          reservedBy: res.reserved_by,
          reservedEmail: res.reserved_email,
          itemCount: count,
          createdAt: res.created_at,
        });
      }
    }
    return result;
  },

  async getReservationItems(outingName) {
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .select('outing_name, reserved_by, reserved_email, created_at')
      .eq('outing_name', outingName)
      .maybeSingle();
    if (resError) throw resError;
    if (!resData) return null;

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'Reserved')
      .eq('outing_name', outingName)
      .order('item_class')
      .order('item_num');
    if (itemsError) throw itemsError;

    return {
      outingName: resData.outing_name,
      reservedBy: resData.reserved_by,
      reservedEmail: resData.reserved_email,
      createdAt: resData.created_at,
      items: items.map(mapRowToItem),
    };
  },

  async deleteReservation(outingName) {
    // Un-reserve any items still reserved for this outing (e.g. removed from cart before checkout)
    const { error: itemsError } = await supabase
      .from('items')
      .update({ status: 'In shed', outing_name: '', updated_at: new Date().toISOString() })
      .eq('status', 'Reserved')
      .eq('outing_name', outingName);
    if (itemsError) throw itemsError;

    // Delete the reservation record
    const { error: resError } = await supabase
      .from('reservations')
      .delete()
      .eq('outing_name', outingName);
    if (resError) throw resError;
  },

  // Expose the raw client for keep-alive ping in server.js
  client: supabase,
};

module.exports = supabaseAPI;
