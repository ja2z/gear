const express = require('express');
const router = express.Router();
const supabaseAPI = require('../services/supabase-api');

const ROLE_NAME_TO_ID = { Admin: 1, QM: 2, Basic: 3 };

// GET /api/manage/members/roles — list roles ordered by id
router.get('/roles', async (req, res) => {
  try {
    const roles = await supabaseAPI.getRoles();
    res.json(roles);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/manage/members — list all members
router.get('/', async (req, res) => {
  try {
    const members = await supabaseAPI.getMembers();
    res.json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /api/manage/members — create a member
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, role, dob } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    const roleId = ROLE_NAME_TO_ID[role] ?? 3;
    const member = await supabaseAPI.createMember({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      roleId,
      dob: dob || '1970-01-01',
    });
    res.status(201).json(member);
  } catch (err) {
    console.error('Error creating member:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// PUT /api/manage/members/:id — update a member
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid member ID' });
    const { firstName, lastName, email, role, dob } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    const roleId = ROLE_NAME_TO_ID[role] ?? 3;
    const member = await supabaseAPI.updateMember(id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      roleId,
      dob: dob || '1970-01-01',
    });
    res.json(member);
  } catch (err) {
    console.error('Error updating member:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/manage/members/:id — delete a member
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid member ID' });
    await supabaseAPI.deleteMember(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
