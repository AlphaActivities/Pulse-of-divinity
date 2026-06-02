import { useState, useEffect } from 'react';
import { useReveal } from '../hooks/useReveal';

const profileImages = [
  { src: '/images/Profile photos/profile_1.JPG', alt: 'Darcy LaDue — artist and founder of Pulse of Divinity' },
  { src: '/images/Profile photos/profile_2.JPG', alt: 'Darcy LaDue — artist in her studio' },
];

const qualities = [
  { label: 'Medium',   value: 'Prismacolor Colored Pencil & Graphite' },
  { label: 'Style',    value: 'Spiritual Realism' },
  { label: 'Based In', value: 'Medford, OR · USA' },
  { label: 'Practice', value: 'Studio & Nature-Immersed' },
];

export default function About() {
  const { ref: leftRef,  visible: leftVisible  } = useReveal();
  const { ref: rightRef, visible: rightVisible } = useReveal();
  const [imgHovered, setImgHovered] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImg(i => (i + 1) % profileImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="section-pad relative overflow-hidden"
      style={{ background:'linear-gradient(165deg,#fdfbf0 0%,rgba(244,232,158,0.08) 40%,#fdf9ed 100%)', scrollMarginTop: 'clamp(64px, 8vw, 82px)' }}
    >
      {/* Ambient */}
      <div className="absolute -top-40 -right-40 pointer-events-none" aria-hidden="true"
        style={{ width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,162,39,0.05) 0%,transparent 70%)' }} />
      <div className="absolute -bottom-40 -left-40 pointer-events-none" aria-hidden="true"
        style={{ width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(155,95,145,0.04) 0%,transparent 70%)' }} />

      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <div className="text-center mb-14 md:mb-20">
          <p className="luxury-subheading text-gold-600 tracking-[0.42em] mb-4">The Artist</p>
          <div style={{ height:'1px', width:'60px', background:'linear-gradient(90deg,transparent,#c9a227,transparent)', margin:'0 auto', animation:'dividerGrow 1.2s ease-out 0.3s both' }} />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* Portrait */}
          <div ref={leftRef} className={`reveal ${leftVisible ? 'visible' : ''}`}>
            {/* Outer positioning shell — extra room for floating stat */}
            <div className="relative" style={{ paddingBottom: '2rem' }}>

              {/* ── Luxury frame wrapper ── */}
              <div
                className="relative"
                style={{ padding: '16px' }}
                onMouseEnter={() => setImgHovered(true)}
                onMouseLeave={() => setImgHovered(false)}
                onTouchStart={() => setImgHovered(true)}
                onTouchEnd={() => setImgHovered(false)}
              >
                {/* Warm shadow plate — offset behind the frame */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{
                  top: '8px', left: '8px', right: '-8px', bottom: '-8px',
                  background: 'linear-gradient(135deg,rgba(201,162,39,0.12) 0%,rgba(62,34,64,0.08) 100%)',
                  filter: 'blur(12px)',
                  opacity: imgHovered ? 1 : 0.5,
                  transition: 'opacity 0.7s ease',
                }} />

                {/* Outer border — breathes gold on hover */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
                  border: '1px solid',
                  borderColor: imgHovered ? 'rgba(201,162,39,0.55)' : 'rgba(201,162,39,0.25)',
                  boxShadow: imgHovered
                    ? '0 0 0 1px rgba(201,162,39,0.10), inset 0 0 28px rgba(201,162,39,0.05)'
                    : 'none',
                  transition: 'border-color 0.65s ease, box-shadow 0.65s ease',
                }} />

                {/* Inner border — tight mat line */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{
                  inset: '8px',
                  border: '1px solid',
                  borderColor: imgHovered ? 'rgba(201,162,39,0.30)' : 'rgba(201,162,39,0.13)',
                  transition: 'border-color 0.65s ease',
                }} />

                {/* ── Corner ornaments — SVG filigree, all four corners ── */}
                {([
                  { style: { top: 0,    left: 0  }, rotate: '0deg'   },
                  { style: { top: 0,    right: 0 }, rotate: '90deg'  },
                  { style: { bottom: 0, right: 0 }, rotate: '180deg' },
                  { style: { bottom: 0, left: 0  }, rotate: '270deg' },
                ] as const).map((corner, i) => (
                  <svg
                    key={i}
                    aria-hidden="true"
                    viewBox="0 0 32 32"
                    width="32" height="32"
                    className="absolute pointer-events-none"
                    style={{
                      ...corner.style,
                      transform: `rotate(${corner.rotate})`,
                      opacity: imgHovered ? 1 : 0.5,
                      transition: 'opacity 0.65s ease',
                    }}
                  >
                    {/* Outer L-rule */}
                    <line x1="1.5" y1="1.5" x2="16"  y2="1.5" stroke="#c9a227" strokeWidth="0.8" strokeLinecap="square" />
                    <line x1="1.5" y1="1.5" x2="1.5" y2="16"  stroke="#c9a227" strokeWidth="0.8" strokeLinecap="square" />
                    {/* Inner L-accent */}
                    <line x1="5.5" y1="5.5" x2="13"  y2="5.5" stroke="#c9a227" strokeWidth="0.5" strokeLinecap="round" opacity="0.65" />
                    <line x1="5.5" y1="5.5" x2="5.5" y2="13"  stroke="#c9a227" strokeWidth="0.5" strokeLinecap="round" opacity="0.65" />
                    {/* Jewel dot at corner intersection */}
                    <circle cx="1.5" cy="1.5" r="1.5" fill="#c9a227" opacity="0.9" />
                    {/* Secondary end dots */}
                    <circle cx="16"  cy="1.5" r="0.8" fill="#c9a227" opacity="0.55" />
                    <circle cx="1.5" cy="16"  r="0.8" fill="#c9a227" opacity="0.55" />
                    {/* Inner corner dot */}
                    <circle cx="5.5" cy="5.5" r="0.7" fill="#c9a227" opacity="0.4" />
                  </svg>
                ))}

                {/* ── Mid-edge tick marks — one per side ── */}
                {/* Top */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: '28px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(201,162,39,0.6),transparent)', opacity: imgHovered ? 0.85 : 0.25, transition: 'opacity 0.65s ease' }} />
                {/* Bottom */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '28px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(201,162,39,0.6),transparent)', opacity: imgHovered ? 0.85 : 0.25, transition: 'opacity 0.65s ease' }} />
                {/* Left */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{ left: 0, top: '50%', transform: 'translateY(-50%)', width: '1px', height: '24px', background: 'linear-gradient(180deg,transparent,rgba(201,162,39,0.6),transparent)', opacity: imgHovered ? 0.85 : 0.25, transition: 'opacity 0.65s ease' }} />
                {/* Right */}
                <div aria-hidden="true" className="absolute pointer-events-none" style={{ right: 0, top: '50%', transform: 'translateY(-50%)', width: '1px', height: '24px', background: 'linear-gradient(180deg,transparent,rgba(201,162,39,0.6),transparent)', opacity: imgHovered ? 0.85 : 0.25, transition: 'opacity 0.65s ease' }} />

                {/* ── Photo container ── */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  {profileImages.map((img, i) => (
                    <img
                      key={img.src}
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover object-top absolute inset-0"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      style={{
                        transform: imgHovered ? 'scale(1.04)' : 'scale(1)',
                        transition: 'transform 0.85s cubic-bezier(0.25,0.46,0.45,0.94), opacity 1.2s ease',
                        opacity: i === activeImg ? 1 : 0,
                      }}
                    />
                  ))}

                  {/* Bottom tone vignette */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                    style={{ background: 'linear-gradient(to bottom,transparent 55%,rgba(42,22,41,0.18) 100%)' }} />

                  {/* Fine art mat — perimeter inner shadow */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                    style={{
                      boxShadow: imgHovered
                        ? 'inset 0 0 48px rgba(42,22,41,0.28), inset 0 0 10px rgba(42,22,41,0.14)'
                        : 'inset 0 0 32px rgba(42,22,41,0.18), inset 0 0 6px rgba(42,22,41,0.08)',
                      transition: 'box-shadow 0.7s ease',
                    }} />

                  {/* Gold shimmer sweep on hover */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0"
                    style={{
                      background: 'linear-gradient(108deg,transparent 32%,rgba(201,162,39,0.07) 50%,transparent 68%)',
                      opacity: imgHovered ? 1 : 0,
                      transition: 'opacity 0.8s ease',
                    }} />

                  {/* Slide indicators */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2" aria-hidden="true">
                    {profileImages.map((_, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'block',
                          width: i === activeImg ? '18px' : '6px',
                          height: '2px',
                          background: i === activeImg ? '#c9a227' : 'rgba(253,249,237,0.5)',
                          transition: 'width 0.4s ease, background 0.4s ease',
                          borderRadius: '1px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating stat */}
              <div
                className="hidden sm:block absolute shimmer-gold text-center"
                aria-label="20 plus years creating"
                style={{
                  bottom: '-4px', right: '-8px',
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg,#fdfbf0,#faf3d9)',
                  border: '1px solid rgba(201,162,39,0.28)',
                  boxShadow: '0 14px 44px rgba(62,34,64,0.12)',
                  minWidth: '140px',
                  animation: 'floatYSlow 7s ease-in-out infinite',
                }}
              >
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'2.1rem', fontWeight:300, lineHeight:1, color:'#c9a227' }}>20+</p>
                <p className="luxury-subheading text-warm-500 mt-1 tracking-widest">Years Creating</p>
              </div>
            </div>
          </div>

          {/* Text */}
          <div
            ref={rightRef}
            className={`reveal reveal-delay-2 ${rightVisible ? 'visible' : ''} mt-8 sm:mt-0`}
            style={{ paddingBottom: '2rem' }}
          >
            <h2 id="about-heading" className="luxury-heading text-plum-900 mb-1" style={{ fontSize:'clamp(2rem,4vw,3.2rem)' }}>
              Darcy LaDue
            </h2>
            <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'1.07rem', letterSpacing:'0.06em', fontStyle:'italic', color:'#c9a227', marginBottom:'1.4rem' }}>
              Artist · Pulse of Divinity
            </p>

            <div style={{ height:'1px', width:rightVisible?'48px':'0', background:'linear-gradient(90deg,#c9a227,transparent)', marginBottom:'1.75rem', transition:'width 1s ease 0.35s' }} />

            <div className="space-y-4 mb-8">
              {[
                'Darcy creates emotionally reflective artwork inspired by nature, inner transformation, and spiritual soundness. Her work is designed to help collectors bring peaceful symbolism and natural beauty into their spaces, creating environments that feel more alive, intentional, and connected.',
                'Each piece begins not with a sketch, but with a feeling: a walk in the rain, a meditation at the edge of still water, a quiet observation of how light falls through leaves. She paints the emotional truth of nature.',
                'Her collectors are emotionally aware, nature-connected people who want their home to feel like a reflection of their inner world: peaceful, symbolic, and beautifully intentional.',
              ].map((text, i) => (
                <p key={i} style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.7vw,1.1rem)', lineHeight:1.92, color:'#6b5143' }}>
                  {text}
                </p>
              ))}
            </div>

            {/* Qualities grid */}
            <dl className="grid grid-cols-2 gap-3 sm:gap-4 mb-9">
              {qualities.map((q, i) => (
                <div
                  key={q.label}
                  className="py-3.5 px-4 sm:py-4 sm:px-5"
                  style={{ border:'1px solid rgba(201,162,39,0.15)', background:'rgba(253,251,240,0.5)', transition:'border-color 0.4s ease,background 0.4s ease', transitionDelay:`${i*0.07}s` }}
                  onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.35)'; el.style.background='rgba(253,251,240,0.85)'; }}
                  onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.15)'; el.style.background='rgba(253,251,240,0.5)'; }}
                  onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.35)'; el.style.background='rgba(253,251,240,0.85)'; }}
                  onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.15)'; el.style.background='rgba(253,251,240,0.5)'; }}
                >
                  <dt style={{ fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:'0.7rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'#573f36', marginBottom:'0.25rem' }}>{q.label}</dt>
                  <dd style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:400, fontSize:'0.93rem', color:'#3e2240' }}>{q.value}</dd>
                </div>
              ))}
            </dl>

            {/* Signature */}
            <div className="flex items-center gap-4">
              <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,transparent,#c9a227)' }} />
              <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'1.1rem', fontStyle:'italic', color:'#c9a227', whiteSpace:'nowrap' }}>
                Painting with intention
              </p>
              <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#c9a227,transparent)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
