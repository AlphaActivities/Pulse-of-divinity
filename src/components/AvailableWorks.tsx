import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import ArtworkLightbox from './ArtworkLightbox';

interface Painting {
  id: number;
  title: string;
  teaser: string;
  price: string;
  image: string;
  imageAlt: string;
  story: string;
  tag: string;
}

const paintings: Painting[] = [
  {
    id: 1,
    title: 'Starlit Within',
    teaser: 'A celestial portrait of inner softness, protection, and the private universe carried within the heart.',
    price: '$3,200',
    image: '/images/For_sale/For_sale_01.PNG',
    imageAlt: 'Starlit Within original painting by Darcy LaDue',
    story: 'A celestial portrait of inner softness, protection, and the private universe carried within the heart. This piece brings dreamlike calm, color, and quiet wonder into the space it enters.',
    tag: 'Celestial · Inner World · Protection',
  },
  {
    id: 2,
    title: 'Bloom Through the Breaking',
    teaser: 'A symbolic portrait of healing, contrast, and becoming whole through what once felt broken.',
    price: '$2,600',
    image: '/images/For_sale/For_sale_02.PNG',
    imageAlt: 'Bloom Through the Breaking original painting by Darcy LaDue',
    story: 'A symbolic portrait of healing, contrast, and becoming whole through what once felt broken. The floral crown softens the fracture, turning vulnerability into quiet strength.',
    tag: 'Healing · Contrast · Becoming Whole',
  },
  {
    id: 3,
    title: 'Warmth Remembered',
    teaser: 'A personal portrait centered around warmth, familiarity, and emotional presence.',
    price: '$2,900',
    image: '/images/For_sale/For_sale_03.webp',
    imageAlt: 'Warmth Remembered original portrait artwork by Darcy LaDue',
    story: 'A heartfelt portrait capturing kindness, individuality, and the quiet energy carried through expression. The warmth of the smile and rich color tones create a feeling that feels both grounding and deeply personal.',
    tag: 'Portrait · Presence · Connection',
  },
  {
    id: 4,
    title: 'Grace in Bloom',
    teaser: 'A graceful portrait exploring softness, presence, and quiet inner beauty.',
    price: '$3,400',
    image: '/images/For_sale/For_sale_04.webp',
    imageAlt: 'Grace in Bloom original portrait artwork by Darcy LaDue',
    story: 'A symbolic portrait centered around femininity, gentleness, and emotional warmth. The calm expression, flowing dark hair, and delicate details create a feeling of quiet confidence and timeless grace.',
    tag: 'Portrait · Heritage · Soft Strength',
  },
];

