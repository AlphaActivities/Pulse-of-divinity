import { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Instagram, Facebook, Send, ChevronDown } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { availableWorks } from '../data/availableWorks';
import {
  trackContactFormStart,
  trackContactMethodSelected,
  trackArtworkInquiryStart,
  trackArtworkInquirySubmit,
  trackCommissionInquiryStart,
  trackCommissionInquirySubmit,
  trackContactFormSubmit,
  trackContactFormError,
  trackEmailLinkClick,
  trackPhoneLinkClick,
  trackSocialLinkClick,
} from '../utils/analytics';

type FormField = 'name' | 'email' | 'phone' | 'interest' | 'contactMethod' | 'message';

interface PieceOption {
  artworkId: string | null;
  value: string;
  label: string;
  price?: string;
  priceNumeric?: number | null;
  image?: string;
  sub?: string;
}

const pieceOptions: PieceOption[] = [
  ...availableWorks
    .filter((w) => w.inquiryEligible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w) => ({
      artworkId: w.id,
      value: w.id,
      label: w.title,
      price: w.priceDisplay,
      priceNumeric: w.priceNumeric,
      image: w.image,
      sub: w.tag,
    })),
  {
    artworkId: null,
    value: 'commission',
    label: 'Private Commission Inquiry',
    sub: 'A work created just for you',
  },
  {
    artworkId: null,
    value: 'general',
    label: 'General Question',
    sub: 'Something else on your mind',
  },
];

const contactMethods = [
  { value: 'email', label: 'Email' },
  { value: 'call',  label: 'Call'  },
  { value: 'text',  label: 'Text'  },
];

const CONTACT_EMAIL = 'darcy.pulseofdivinity@gmail.com';
const CONTACT_PHONE = '+1 (458) 488-0450';
const CONTACT_PHONE_HREF = 'tel:+14584880450';

