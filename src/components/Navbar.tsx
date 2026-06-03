import { useState, useEffect, useCallback } from 'react';
import { scrollToSection } from '../utils/scrollToSection';

const navItems = [
  { label: 'Home',                href: '#home' },
  { label: 'Available Works',     href: '#works' },
  { label: 'About the Artist',    href: '#about' },
  { label: 'Collected Works',     href: '#collected-works' },
  { label: 'Private Commissions', href: '#commissions' },
  { label: 'Contact',             href: '#contact' },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const ids = navItems.map((n) => n.href.slice(1));
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el && window.scrollY >= el.offsetTop - 140) {
          setActiveIdx(i);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNav = useCallback((href: string) => {
    const wasOpen = menuOpen;
    setMenuOpen(false);
    document.body.style.overflow = '';
    if (href === '#collected-works') {
      setTimeout(() => { window.location.hash = '#collected-works'; }, wasOpen ? 80 : 0);
      return;
    }
    setTimeout(() => { scrollToSection(href); }, wasOpen ? 80 : 0);
  }, [menuOpen]);

  return (
    <>
      {/* ── Bar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-[background,border-color,box-shadow,backdrop-filter,-webkit-backdrop-filter] duration-500 ${
          scrolled ? 'glass-nav py-5' : 'bg-transparent py-5'
        }`}
        style={{ willChange: 'background, box-shadow', transform: 'translateZ(0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 flex items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => handleNav('#home')}
            aria-label="Pulse of Divinity — return to top"
            className="flex items-center gap-3 group shrink-0"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              opacity: menuOpen ? 0 : 1,
              pointerEvents: menuOpen ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
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

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-7 lg:gap-10" role="list">
            {navItems.map((item, i) => (
              <li key={item.label}>
                <button
                  onClick={() => handleNav(item.href)}
                  className="nav-link"
                  aria-current={i === activeIdx ? 'page' : undefined}
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 300,
                    fontSize: '10.5px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: i === activeIdx
                      ? (scrolled ? '#c9a227' : '#f4e89e')
                      : (scrolled ? '#6b5143' : 'rgba(250,243,217,0.72)'),
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 0',
                    transition: 'color 0.3s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Hamburger — morphs to X */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="md:hidden flex flex-col justify-center items-end"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              gap: 0,
              width: '44px',
              height: '44px',
              position: 'relative',
              zIndex: menuOpen ? 52 : undefined,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: i === 1 ? (menuOpen ? '0' : '24px') : '24px',
                  height: '1.5px',
                  background: menuOpen ? '#3e2240' : (scrolled ? '#3e2240' : '#fdf9ed'),
                  margin: '3px 0',
                  transformOrigin: 'center',
                  transition: 'transform 0.4s ease, opacity 0.35s ease, width 0.3s ease, background 0.3s ease',
                  transform:
                    menuOpen && i === 0 ? 'translateY(7px) rotate(45deg)' :
                    menuOpen && i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </nav>

      {/* ── Mobile backdrop ── */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 48,
          background: 'rgba(42,22,41,0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.45s ease',
        }}
      />

      {/* ── Mobile drawer ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(82vw, 320px)',
          zIndex: 51,
          background: 'linear-gradient(165deg, #fdfbf0 0%, #faf3d9 100%)',
          boxShadow: '-24px 0 70px rgba(42,22,41,0.28)',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 2.25rem',
          /* safe area for notch phones */
          paddingRight: 'max(2.25rem, env(safe-area-inset-right))',
        }}
      >
        {/* Gold top accent */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
        }} />

        {/* Close button */}
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation menu"
          style={{
            position: 'absolute',
            top: '18px',
            right: '20px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {[45, -45].map((deg, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                display: 'block',
                width: '22px',
                height: '1px',
                background: '#3e2240',
                transform: `rotate(${deg}deg)`,
              }}
            />
          ))}
        </button>

        <div style={{ width: '36px', height: '1px', background: 'linear-gradient(90deg,#c9a227,transparent)', marginBottom: '2rem' }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item, i) => (
            <li key={item.label} style={{ borderBottom: '1px solid rgba(201,162,39,0.1)' }}>
              <button
                onClick={() => handleNav(item.href)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 300,
                  fontSize: 'clamp(1.6rem, 5vw, 1.9rem)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.15,
                  color: i === activeIdx ? '#c9a227' : '#3e2240',
                  background: 'none',
                  border: 'none',
                  padding: '0.75rem 0',
                  cursor: 'pointer',
                  /* min tap target height */
                  minHeight: '52px',
                  transition: 'color 0.3s ease, padding-left 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.paddingLeft = '10px';
                  el.style.color = '#c9a227';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.paddingLeft = '0';
                  el.style.color = i === activeIdx ? '#c9a227' : '#3e2240';
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.paddingLeft = '10px';
                  el.style.color = '#c9a227';
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.paddingLeft = '0';
                  el.style.color = i === activeIdx ? '#c9a227' : '#3e2240';
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div style={{ width: '36px', height: '1px', background: 'linear-gradient(90deg,#c9a227,transparent)', marginTop: '2rem', marginBottom: '0.75rem' }} />
        <p style={{
          fontFamily: 'Jost, sans-serif',
          fontWeight: 300,
          fontSize: '8.5px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#9d7a62',
        }}>
          Fine Art · Original Works
        </p>
      </div>
    </>
  );
}
