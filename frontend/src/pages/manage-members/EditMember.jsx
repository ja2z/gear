import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Toast from '../../components/Toast';
import SegmentedControl from '../../components/SegmentedControl';
import { useToast } from '../../hooks/useToast';
import { useMembersMock } from '../../context/MembersMockContext';
import {
  PATROLS,
  BSA_RANKS,
  ADULT_LABELS,
  defaultAdultLabel,
  defaultPatrolForYouth,
  defaultRankForYouth,
} from '../../data/membersMockData';
import { AnimateMain, SegmentSwitchAnimate } from '../../components/AnimateMain';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';

const ROLE_TABS = [
  { key: 'Admin', label: 'Admin' },
  { key: 'QM', label: 'QM' },
  { key: 'Basic', label: 'Basic' },
];

const KIND_TABS = [
  { key: 'youth', label: 'Youth' },
  { key: 'adult', label: 'Adult' },
];

const selectClass =
  'w-full rounded-full border-2 border-[#d1d5db] bg-white px-4 py-3 text-base text-gray-900 focus:border-scout-blue focus:outline-none';

const selectClassModal =
  'w-full rounded-full border-2 border-[#d1d5db] bg-white px-3 py-2 text-base text-gray-900 focus:border-scout-blue focus:outline-none';

const normalizeRole = (r) => {
  const allowed = ['Admin', 'QM', 'Basic'];
  return allowed.includes(r) ? r : 'Basic';
};

const EditMember = ({ memberId: memberIdProp, onClose }) => {
  const params = useParams();
  const id = memberIdProp ?? params.id;
  const navigate = useNavigate();
  const isModal = Boolean(onClose);
  const { toast, showToast, hideToast } = useToast();
  const { getMember, updateMember, canEditRoster } = useMembersMock();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Basic');
  const [memberKind, setMemberKind] = useState('adult');
  const [patrol, setPatrol] = useState(defaultPatrolForYouth());
  const [rank, setRank] = useState(defaultRankForYouth());
  const [adultLabel, setAdultLabel] = useState(defaultAdultLabel());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEditRoster) {
      showToast('Only admins can edit the roster.', 'error');
      if (onClose) onClose();
      else navigate('/manage/members', { replace: true });
    }
  }, [canEditRoster, navigate, onClose, showToast]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const m = getMember(id);
    if (!m) {
      showToast('Member not found', 'error');
      if (onClose) onClose();
      else navigate('/manage/members', { replace: true });
      return;
    }
    setFullName(m.fullName || '');
    setEmail(m.email || '');
    setRole(normalizeRole(m.role));
    const kind = m.memberKind === 'youth' ? 'youth' : 'adult';
    setMemberKind(kind);
    setPatrol(m.patrol || defaultPatrolForYouth());
    setRank(m.rank || defaultRankForYouth());
    setAdultLabel(m.adultLabel || defaultAdultLabel());
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when member id changes
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      showToast('Please enter a name', 'error');
      return;
    }
    try {
      setSaving(true);
      updateMember(id, {
        fullName: name,
        email: email.trim(),
        role,
        memberKind,
        patrol: memberKind === 'youth' ? patrol : null,
        rank: memberKind === 'youth' ? rank : null,
        adultLabel: memberKind === 'adult' ? adultLabel : null,
      });
      showToast('Saved', 'success');
      setTimeout(() => {
        if (onClose) onClose();
        else navigate('/manage/members');
      }, 600);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!canEditRoster) {
    return null;
  }

  const rootClass = isModal
    ? 'flex flex-col bg-gray-100'
    : 'h-screen-small flex flex-col bg-gray-100';

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-scout-blue" />
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="header">
        {isModal ? (
          <button type="button" onClick={onClose} className="back-button" aria-label="Close editor">
            ←
          </button>
        ) : (
          <Link to="/manage/members" className="back-button no-underline">
            ←
          </Link>
        )}
        <h1 id={isModal ? 'edit-member-modal-title' : undefined}>Edit member</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain
        className={isModal ? 'flex flex-col overflow-visible' : 'flex flex-1 flex-col min-h-0'}
      >
      <div className={isModal ? '' : 'flex-1 overflow-y-auto'}>
        <form
          onSubmit={handleSubmit}
          className={`mx-auto w-full max-w-xl ${
            isModal ? 'space-y-3 px-4 py-3 pb-4' : 'space-y-6 px-5 py-6'
          }`}
        >
          <div>
            <label
              htmlFor="edit-fullName"
              className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
            >
              Full name
            </label>
            <input
              id="edit-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={isModal ? 'search-input !py-2' : 'search-input'}
              placeholder="e.g. Alex Smith"
              autoComplete="name"
              disabled={saving}
            />
          </div>
          <div>
            <label
              htmlFor="edit-email"
              className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
            >
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={isModal ? 'search-input !py-2' : 'search-input'}
              placeholder="optional"
              autoComplete="email"
              disabled={saving}
            />
          </div>
          <div>
            <span
              className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
            >
              Youth or adult
            </span>
            <SegmentedControl tabs={KIND_TABS} value={memberKind} onChange={setMemberKind} />
          </div>
          <SegmentSwitchAnimate key={memberKind} className={isModal ? 'space-y-3' : 'space-y-6'}>
          {memberKind === 'youth' ? (
            <>
              <div>
                <label
                  htmlFor="edit-patrol"
                  className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
                >
                  Patrol
                </label>
                <select
                  id="edit-patrol"
                  value={patrol}
                  onChange={(e) => setPatrol(e.target.value)}
                  className={isModal ? selectClassModal : selectClass}
                  disabled={saving}
                >
                  {PATROLS.map((p) => (
                    <option key={p} value={p}>
                      {p === 'Unassigned' ? 'Unassigned' : `${p} Patrol`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="edit-rank"
                  className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
                >
                  Rank (Scouts BSA)
                </label>
                <select
                  id="edit-rank"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className={isModal ? selectClassModal : selectClass}
                  disabled={saving}
                >
                  {BSA_RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label
                htmlFor="edit-adultLabel"
                className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
              >
                Adult category
              </label>
              <select
                id="edit-adultLabel"
                value={adultLabel}
                onChange={(e) => setAdultLabel(e.target.value)}
                className={isModal ? selectClassModal : selectClass}
                disabled={saving}
              >
                {ADULT_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}
          </SegmentSwitchAnimate>
          <div>
            <span
              className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
            >
              App permission
            </span>
            <SegmentedControl tabs={ROLE_TABS} value={role} onChange={setRole} />
          </div>
          <div className={isModal ? 'pt-3' : ''}>
            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="btn-primary-pill w-full"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
      </AnimateMain>
    </div>
  );
};

export default EditMember;
