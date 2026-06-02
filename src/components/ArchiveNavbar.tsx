import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

export default function ArchiveNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '';
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'
      }`}
      role="navigation"
      aria-label="Archive navigation"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 flex items-center">

        {/* Left column — Back button */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
            transition: `opacity 900ms ${EASE}, transform 900ms ${EASE}`,
          }}
        >
          <button
            onClick={handleBack}
            aria-label="Back to Pulse of Divinity"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'none',
              border: '1px solid rgba(201,162,39,0.32)',
              padding: '0.45rem 1rem 0.45rem 0.75rem',
              cursor: 'pointer',
              transition: 'border-color 0.4s ease, background 0.4s ease, transform 0.3s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(201,162,39,0.65)';
              el.style.background = 'rgba(201,162,39,0.07)';
              el.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(201,162,39,0.32)';
              el.style.background = 'none';
              el.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={14} color="rgba(166,124,40,1)" strokeWidth={1.5} />
            <span
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(166,124,40,1)',
                whiteSpace: 'nowrap',
              }}
            >
              Back to Pulse of Divinity
            </span>
          </button>
        </div>

        {/* Center column — Logo + wordmark */}
        <button
          onClick={() => { window.location.hash = ''; }}
          aria-label="Pulse of Divinity — return to home"
          className="flex items-center gap-3 group shrink-0"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(20px)',
            transition: `opacity 900ms ${EASE} 80ms, transform 900ms ${EASE} 80ms`,
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

        {/* Right column — invisible balance spacer */}
        <div style={{ flex: 1 }} aria-hidden="true" />

      </div>
    </nav>
  );
}
