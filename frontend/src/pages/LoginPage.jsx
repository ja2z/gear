import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { useAuth } from '../context/AuthContext';
import TroopBrandHeader from '../components/TroopBrandHeader';
import { AnimateMain } from '../components/AnimateMain';

const API_BASE_URL = getApiBaseUrl();

const loginHeaderCenter = (
  <div className="flex flex-col items-center gap-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Scouts BSA</p>
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
      <h1 className="text-lg font-semibold leading-none text-gray-900 sm:text-xl">Troop 222</h1>
      <span className="text-sm text-gray-500">Troop tools</span>
    </div>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { devBypassLogin } = useAuth();
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          'The server did not return JSON (often the API is down or misconfigured). In dev, run the backend on port 3001 and avoid setting VITE_API_URL to the Vite URL (use relative /api).'
        );
      }
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    devBypassLogin?.();
    navigate('/home', { replace: true });
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <TroopBrandHeader center={loginHeaderCenter} />

      <AnimateMain className="flex-1 flex flex-col items-center justify-center px-5">
        {sent ? (
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm">
              If that email is registered, we sent a login link. It expires in 15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Use the email on file with the troop. After you sign in, you will land on the{' '}
                <span className="text-gray-700 font-medium">troop hub</span> (gear, outings, and manage).
              </p>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-scout-blue/35 bg-white"
            />

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center rounded-3xl py-4
                         bg-scout-blue/12 border border-scout-blue/20 text-scout-blue font-bold text-base
                         disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending…' : 'Send Login Link'}
            </button>

            {import.meta.env.DEV && typeof devBypassLogin === 'function' && (
              <button
                type="button"
                onClick={handleDevBypass}
                className="w-full text-center text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl py-3 px-3 font-medium"
              >
                Continue without signing in (dev only)
              </button>
            )}
          </form>
        )}
      </AnimateMain>
    </div>
  );
};

export default LoginPage;