function PaintingCard({
  painting,
  index,
  onImageClick,
}: {
  painting: Painting;
  index: number;
  onImageClick: (painting: Painting) => void;
}) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [hovered,   setHovered]   = useState(false);
  const [imgHovered, setImgHovered] = useState(false);
  const { ref, visible } = useReveal();

  return (
    <article
      ref={ref}
      className={`reveal reveal-delay-${index + 2} ${visible ? 'visible' : ''}`}
      aria-label={`${painting.title} — original painting`}
    >
      <div
        className="overflow-hidden gold-glow-border"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setHovered(false)}
        style={{
          border: '1px solid rgba(201,162,39,0.14)',
          background: 'linear-gradient(148deg,#fdfbf0 0%,#faf3d9 100%)',
          boxShadow: hovered
            ? '0 30px 70px rgba(62,34,64,0.14),0 6px 22px rgba(201,162,39,0.11)'
            : '0 6px 40px rgba(62,34,64,0.06)',
          transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
          transition: 'transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.55s ease,border-color 0.55s ease',
        }}
      >
        {/* ── Two-col layout ── */}
        <div className="flex flex-col lg:flex-row items-start">

          {/* Image */}
          <div
            className="relative w-full lg:w-3/5 overflow-hidden"
            style={{ minHeight: '320px', maxHeight: 'clamp(340px, 40vw, 500px)' }}
          >
            <button
              aria-label={`View full image of ${painting.title}`}
              onClick={() => onImageClick(painting)}
              onMouseEnter={() => setImgHovered(true)}
              onMouseLeave={() => setImgHovered(false)}
              onTouchStart={() => setImgHovered(true)}
              onTouchEnd={() => setImgHovered(false)}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: 'inherit',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
            <img
              src={painting.image}
              alt={painting.imageAlt}
              className="w-full h-full object-cover"
              loading="lazy"
              style={{
                minHeight: 'unset',
                objectPosition: 'center 18%',
                transform: hovered || imgHovered ? 'scale(1.045)' : 'scale(1)',
                transition: 'transform 0.85s cubic-bezier(0.25,0.46,0.45,0.94)',
                display: 'block',
              }}
            />
            {/* Hover overlay */}
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

            {/* Gradient veil bottom */}
            <div
              className="absolute bottom-0 left-0 right-0"
              aria-hidden="true"
              style={{ height: '40%', background: 'linear-gradient(to top,rgba(42,22,41,0.32) 0%,transparent 100%)', pointerEvents: 'none' }}
            />

            {/* Corner brackets */}
            {([['top-4 left-4', 'borderTop borderLeft'], ['bottom-4 right-4', 'borderBottom borderRight']] as const).map(([pos], ci) => (
              <div
                key={ci}
                className={`absolute ${pos}`}
                aria-hidden="true"
                style={{
                  width: hovered ? 26 : 18,
                  height: hovered ? 26 : 18,
                  borderTop:    ci === 0 ? '1px solid rgba(201,162,39,0.6)' : 'none',
                  borderLeft:   ci === 0 ? '1px solid rgba(201,162,39,0.6)' : 'none',
                  borderBottom: ci === 1 ? '1px solid rgba(201,162,39,0.6)' : 'none',
                  borderRight:  ci === 1 ? '1px solid rgba(201,162,39,0.6)' : 'none',
                  transition: 'width 0.4s ease,height 0.4s ease',
                }}
              />
            ))}

            {/* Tag badge */}
            <div
              className="absolute top-4 right-4 px-3 py-1.5"
              aria-label={`Themes: ${painting.tag}`}
              style={{ background:'rgba(42,22,41,0.78)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }}
            >
              <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'8px', letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(250,228,140,0.85)' }}>
                {painting.tag}
              </p>
            </div>
          </div>

          {/* Info panel */}
          <div className="w-full lg:w-2/5 flex flex-col p-7 sm:p-9 lg:p-11">
            <p aria-hidden="true" style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'2.6rem', fontWeight:300, lineHeight:1, color:'#c9a227', opacity:0.25, marginBottom:'0.85rem' }}>
              0{painting.id}
            </p>

            <h3 className="luxury-heading text-plum-900 mb-3" style={{ fontSize:'clamp(1.5rem,2.8vw,2.1rem)' }}>
              {painting.title}
            </h3>

            <p className="mb-5 italic" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'1.04rem', lineHeight:1.8, color:'#6b5143' }}>
              {painting.teaser}
            </p>

            {/* Animated divider */}
            <div style={{ height:'1px', width:visible?'55px':'0', background:'linear-gradient(90deg,#c9a227,transparent)', marginBottom:'1.4rem', transition:'width 1.1s ease 0.4s' }} />

            {/* Details */}
            <dl className="space-y-2 mb-6">
              <div className="flex justify-between items-center pt-1.5">
                <dt style={{ fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:'0.7rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'#573f36' }}>Investment</dt>
                <dd style={{ fontFamily:'Jost, system-ui, sans-serif', fontSize:'1.1rem', fontWeight:400, color:'#7d4574', letterSpacing:'0.06em' }}>
                  {painting.price}
                </dd>
              </div>
            </dl>

            {/* Story toggle — tappable on mobile */}
            <button
              onClick={() => setStoryOpen(!storyOpen)}
              aria-expanded={storyOpen}
              aria-controls={`story-${painting.id}`}
              className="flex items-center gap-3 mb-6 group"
              style={{ background:'none', border:'none', padding:'4px 0', cursor:'pointer', minHeight:'44px' }}
            >
              <div
                aria-hidden="true"
                style={{
                  width:28, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  border:`1px solid ${storyOpen ? 'rgba(201,162,39,0.65)' : 'rgba(201,162,39,0.28)'}`,
                  background: storyOpen ? 'rgba(201,162,39,0.1)' : 'transparent',
                  transform: storyOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.4s ease,background 0.3s ease,border-color 0.3s ease',
                }}
              >
                <span style={{ color:'#c9a227', fontSize:'15px', lineHeight:1, fontWeight:300, userSelect:'none' }}>+</span>
              </div>
              <span style={{ fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:'0.7rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'#573f36', transition:'color 0.3s ease' }} className="group-hover:text-gold-600">
                {storyOpen ? 'Close the story' : 'Discover the story'}
              </span>
            </button>

            {/* CTA */}
            <button
              className="luxury-btn-plum w-full mt-6"
              onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Inquire About This Piece
            </button>
          </div>
        </div>

        {/* ── Expandable story ── */}
        <div
          id={`story-${painting.id}`}
          aria-hidden={!storyOpen}
          style={{ maxHeight: storyOpen ? '500px' : '0', overflow:'hidden', transition:'max-height 0.7s cubic-bezier(0.25,0.46,0.45,0.94)' }}
        >
          <div
            style={{
              padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1.75rem,5vw,3.5rem)',
              borderTop:'1px solid rgba(201,162,39,0.14)',
              background:'linear-gradient(180deg,rgba(253,249,237,0.65) 0%,rgba(253,251,240,0.35) 100%)',
            }}
          >
            <p className="luxury-subheading text-gold-600 mb-4" style={{ letterSpacing:'0.28em' }}>
              The Story Behind This Work
            </p>
            <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.1rem)', lineHeight:1.95, color:'#6b5143', maxWidth:'640px' }}>
              {painting.story}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AvailableWorks() {
  const { ref: titleRef, visible: titleVisible } = useReveal();
  const [lightbox, setLightbox] = useState<{ image: string; alt: string; title: string } | null>(null);

  return (
    <>
    <section
      id="works"
      aria-labelledby="works-heading"
      className="section-pad"
      style={{ background:'linear-gradient(180deg,#fdf9ed 0%,#fdfbf0 100%)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header
          ref={titleRef}
          className={`text-center mb-16 md:mb-20 reveal ${titleVisible ? 'visible' : ''}`}
        >
          <p className="luxury-subheading text-gold-600 tracking-[0.42em] mb-5">
            Original Works
          </p>
          <h2
            id="works-heading"
            className="luxury-heading text-plum-900 mb-5"
            style={{ fontSize:'clamp(2rem,5vw,3.8rem)' }}
          >
            Available Works
          </h2>
          <div style={{ height:'1px', width:titleVisible?'60px':'0', background:'linear-gradient(90deg,transparent,#c9a227,transparent)', margin:'0 auto 1.6rem', transition:'width 1.2s ease 0.3s' }} />
          <p className="text-warm-600 max-w-2xl mx-auto" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.15rem)', lineHeight:1.95 }}>
            Each original painting is created as an emotional reflection, blending nature,
            symbolism, and spiritual soundness into a visual experience meant to transform
            the feeling of a space.
          </p>
        </header>

        {/* Cards */}
        <div className="space-y-12 md:space-y-16">
          {paintings.map((p, i) => (
            <PaintingCard
              key={p.id}
              painting={p}
              index={i}
              onImageClick={(painting) => setLightbox({ image: painting.image, alt: painting.imageAlt, title: painting.title })}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className={`text-center mt-16 md:mt-20 reveal reveal-delay-3 ${titleVisible ? 'visible' : ''}`}>
          <div className="luxury-divider mb-5" />
          <p className="italic mb-2" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:400, fontSize:'0.97rem', lineHeight:1.85, color:'#3e2240' }}>
            All original works include a detailed journey certificate of authenticity and white-glove shipping.
          </p>
          <p style={{ fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:'0.72rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'#3e2240', marginTop:'0.5rem' }}>
            Inquiries are personal · No instant checkout
          </p>
        </div>
      </div>
    </section>

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
