import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const LoginPage = () => {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-scout-blue text-white py-5 px-4 shrink-0">
        <div className="flex items-center justify-center">
          <img src="/BSA_Logo.webp" alt="BSA Logo" className="h-10 w-auto mr-4" />
          <h1 className="text-xl font-semibold text-center">Troop 222 Gear Tracker</h1>
          <img src="/BSA_Logo.webp" alt="BSA Logo" className="h-10 w-auto ml-4" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5">
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
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500 mt-1 text-sm">Enter your email to receive a login link</p>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-scout-blue bg-white"
            />

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center rounded-3xl py-4
                         bg-scout-blue text-white font-bold text-base
                         disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending…' : 'Send Login Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
