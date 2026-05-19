import { useState } from 'react';
import { Flame, Leaf, Gem } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';

const pillars = [
  {
    Icon: Flame,
    tileClass: 'pillar-tile pillar-tile-ember',
    title: 'Emotional Atmosphere',
    body: 'These paintings are not decoration. They are a feeling. Each work is designed to shift the energy of the room it enters, bringing softness, calm, and a quiet sense of meaning.',
  },
  {
    Icon: Leaf,
    tileClass: 'pillar-tile pillar-tile-sweep',
    title: 'Symbolic Reflection',
    body: 'Nature, transformation, and inner life are woven into every brushstroke. Collectors often find that a piece mirrors something they have been holding inside: a season, a healing, a becoming.',
  },
  {
    Icon: Gem,
    tileClass: 'pillar-tile pillar-tile-prism',
    title: "A Collector's Investment",
    body: 'Each original is singular. There is no reproduction, no print run. When you bring one of these works into your home, you are the sole keeper of something that exists only once in the world.',
  },
];

function PillarCard({ pillar, index, parentVisible }: { pillar: typeof pillars[0]; index: number; parentVisible: boolean }) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  const { Icon } = pillar;

  return (
    <div
      ref={ref}
      className={`reveal reveal-delay-${index + 1} ${visible ? 'visible' : ''} flex flex-col`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      <div
        className={`flex-1 p-7 sm:p-9 ${pillar.tileClass}`}
        style={{
          border: `2px solid ${hovered ? 'rgba(201,162,39,0.55)' : 'rgba(201,162,39,0.28)'}`,
          background: hovered ? 'rgba(253,251,235,0.96)' : 'rgba(253,249,228,0.82)',
          boxShadow: hovered
            ? '0 20px 56px rgba(62,34,64,0.13), inset 0 0 0 1px rgba(201,162,39,0.12)'
            : '0 4px 18px rgba(62,34,64,0.07), inset 0 0 0 1px rgba(201,162,39,0.06)',
          transform: hovered ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
          transition: 'all 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* Content above animation pseudo-layers */}
        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{ marginBottom: '1.4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: hovered
              ? 'radial-gradient(circle, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.06) 100%)'
              : 'radial-gradient(circle, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.03) 100%)',
            border: `1px solid ${hovered ? 'rgba(201,162,39,0.42)' : 'rgba(201,162,39,0.22)'}`,
            transition: 'all 0.5s ease',
          }}>
            <Icon
              size={22}
              strokeWidth={1.25}
              style={{
                color: hovered ? '#b8881a' : '#c9a227',
                transition: 'color 0.4s ease',
              }}
            />
          </div>
        </div>

        <h3 className="luxury-heading mb-3" style={{ fontSize:'clamp(1.1rem,1.8vw,1.2rem)', color: hovered ? '#2e1638' : '#4a2658', transition:'color 0.3s ease' }}>
          {pillar.title}
        </h3>
        <div style={{ height:'1px', width:parentVisible?'32px':'0', background:'linear-gradient(90deg,#c9a227,transparent)', marginBottom:'1.1rem', transition:`width 0.9s ease ${0.3+index*0.15}s` }} />
        <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:400, fontSize:'clamp(0.97rem,1.5vw,1.05rem)', lineHeight:1.9, color:'#4a3028' }}>
          {pillar.body}
        </p>
        </div>{/* end z-index wrapper */}
      </div>
    </div>
  );
}

export default function EmotionalBridge() {
  const { ref: titleRef, visible: titleVisible } = useReveal();

  return (
    <section
      className="section-pad relative overflow-hidden"
      aria-label="Why collect original art"
      style={{ background:'linear-gradient(180deg,#fdf9ed 0%,#faf3d9 60%,#fdf9ed 100%)' }}
    >
      {/* Ambient radial */}
      <div
        className="absolute top-1/2 left-1/2 pointer-events-none"
        aria-hidden="true"
        style={{ transform:'translate(-50%,-50%)', width:'700px', height:'700px', borderRadius:'50%', background:'radial-gradient(circle,rgba(201,162,39,0.04) 0%,transparent 65%)' }}
      />

      <div className="max-w-5xl mx-auto">
        <div
          ref={titleRef}
          className={`text-center mb-14 md:mb-20 reveal ${titleVisible ? 'visible' : ''}`}
        >
          <p className="luxury-subheading text-gold-600 tracking-[0.42em] mb-4 md:mb-5">More Than a Painting</p>
          <h2
            className="luxury-heading text-plum-900"
            style={{ fontSize:'clamp(1.85rem,4.5vw,3.4rem)', maxWidth:'720px', margin:'0 auto 1.4rem' }}
          >
            Art that upgrades your space, and how you feel when you need peace and tranquility at home.
          </h2>
          <div style={{ height:'1px', width:titleVisible?'60px':'0', background:'linear-gradient(90deg,transparent,#c9a227,transparent)', margin:'0 auto 1.6rem', transition:'width 1.2s ease 0.3s' }} />
          <p className="max-w-2xl mx-auto" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.15rem)', lineHeight:1.95, color:'#6b5143' }}>
            The collectors drawn to this work are not looking to fill a wall. They are creating an environment:
            a sanctuary that reflects who they are, what they value, and the kind of peace that makes you desire to come home.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
          {pillars.map((p, i) => (
            <PillarCard key={p.title} pillar={p} index={i} parentVisible={titleVisible} />
          ))}
        </div>

        <blockquote
          className={`text-center mt-16 md:mt-20 reveal reveal-delay-4 ${titleVisible ? 'visible' : ''}`}
        >
          <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.18rem)', lineHeight:1.88, fontStyle:'italic', color:'#6b5143' }}>
            "I paint for people who believe their home should feel like an extension of their inner world, creating a living, breathing sanctuary."
          </p>
          <footer className="luxury-subheading text-gold-500 mt-4 tracking-widest">— Darcy</footer>
        </blockquote>
      </div>
    </section>
  );
}