export default function Contact() {
  const { ref: titleRef, visible: titleVisible } = useReveal();
  const { ref: formRef,  visible: formVisible  } = useReveal();

  const [form, setForm] = useState({ name:'', email:'', phone:'', interest:'', contactMethod:'', message:'' });
  const [submitted, setSubmitted] = useState(false);
  const [focused,   setFocused]   = useState<FormField | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const formStartFired    = useRef(false);
  const inquiryStartFired = useRef<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const nav = document.querySelector('nav');
    const navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 68;
    const panelHeight = Math.min(360, window.innerHeight * 0.5);
    const spaceBelow = window.innerHeight - trigger.bottom;
    if (spaceBelow < panelHeight + 16) {
      window.scrollTo({
        top: trigger.top + window.scrollY - navHeight - 96,
        behavior: 'smooth',
      });
    }
  }, [dropdownOpen]);

  const selectedOption = pieceOptions.find(o => o.value === form.interest);

  const set = (field: FormField, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  const handleFormStart = () => {
    if (formStartFired.current) return;
    formStartFired.current = true;
    trackContactFormStart();
  };

  const handleInterestSelect = (value: string) => {
    set('interest', value);
    setDropdownOpen(false);
    setFocused(null);
    const option = pieceOptions.find((o) => o.value === value);
    if (!option) return;
    if (option.artworkId && inquiryStartFired.current !== value) {
      inquiryStartFired.current = value;
      trackArtworkInquiryStart({
        inquiry_type: 'available_work',
        artwork_id: option.artworkId,
        artwork_title: option.label,
        artwork_price: option.priceNumeric ?? null,
      });
    } else if (value === 'commission' && inquiryStartFired.current !== 'commission') {
      inquiryStartFired.current = 'commission';
      trackCommissionInquiryStart();
    }
  };

  const handleContactMethodSelect = (value: string) => {
    set('contactMethod', value);
    trackContactMethodSelected(value as 'email' | 'call' | 'text');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = pieceOptions.find((o) => o.value === form.interest);
    const body = new URLSearchParams({
      'form-name': 'contact',
      'bot-field': '',
      name: form.name,
      email: form.email,
      phone: form.phone,
      interest: form.interest,
      artworkId: selected?.artworkId ?? '',
      artworkTitle: selected?.label ?? '',
      artworkPrice: selected?.price ?? '',
      contactMethod: form.contactMethod,
      message: form.message,
    });
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then((res) => {
        if (res.ok) {
          const inquiryType = selected?.artworkId
            ? 'available_work' as const
            : selected?.value === 'commission'
              ? 'commission' as const
              : 'general' as const;
          const contactMethod = form.contactMethod as 'email' | 'call' | 'text' | undefined;
          trackContactFormSubmit({
            inquiry_type: inquiryType,
            contact_method: contactMethod || undefined,
            form_progress: formProgress,
          });
          if (selected?.artworkId) {
            trackArtworkInquirySubmit({
              inquiry_type: 'available_work',
              artwork_id: selected.artworkId,
              artwork_title: selected.label,
              artwork_price: selected.priceNumeric ?? null,
              contact_method: contactMethod || undefined,
            });
          } else if (selected?.value === 'commission') {
            trackCommissionInquirySubmit({ contact_method: contactMethod || undefined });
          }
          setSubmitted(true);
        } else {
          trackContactFormError({ error_type: 'netlify_submission_failed', status_code: res.status });
          console.error('Netlify form submission failed:', res.status);
        }
      })
      .catch((err) => {
        trackContactFormError({ error_type: 'network_error' });
        console.error('Netlify form submission error:', err);
      });
  };

  /* Shared input style with focus indicator */
  const inputStyle = (field: FormField): React.CSSProperties => ({
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${focused === field ? '#c9a227' : 'rgba(107,81,67,0.35)'}`,
    padding: '12px 0',
    outline: 'none',
    fontFamily: 'Jost, system-ui, sans-serif',
    fontWeight: 300,
    fontSize: 'clamp(1rem,1.5vw,0.97rem)',
    color: '#573f36',
    transition: 'border-color 0.35s ease',
    WebkitAppearance: 'none',
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Jost, sans-serif',
    fontWeight: 400,
    fontSize: '11px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#6b5143',
    display: 'block',
    marginBottom: '8px',
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const formProgress = Math.min(100,
    (form.name.trim()            ? 15 : 0) +
    (emailRegex.test(form.email) ? 20 : 0) +
    (form.phone.trim()           ? 10 : 0) +
    (form.interest               ? 20 : 0) +
    (form.contactMethod          ? 15 : 0) +
    (form.message.trim()         ? 20 : 0)
  );

  const contactLinks = [
    {
      icon: Phone,
      label: 'Phone',
      display: CONTACT_PHONE,
      href: CONTACT_PHONE_HREF,
      sub: 'Call or Text Welcome',
    },
    {
      icon: Mail,
      label: 'Email',
      display: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      sub: '',
    },
  ];

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="section-pad"
      style={{ background:'linear-gradient(170deg,#fdfbf0 0%,#faf3d9 50%,#fdf9ed 100%)', scrollMarginTop: 'clamp(64px, 8vw, 82px)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header
          ref={titleRef}
          className={`text-center mb-14 md:mb-20 reveal ${titleVisible ? 'visible' : ''}`}
        >
          <p className="luxury-subheading text-gold-600 tracking-[0.42em] mb-4 md:mb-5">Reach Out</p>
          <h2 id="contact-heading" className="luxury-heading text-plum-900 mb-4" style={{ fontSize:'clamp(2rem,5vw,3.8rem)' }}>
            Begin a Conversation
          </h2>
          <div style={{ height:'1px', width:titleVisible?'60px':'0', background:'linear-gradient(90deg,transparent,#c9a227,transparent)', margin:'0 auto 1.6rem', transition:'width 1.2s ease 0.3s' }} />
          <p className="text-warm-600 max-w-xl mx-auto" style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(1rem,1.7vw,1.12rem)', lineHeight:1.95 }}>
            Whether you are interested in an available painting or a future private commission,
            you are invited to reach out and begin a calm, personal conversation about the piece
            that resonates with you.
          </p>
        </header>

        <div
          ref={formRef}
          className={`grid lg:grid-cols-5 gap-12 lg:gap-16 reveal reveal-delay-2 ${formVisible ? 'visible' : ''}`}
        >
          {/* ── Left: info ── */}
          <aside className="lg:col-span-2 flex flex-col gap-8 sm:gap-10">
            <div>
              <h3 className="luxury-heading text-plum-800 mb-6 sm:mb-7" style={{ fontSize:'clamp(1.2rem,2.5vw,1.4rem)' }}>
                Contact Darcy LaDue Directly
              </h3>

              <div className="space-y-5 sm:space-y-6">
                {/* Phone */}
                <a
                  href={CONTACT_PHONE_HREF}
                  className="flex items-start gap-4 group"
                  style={{ textDecoration:'none' }}
                  onClick={() => trackPhoneLinkClick({ link_location: 'contact_sidebar' })}
                >
                  <div
                    style={{ padding:'11px', border:'1px solid rgba(201,162,39,0.28)', marginTop:'2px', flexShrink:0, transition:'background 0.35s ease,border-color 0.35s ease' }}
                    onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                    onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                  >
                    <Phone size={16} style={{ color:'#c9a227' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p style={labelStyle}>Phone</p>
                    <p className="group-hover:text-gold-700 transition-colors duration-300 break-words" style={{ fontFamily:'Jost, system-ui, sans-serif', fontWeight:300, fontSize:'0.92rem', letterSpacing:'0.02em', color:'#3e2240' }}>
                      {CONTACT_PHONE}
                    </p>
                    <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b5143', marginTop:'3px' }}>
                      Call or Text Welcome
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-start gap-4 group"
                  style={{ textDecoration:'none' }}
                  onClick={() => trackEmailLinkClick({ link_location: 'contact_sidebar' })}
                >
                  <div
                    style={{ padding:'11px', border:'1px solid rgba(201,162,39,0.28)', marginTop:'2px', flexShrink:0, transition:'background 0.35s ease,border-color 0.35s ease' }}
                    onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                    onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                  >
                    <Mail size={16} style={{ color:'#c9a227' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p style={labelStyle}>Email</p>
                    <p className="group-hover:text-gold-700 transition-colors duration-300 break-words" style={{ fontFamily:'Jost, system-ui, sans-serif', fontWeight:300, fontSize:'0.92rem', letterSpacing:'0.02em', color:'#3e2240' }}>
                      {CONTACT_EMAIL}
                    </p>
                  </div>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/pulseofdivinity/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                  style={{ textDecoration:'none' }}
                  onClick={() => trackSocialLinkClick({ platform: 'instagram', link_location: 'contact_sidebar' })}
                >
                  <div
                    style={{ padding:'11px', border:'1px solid rgba(201,162,39,0.28)', marginTop:'2px', flexShrink:0, transition:'background 0.35s ease,border-color 0.35s ease' }}
                    onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                    onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                  >
                    <Instagram size={16} style={{ color:'#c9a227' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p style={labelStyle}>Instagram</p>
                    <p
                      className="group-hover:text-gold-700 transition-colors duration-300 break-words"
                      style={{ fontFamily:'Jost, system-ui, sans-serif', fontWeight:300, fontSize:'0.92rem', letterSpacing:'0.02em', color:'#3e2240' }}
                    >
                      @pulseofdivinity
                    </p>
                    <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b5143', marginTop:'3px' }}>
                      Artwork &amp; process
                    </p>
                  </div>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/pulseofdivinity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                  style={{ textDecoration:'none' }}
                  onClick={() => trackSocialLinkClick({ platform: 'facebook', link_location: 'contact_sidebar' })}
                >
                  <div
                    style={{ padding:'11px', border:'1px solid rgba(201,162,39,0.28)', marginTop:'2px', flexShrink:0, transition:'background 0.35s ease,border-color 0.35s ease' }}
                    onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                    onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='rgba(201,162,39,0.1)'; el.style.borderColor='rgba(201,162,39,0.55)'; }}
                    onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.background='transparent'; el.style.borderColor='rgba(201,162,39,0.28)'; }}
                  >
                    <Facebook size={16} style={{ color:'#c9a227' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p style={labelStyle}>Facebook</p>
                    <p
                      className="group-hover:text-gold-700 transition-colors duration-300 break-words"
                      style={{ fontFamily:'Jost, system-ui, sans-serif', fontWeight:300, fontSize:'0.92rem', letterSpacing:'0.02em', color:'#3e2240' }}
                    >
                      Pulse of Divinity
                    </p>
                    <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b5143', marginTop:'3px' }}>
                      Follow the art journey
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Personal note */}
            <blockquote
              style={{ padding:'1.6rem', border:'1px solid rgba(201,162,39,0.18)', background:'rgba(253,251,240,0.55)', transition:'border-color 0.4s ease,box-shadow 0.4s ease' }}
              onMouseEnter={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.35)'; el.style.boxShadow='0 8px 28px rgba(62,34,64,0.07)'; }}
              onMouseLeave={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.18)'; el.style.boxShadow='none'; }}
              onTouchStart={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.35)'; el.style.boxShadow='0 8px 28px rgba(62,34,64,0.07)'; }}
              onTouchEnd={(e) => { const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(201,162,39,0.18)'; el.style.boxShadow='none'; }}
            >
              <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(0.97rem,1.5vw,1.02rem)', lineHeight:1.92, fontStyle:'italic', color:'#6b5143' }}>
                "Every message is read and responded to personally, by me, not an assistant.
                There is no rush here. Take your time."
              </p>
              <footer className="luxury-subheading text-gold-600 mt-4 tracking-widest">— Darcy</footer>
            </blockquote>
          </aside>

          {/* ── Right: form ── */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div
                className="flex flex-col items-center justify-center text-center py-16 px-6"
                style={{ border:'1px solid rgba(201,162,39,0.18)', background:'rgba(253,251,240,0.5)', animation:'fadeUp 0.8s ease-out forwards', minHeight:'440px' }}
              >
                <div
                  style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#c9a227,#dfc236)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.5rem', animation:'pulseGold 2.5s ease-in-out infinite' }}
                >
                  <Send size={18} style={{ color:'#2a1629' }} strokeWidth={1.5} />
                </div>
                <h3 className="luxury-heading text-plum-900 mb-4" style={{ fontSize:'clamp(1.5rem,3vw,1.75rem)' }}>
                  Your message has arrived.
                </h3>
                <p style={{ fontFamily:'Cormorant Garamond,serif', fontWeight:300, fontSize:'clamp(0.97rem,1.5vw,1.05rem)', lineHeight:1.88, color:'#6b5143', maxWidth:'300px' }}>
                  Darcy will respond personally, usually within 1–2 business days. Thank you for reaching out.
                </p>
              </div>
            ) : (
              <form
                name="contact"
                method="POST"
                data-netlify="true"
                netlify-honeypot="bot-field"
                onSubmit={handleSubmit}
                noValidate
                style={{ display:'flex', flexDirection:'column', gap:'clamp(1.5rem,3vw,2rem)' }}
              >
                <input type="hidden" name="form-name" value="contact" />
                <p className="hidden">
                  <label>Don't fill this out if you're human: <input name="bot-field" /></label>
                </p>
                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <label htmlFor="f-name" style={labelStyle}>Your Name</label>
                    <input
                      id="f-name"
                      type="text"
                      name="name"
                      required
                      autoComplete="name"
                      value={form.name}
                      placeholder="Full name"
                      onChange={(e) => set('name', e.target.value)}
                      onFocus={() => { handleFormStart(); setFocused('name'); }}
                      onBlur={() => setFocused(null)}
                      style={inputStyle('name')}
                    />
                  </div>
                  <div>
                    <label htmlFor="f-email" style={labelStyle}>Email Address</label>
                    <input
                      id="f-email"
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      placeholder="your@email.com"
                      onChange={(e) => set('email', e.target.value)}
                      onFocus={() => { handleFormStart(); setFocused('email'); }}
                      onBlur={() => setFocused(null)}
                      style={inputStyle('email')}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="f-phone" style={labelStyle}>
                    Phone Number{' '}
                    <span style={{ opacity:0.6, fontStyle:'italic', textTransform:'none', letterSpacing:0, fontFamily:'Cormorant Garamond,serif', fontSize:'11px' }}>(optional)</span>
                  </label>
                  <input
                    id="f-phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={form.phone}
                    placeholder="+1 (234) 567-8901"
                    onChange={(e) => set('phone', formatPhone(e.target.value))}
                    onFocus={() => { handleFormStart(); setFocused('phone'); }}
                    onBlur={() => setFocused(null)}
                    style={inputStyle('phone')}
                  />
                </div>

                {/* Interest — custom dropdown */}
                <div ref={dropdownRef} style={{ position:'relative' }}>
                  <label style={labelStyle}>Which piece are you interested in?</label>

                  {/* Trigger */}
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={() => { handleFormStart(); setDropdownOpen(o => !o); setFocused('interest'); }}
                    onBlur={() => { if (!dropdownOpen) setFocused(null); }}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                    aria-controls="interest-listbox"
                    style={{
                      width:'100%',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'space-between',
                      gap:'12px',
                      background:'transparent',
                      border:'none',
                      borderBottom:`1px solid ${focused==='interest'||dropdownOpen ? '#c9a227' : 'rgba(107,81,67,0.35)'}`,
                      padding:'12px 0',
                      cursor:'pointer',
                      transition:'border-color 0.35s ease',
                      minHeight:'44px',
                    }}
                  >
                    {selectedOption ? (
                      <span style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        {selectedOption.image && (
                          <img
                            src={selectedOption.image}
                            alt={selectedOption.label}
                            style={{ width:'36px', height:'36px', objectFit:'cover', flexShrink:0, border:'1px solid rgba(201,162,39,0.3)' }}
                          />
                        )}
                        <span style={{ fontFamily:'Jost,system-ui,sans-serif', fontWeight:300, fontSize:'clamp(0.9rem,1.5vw,0.97rem)', color:'#573f36', textAlign:'left' }}>
                          {selectedOption.label}
                          {selectedOption.price && (
                            <span style={{ marginLeft:'8px', color:'#7d4574', fontWeight:400 }}>{selectedOption.price}</span>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontFamily:'Jost,system-ui,sans-serif', fontWeight:300, fontSize:'clamp(0.9rem,1.5vw,0.97rem)', color:'rgba(107,81,67,0.5)' }}>
                        Select an option…
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      style={{ color:'#c9a227', flexShrink:0, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.3s ease' }}
                    />
                  </button>

                  {/* Dropdown panel */}
                  <div
                    id="interest-listbox"
                    role="listbox"
                    aria-label="Select a piece"
                    className="dropdown-luxury-scroll"
                    style={{
                      position:'absolute',
                      top:'calc(100% + 4px)',
                      left:0,
                      right:0,
                      zIndex:50,
                      background:'#fdfbf0',
                      border:'1px solid rgba(201,162,39,0.28)',
                      boxShadow:'0 16px 48px rgba(62,34,64,0.13)',
                      maxHeight: dropdownOpen ? 'min(360px, 50vh)' : '0',
                      overflowY: dropdownOpen ? 'auto' : 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarColor: '#d4af37 rgba(255, 255, 255, 0.02)',
                      scrollbarWidth: 'thin',
                      opacity: dropdownOpen ? 1 : 0,
                      pointerEvents: dropdownOpen ? 'auto' : 'none',
                      transition:'max-height 0.35s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s ease',
                    }}
                  >
                    {pieceOptions.map((o, index) => {
                      const isSelected = form.interest === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleInterestSelect(o.value)}
                          style={{
                            width:'100%',
                            display:'flex',
                            alignItems:'center',
                            gap:'12px',
                            padding:'12px 16px',
                            background: isSelected ? 'rgba(201,162,39,0.08)' : 'transparent',
                            border:'none',
                            borderBottom: index < pieceOptions.length - 1 ? '1px solid rgba(212, 175, 55, 0.10)' : 'none',
                            cursor:'pointer',
                            textAlign:'left',
                            transition:'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background='rgba(201,162,39,0.12)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background=isSelected?'rgba(201,162,39,0.08)':'transparent'; }}
                        >
                          {o.image ? (
                            <img
                              src={o.image}
                              alt={o.label}
                              style={{ width:'52px', height:'52px', objectFit:'cover', flexShrink:0, border:'1px solid rgba(201,162,39,0.25)' }}
                            />
                          ) : (
                            <div style={{ width:'52px', height:'52px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(201,162,39,0.18)', background:'rgba(201,162,39,0.04)' }}>
                              <span style={{ color:'rgba(201,162,39,0.5)', fontSize:'18px', fontFamily:'Cormorant Garamond,serif' }}>✦</span>
                            </div>
                          )}
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontFamily:'Jost,system-ui,sans-serif', fontWeight:400, fontSize:'0.9rem', color:'#3e2240', letterSpacing:'0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {o.label}
                              {o.price && <span style={{ marginLeft:'8px', color:'#7d4574', fontWeight:400 }}>{o.price}</span>}
                            </p>
                            {o.sub && (
                              <p style={{ fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'9px', letterSpacing:'0.18em', textTransform:'uppercase', color:'#6b5143', marginTop:'3px' }}>
                                {o.sub}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred contact method */}
                <fieldset style={{ border:'none', padding:0, margin:0 }}>
                  <legend style={labelStyle}>Preferred Contact Method</legend>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'4px' }}>
                    {contactMethods.map((m) => {
                      const active = form.contactMethod === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => handleContactMethodSelect(m.value)}
                          aria-pressed={active}
                          style={{
                            padding:'10px 20px',
                            border:`1px solid ${active?'rgba(201,162,39,0.7)':'rgba(201,162,39,0.22)'}`,
                            background: active?'rgba(201,162,39,0.1)':'transparent',
                            fontFamily:'Jost,sans-serif', fontWeight:300,
                            fontSize:'10px', letterSpacing:'0.22em', textTransform:'uppercase',
                            color: active?'#a87e1e':'#6b5143',
                            cursor:'pointer',
                            transition:'all 0.3s ease',
                            minHeight:'44px',  /* accessible tap target */
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Message */}
                <div>
                  <label htmlFor="f-message" style={labelStyle}>Your Message</label>
                  <textarea
                    id="f-message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    placeholder="Share what drew you here, what you are seeking, or simply say hello…"
                    onChange={(e) => set('message', e.target.value)}
                    onFocus={() => { handleFormStart(); setFocused('message'); }}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle('message'), resize:'none', lineHeight:1.85 }}
                  />
                </div>

                <button
                  type="submit"
                  className="luxury-btn-primary"
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}
                >
                  <div
                    className={`btn-progress-fill${formProgress >= 100 ? ' is-complete' : ''}`}
                    style={{ width: `${Math.max(28, formProgress)}%` }}
                  />
                  <span style={{ position:'relative', zIndex:2 }}>Send Inquiry</span>
                  <Send size={12} strokeWidth={1.5} style={{ position:'relative', zIndex:2 }} />
                </button>

                <p style={{ textAlign:'center', fontFamily:'Jost,sans-serif', fontWeight:300, fontSize:'10px', letterSpacing:'0.08em', color:'#6b5143' }}>
                  Your information is held in confidence and never shared with third parties.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
