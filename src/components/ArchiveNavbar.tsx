import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ArchiveNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
              transition: 'opacity 0.3s ease',
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
                color: scrolled ? '#3e2240' : '#fdf9ed',
                lineHeight: 1.2,
              }}
            >
              Pulse of Divinity
            </span>
            <span
              className="block transition-colors duration-500"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: '11.5px',
                letterSpacing: '0.38em',
                textTransform: 'uppercase',
                color: scrolled ? '#c9a227' : 'rgba(250,224,140,0.72)',
              }}
            >
              Original Fine Art
            </span>
          </div>
        </button>

        {/* Back button */}
        <button
          onClick={handleBack}
          aria-label="Back to Pulse of Divinity"
          className="flex items-center shrink-0"
          style={{
            gap: '0.55rem',
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: `1px solid ${scrolled ? 'rgba(201,162,39,0.32)' : 'rgba(255,255,255,0.22)'}`,
            padding: '0.45rem 1rem 0.45rem 0.75rem',
            cursor: 'pointer',
            transition: 'border-color 0.4s ease, background 0.4s ease, transform 0.3s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = scrolled ? 'rgba(201,162,39,0.65)' : 'rgba(255,255,255,0.55)';
            el.style.background = scrolled ? 'rgba(201,162,39,0.07)' : 'rgba(255,255,255,0.08)';
            el.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = scrolled ? 'rgba(201,162,39,0.32)' : 'rgba(255,255,255,0.22)';
            el.style.background = 'none';
            el.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft
            size={14}
            color={scrolled ? 'rgba(166,124,40,1)' : 'rgba(255,255,255,0.85)'}
            strokeWidth={1.5}
          />
          <span
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 300,
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: scrolled ? 'rgba(166,124,40,1)' : 'rgba(255,255,255,0.85)',
              whiteSpace: 'nowrap',
              transition: 'color 0.4s ease',
            }}
          >
            Back to Pulse of Divinity
          </span>
        </button>

      </div>
    </nav>
  );
}
