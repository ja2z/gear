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
    eventId: row.event_id || null,
    outingName: row.events?.name || '',   // populated via FK join
    notes: row.notes,
    inApp: Boolean(row.in_app),
  };
}

function mapRowToEvent(row) {
  const splUser = Array.isArray(row.spl_user) ? row.spl_user[0] : row.spl_user;
  const asplUser = Array.isArray(row.aspl_user) ? row.aspl_user[0] : row.aspl_user;
  const adultLeaderUser = Array.isArray(row.adult_leader_user) ? row.adult_leader_user[0] : row.adult_leader_user;
  return {
    id: row.id,
    name: row.name,
    eventTypeId: row.event_type_id,
    eventType: row.event_types?.type || '',
    startDate: row.start_date,
    endDate: row.end_date,
    eventSplId: row.event_spl,
    eventSplName: splUser ? `${splUser.first_name} ${splUser.last_name}` : null,
    eventAsplId: row.event_aspl,
    eventAsplName: asplUser ? `${asplUser.first_name} ${asplUser.last_name}` : null,
    adultLeaderId: row.adult_leader,
    adultLeaderName: adultLeaderUser ? `${adultLeaderUser.first_name} ${adultLeaderUser.last_name}` : null,
    createdAt: row.created_at,
  };
}

const EVENT_SELECT = `
  id, name, event_type_id, start_date, end_date, event_spl, event_aspl, adult_leader, created_at,
  event_types(type),
  spl_user:users!events_event_spl_fkey(first_name, last_name),
  aspl_user:users!events_event_aspl_fkey(first_name, last_name),
  adult_leader_user:users!events_adult_leader_fkey(first_name, last_name)
`;

