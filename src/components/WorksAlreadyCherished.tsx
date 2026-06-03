import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import ArtworkLightbox from './ArtworkLightbox';
import ArchiveCard from './ArchiveCard';
import { works } from '../data/cherishedWorks';
import type { CherishedWork } from '../data/cherishedWorks';

/* ── Status badge ──────────────────────────────────────────────────────────── */
function StatusBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.38rem 1rem',
        border: '1px solid rgba(201,162,39,0.38)',
        background: 'rgba(201,162,39,0.09)',
      }}
    >
      <span
        style={{
          display: 'block',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#c9a227',
          opacity: 0.85,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'Jost, sans-serif',
          fontWeight: 400,
          fontSize: '10px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(171,122,18,1)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Featured card (large editorial) ──────────────────────────────────────── */
function FeaturedCard({
  work,
  index,
  size = 'primary',
  onImageClick,
}: {
  work: CherishedWork;
  index: number;
  size?: 'primary' | 'secondary';
  onImageClick: (work: CherishedWork) => void;
}) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);

  const isPrimary = size === 'primary';

  return (
    <article
      ref={ref}
      className={`reveal reveal-delay-${index + 1} ${visible ? 'visible' : ''}`}
      aria-label={`${work.title} — ${work.status}`}
      style={{
        flex: isPrimary ? '0 0 63%' : '0 0 35%',
        marginTop: isPrimary ? '0' : 'clamp(3rem, 5vw, 5rem)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      <div
        style={{
          border: '1px solid rgba(201,162,39,0.16)',
          background: 'linear-gradient(148deg, #f8f4ec 0%, #f5f0e6 100%)',
          boxShadow: hovered
            ? '0 36px 80px rgba(62,34,64,0.15), 0 10px 28px rgba(201,162,39,0.10)'
            : isPrimary
              ? '0 20px 60px rgba(62,34,64,0.13), 0 4px 18px rgba(62,34,64,0.06)'
              : '0 8px 40px rgba(62,34,64,0.07)',
          transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
          transition: 'transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.65s ease, border-color 0.65s ease',
          borderColor: hovered ? 'rgba(201,162,39,0.3)' : 'rgba(201,162,39,0.16)',
          overflow: 'hidden',
        }}
      >
        {/* Image */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: isPrimary ? '3/2' : '3/4',
          }}
        >
          <button
            aria-label={`View full image of ${work.title}`}
            onClick={() => onImageClick(work)}
            onMouseEnter={() => setImgHovered(true)}
            onMouseLeave={() => setImgHovered(false)}
            onTouchStart={() => setImgHovered(true)}
            onTouchEnd={() => setImgHovered(false)}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              position: 'absolute',
              inset: 0,
              zIndex: 1,
            }}
          >
            <img
              src={work.image}
              alt={work.imageAlt}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: hovered || imgHovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: imgHovered ? 'rgba(8,3,14,0.28)' : 'transparent',
                transition: 'background 0.4s ease',
              }}
            >
              {imgHovered && (
                <span
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 400,
                    fontSize: '10px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(230,195,90,0.95)',
                    padding: '0.5rem 1.1rem',
                    border: '1px solid rgba(201,162,39,0.55)',
                    background: 'rgba(8,3,14,0.62)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  View Artwork
                </span>
              )}
            </div>
          </button>

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 45%, rgba(30,15,38,0.38) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {([
            { pos: 'top-4 left-4', t: true,  l: true,  b: false, r: false },
            { pos: 'bottom-4 right-4', t: false, l: false, b: true, r: true },
          ] as const).map(({ pos, t, l, b, r }, ci) => (
            <div
              key={ci}
              className={`absolute ${pos}`}
              aria-hidden="true"
              style={{
                width: hovered ? 24 : 16,
                height: hovered ? 24 : 16,
                borderTop:    t ? '1px solid rgba(201,162,39,0.55)' : 'none',
                borderLeft:   l ? '1px solid rgba(201,162,39,0.55)' : 'none',
                borderBottom: b ? '1px solid rgba(201,162,39,0.55)' : 'none',
                borderRight:  r ? '1px solid rgba(201,162,39,0.55)' : 'none',
                transition: 'width 0.4s ease, height 0.4s ease',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        {/* Info */}
        <div style={{ padding: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <StatusBadge label={work.status} />
          </div>

          <h3
            className="luxury-heading text-plum-900"
            style={{
              fontSize: isPrimary
                ? 'clamp(1.6rem, 3vw, 2.4rem)'
                : 'clamp(1.45rem, 2.5vw, 2rem)',
              marginBottom: '0.75rem',
            }}
          >
            {work.title}
          </h3>

          <div
            style={{
              height: '1px',
              width: visible ? '44px' : '0',
              background: 'linear-gradient(90deg, #c9a227, transparent)',
              marginBottom: '1rem',
              transition: 'width 1.1s ease 0.4s',
            }}
          />

          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 400,
              fontSize: 'clamp(1.02rem, 1.7vw, 1.13rem)',
              lineHeight: 1.95,
              fontStyle: 'italic',
              color: '#4e3428',
              marginBottom: '1.5rem',
            }}
          >
            {work.story}
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.45rem 1rem',
              background: 'rgba(201,162,39,0.08)',
              border: '1px solid rgba(201,162,39,0.22)',
            }}
          >
            <span
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 400,
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(140,98,12,1)',
              }}
            >
              {work.value}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */
export default function WorksAlreadyCherished() {
  const { ref: headerRef, visible: headerVisible } = useReveal();
  const { ref: row2Ref, visible: row2Visible } = useReveal();
  const { ref: closingRef, visible: closingVisible } = useReveal();
  const [lightbox, setLightbox] = useState<{ image: string; alt: string; title: string } | null>(null);

  const [featured1, featured2, ...archiveWorks] = works;
  const previewWorks = archiveWorks.slice(0, 4);

  const handleImageClick = (work: CherishedWork) =>
    setLightbox({ image: work.image, alt: work.imageAlt, title: work.title });

  return (
    <>
    <section
      id="cherished"
      aria-labelledby="cherished-heading"
      className="section-pad relative overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #f5f0e6 0%, #f0ebe0 40%, #f5f0e6 100%)',
      }}
    >
      {/* Ambient radial — warm gold breath */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,162,39,0.05) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          bottom: '5%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(155,95,145,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto">

        {/* ── Section header ── */}
        <header
          ref={headerRef}
          className={`text-center mb-16 md:mb-20 reveal ${headerVisible ? 'visible' : ''}`}
        >
          <p className="luxury-subheading text-gold-600 tracking-[0.42em] mb-5">
            A Legacy of Placed Works
          </p>

          <h2
            id="cherished-heading"
            className="luxury-heading text-plum-900 mb-5"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.8rem)' }}
          >
            Works Already Cherished
          </h2>

          <div
            style={{
              height: '1px',
              width: headerVisible ? '60px' : '0',
              background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
              margin: '0 auto 1.8rem',
              transition: 'width 1.2s ease 0.3s',
            }}
          />

          <p
            className="text-warm-600 max-w-2xl mx-auto"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              lineHeight: 1.95,
              fontStyle: 'italic',
            }}
          >
            These pieces have already found their homes and have been gifted with intention, collected with care,
            or placed in private spaces where they continue to do what they were made to do: hold meaning,
            calm the atmosphere, and quietly transform the rooms they inhabit.
          </p>
        </header>

        {/* ── Row 1: Featured editorial pair ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
            marginBottom: 'clamp(2.5rem, 5vw, 4.5rem)',
          }}
          className="lg:!flex-row lg:items-start"
        >
          <FeaturedCard work={featured1} index={0} size="primary" onImageClick={handleImageClick} />
          <FeaturedCard work={featured2} index={1} size="secondary" onImageClick={handleImageClick} />
        </div>

        {/* ── Thin archive divider ── */}
        <div
          ref={row2Ref}
          className={`reveal ${row2Visible ? 'visible' : ''}`}
          style={{ marginBottom: 'clamp(2rem, 4vw, 3.5rem)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.55))' }} />
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: '11.5px',
                letterSpacing: '0.52em',
                textTransform: 'uppercase',
                color: 'rgba(166,124,40,0.85)',
                whiteSpace: 'nowrap',
              }}
            >
              Further Collected Works
            </p>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,162,39,0.55), transparent)' }} />
          </div>
        </div>

        {/* ── Preview archive grid (3 items) ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{
            gap: 'clamp(2rem, 4vw, 3.5rem)',
            marginBottom: 'clamp(3rem, 6vw, 5.5rem)',
          }}
        >
          {previewWorks.map((work, i) => (
            <ArchiveCard key={work.id} work={work} index={i} onImageClick={handleImageClick} />
          ))}
        </div>

        {/* ── View Full Archive CTA ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '-1.5rem',
            marginBottom: 'clamp(3rem, 6vw, 5.5rem)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', maxWidth: '420px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.4))' }} />
            <div
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'rgba(201,162,39,0.5)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,162,39,0.4), transparent)' }} />
          </div>

          <button
            onClick={() => { window.location.hash = '#collected-works'; }}
            style={{
              background: 'none',
              border: '1px solid rgba(201,162,39,0.55)',
              padding: '1rem 2.5rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              width: 'calc(100% - 2rem)',
              maxWidth: 'min(100%, 480px)',
              boxSizing: 'border-box',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              animation: 'pulseGold 4s ease-in-out infinite',
              transition: 'border-color 0.4s ease, background 0.4s ease, transform 0.4s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(201,162,39,0.75)';
              el.style.background = 'rgba(201,162,39,0.09)';
              el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(201,162,39,0.55)';
              el.style.background = 'none';
              el.style.transform = 'translateY(0)';
            }}
            aria-label="View full collected archive"
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '60%',
                height: '100%',
                background: 'linear-gradient(115deg, transparent 0%, rgba(253,249,237,0.08) 30%, rgba(201,162,39,0.28) 50%, rgba(253,249,237,0.10) 70%, transparent 100%)',
                transform: 'translateX(-140%) skewX(-18deg)',
                animation: 'shimmerSweep 4s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 400,
                fontSize: '12px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(166,124,40,1)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              View Full Collected Archive
            </span>
            <span
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: '0.92rem',
                letterSpacing: '0.04em',
                color: 'rgba(107,81,67,0.92)',
                lineHeight: 1.6,
                maxWidth: '100%',
                position: 'relative',
                zIndex: 1,
              }}
            >
              View the complete archive of collected, gifted, and commissioned works.
            </span>
          </button>
        </div>

        {/* ── Closing colophon ── */}
        <div
          ref={closingRef}
          className={`reveal reveal-delay-2 ${closingVisible ? 'visible' : ''}`}
          style={{ display: 'flex', justifyContent: 'center' }}
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
              These works now live in private spaces, where their meaning continues unfolding daily in the atmosphere of someone's life.
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
    </section>

    <style>{`
      @keyframes shimmerSweep {
        0%   { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
        14%  { opacity: 1; }
        56%  { transform: translateX(190%) skewX(-18deg); opacity: 1; }
        65%  { opacity: 0; }
        100% { transform: translateX(190%) skewX(-18deg); opacity: 0; }
      }
    `}</style>

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
