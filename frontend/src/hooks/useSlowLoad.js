import { useState, useEffect } from 'react';

const PING_URL = 'https://1.1.1.1/cdn-cgi/trace';
const PING_TIMEOUT_MS = 1500;
// Delays (ms) at which to sample network reachability while loading
const PING_SCHEDULE = [2000, 5000, 10000];

async function pingNetwork() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    await fetch(PING_URL, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Hint values (in escalating order):
//   'network'       — ping failed, likely poor signal
//   'backend'       — ping passed, backend is just slow
//   'signal_ok'     — prior ping failed but latest passed; backend still loading
//   'backend_long'  — still loading at 10s, network is fine → Render cold start
export function useSlowLoad(isLoading) {
  const [hint, setHint] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      setHint(null);
      return;
    }

    let prevNetworkOk = null;
    const timers = [];

    PING_SCHEDULE.forEach((delay, i) => {
      const isLast = i === PING_SCHEDULE.length - 1;
      const t = setTimeout(async () => {
        const networkOk = await pingNetwork();

        if (!networkOk) {
          setHint('network');
        } else if (prevNetworkOk === false) {
          // Network was bad before but is OK now — signal improved
          setHint('signal_ok');
        } else if (isLast) {
          setHint('backend_long');
        } else {
          setHint('backend');
        }

        prevNetworkOk = networkOk;
      }, delay);

      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
      setHint(null);
    };
  }, [isLoading]);

  return hint;
}
