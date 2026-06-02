import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import type { CherishedWork } from '../data/cherishedWorks';

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

export { StatusBadge };

export default function ArchiveCard({
  work,
  index,
  onImageClick,
}: {
  work: CherishedWork;
  index: number;
  onImageClick: (work: CherishedWork) => void;
}) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);

  const isStaggered = index % 2 === 1;

  return (
    <article
      ref={ref}
      className={`reveal reveal-delay-${(index % 4) + 1} ${visible ? 'visible' : ''} ${isStaggered ? 'sm:mt-12' : ''}`}
      aria-label={`${work.title} — ${work.status}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      <div
        style={{
          border: '1px solid rgba(201,162,39,0.14)',
          background: 'linear-gradient(148deg, #f8f4ec 0%, #f5f0e6 100%)',
          boxShadow: hovered
            ? '0 22px 52px rgba(62,34,64,0.12), 0 4px 16px rgba(201,162,39,0.08)'
            : '0 4px 28px rgba(62,34,64,0.06)',
          transform: hovered ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
          transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.6s ease, border-color 0.6s ease',
          borderColor: hovered ? 'rgba(201,162,39,0.28)' : 'rgba(201,162,39,0.14)',
          overflow: 'hidden',
        }}
      >
        {/* Image */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: '3/4',
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
                transform: hovered || imgHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.85s cubic-bezier(0.25,0.46,0.45,0.94)',
                filter: 'sepia(0.08) saturate(0.93) brightness(0.97)',
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
              background: 'linear-gradient(to bottom, transparent 50%, rgba(38,18,8,0.36) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: '0.85rem',
              left: '0.85rem',
              padding: '0.38rem 0.9rem',
              background: 'rgba(14,7,22,0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(201,162,39,0.28)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 400,
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(220,185,80,1)',
              }}
            >
              {work.status}
            </p>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <h3
            className="luxury-heading text-plum-900"
            style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.4rem)', marginBottom: '0.55rem' }}
          >
            {work.title}
          </h3>

          <div
            style={{
              height: '1px',
              width: visible ? '32px' : '0',
              background: 'linear-gradient(90deg, #c9a227, transparent)',
              marginBottom: '0.75rem',
              transition: 'width 1s ease 0.5s',
            }}
          />

          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 400,
              fontSize: 'clamp(0.95rem, 1.5vw, 1.04rem)',
              lineHeight: 1.92,
              fontStyle: 'italic',
              color: '#4e3428',
              marginBottom: '1.1rem',
            }}
          >
            {work.story}
          </p>

          <div
            style={{
              padding: '0.38rem 0.85rem',
              background: 'rgba(201,162,39,0.08)',
              border: '1px solid rgba(201,162,39,0.2)',
              display: 'inline-block',
            }}
          >
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 400,
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(140,98,12,1)',
              }}
            >
              {work.value}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
