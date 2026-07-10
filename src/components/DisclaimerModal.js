import { useEffect, useState } from 'react';

const ACCEPTED_KEY = 'investorai-disclaimer-accepted';

// localStorage can throw (private-browsing quota limits on some mobile
// browsers) — a disclaimer modal reappearing once in a while is a much
// smaller problem than that throw taking down the whole app.
function hasAccepted() {
  try {
    return localStorage.getItem(ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
}

function persistAccepted() {
  try {
    localStorage.setItem(ACCEPTED_KEY, '1');
  } catch {
    // Worst case the disclaimer shows again next visit.
  }
}

export default function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasAccepted()) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    persistAccepted();
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <p className="text-sm text-slate-200 leading-relaxed mb-6">
          ⚠️ InvestorAI Pro предоставя инструменти за образование и анализ. Информацията НЕ представлява
          финансов съвет. Консултирайте се с лицензиран финансов съветник.
        </p>
        <button
          onClick={handleAccept}
          className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Разбрах
        </button>
      </div>
    </div>
  );
}
