import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { works } from '../data/cherishedWorks';
import type { CherishedWork } from '../data/cherishedWorks';
import ArchiveCard from '../components/ArchiveCard';
import ArchiveNavbar from '../components/ArchiveNavbar';
import ArtworkLightbox from '../components/ArtworkLightbox';
import Footer from '../components/Footer';

interface Props {
  onNavigateHome: () => void;
}

export default function CollectedWorksPage({ onNavigateHome }: Props) {
  const [lightbox, setLightbox] = useState<{ image: string; alt: string; title: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '';
    }
  };

  const handleImageClick = (work: CherishedWork) =>
    setLightbox({ image: work.image, alt: work.imageAlt, title: work.title });

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          overflowX: 'hidden',
          maxWidth: '100%',
          background: 'linear-gradient(170deg, #f5f0e6 0%, #f0ebe0 40%, #f5f0e6 100%)',
        }}
      >
        <ArchiveNavbar onNavigateHome={onNavigateHome} />

        {/* ── Page content ── */}
        <main style={{ paddingTop: 'clamp(64px, 8vw, 82px)' }}>

          {/* ── Back button ── */}
          <div
            style={{
              maxWidth: '72rem',
              margin: '0 auto',
              padding: '1.5rem clamp(1.25rem, 4vw, 3rem) 0',
            }}
          >
            <button
              onClick={handleBack}
              aria-label="Back to Pulse of Divinity"
              className="archive-back-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: 'none',
                border: '1px solid rgba(201,162,39,0.32)',
                padding: '0.5rem 1rem 0.5rem 0.75rem',
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'border-color 0.35s ease, background 0.35s ease, transform 0.35s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = 'rgba(201,162,39,0.65)';
                el.style.background = 'rgba(201,162,39,0.06)';
                el.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = 'rgba(201,162,39,0.32)';
                el.style.background = 'none';
                el.style.transform = 'translateX(0)';
              }}
            >
              <span className="archive-back-arrow">
                <ArrowLeft size={13} color="rgba(166,124,40,1)" strokeWidth={1.5} />
              </span>
              <span
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 500,
                  fontSize: '11px',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'rgba(166,124,40,1)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Back to Pulse of Divinity
              </span>
            </button>
          </div>
          {/* ── Page hero header ── */}
          <div
            style={{
              maxWidth: '72rem',
              margin: '0 auto',
              padding: 'clamp(3.5rem, 8vw, 6rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 5vw, 3.5rem)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Ambient gold radial */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(201,162,39,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: '11px',
                letterSpacing: '0.42em',
                textTransform: 'uppercase',
                color: 'rgba(166,124,40,0.9)',
                marginBottom: '1.25rem',
              }}
            >
              A Legacy of Placed Works
            </p>

            <h1
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                fontSize: 'clamp(2.2rem, 6vw, 4rem)',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                color: '#3e2240',
                marginBottom: '1.5rem',
              }}
            >
              Works Already Cherished
            </h1>

            <div
              style={{
                height: '1px',
                width: '60px',
                background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
                margin: '0 auto 1.75rem',
              }}
            />

            <p
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
                lineHeight: 1.95,
                fontStyle: 'italic',
                color: '#6b5143',
                maxWidth: '640px',
                margin: '0 auto',
              }}
            >
              A private archive of collected, gifted, and commissioned pieces, each carrying its own
              emotional history, atmosphere, and meaning.
            </p>
          </div>

          {/* ── Full works grid ── */}
          <div
            style={{
              maxWidth: '72rem',
              margin: '0 auto',
              padding: '0 clamp(1.25rem, 4vw, 3rem) clamp(4rem, 8vw, 7rem)',
            }}
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ gap: 'clamp(2rem, 4vw, 3.5rem)' }}
            >
              {works.map((work, i) => (
                <ArchiveCard key={work.id} work={work} index={i} onImageClick={handleImageClick} />
              ))}
            </div>

            {/* ── Closing colophon ── */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 'clamp(3rem, 6vw, 5rem)',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  padding: 'clamp(1.5rem, 3vw, 2rem) clamp(2rem, 6vw, 4rem)',
                  borderTop: '1px solid rgba(201,162,39,0.22)',
                  borderBottom: '1px solid rgba(201,162,39,0.22)',
                  position: 'relative',
                }}
              >
                {([
                  { top: '-1px', left: '-1px', borderTop: '1px solid rgba(201,162,39,0.5)', borderLeft: '1px solid rgba(201,162,39,0.5)' },
                  { top: '-1px', right: '-1px', borderTop: '1px solid rgba(201,162,39,0.5)', borderRight: '1px solid rgba(201,162,39,0.5)' },
                  { bottom: '-1px', left: '-1px', borderBottom: '1px solid rgba(201,162,39,0.5)', borderLeft: '1px solid rgba(201,162,39,0.5)' },
                  { bottom: '-1px', right: '-1px', borderBottom: '1px solid rgba(201,162,39,0.5)', borderRight: '1px solid rgba(201,162,39,0.5)' },
                ] as React.CSSProperties[]).map((s, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    style={{ position: 'absolute', width: '10px', height: '10px', ...s }}
                  />
                ))}

                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'rgba(201,162,39,0.55)',
                    margin: '0 auto 1.1rem',
                  }}
                />

                <p
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
                    lineHeight: 1.9,
                    color: '#3e2240',
                    opacity: 0.88,
                    letterSpacing: '0.01em',
                  }}
                >
                  These works now live in private spaces, where their meaning continues unfolding
                  daily in the atmosphere of someone's life.
                </p>

                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'rgba(201,162,39,0.55)',
                    margin: '1.1rem auto 0',
                  }}
                />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {lightbox && (
        <ArtworkLightbox
          open={!!lightbox}
          image={lightbox.image}
          alt={lightbox.alt}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
