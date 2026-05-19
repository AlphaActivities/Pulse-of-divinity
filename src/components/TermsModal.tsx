import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    heading: 'Ownership of All Content',
    body: 'All artwork, photography, written content, branding, logos, and visual materials presented on this site belong to their respective creator and owner. All rights are reserved.',
  },
  {
    heading: 'No Reproduction Without Permission',
    body: 'Site content, including artwork images, descriptions, and written materials, may not be copied, downloaded, reproduced, altered, distributed, or used commercially without explicit written permission from the owner.',
  },
  {
    heading: 'Availability & Pricing',
    body: 'Artwork availability, pricing, commission details, and timelines are subject to change at any time without notice. What you see on this site reflects the most current information available, though it does not constitute a binding offer.',
  },
  {
    heading: 'Inquiries Are Not Reservations',
    body: 'Submitting a contact form inquiry does not guarantee the availability of an artwork, acceptance of a commission, reservation of a piece, or any commitment from either party. All details are discussed and agreed upon individually.',
  },
  {
    heading: 'Commission Discussions',
    body: 'Commission pricing, scope, timelines, and final terms are handled through personal conversation. Nothing is confirmed or binding until both parties have agreed in writing.',
  },
  {
    heading: 'Purpose of This Site',
    body: 'This site exists for informational and inquiry purposes only. It is a personal portfolio and point of contact, not a retail storefront or automated transaction platform.',
  },
  {
    heading: 'Respectful Use',
    body: 'Visitors are asked to use this site with care and respect. The contact form is intended for genuine artwork inquiries. Misuse or abusive communication is not welcome and will not receive a response.',
  },
];

export default function TermsModal({ open, onClose }: Props) {
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
        aria-labelledby="terms-heading"
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
                id="terms-heading"
                style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing: '0.02em', lineHeight: 1.1, color: '#3e2240', marginBottom: '0.6rem' }}
              >
                Terms of Use
              </h2>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(0.95rem, 1.6vw, 1.05rem)', color: '#6b5143', lineHeight: 1.6 }}>
                Use of this site, artwork imagery, and commission inquiries.
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Close terms of use"
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
              This is a personal fine art practice. These terms exist to protect the work and to set clear, respectful expectations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
