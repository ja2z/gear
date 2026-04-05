import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = '/api';

const VerifyPage = () => {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { refreshUser }   = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token found in URL.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');

        await refreshUser();
        navigate('/home', { replace: true });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="h-screen-small flex flex-col items-center justify-center bg-gray-100 px-5">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Login link invalid</h2>
        <p className="text-gray-500 text-center mb-6 text-sm">{error}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="rounded-3xl py-3 px-8 bg-scout-blue text-white font-bold"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen-small flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-scout-blue mx-auto mb-3" />
        <p className="text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
};

export default VerifyPage;
