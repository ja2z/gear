const MESSAGES = {
  network:      'Signal looks weak out here — still trying to connect…',
  backend:      'Connection is fine — server is taking a moment…',
  signal_ok:    'Signal improved — server still loading…',
  backend_long: 'Server is warming up. Free servers take ~30s on first start.',
};

const SlowLoadHint = ({ hint }) => {
  if (!hint) return null;
  return (
    <p className="text-sm text-gray-400 mt-3 animate-pulse text-center px-4">
      {MESSAGES[hint]}
    </p>
  );
};

export default SlowLoadHint;
