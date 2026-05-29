import { useState } from 'react';
import { Instagram, Facebook, Mail } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import PrivacyModal from './PrivacyModal';
import TermsModal from './TermsModal';

const navLinks = [
  { label: 'Home',                href: '#home' },
  { label: 'Available Works',     href: '#works' },
  { label: 'About the Artist',    href: '#about' },
  { label: 'Private Commissions', href: '#commissions' },
  { label: 'Contact',             href: '#contact' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { ref, visible } = useReveal();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen,   setTermsOpen]   = useState(false);

  return (
    <>
    <footer
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #2a1629 0%, #3e2240 100%)',
        paddingTop: '5rem',
        paddingBottom: '3rem',
      }}
    >
      {/* Ambient top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '500px',
          height: '200px',
          background: 'radial-gradient(ellipse, rgba(201,162,39,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Floating subtle particle */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute particle-glow pointer-events-none"
          style={{
            width: '3px',
            height: '3px',
            left: `${25 + i * 25}%`,
            top: `${30 + i * 15}%`,
            opacity: 0.2,
            animation: `particleDrift ${9 + i * 3}s ease-in-out ${i * 2.5}s infinite`,
          }}
        />
      ))}

      <div
        ref={ref}
        className={`max-w-5xl mx-auto px-6 md:px-12 reveal ${visible ? 'visible' : ''}`}
      >
        {/* Main */}
        <div className="text-center mb-14">
          <div className="flex flex-col items-center gap-5 mb-3">
            <img
              src="/images/Darcy-logo.PNG"
              alt="Pulse of Divinity logo"
              style={{
                display: 'block',
                height: '160px',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                margin: '0 auto',
                transform: 'translateX(-24px)',
                opacity: 0.88,
              }}
            />
            <p
              className="text-ivory-100"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                fontSize: '1.75rem',
                letterSpacing: '0.14em',
              }}
            >
              Pulse of Divinity
            </p>
          </div>
          <p className="luxury-subheading text-gold-500 tracking-[0.42em] mb-10" style={{ fontSize: '1rem' }}>
            Original Fine Art · Darcy
          </p>

          <div
            style={{
              height: '1px',
              width: visible ? '60px' : '0',
              background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.7), transparent)',
              margin: '0 auto 2.5rem',
              transition: 'width 1.2s ease 0.3s',
            }}
          />

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
              {navLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="nav-link"
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      fontWeight: 300,
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgba(250,243,217,0.5)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.5)'; }}
                    onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
                    onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.5)'; }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Social icons row */}
        <div className="flex items-center justify-center gap-5 mb-10">
          {[
            { href: 'https://www.instagram.com/pulseofdivinity/', icon: Instagram, label: 'Instagram' },
            { href: 'https://www.facebook.com/pulseofdivinity',   icon: Facebook,  label: 'Facebook'  },
            { href: 'mailto:darcy.pulseofdivinity@gmail.com',      icon: Mail,      label: 'Email'     },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
              aria-label={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                border: '1px solid rgba(201,162,39,0.22)',
                color: 'rgba(201,162,39,0.65)',
                textDecoration: 'none',
                transition: 'border-color 0.35s ease, color 0.35s ease, background 0.35s ease',
              }}
              onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.6)'; el.style.color='#c9a227'; el.style.background='rgba(201,162,39,0.07)'; }}
              onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.22)'; el.style.color='rgba(201,162,39,0.65)'; el.style.background='transparent'; }}
              onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.6)'; el.style.color='#c9a227'; el.style.background='rgba(201,162,39,0.07)'; }}
              onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.22)'; el.style.color='rgba(201,162,39,0.65)'; el.style.background='transparent'; }}
            >
              <Icon size={15} strokeWidth={1.5} />
            </a>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3"
          style={{ paddingTop: '2rem', borderTop: '1px solid rgba(201,162,39,0.1)' }}
        >
          <p
            className="sm:flex-1"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 300,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'rgba(250,243,217,0.55)',
            }}
          >
            &copy; {year} Pulse of Divinity. All rights reserved.
          </p>

          <p
            className="sm:flex-1 text-center"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontSize: '0.9rem',
              fontStyle: 'italic',
              color: 'rgba(250,243,217,0.55)',
            }}
          >
            Art that lives in the soul.
          </p>

          <p
            className="sm:flex-1 sm:text-right"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 300,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'rgba(250,243,217,0.55)',
            }}
          >
            <button
              onClick={() => setPrivacyOpen(true)}
              style={{ color: 'rgba(250,243,217,0.55)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', transition: 'color 0.3s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.55)'; }}
              onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.55)'; }}
            >
              Privacy
            </button>
            {' · '}
            <button
              onClick={() => setTermsOpen(true)}
              style={{ color: 'rgba(250,243,217,0.55)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', transition: 'color 0.3s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.55)'; }}
              onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.color = '#c9a227'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,243,217,0.55)'; }}
            >
              Terms
            </button>
          </p>
        </div>
      </div>
    </footer>

    <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    <TermsModal   open={termsOpen}   onClose={() => setTermsOpen(false)}   />
    </>
  );
}
