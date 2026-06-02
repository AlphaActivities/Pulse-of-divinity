import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { scrollToSection } from '../utils/scrollToSection';

const process = [
  {
    step: '01',
    tileClass: 'step-tile step-tile-ink',
    title: 'A Personal Conversation',
    description: 'Darcy begins with a genuine and unhurried conversation about your space, your story, and the emotion or vision you want to hold in art. Listening to you is step one.',
  },
  {
    step: '02',
    tileClass: 'step-tile step-tile-aurora',
    title: 'Vision & Direction',
    description: 'From what you share, Darcy develops a written and visual direction for your piece: the mood, symbolism, palette specs, and energy. You respond before a single creative stroke is made.',
  },
  {
    step: '03',
    tileClass: 'step-tile step-tile-stars',
    title: 'Creation with Intention',
    description: 'Your painting is made over weeks, with care and precision. You receive progress documentation throughout. The creation is a shared journey, not a transaction.',
  },
  {
    step: '04',
    tileClass: 'step-tile step-tile-foil',
    title: 'Delivery & Provenance',
    description: 'Delivered with premium care, a detailed journey certificate of authenticity, and the full story of your piece: its inspiration, symbolism, and the moments it came to life.',
  },
];

function StepCard({ step, index, parentVisible }: { step: typeof process[0]; index: number; parentVisible: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      {index < process.length - 1 && (
        <div
          className="hidden lg:block absolute top-9 left-full w-5 h-px"
          aria-hidden="true"
          style={{ background:'linear-gradient(90deg,rgba(201,162,39,0.35),transparent)', zIndex:10 }}
        />
      )}
      <div
        className={`p-6 sm:p-7 h-full ${step.tileClass}`}
        style={{
          border:`2px solid ${hovered?'rgba(201,162,39,0.58)':'rgba(201,162,39,0.28)'}`,
          background: hovered?'rgba(62,34,64,0.52)':'rgba(42,22,41,0.55)',
          boxShadow: hovered
            ? '0 16px 44px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(201,162,39,0.10)'
            : '0 4px 16px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(201,162,39,0.05)',
          transform: hovered?'translateY(-3px) scale(1.04)':'translateY(0) scale(1)',
          transition:'all 0.45s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        <div style={{ position:'relative', zIndex:1 }}>
        <p style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'2.3rem', fontWeight:300, lineHeight:1, color:'#c9a227', opacity:hovered?0.78:0.58, marginBottom:'1.1rem', transition:'opacity 0.4s ease' }}>
          {step.step}
        </p>
        <h4 className="luxury-heading mb-2.5" style={{ fontSize:'1.05rem', color:hovered?'#f4e89e':'#faeec8', transition:'color 0.35s ease' }}>
          {step.title}
        </h4>
        <div style={{ height:'1px', width:parentVisible?'26px':'0', background:'linear-gradient(90deg,rgba(201,162,39,0.7),transparent)', marginBottom:'0.85rem', transition:`width 0.9s ease ${0.2+index*0.12}s` }} />
        <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(0.92rem,1.5vw,0.97rem)', lineHeight:1.88, color:'rgba(250,243,217,0.88)' }}>
          {step.description}
        </p>
        </div>
      </div>
    </div>
  );
}

