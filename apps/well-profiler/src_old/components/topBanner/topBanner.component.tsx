'use client';

import React, { useEffect, useState } from 'react';

const DISMISSED_KEY = 'welldot-legacy-banner-dismissed';

function TopBanner() {
  // Visible by default so it's present in the server-rendered HTML (SEO
  // crawlers read this, not the post-hydration state). Only hidden client-side
  // for visitors who already dismissed it.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const handleClose = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="w-full bg-[#02355a] text-white px-3 py-2 flex flex-row items-center justify-center gap-3 text-center text-sm">
      <span>
        Este é o antigo Well Profiler. Conheça a nova versão, mais completa,
        em{' '}
        <a
          href="https://welldot.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline decoration-[#ff9e2e] underline-offset-2"
        >
          welldot.org →
        </a>
      </span>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Fechar aviso"
        className="ml-2 shrink-0 text-white/80 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

export default TopBanner;
