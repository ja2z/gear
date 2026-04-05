import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trash2, UserPlus } from 'lucide-react';
import SearchableSegmentedToolbar from '../../components/SearchableSegmentedToolbar';
import { useMembersMock } from '../../context/MembersMockContext';
import { buildGroupedSections } from '../../data/membersMockData';
import { AnimateMain, SegmentSwitchAnimate } from '../../components/AnimateMain';
import EditMember from './EditMember';
import AddMember from './AddMember';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';

const VIEW_TABS = [
  { key: 'grouped', label: 'Grouped' },
  { key: 'all', label: 'All A–Z' },
];

function roleBadgeClass(role) {
  switch (role) {
    case 'Admin':
      return 'inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-900';
    case 'QM':
      return 'inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900';
    default:
      return 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700';
  }
}

function emailBadgeClass(hasEmail) {
  return hasEmail
    ? 'inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800'
    : 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600';
}

function MemberCard({
  m,
  canEdit,
  onEdit,
  onDelete,
  formatAdded,
}) {
  const hasEmail = Boolean((m.email || '').trim());
  const isYouth = m.memberKind === 'youth';

  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">{m.fullName}</span>
        {canEdit && (
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-lg leading-none text-scout-blue hover:bg-scout-blue/10"
            aria-label={`Edit ${m.fullName}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(m);
            }}
          >
            ✏️
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-700">{hasEmail ? m.email : 'No email on file'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className={roleBadgeClass(m.role || 'Basic')}>{m.role || 'Basic'}</span>
        <span className={emailBadgeClass(hasEmail)}>{hasEmail ? 'Email on file' : 'No email'}</span>
        {isYouth ? (
          <>
            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
              {m.patrol === 'Unassigned' || !m.patrol ? 'Unassigned' : `${m.patrol} Patrol`}
            </span>
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              {m.rank || 'Scout'}
            </span>
          </>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
            {m.adultLabel || 'Adult'}
          </span>
        )}
      </div>
      {formatAdded(m.createdAt) && (
        <p className="mt-1 text-xs text-gray-600">Added {formatAdded(m.createdAt)}</p>
      )}
    </>
  );

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div
          className={`min-w-0 flex-1 ${canEdit ? 'cursor-pointer' : ''}`}
          onClick={() => canEdit && onEdit(m)}
          onKeyDown={(e) => {
            if (canEdit && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onEdit(m);
            }
          }}
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
        >
          {body}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(m);
            }}
            className="remove-item-btn-clean ml-1 shrink-0 touch-target"
            title="Remove member"
            aria-label={`Remove ${m.fullName}`}
          >
            <Trash2 className="h-4 w-4 text-gray-500" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

const ManageMembers = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { listMembers, deleteMember, canEditRoster } = useMembersMock();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grouped');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);

  const members = useMemo(() => listMembers(searchQuery), [listMembers, searchQuery]);
  const totalCount = useMemo(() => listMembers('').length, [listMembers]);
  const groupedSections = useMemo(() => buildGroupedSections(members), [members]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      deleteMember(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      window.alert(err.message || 'Could not delete member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (member) => {
    if (!canEditRoster) return;
    setEditingMemberId(member.id);
  };

  const openAddMemberModal = () => {
    setAddModalKey((k) => k + 1);
    setAddingMember(true);
  };

  useEffect(() => {
    if (location.state?.openAddMember) {
      setAddModalKey((k) => k + 1);
      setAddingMember(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!editingMemberId && !addingMember) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (editingMemberId) setEditingMemberId(null);
      else if (addingMember) setAddingMember(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [editingMemberId, addingMember]);

  const formatAdded = (iso) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/manage" className="back-button no-underline" aria-label="Back to manage data">
          ←
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1">
          <h1 className="!flex-none text-center text-truncate">Members</h1>
          <span className="text-xs font-medium text-gray-400">
            {totalCount} {totalCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <SearchableSegmentedToolbar
        tabs={VIEW_TABS}
        segmentValue={viewMode}
        onSegmentChange={(key) => {
          setViewMode(key);
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchPlaceholder="Search name, email, patrol, rank…"
      />

      {canEditRoster && (
        <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={openAddMemberModal}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-scout-green/20 bg-scout-green/12 text-base font-medium text-scout-green touch-target transition-colors hover:bg-scout-green/18 active:bg-scout-green/22"
          >
            <UserPlus className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            Add member
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <SegmentSwitchAnimate key={viewMode} className="min-h-0">
        <div className="space-y-3 px-5 py-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))]">
          {members.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {searchQuery.trim()
                ? 'No members match your search.'
                : 'No members in the roster.'}
            </p>
          ) : viewMode === 'grouped' ? (
            groupedSections.map((section) => (
              <section key={section.key} className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900">
                  {section.title}{' '}
                  <span className="text-sm font-normal text-gray-500">({section.members.length})</span>
                </h2>
                {section.members.map((m) => (
                  <MemberCard
                    key={m.id}
                    m={m}
                    canEdit={canEditRoster}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                    formatAdded={formatAdded}
                  />
                ))}
              </section>
            ))
          ) : (
            members.map((m) => (
              <MemberCard
                key={m.id}
                m={m}
                canEdit={canEditRoster}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                formatAdded={formatAdded}
              />
            ))
          )}
        </div>
        </SegmentSwitchAnimate>
      </div>
      </AnimateMain>

      {deleteTarget && (
        <div
          className={`fixed inset-0 flex items-end justify-center bg-black/40 ${
            editingMemberId || addingMember ? 'z-[120]' : 'z-50'
          }`}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white px-5 pt-5 pb-8">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Remove member?</h2>
            <p className="mb-1 text-sm text-gray-600">
              <span className="font-medium">{deleteTarget.fullName}</span>
            </p>
            <p className="mb-6 text-sm text-gray-500">
              This removes them from the roster. You can add them again later.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="touch-target h-12 flex-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="touch-target h-12 flex-1 rounded-md bg-scout-red/12 border border-scout-red/20 text-sm font-medium text-scout-red disabled:opacity-50"
              >
                {deleteLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMemberId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-member-modal-title"
        >
          <button
            type="button"
            className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
            aria-label="Close editor"
            onClick={() => setEditingMemberId(null)}
          />
          <div className="modal-dialog-panel-enter relative z-[101] flex max-h-[96dvh] w-full max-w-md flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-gray-100 shadow-2xl">
            <EditMember
              key={editingMemberId}
              memberId={editingMemberId}
              onClose={() => setEditingMemberId(null)}
            />
          </div>
        </div>
      )}

      {addingMember && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-modal-title"
        >
          <button
            type="button"
            className="modal-dialog-backdrop-enter absolute inset-0 bg-black/45"
            aria-label="Close add member"
            onClick={() => setAddingMember(false)}
          />
          <div className="modal-dialog-panel-enter relative z-[101] flex max-h-[96dvh] w-full max-w-md flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-gray-100 shadow-2xl">
            <AddMember key={addModalKey} onClose={() => setAddingMember(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMembers;