export default function Commissions() {
  const { ref: titleRef, visible: titleVisible } = useReveal();
  const { ref: stepsRef, visible: stepsVisible } = useReveal();

  return (
    <section
      id="commissions"
      aria-labelledby="commissions-heading"
      className="section-pad relative overflow-hidden"
      style={{ background:'linear-gradient(160deg,#2a1629 0%,#3e2240 40%,#2a1629 100%)', scrollMarginTop: 'clamp(64px, 8vw, 82px)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
        style={{ background:'radial-gradient(ellipse 60% 50% at 50% 30%,rgba(201,162,39,0.07) 0%,transparent 70%)', animation:'gradientDrift 22s ease-in-out infinite', backgroundSize:'200% 200%' }} />

      {/* Drifting diagonal lines — layer A */}
      <div className="commissions-lines" aria-hidden="true" />
      {/* Drifting diagonal lines — layer B */}
      <div className="commissions-lines-b" aria-hidden="true" />
      {/* Breathing gold veil */}
      <div className="commissions-veil" aria-hidden="true" />

      {/* Floating gold motes */}
      {[
        { w:'4px',  h:'4px',  left:'12%', top:'72%', dur:'19s', delay:'0s'   },
        { w:'3px',  h:'3px',  left:'28%', top:'80%', dur:'24s', delay:'4.5s' },
        { w:'5px',  h:'5px',  left:'45%', top:'85%', dur:'21s', delay:'1.8s' },
        { w:'3px',  h:'3px',  left:'61%', top:'78%', dur:'27s', delay:'7s'   },
        { w:'4px',  h:'4px',  left:'74%', top:'82%', dur:'22s', delay:'3.2s' },
        { w:'3px',  h:'3px',  left:'88%', top:'75%', dur:'18s', delay:'9s'   },
        { w:'3px',  h:'3px',  left:'20%', top:'65%', dur:'30s', delay:'5.7s' },
        { w:'4px',  h:'4px',  left:'54%', top:'70%', dur:'25s', delay:'11s'  },
        { w:'3px',  h:'3px',  left:'82%', top:'68%', dur:'20s', delay:'2.1s' },
        { w:'6px',  h:'6px',  left:'35%', top:'90%', dur:'17s', delay:'8s'   },
        { w:'3px',  h:'3px',  left:'68%', top:'88%', dur:'23s', delay:'13s'  },
      ].map((m, i) => (
        <div
          key={i}
          className="commissions-mote"
          aria-hidden="true"
          style={{
            width: m.w,
            height: m.h,
            left: m.left,
            top: m.top,
            animationDuration: m.dur,
            animationDelay: m.delay,
          }}
        />
      ))}

      {/* Corner ornaments */}
      {['top-8 left-8','bottom-8 right-8'].map((pos, i) => (
        <div key={i} aria-hidden="true" className={`absolute w-14 h-14 pointer-events-none ${pos}`}
          style={{ borderTop:i===0?'1px solid rgba(201,162,39,0.18)':undefined, borderLeft:i===0?'1px solid rgba(201,162,39,0.18)':undefined, borderBottom:i===1?'1px solid rgba(201,162,39,0.18)':undefined, borderRight:i===1?'1px solid rgba(201,162,39,0.18)':undefined }} />
      ))}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header
          ref={titleRef}
          className={`text-center mb-14 md:mb-20 reveal ${titleVisible ? 'visible' : ''}`}
        >
          <p className="luxury-subheading text-gold-400 tracking-[0.42em] mb-4 md:mb-5">For the Devoted Collector</p>
          <h2 id="commissions-heading" className="luxury-heading text-ivory-100 mb-4" style={{ fontSize:'clamp(2rem,5vw,3.8rem)' }}>
            Private Commissions
          </h2>
          <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:500, fontSize:'clamp(1.1rem,1.9vw,1.22rem)', letterSpacing:'0.04em', fontStyle:'italic', color:'rgba(201,162,39,1)', marginBottom:'1.5rem', textShadow:'0 1px 12px rgba(201,162,39,0.25)' }}>
            For collectors who want a piece created from a personal emotion, story, or vision.
          </p>
          <div style={{ height:'1px', width:titleVisible?'60px':'0', background:'linear-gradient(90deg,transparent,rgba(201,162,39,0.7),transparent)', margin:'0 auto 1.75rem', transition:'width 1.2s ease 0.3s' }} />
          <p className="text-ivory-300 max-w-2xl mx-auto" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.12rem)', lineHeight:1.95 }}>
            Darcy offers private commissioned works for those seeking artwork connected to a personal
            story, emotional season, spiritual transition, or meaningful space. Each commission is a singular act
            of co-creation. Your energy, translated into something you can live with forever.
          </p>
        </header>

        <div ref={stepsRef}>
          {/* Steps grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12 md:mb-14">
            {process.map((step, i) => (
              <div key={step.step} className={`reveal reveal-delay-${i + 1} ${stepsVisible ? 'visible' : ''}`}>
                <StepCard step={step} index={i} parentVisible={stepsVisible} />
              </div>
            ))}
          </div>

          {/* Investment details */}
          <div
            className={`grid sm:grid-cols-3 gap-px mb-12 md:mb-14 reveal reveal-delay-3 ${stepsVisible ? 'visible' : ''}`}
            style={{ background:'rgba(201,162,39,0.13)' }}
          >
            {[
              { label:'Starting Investment', value:'From $2,500', note:'Scales with size & complexity' },
              { label:'Creation Timeline',   value:'6–12 Weeks',  note:'Devoted, unhurried creation' },
              { label:'Worldwide Delivery',  value:'Included',    note:'Archival white-glove shipping' },
            ].map((d) => (
              <div
                key={d.label}
                className="py-8 sm:py-10 px-6 sm:px-8 text-center"
                style={{ background:'rgba(42,22,41,0.5)', transition:'background 0.4s ease, transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)', transform:'scale(1)' }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(62,34,64,0.65)'; el.style.transform='scale(1.05)'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(42,22,41,0.5)'; el.style.transform='scale(1)'; }}
                onTouchStart={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(62,34,64,0.65)'; el.style.transform='scale(1.05)'; }}
                onTouchEnd={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(42,22,41,0.5)'; el.style.transform='scale(1)'; }}
              >
                <p className="luxury-subheading text-gold-400 tracking-widest mb-3">{d.label}</p>
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1.3rem,2.5vw,1.6rem)', color:'#fdf9ed', marginBottom:'0.4rem' }}>{d.value}</p>
                <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'10px', letterSpacing:'0.12em', color:'rgba(250,243,217,0.75)' }}>{d.note}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className={`text-center reveal reveal-delay-4 ${stepsVisible ? 'visible' : ''}`}>
            <blockquote
              className="text-ivory-300 mb-8 italic max-w-lg mx-auto"
              style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.8vw,1.1rem)', lineHeight:1.88 }}
            >
              "A commission is not a request, it is an invitation to bring your innermost world into visible form."
            </blockquote>
            <button
              className="luxury-btn-primary"
              onClick={() => scrollToSection('#contact')}
            >
              Begin a Commission Conversation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
