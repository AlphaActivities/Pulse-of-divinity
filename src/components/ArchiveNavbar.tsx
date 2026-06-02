import { useState, useEffect } from 'react';

export default function ArchiveNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'
      }`}
      role="navigation"
      aria-label="Archive navigation"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 flex items-center justify-between">

        {/* Logo + wordmark */}
        <button
          onClick={() => { window.location.hash = ''; }}
          aria-label="Pulse of Divinity — return to home"
          className="flex items-center gap-3 group shrink-0"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <img
            src="/images/Darcy-logo.PNG"
            alt="Pulse of Divinity logo"
            style={{
              height: 'clamp(60px, 10vw, 82px)',
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.92,
              margin: '-12px 0',
            }}
          />
          <div className="flex flex-col items-start">
            <span
              className="block transition-all duration-500 group-hover:tracking-wider"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#3e2240',
                lineHeight: 1.2,
              }}
            >
              Pulse of Divinity
            </span>
            <span
              className="block"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: '11.5px',
                letterSpacing: '0.38em',
                textTransform: 'uppercase',
                color: '#c9a227',
              }}
            >
              Original Fine Art
            </span>
          </div>
        </button>

      </div>
    </nav>
  );
}
