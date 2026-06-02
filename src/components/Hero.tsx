import { useEffect, useRef, useState } from 'react';
import { scrollToSection } from '../utils/scrollToSection';

/* ─── Bird config ─────────────────────────────────────────────────────────── */
interface BirdState {
  id: number;
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
  wingPhase: number;
  wingSpeed: number;
  yDrift: number;
  yDriftSpeed: number;
}

const BIRD_CONFIGS: Omit<BirdState, 'x' | 'wingPhase' | 'yDrift'>[] = [
  { id: 0, y: 22, speed: 0.016, scale: 1.35, opacity: 0.82, wingSpeed: 0.0055, yDriftSpeed: 0.0009 },
  { id: 1, y: 28, speed: 0.013, scale: 1.15, opacity: 0.75, wingSpeed: 0.0048, yDriftSpeed: 0.0007 },
  { id: 2, y: 18, speed: 0.010, scale: 0.85, opacity: 0.60, wingSpeed: 0.0042, yDriftSpeed: 0.0006 },
  { id: 3, y: 34, speed: 0.009, scale: 0.78, opacity: 0.55, wingSpeed: 0.0038, yDriftSpeed: 0.0008 },
  { id: 4, y: 14, speed: 0.006, scale: 0.50, opacity: 0.38, wingSpeed: 0.0028, yDriftSpeed: 0.0005 },
  { id: 5, y: 12, speed: 0.005, scale: 0.40, opacity: 0.30, wingSpeed: 0.0022, yDriftSpeed: 0.0004 },
  { id: 6, y: 20, speed: 0.007, scale: 0.45, opacity: 0.35, wingSpeed: 0.0032, yDriftSpeed: 0.0005 },
];

