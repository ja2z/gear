import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Toast from '../../components/Toast';
import SegmentedControl from '../../components/SegmentedControl';
import { useToast } from '../../hooks/useToast';
import { useMembersMock } from '../../context/MembersMockContext';
import { AnimateMain, SegmentSwitchAnimate } from '../../components/AnimateMain';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';

const KIND_TABS = [
  { key: 'youth', label: 'Youth' },
  { key: 'adult', label: 'Adult' },
];

const EditMember = ({ memberId: memberIdProp, onClose }) => {
  const params = useParams();
  const id = memberIdProp ?? (params.id ? parseInt(params.id, 10) : null);
  const navigate = useNavigate();
  const isModal = Boolean(onClose);
  const { toast, showToast, hideToast } = useToast();
  const { getMember, updateMember, canEditRoster, roles } = useMembersMock();
  const roleTabs = roles.map((r) => ({ key: r.name, label: r.name }));
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Basic');
  const [memberKind, setMemberKind] = useState('adult');
  const [dob, setDob] = useState('');
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
    setFirstName(m.firstName || '');
    setLastName(m.lastName || '');
    setEmail(m.email || '');
    const validRoles = roles.map((r) => r.name);
    setRole(validRoles.includes(m.role) ? m.role : (validRoles.at(-1) ?? 'Basic'));
    const kind = m.memberKind === 'youth' ? 'youth' : 'adult';
    setMemberKind(kind);
    // For youth: show actual dob; for adult: leave dob empty (will send 1970-01-01)
    setDob(kind === 'youth' && m.dob ? m.dob : '');
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when member id changes
  }, [id]);

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    (memberKind === 'adult' || dob);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        showToast('First name, last name, and email are required', 'error');
      } else if (memberKind === 'youth' && !dob) {
        showToast('Date of birth is required for youth', 'error');
      }
      return;
    }
    setSaving(true);
    try {
      await updateMember(id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        memberKind,
        dob: memberKind === 'adult' ? '1970-01-01' : dob,
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

  if (!canEditRoster) return null;

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

      <AnimateMain className={isModal ? 'flex flex-col overflow-visible' : 'flex flex-1 flex-col min-h-0'}>
        <div className={isModal ? '' : 'flex-1 overflow-y-auto'}>
          <form
            onSubmit={handleSubmit}
            className={`mx-auto w-full max-w-xl ${
              isModal ? 'space-y-3 px-4 py-3 pb-4' : 'space-y-6 px-5 py-6'
            }`}
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <label
                  htmlFor="edit-firstName"
                  className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
                >
                  First name <span className="text-scout-red">*</span>
                </label>
                <input
                  id="edit-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={isModal ? 'search-input !py-2' : 'search-input'}
                  placeholder="First"
                  autoComplete="given-name"
                  disabled={saving}
                  required
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="edit-lastName"
                  className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
                >
                  Last name <span className="text-scout-red">*</span>
                </label>
                <input
                  id="edit-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={isModal ? 'search-input !py-2' : 'search-input'}
                  placeholder="Last"
                  autoComplete="family-name"
                  disabled={saving}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-email"
                className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
              >
                Email <span className="text-scout-red">*</span>
              </label>
              <input
                id="edit-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={isModal ? 'search-input !py-2' : 'search-input'}
                placeholder="email@example.com"
                autoComplete="email"
                disabled={saving}
                required
              />
            </div>

            <div>
              <span className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}>
                Youth or adult
              </span>
              <SegmentedControl
                tabs={KIND_TABS}
                value={memberKind}
                onChange={(k) => {
                  setMemberKind(k);
                  if (k === 'adult') setDob('');
                }}
              />
            </div>

            <SegmentSwitchAnimate key={memberKind} className={isModal ? 'space-y-3' : 'space-y-6'}>
              {memberKind === 'youth' && (
                <div>
                  <label
                    htmlFor="edit-dob"
                    className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}
                  >
                    Date of birth <span className="text-scout-red">*</span>
                  </label>
                  <input
                    id="edit-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={isModal ? 'search-input !py-2' : 'search-input'}
                    disabled={saving}
                    required
                  />
                </div>
              )}
            </SegmentSwitchAnimate>

            <div>
              <span className={`${isModal ? 'mb-1' : 'mb-2'} block text-sm font-medium text-gray-700`}>
                App permission
              </span>
              <SegmentedControl tabs={roleTabs} value={role} onChange={setRole} />
            </div>

            <div className={isModal ? 'pt-3' : ''}>
              <button
                type="submit"
                disabled={saving || !isValid}
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
