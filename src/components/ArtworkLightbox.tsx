import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ArtworkLightboxProps {
  open: boolean;
  image: string;
  alt: string;
  title?: string;
  onClose: () => void;
  // Tracking-ready fields — stored for future GA4 events, not rendered
  artworkId?: string;
  artworkCollection?: string;
  artworkStatusCode?: string;
  artworkPrice?: number | null;
}

export default function ArtworkLightbox({ open, image, alt, title, onClose }: ArtworkLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const prevBodyPosition  = document.body.style.position;
    const prevBodyTop       = document.body.style.top;
    const prevBodyWidth     = document.body.style.width;
    const prevBodyOverflow  = document.body.style.overflow;
    const prevHtmlOverflow  = document.documentElement.style.overflow;

    document.body.style.position = 'fixed';
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.position = prevBodyPosition;
      document.body.style.top      = prevBodyTop;
      document.body.style.width    = prevBodyWidth;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Artwork preview: ${title}` : 'Artwork preview'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2.5rem)',
        background: 'rgba(8, 3, 14, 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'lightbox-fade-in 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Close button */}
      <button
        aria-label="Close artwork preview"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'fixed',
          top: 'clamp(0.75rem, 2vw, 1.5rem)',
          right: 'clamp(0.75rem, 2vw, 1.5rem)',
          zIndex: 10000,
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(201, 162, 39, 0.12)',
          border: '1px solid rgba(201, 162, 39, 0.45)',
          cursor: 'pointer',
          transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,162,39,0.22)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,162,39,0.75)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,162,39,0.12)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,162,39,0.45)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <X size={18} color="rgba(230,195,90,1)" strokeWidth={1.5} />
      </button>

      {/* Image container */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          animation: 'lightbox-scale-in 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Gold border frame */}
        <div
          style={{
            position: 'relative',
            padding: '6px',
            background: 'linear-gradient(145deg, rgba(201,162,39,0.22) 0%, rgba(201,162,39,0.06) 50%, rgba(201,162,39,0.18) 100%)',
            boxShadow: '0 0 60px rgba(201,162,39,0.14), 0 30px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(201,162,39,0.3)',
            border: '1px solid rgba(201,162,39,0.38)',
          }}
        >
          {/* Corner accents */}
          {[
            { top: '-1px', left: '-1px', borderTop: '2px solid rgba(201,162,39,0.7)', borderLeft: '2px solid rgba(201,162,39,0.7)' },
            { top: '-1px', right: '-1px', borderTop: '2px solid rgba(201,162,39,0.7)', borderRight: '2px solid rgba(201,162,39,0.7)' },
            { bottom: '-1px', left: '-1px', borderBottom: '2px solid rgba(201,162,39,0.7)', borderLeft: '2px solid rgba(201,162,39,0.7)' },
            { bottom: '-1px', right: '-1px', borderBottom: '2px solid rgba(201,162,39,0.7)', borderRight: '2px solid rgba(201,162,39,0.7)' },
          ].map((s, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{ position: 'absolute', width: '16px', height: '16px', ...s }}
            />
          ))}

          <img
            src={image}
            alt={alt}
            style={{
              display: 'block',
              maxWidth: 'min(90vw, 900px)',
              maxHeight: 'min(80vh, 800px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Title caption */}
        {title && (
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
                letterSpacing: '0.04em',
                color: 'rgba(220,195,120,0.88)',
                lineHeight: 1.6,
              }}
            >
              {title}
            </p>
            <div
              style={{
                width: '36px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.6), transparent)',
                margin: '0.5rem auto 0',
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes lightbox-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lightbox-scale-in {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