/* ─── Canvas Bird ─────────────────────────────────────────────────────────── */
function Bird({ scale, opacity, wingPhase }: { scale: number; opacity: number; wingPhase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const W = Math.round(110 * scale);
  const H = Math.round(52 * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = opacity;
    // flip horizontally so the bird faces right
    ctx.translate(W, 0);
    ctx.scale(-1, 1);

    // coordinate space: body centre at (cx, cy)
    const cx = W * 0.44;
    const cy = H * 0.52;
    const s  = scale;

    // wing flap: -1 (down) to +1 (up)
    const flap = Math.sin(wingPhase);

    // ── helper to draw one wing half ──────────────────────────────────────
    function drawWing(side: 1 | -1) {
      const tip = flap * 14 * s;            // wingtip vertical travel
      const mid = flap * 8 * s;
      const trail = flap * 5 * s;

      // Outer wing span in x
      const tipX = cx + side * 46 * s;
      const midX = cx + side * 24 * s;

      // Main wing surface (filled silhouette)
      ctx.beginPath();
      ctx.moveTo(cx + side * 6 * s, cy - 1 * s);
      // leading edge sweeps out to tip
      ctx.bezierCurveTo(
        cx + side * 18 * s, cy + mid * 0.6,
        cx + side * 34 * s, cy + tip * 0.85,
        tipX, cy + tip,
      );
      // trailing edge curves back with feather droop
      ctx.bezierCurveTo(
        cx + side * 38 * s, cy + trail + 5 * s,
        cx + side * 28 * s, cy + trail + 4 * s,
        midX, cy + trail + 2 * s,
      );
      ctx.bezierCurveTo(
        cx + side * 18 * s, cy + trail + 1.5 * s,
        cx + side * 10 * s, cy + 3 * s,
        cx + side * 6 * s, cy + 1 * s,
      );
      ctx.closePath();

      // Rich dark plumage gradient — dark charcoal with warm undertone
      const grad = ctx.createLinearGradient(cx, cy - 10 * s, cx, cy + tip + 8 * s);
      grad.addColorStop(0,   'rgba(42, 34, 28, 0.95)');
      grad.addColorStop(0.4, 'rgba(30, 22, 16, 0.92)');
      grad.addColorStop(0.8, 'rgba(22, 14, 10, 0.88)');
      grad.addColorStop(1,   'rgba(15,  8,  5, 0.82)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle iridescent sheen on upper wing surface
      ctx.beginPath();
      ctx.moveTo(cx + side * 7 * s, cy - 0.5 * s);
      ctx.bezierCurveTo(
        cx + side * 18 * s, cy + mid * 0.5,
        cx + side * 30 * s, cy + tip * 0.75,
        cx + side * 44 * s, cy + tip * 0.92,
      );
      ctx.bezierCurveTo(
        cx + side * 36 * s, cy + tip * 0.85,
        cx + side * 22 * s, cy + mid * 0.4,
        cx + side * 8 * s, cy - 0.5 * s,
      );
      ctx.closePath();
      const sheen = ctx.createLinearGradient(cx, cy + tip * 0.3, tipX, cy + tip);
      sheen.addColorStop(0,   'rgba(90, 75, 55, 0.30)');
      sheen.addColorStop(0.5, 'rgba(70, 58, 40, 0.15)');
      sheen.addColorStop(1,   'rgba(50, 40, 28, 0.05)');
      ctx.fillStyle = sheen;
      ctx.fill();

      // Inner covert panel — slightly lighter warm brown
      ctx.beginPath();
      ctx.moveTo(cx + side * 7 * s, cy);
      ctx.bezierCurveTo(
        cx + side * 14 * s, cy + mid * 0.55,
        cx + side * 20 * s, cy + tip * 0.70,
        cx + side * 26 * s, cy + tip * 0.78,
      );
      ctx.bezierCurveTo(
        cx + side * 20 * s, cy + trail * 0.6 + 2 * s,
        cx + side * 14 * s, cy + trail * 0.4 + 1.5 * s,
        cx + side * 7 * s, cy + 0.5 * s,
      );
      ctx.closePath();
      const covert = ctx.createLinearGradient(cx + side * 7 * s, cy, cx + side * 26 * s, cy + tip);
      covert.addColorStop(0,   'rgba(62, 50, 38, 0.70)');
      covert.addColorStop(1,   'rgba(40, 30, 20, 0.45)');
      ctx.fillStyle = covert;
      ctx.fill();

      // Primary feather separation lines (subtle)
      for (let i = 0; i < 5; i++) {
        const t = (i + 1) / 6;
        const fx = cx + side * (28 + i * 4) * s;
        const fy = cy + tip * (0.72 + t * 0.18);
        const bx = cx + side * (26 + i * 3.5) * s;
        const by = cy + trail * 0.7 + 3 * s;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(fx - side * 1 * s, fy + 2 * s, fx, fy);
        ctx.strokeStyle = `rgba(18, 10, 6, ${0.35 + t * 0.2})`;
        ctx.lineWidth = 0.5 * s;
        ctx.stroke();
      }
    }

    drawWing(-1); // left wing
    drawWing(1);  // right wing

    // ── Body ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.ellipse(cx, cy, 9 * s, 4 * s, -0.12, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(cx - 1 * s, cy - 1.5 * s, 1 * s, cx, cy, 9 * s);
    bodyGrad.addColorStop(0,   'rgba(68, 54, 40, 0.98)');
    bodyGrad.addColorStop(0.5, 'rgba(38, 28, 18, 0.96)');
    bodyGrad.addColorStop(1,   'rgba(20, 12,  8, 0.92)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // underbelly highlight
    ctx.beginPath();
    ctx.ellipse(cx + 1 * s, cy + 1 * s, 5 * s, 2 * s, -0.1, 0, Math.PI * 2);
    const belly = ctx.createRadialGradient(cx + 1 * s, cy + 0.5 * s, 0.5 * s, cx + 1 * s, cy + 1 * s, 5 * s);
    belly.addColorStop(0,   'rgba(100, 82, 58, 0.28)');
    belly.addColorStop(1,   'rgba(60, 45, 28, 0.00)');
    ctx.fillStyle = belly;
    ctx.fill();

    // ── Tail ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx + 8 * s, cy + 0.5 * s);
    ctx.bezierCurveTo(cx + 14 * s, cy - 1 * s, cx + 20 * s, cy - 2 * s, cx + 22 * s, cy + 1 * s);
    ctx.bezierCurveTo(cx + 20 * s, cy + 2.5 * s, cx + 16 * s, cy + 3 * s, cx + 8 * s, cy + 1.5 * s);
    ctx.closePath();
    const tailGrad = ctx.createLinearGradient(cx + 8 * s, cy, cx + 22 * s, cy + 1 * s);
    tailGrad.addColorStop(0,   'rgba(45, 35, 22, 0.92)');
    tailGrad.addColorStop(1,   'rgba(20, 12,  8, 0.80)');
    ctx.fillStyle = tailGrad;
    ctx.fill();

    // ── Head ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.ellipse(cx - 10 * s, cy - 2 * s, 4.5 * s, 4 * s, 0.2, 0, Math.PI * 2);
    const headGrad = ctx.createRadialGradient(cx - 11 * s, cy - 3 * s, 0.5 * s, cx - 10 * s, cy - 2 * s, 4.5 * s);
    headGrad.addColorStop(0,   'rgba(72, 58, 42, 0.98)');
    headGrad.addColorStop(0.6, 'rgba(40, 28, 18, 0.96)');
    headGrad.addColorStop(1,   'rgba(22, 14,  8, 0.90)');
    ctx.fillStyle = headGrad;
    ctx.fill();

    // eye
    ctx.beginPath();
    ctx.arc(cx - 12 * s, cy - 3.2 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 4, 2, 0.95)';
    ctx.fill();
    // eye highlight
    ctx.beginPath();
    ctx.arc(cx - 12.4 * s, cy - 3.6 * s, 0.28 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 245, 220, 0.80)';
    ctx.fill();

    // ── Beak ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx - 14 * s, cy - 2.2 * s);
    ctx.lineTo(cx - 19 * s, cy - 3.4 * s);
    ctx.lineTo(cx - 14 * s, cy - 0.8 * s);
    ctx.closePath();
    const beakGrad = ctx.createLinearGradient(cx - 14 * s, cy - 3 * s, cx - 19 * s, cy - 1 * s);
    beakGrad.addColorStop(0, 'rgba(140, 110, 55, 0.95)');
    beakGrad.addColorStop(1, 'rgba(90,  68, 30, 0.90)');
    ctx.fillStyle = beakGrad;
    ctx.fill();

    ctx.restore();
  }, [W, H, opacity, wingPhase, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-hidden="true"
      style={{ display: 'block' }}
    />
  );
}

/* ─── Particles ───────────────────────────────────────────────────────────── */
interface Particle { id:number; x:number; y:number; size:number; dur:number; delay:number; op:number; }
function buildParticles(): Particle[] {
  return Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: 2 + (i * 2.71) % 96,
    y: 5 + (i * 2.61) % 90,
    size: 1.0 + (i % 6) * 0.55,
    dur: 9 + (i % 7) * 2.8,
    delay: (i * 0.71) % 11,
    op: 0.28 + (i % 5) * 0.12,
  }));
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */
export default function Hero() {
  const [birds, setBirds]   = useState<BirdState[]>([]);
  const [particles]         = useState<Particle[]>(buildParticles);
  const birdsRef            = useRef<BirdState[]>([]);
  const rafRef              = useRef<number>(0);
  const lastTRef            = useRef<number>(0);

  useEffect(() => {
    const init: BirdState[] = BIRD_CONFIGS.map((cfg, i) => ({
      ...cfg,
      x: -20 - i * 18,
      wingPhase: (i * Math.PI * 2) / BIRD_CONFIGS.length,
      yDrift: i * 1.1,
    }));
    birdsRef.current = init;
    setBirds(init);
  }, []);

  useEffect(() => {
    let running = true;
    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(now - lastTRef.current, 60);
      lastTRef.current = now;
      if (dt > 0) {
        birdsRef.current = birdsRef.current.map((b) => ({
          ...b,
          x: b.x + b.speed * dt > 112 ? -14 - Math.random() * 10 : b.x + b.speed * dt,
          wingPhase: b.wingPhase + b.wingSpeed * dt,
          yDrift: b.yDrift + b.yDriftSpeed * dt,
        }));
        setBirds([...birdsRef.current]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const scrollTo = (id: string) => scrollToSection(id);

  return (
    <section
      id="home"
      aria-label="Hero — Pulse of Divinity"
      className="relative w-full overflow-hidden"
      style={{ minHeight: '100svh', scrollMarginTop: 'clamp(64px, 8vw, 82px)' }}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0" aria-hidden="true">

        {/* 1. Deep plum base */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0d0614 0%, #160a22 30%, #1a0d2e 60%, #110819 100%)' }} />

        {/* 2. Aurora blob A — slow violet sweep */}
        <div className="absolute hero-aurora-a" style={{
          width: '80vw', height: '70vh',
          top: '-10%', left: '-15%',
          background: 'radial-gradient(ellipse at center, rgba(88,28,120,0.55) 0%, rgba(62,10,90,0.28) 45%, transparent 72%)',
          filter: 'blur(52px)',
          willChange: 'transform',
          animation: 'auroraA 22s ease-in-out infinite',
        }} />

        {/* 2b. Aurora blob B — gold-warm sweep */}
        <div className="absolute hero-aurora-b" style={{
          width: '70vw', height: '60vh',
          bottom: '-8%', right: '-10%',
          background: 'radial-gradient(ellipse at center, rgba(140,80,20,0.38) 0%, rgba(90,45,10,0.18) 48%, transparent 72%)',
          filter: 'blur(60px)',
          willChange: 'transform',
          animation: 'auroraB 28s ease-in-out infinite',
        }} />

        {/* 2c. Aurora blob C — midnight blue accent */}
        <div className="absolute" style={{
          width: '55vw', height: '55vh',
          top: '20%', left: '30%',
          background: 'radial-gradient(ellipse at center, rgba(15,30,80,0.45) 0%, rgba(10,20,55,0.20) 50%, transparent 72%)',
          filter: 'blur(70px)',
          willChange: 'transform',
          animation: 'auroraC 34s ease-in-out infinite',
        }} />

        {/* 2d. Aurora blob D — soft rose-violet top-right */}
        <div className="absolute" style={{
          width: '50vw', height: '45vh',
          top: '-5%', right: '5%',
          background: 'radial-gradient(ellipse at center, rgba(100,30,80,0.32) 0%, rgba(70,15,55,0.15) 50%, transparent 72%)',
          filter: 'blur(55px)',
          willChange: 'transform',
          animation: 'auroraD 26s ease-in-out infinite',
        }} />

        {/* 3. Bokeh orbs */}
        <div className="absolute" style={{ width:320, height:320, borderRadius:'50%', top:'8%', left:'12%', background:'radial-gradient(circle, rgba(201,162,39,0.09) 0%, transparent 65%)', filter:'blur(28px)', animation:'bokehDrift1 18s ease-in-out infinite' }} />
        <div className="absolute" style={{ width:240, height:240, borderRadius:'50%', top:'55%', right:'8%', background:'radial-gradient(circle, rgba(180,120,200,0.10) 0%, transparent 65%)', filter:'blur(22px)', animation:'bokehDrift2 24s ease-in-out infinite' }} />
        <div className="absolute" style={{ width:160, height:160, borderRadius:'50%', bottom:'15%', left:'22%', background:'radial-gradient(circle, rgba(201,162,39,0.07) 0%, transparent 65%)', filter:'blur(18px)', animation:'bokehDrift3 20s ease-in-out infinite' }} />
        <div className="absolute" style={{ width:200, height:200, borderRadius:'50%', top:'35%', left:'60%', background:'radial-gradient(circle, rgba(120,60,160,0.08) 0%, transparent 65%)', filter:'blur(24px)', animation:'bokehDrift1 29s ease-in-out infinite reverse' }} />

        {/* 4. Painterly texture overlay — fine noise via SVG feTurbulence */}
        <div className="absolute inset-0" style={{
          opacity: 0.038,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          backgroundRepeat: 'repeat',
        }} />

        {/* 5. Vignette edge darkening */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(8,3,14,0.62) 100%)' }} />

        {/* 6. Top fade */}
        <div className="absolute inset-x-0 top-0" style={{ height:'22%', background:'linear-gradient(to bottom, rgba(8,3,14,0.55) 0%, transparent 100%)' }} />

        {/* 7. Bottom fade */}
        <div className="absolute inset-x-0 bottom-0" style={{ height:'18%', background:'linear-gradient(to top, rgba(8,3,14,0.70) 0%, transparent 100%)' }} />
      </div>

      {/* ── Birds ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }} aria-hidden="true">
        {[...birds].sort((a, b) => a.scale - b.scale).map((bird) => (
          <div
            key={bird.id}
            style={{
              position: 'absolute',
              left: `${bird.x}%`,
              top: `${bird.y + Math.sin(bird.yDrift) * 2.8}%`,
              transform: `translate(-50%,-50%) rotate(${Math.cos(bird.yDrift) * bird.yDriftSpeed * 1200}deg)`,
              willChange: 'transform',
              filter: bird.scale < 0.6 ? 'blur(0.5px)' : 'none',
            }}
          >
            <Bird scale={bird.scale} opacity={bird.opacity} wingPhase={bird.wingPhase} />
          </div>
        ))}
      </div>

      {/* ── Particles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 11 }} aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute particle-glow"
            style={{ left:`${p.x}%`, top:`${p.y}%`, width:`${p.size}px`, height:`${p.size}px`, opacity:p.op, animation:`particleDrift ${p.dur}s ease-in-out ${p.delay}s infinite` }}
          />
        ))}
      </div>

      {/* ── Ambient shimmer — subtle gold sweep ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ zIndex: 12, background: 'linear-gradient(135deg, rgba(201,162,39,0.04) 0%, transparent 45%, rgba(88,28,120,0.05) 100%)', backgroundSize:'300% 300%', animation:'gradientDrift 24s ease-in-out infinite' }}
      />

      {/* ── Readability layer — softened to accommodate portrait left ── */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          zIndex: 14,
          inset: 0,
          background: 'radial-gradient(ellipse 90% 80% at 62% 55%, rgba(8,3,14,0.62) 0%, rgba(8,3,14,0.32) 50%, rgba(8,3,14,0.08) 70%, transparent 82%)',
        }}
      />

      {/* ── Content ── */}
      {/* On mobile: relative flow so section grows to fit. On md+: absolute centered overlay. */}
      <div
        className="relative md:absolute md:inset-0 flex items-start md:items-center justify-center pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <div
          className="pointer-events-auto w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-14 flex flex-col md:flex-row items-center gap-6 md:gap-12 lg:gap-20"
          style={{
            paddingTop: 'clamp(5.5rem, 14vh, 8rem)',
            paddingBottom: 'clamp(4rem, 8vh, 6rem)',
          }}
        >

          {/* ── Portrait ── */}
          <div
            className="flex-shrink-0 opacity-0"
            style={{
              animation: 'heroPortraitReveal 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards',
              /*
                Mobile: fixed pixel width so the portrait doesn't dominate the
                stacked layout. md+: grows to fill ~28% of viewport width.
              */
              width: 'clamp(130px, 32vw, 340px)',
            }}
          >
            {/*
              Extra padding around the inner box to give the absolutely-positioned
              frame decorations room to render without bleeding outside the flex item.
              On mobile the frame offsets are halved to stay compact.
            */}
            <div style={{ padding: '20px 0 28px 14px' }}>
              <div className="relative" style={{ width: '100%' }}>
                {/* Outer offset frame — gold lines */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-14px', left: '-14px',
                    right: '14px', bottom: '14px',
                    border: '1px solid rgba(201,162,39,0.35)',
                    pointerEvents: 'none',
                    animation: 'heroFrameGlow 4s ease-in-out 2s infinite alternate',
                  }}
                />
                {/* Inner offset frame — softer */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-7px', left: '-7px',
                    right: '7px', bottom: '7px',
                    border: '1px solid rgba(201,162,39,0.15)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Photo */}
                <div
                  style={{
                    aspectRatio: '3/4',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 28px 80px rgba(8,3,14,0.85), 0 8px 24px rgba(8,3,14,0.6), inset 0 0 0 1px rgba(201,162,39,0.12)',
                  }}
                >
                  <img
                    src="/images/Profile photos/profile_1.JPG"
                    alt="Darcy LaDue — artist and founder of Pulse of Divinity"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      display: 'block',
                    }}
                  />
                  {/* Subtle gradient veil — bottom fade into dark */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 50%, rgba(8,3,14,0.45) 100%)',
                    }}
                  />
                  {/* Gold shimmer overlay */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(201,162,39,0.06) 0%, transparent 55%)',
                    }}
                  />
                </div>

                {/* Name tag — contained within the padding zone below the photo */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-22px',
                    right: '-18px',
                    padding: '0.55rem 1rem',
                    background: 'linear-gradient(135deg, rgba(12,6,20,0.96), rgba(20,10,32,0.92))',
                    border: '1px solid rgba(201,162,39,0.30)',
                    boxShadow: '0 8px 32px rgba(8,3,14,0.7)',
                    whiteSpace: 'nowrap',
                    animation: 'heroPortraitReveal 1.2s cubic-bezier(0.22,1,0.36,1) 1.1s both',
                  }}
                >
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(0.78rem,1.1vw,0.9rem)', color: '#c9a227', letterSpacing: '0.06em', lineHeight: 1.2 }}>
                    Darcy LaDue
                  </p>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,243,217,0.55)', marginTop: '0.15rem' }}>
                    Artist · Painter
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Text ── */}
          <div className="flex-1 text-center md:text-left">
            <p
              className="luxury-subheading text-gold-gradient tracking-[0.42em] opacity-0"
              style={{
                fontWeight: 500,
                fontSize: 'clamp(0.6rem, 1.1vw, 0.78rem)',
                filter: 'drop-shadow(0 1px 10px rgba(22,10,30,0.95))',
                animation: 'fadeUp 1s ease-out 0.35s forwards',
                marginBottom: 'clamp(0.9rem, 2vh, 1.4rem)',
              }}
            >
              Spiritual Fine Art · Darcy
            </p>

            <h1
              className="luxury-heading text-ivory-100 opacity-0"
              style={{
                fontSize: 'clamp(1.55rem, 3.8vw, 3.6rem)',
                animation: 'fadeUp 1.15s ease-out 0.65s forwards',
                textShadow: '0 2px 28px rgba(22,10,30,0.95), 0 1px 8px rgba(22,10,30,0.7)',
                lineHeight: 1.13,
                marginBottom: 'clamp(0.9rem, 2vh, 1.4rem)',
              }}
            >
              Original artwork created to bring<br />
              <span className="hero-accent-phrase">peace, symbolism, and nature</span><br />
              into elevated spaces.
            </h1>

            {/* Animated divider */}
            <div className="opacity-0 flex justify-center md:justify-start" style={{ animation: 'fadeIn 1s ease-out 1.05s forwards', marginBottom: 'clamp(0.9rem, 2vh, 1.4rem)' }}>
              <div style={{ height:'1px', width:'0', background:'linear-gradient(90deg,transparent,#c9a227,transparent)', animation:'dividerGrow 1.2s ease-out 1.2s forwards' }} />
            </div>

            <p
              className="opacity-0 mx-auto md:mx-0"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 300,
                color: 'rgba(250,243,217,0.92)',
                fontSize: 'clamp(0.88rem, 1.6vw, 1.08rem)',
                letterSpacing: '0.03em',
                lineHeight: 1.85,
                animation: 'fadeUp 1s ease-out 1.15s forwards',
                textShadow: '0 1px 20px rgba(22,10,30,0.95), 0 0 8px rgba(22,10,30,0.7)',
                maxWidth: '480px',
                marginBottom: 'clamp(1.75rem, 3.5vh, 2.75rem)',
              }}
            >
              Pulse of Divinity is a spiritual luxury art collection by Darcy LaDue, created for
              collectors who want their environment to feel calm, meaningful, and emotionally alive.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-3 sm:gap-4 opacity-0"
              style={{ animation: 'fadeUp 1s ease-out 1.45s forwards' }}
            >
              <button
                onClick={() => scrollTo('#works')}
                className="luxury-btn-primary w-full sm:w-auto"
                style={{ minWidth: 0 }}
              >
                Explore Available Works
              </button>
              <button
                onClick={() => scrollTo('#commissions')}
                className="luxury-btn-ghost w-full sm:w-auto"
                style={{ minWidth: 0 }}
              >
                Inquire About a Commission
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
