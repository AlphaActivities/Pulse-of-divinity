import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    heading: 'Information You Provide',
    body: 'When you submit the contact form, you may share your name, email address, phone number, preferred contact method, artwork interest, and a personal message. This information is given voluntarily and is used solely to respond to your inquiry.',
  },
  {
    heading: 'How It Is Used',
    body: 'Information submitted through this site is used only to communicate with you about artwork, commissions, availability, and matters directly related to Pulse of Divinity. It is not used for unrelated marketing or automated messaging.',
  },
  {
    heading: 'It Is Never Sold',
    body: 'Your personal information is not sold, rented, or shared with third parties for marketing or commercial purposes of any kind.',
  },
  {
    heading: 'Platform & Hosting',
    body: 'Basic analytics or access logs may be collected automatically by the website platform or hosting provider as part of normal site operation. This sits outside of Darcy\'s direct control.',
  },
  {
    heading: 'What To Avoid',
    body: 'Please do not submit sensitive personal information, such as financial details, passwords, or government identification, through the contact form.',
  },
  {
    heading: 'Your Rights',
    body: 'If you would like your submitted information removed or corrected, reach out directly using the contact details on this site. Requests are handled personally and promptly.',
  },
];

export default function PrivacyModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2rem)',
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(22,10,28,0.82)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-heading"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          background: 'linear-gradient(160deg, #fdfbf0 0%, #faf3d9 100%)',
          boxShadow: '0 40px 100px rgba(22,10,28,0.45), 0 0 0 1px rgba(201,162,39,0.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
          overflowY: 'auto',
        }}
      >
        {/* Gold top accent */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c9a227, transparent)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: 'clamp(1.75rem, 4vw, 2.5rem) clamp(1.75rem, 4vw, 2.75rem) 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: '0.68rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c9a227', marginBottom: '0.6rem' }}>
                Pulse of Divinity
              </p>
              <h2
                id="privacy-heading"
                style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing: '0.02em', lineHeight: 1.1, color: '#3e2240', marginBottom: '0.6rem' }}
              >
                Privacy Policy
              </h2>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(0.95rem, 1.6vw, 1.05rem)', color: '#6b5143', lineHeight: 1.6 }}>
                How your information is treated when you contact Pulse of Divinity.
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Close privacy policy"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                border: '1px solid rgba(201,162,39,0.3)',
                background: 'transparent',
                cursor: 'pointer',
                color: '#6b5143',
                transition: 'background 0.25s ease, border-color 0.25s ease',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,162,39,0.1)'; el.style.borderColor = 'rgba(201,162,39,0.55)'; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = 'rgba(201,162,39,0.3)'; }}
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, #c9a227, transparent)', width: '48px', margin: '1.4rem 0' }} />
        </div>

        {/* Body */}
        <div style={{ padding: '0 clamp(1.75rem, 4vw, 2.75rem) clamp(1.75rem, 4vw, 2.5rem)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sections.map((s) => (
              <div key={s.heading}>
                <h3 style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3e2240', marginBottom: '0.45rem' }}>
                  {s.heading}
                </h3>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(0.97rem, 1.6vw, 1.05rem)', lineHeight: 1.9, color: '#6b5143' }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(201,162,39,0.15)' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(107,81,67,0.7)', textAlign: 'center' }}>
              This policy reflects a personal, small-business practice built on trust and direct communication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