const supabaseAPI = {
  // ========== INVENTORY ==========

  async getInventory() {
    const { data, error } = await supabase
      .from('items')
      .select('*, events(id, name)')
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
      .select('*, events(id, name)')
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
      .select('*, events(id, name)')
      .eq('item_id', itemId)
      .neq('status', 'Removed from inventory')
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToItem(data) : null;
  },

  // ========== CHECKOUT / CHECKIN ==========

  async checkoutItems(itemIds, scoutName, eventId, processedBy, notes = '') {
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
            event_id: eventId,
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
          eventId,
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
        const priorEventId = item.eventId || null;

        const { error: updateError } = await supabase
          .from('items')
          .update({
            status: itemStatus,
            checked_out_to: '',
            checked_out_by: '',
            check_out_date: null,
            event_id: null,
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
          eventId: priorEventId,
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

  // ========== OUTINGS (events with checked-out items) ==========

  async getOutingsWithItems() {
    const { data, error } = await supabase
      .from('items')
      .select('event_id, check_out_date, events(id, name)')
      .eq('status', 'Checked out')
      .eq('in_app', true)
      .not('event_id', 'is', null);
    if (error) throw error;

    const eventMap = new Map();
    data.forEach(row => {
      const key = row.event_id;
      const name = row.events?.name || `Event ${key}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, { eventId: key, outingName: name, item_count: 0, checked_out_date: row.check_out_date });
      }
      const o = eventMap.get(key);
      o.item_count++;
      if (row.check_out_date && (!o.checked_out_date || row.check_out_date < o.checked_out_date)) {
        o.checked_out_date = row.check_out_date;
      }
    });

    return Array.from(eventMap.values())
      .map(({ eventId, outingName, item_count, checked_out_date }) => ({
        eventId,
        outingName,
        itemCount: item_count,
        checkedOutDate: checked_out_date,
      }))
      .sort((a, b) => {
        if (!a.checkedOutDate) return 1;
        if (!b.checkedOutDate) return -1;
        return b.checkedOutDate.localeCompare(a.checkedOutDate);
      });
  },

  async getCheckedOutItemsByOuting(outingNameOrEventId) {
    // Accept either numeric event ID or event name string
    let eventId = parseInt(outingNameOrEventId, 10);
    if (isNaN(eventId)) {
      const { data: ev } = await supabase
        .from('events')
        .select('id')
        .eq('name', outingNameOrEventId)
        .maybeSingle();
      eventId = ev?.id;
    }
    if (!eventId) return [];

    const { data, error } = await supabase
      .from('items')
      .select('item_id, item_class, item_num, description, checked_out_to, event_id, check_out_date, condition, events(name)')
      .eq('status', 'Checked out')
      .eq('event_id', eventId)
      .eq('in_app', true)
      .order('item_class')
      .order('item_num');
    if (error) throw error;

    return data.map(row => ({
      itemId: row.item_id,
      description: row.description,
      checkedOutTo: row.checked_out_to,
      outingName: row.events?.name || '',
      eventId: row.event_id,
      checkOutDate: row.check_out_date,
      condition: row.condition,
    }));
  },

  async getOutingDetails(outingNameOrEventId) {
    // Accept either numeric event ID or event name string
    let eventId = parseInt(outingNameOrEventId, 10);
    if (isNaN(eventId)) {
      const { data: ev } = await supabase
        .from('events')
        .select('id')
        .eq('name', outingNameOrEventId)
        .maybeSingle();
      eventId = ev?.id;
    }
    if (!eventId) return null;

    // Get event with SPL user details
    const { data: eventData, error: evError } = await supabase
      .from('events')
      .select('id, name, start_date, event_spl, event_aspl')
      .eq('id', eventId)
      .maybeSingle();
    if (evError) throw evError;
    if (!eventData) return null;

    // Get QM name from the first checked-out item for this event
    const { data: itemData } = await supabase
      .from('items')
      .select('checked_out_to, checked_out_by, check_out_date, notes')
      .eq('event_id', eventId)
      .eq('status', 'Checked out')
      .limit(1)
      .maybeSingle();

    // Get SPL name from users if available
    let scoutName = itemData?.checked_out_to || '';
    if (eventData.event_spl) {
      const { data: splUser } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', eventData.event_spl)
        .maybeSingle();
      if (splUser) scoutName = `${splUser.first_name} ${splUser.last_name}`;
    }

    return {
      eventId: eventData.id,
      outingName: eventData.name,
      scoutName,
      qmName: itemData?.checked_out_by || '',
      date: itemData?.check_out_date || eventData.start_date,
      notes: itemData?.notes || '',
    };
  },

  // ========== EVENTS CRUD ==========

  async getEventTypes() {
    const { data, error } = await supabase
      .from('event_types')
      .select('id, type')
      .order('id');
    if (error) throw error;
    return data;
  },

  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, role_id, dob')
      .order('last_name')
      .order('first_name');
    if (error) throw error;

    const today = new Date();
    return data
      .filter(u => u.dob !== null)
      .map(u => {
        const dob = new Date(u.dob);
        let age = today.getFullYear() - dob.getFullYear();
        const hadBirthday =
          today.getMonth() > dob.getMonth() ||
          (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
        if (!hadBirthday) age--;
        return {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          roleId: u.role_id,
          fullName: `${u.first_name} ${u.last_name}`,
          isAdult: age >= 18,
        };
      });
  },

  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .order('start_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapRowToEvent);
  },

  async getEventById(id) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToEvent(data) : null;
  },

  async createEvent(eventData) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        event_type_id: eventData.eventTypeId,
        start_date: eventData.startDate || null,
        end_date: eventData.endDate || null,
        event_spl: eventData.eventSplId || null,
        event_aspl: eventData.eventAsplId || null,
        adult_leader: eventData.adultLeaderId || null,
      })
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    return mapRowToEvent(data);
  },

  async updateEvent(id, eventData) {
    const { data, error } = await supabase
      .from('events')
      .update({
        name: eventData.name,
        event_type_id: eventData.eventTypeId,
        start_date: eventData.startDate || null,
        end_date: eventData.endDate || null,
        event_spl: eventData.eventSplId || null,
        event_aspl: eventData.eventAsplId || null,
        adult_leader: eventData.adultLeaderId || null,
      })
      .eq('id', id)
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    return mapRowToEvent(data);
  },

  async deleteEvent(id) {
    // Return any checked-out or reserved items to "In shed" before deleting the event.
    // (items.event_id is SET NULL on delete, but status would be left as "Checked out")
    const { error: itemsError } = await supabase
      .from('items')
      .update({ status: 'In shed', checked_out_to: '', checked_out_by: '', check_out_date: null, updated_at: new Date().toISOString() })
      .eq('event_id', id)
      .in('status', ['Checked out', 'Reserved']);
    if (itemsError) throw itemsError;

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== TRANSACTIONS ==========

  async addTransaction(transaction) {
    const { error } = await supabase.from('transactions').insert({
      transaction_id: transaction.transactionId,
      timestamp: transaction.timestamp || new Date().toISOString(),
      action: transaction.action,
      item_id: transaction.itemId,
      event_id: transaction.eventId || null,
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
      .select('*, events(id, name)')
      .eq('item_id', itemId.trim())
      .order('timestamp', { ascending: false });
    if (error) throw error;

    return data.map(row => ({
      timestamp: row.timestamp,
      action: row.action,
      itemId: row.item_id,
      eventId: row.event_id || null,
      outingName: row.events?.name || '',
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
      .select('*, events(id, name)', { count: 'exact' });

    if (dateRange && dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      if (!isNaN(daysAgo)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysAgo);
        query = query.gte('timestamp', cutoff.toISOString());
      }
    }

    if (outing && outing.trim() !== '') {
      // Find event IDs whose name matches the search string
      const { data: matchingEvents } = await supabase
        .from('events')
        .select('id')
        .ilike('name', `%${outing.trim()}%`);
      const eventIds = (matchingEvents || []).map(e => e.id);
      if (eventIds.length === 0) {
        return { transactions: [], total: 0 };
      }
      query = query.in('event_id', eventIds);
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
        eventId: row.event_id || null,
        outingName: row.events?.name || '',
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
      .select('event_id, timestamp, events(id, name)')
      .not('event_id', 'is', null);
    if (error) throw error;

    const eventMap = new Map();
    data.forEach(row => {
      const id = row.event_id;
      const name = row.events?.name || `Event ${id}`;
      if (!eventMap.has(id)) {
        eventMap.set(id, { eventId: id, outingName: name, count: 0, minTimestamp: row.timestamp });
      }
      const o = eventMap.get(id);
      o.count++;
      if (row.timestamp && (!o.minTimestamp || row.timestamp < o.minTimestamp)) {
        o.minTimestamp = row.timestamp;
      }
    });

    return Array.from(eventMap.values())
      .map(({ eventId, outingName, count, minTimestamp }) => ({
        eventId,
        outingName,
        transactionCount: count,
        minTimestamp,
      }))
      .sort((a, b) => {
        if (!a.minTimestamp) return 1;
        if (!b.minTimestamp) return -1;
        return b.minTimestamp.localeCompare(a.minTimestamp);
      });
  },

  async getOutingItemBreakdown(outingNameOrEventId) {
    // Accept either numeric event ID or event name string
    let eventId = parseInt(outingNameOrEventId, 10);
    let resolvedName = outingNameOrEventId;

    if (isNaN(eventId)) {
      const { data: ev } = await supabase
        .from('events')
        .select('id, name')
        .eq('name', outingNameOrEventId)
        .maybeSingle();
      eventId = ev?.id;
      resolvedName = ev?.name || outingNameOrEventId;
    } else {
      const { data: ev } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .maybeSingle();
      resolvedName = ev?.name || outingNameOrEventId;
    }

    if (!eventId) {
      return { outingName: resolvedName, totalUniqueItems: 0, checkedOut: 0, checkedIn: 0, checkedOutItems: [], checkedInItems: [] };
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('item_id, action, timestamp')
      .eq('event_id', eventId)
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
      outingName: resolvedName,
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
      .select('*, events(id, name)')
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
      event_id: null,
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
      updateData.event_id = null;
    }

    const { error } = await supabase.from('items').update(updateData).eq('item_id', itemId);
    if (error) throw error;
  },

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

  async createReservation(itemIds, eventId, reservedBy, reservedEmail) {
    // Upsert reservation record (allows re-reserving same event)
    const { error: resError } = await supabase
      .from('reservations')
      .upsert(
        { event_id: eventId, reserved_by: reservedBy, reserved_email: reservedEmail, created_at: new Date().toISOString() },
        { onConflict: 'event_id' }
      );
    if (resError) throw resError;

    // Un-reserve any items currently reserved for this event
    const { error: clearError } = await supabase
      .from('items')
      .update({ status: 'In shed', event_id: null, updated_at: new Date().toISOString() })
      .eq('status', 'Reserved')
      .eq('event_id', eventId);
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
            event_id: eventId,
            updated_at: new Date().toISOString(),
          })
          .eq('item_id', itemId);
        if (updateError) throw updateError;

        results.push({ itemId, success: true, description: item.description, itemDesc: item.itemDesc });
      } catch (err) {
        results.push({ itemId, success: false, error: err.message });
      }
    }
    return results;
  },

  async getReservations() {
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .select('event_id, reserved_by, reserved_email, created_at, events(id, name)')
      .order('created_at', { ascending: false });
    if (resError) throw resError;

    const result = [];
    for (const res of resData) {
      const { count, error: countError } = await supabase
        .from('items')
        .select('item_id', { count: 'exact', head: true })
        .eq('status', 'Reserved')
        .eq('event_id', res.event_id);
      if (countError) throw countError;
      if (count > 0) {
        result.push({
          eventId: res.event_id,
          outingName: res.events?.name || `Event ${res.event_id}`,
          reservedBy: res.reserved_by,
          reservedEmail: res.reserved_email,
          itemCount: count,
          createdAt: res.created_at,
        });
      }
    }
    return result;
  },

  async getReservationItems(eventId) {
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .select('event_id, reserved_by, reserved_email, created_at, events(id, name)')
      .eq('event_id', eventId)
      .maybeSingle();
    if (resError) throw resError;
    if (!resData) return null;

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*, events(id, name)')
      .eq('status', 'Reserved')
      .eq('event_id', eventId)
      .order('item_class')
      .order('item_num');
    if (itemsError) throw itemsError;

    return {
      eventId: resData.event_id,
      outingName: resData.events?.name || `Event ${resData.event_id}`,
      reservedBy: resData.reserved_by,
      reservedEmail: resData.reserved_email,
      createdAt: resData.created_at,
      items: items.map(mapRowToItem),
    };
  },

  async deleteReservation(eventId) {
    // Un-reserve any items still reserved for this event
    const { error: itemsError } = await supabase
      .from('items')
      .update({ status: 'In shed', event_id: null, updated_at: new Date().toISOString() })
      .eq('status', 'Reserved')
      .eq('event_id', eventId);
    if (itemsError) throw itemsError;

    const { error: resError } = await supabase
      .from('reservations')
      .delete()
      .eq('event_id', eventId);
    if (resError) throw resError;
  },

  // Expose the raw client for keep-alive ping in server.js
  client: supabase,
};

module.exports = supabaseAPI;
