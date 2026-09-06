import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  COUNTRY_OPTIONS,
  getRegionsForCountry,
  type CountryCode,
  type ShippingAddress,
  type ShippingFormErrors,
} from '../types/shipping';

interface AcquireArtworkModalProps {
  open: boolean;
  artworkTitle: string;
  artworkPriceDisplay: string;
  onClose: () => void;
}

const EMPTY_FORM: ShippingAddress = {
  fullName: '',
  country: 'US',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  phone: '',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'Jost, sans-serif',
  fontWeight: 400,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'rgba(220,195,120,0.85)',
  display: 'block',
  marginBottom: '8px',
};

const inputStyle = (hasError: boolean, isFocused: boolean): React.CSSProperties => ({
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${hasError ? '#b85450' : isFocused ? 'rgba(201,162,39,0.7)' : 'rgba(220,195,120,0.3)'}`,
  padding: '12px 0',
  outline: 'none',
  fontFamily: 'Jost, system-ui, sans-serif',
  fontWeight: 300,
  fontSize: 'clamp(0.9rem,1.5vw,0.97rem)',
  color: '#fdfbf0',
  transition: 'border-color 0.35s ease',
  WebkitAppearance: 'none',
});

const selectStyle = (hasError: boolean, isFocused: boolean): React.CSSProperties => ({
  ...inputStyle(hasError, isFocused),
  cursor: 'pointer',
  paddingRight: '24px',
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9a227' stroke-width='1.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0 center',
});

const errorTextStyle: React.CSSProperties = {
  fontFamily: 'Jost, sans-serif',
  fontWeight: 300,
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#b85450',
  marginTop: '6px',
};

export default function AcquireArtworkModal({
  open,
  artworkTitle,
  artworkPriceDisplay,
  onClose,
}: AcquireArtworkModalProps) {
  const [form, setForm] = useState<ShippingAddress>(EMPTY_FORM);
  const [errors, setErrors] = useState<ShippingFormErrors>({});
  const [focused, setFocused] = useState<keyof ShippingAddress | null>(null);
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });

    return () => {
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const set = (field: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched) {
      setErrors(validate({ ...form, [field]: value }));
    }
  };

  const validate = (data: ShippingAddress): ShippingFormErrors => {
    const errs: ShippingFormErrors = {};
    if (!data.fullName.trim()) errs.fullName = 'Please enter recipient name';
    if (!data.addressLine1.trim()) errs.addressLine1 = 'Please enter street address';
    if (!data.city.trim()) errs.city = 'Please enter city';
    if (!data.region) errs.region = 'Please select state or province';
    if (!data.postalCode.trim()) errs.postalCode = 'Please enter postal or ZIP code';
    if (data.phone && !/^[\d\s()+-]{7,}$/.test(data.phone.trim())) {
      errs.phone = 'Please enter a valid phone number';
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    // Phase 4A: no external action. Phase 4B will wire this to a server endpoint.
  };

  const regions = getRegionsForCountry(form.country);

  const handleCountryChange = (value: string) => {
    const country = value as CountryCode;
    setForm((prev) => ({
      ...prev,
      country,
      region: '',
    }));
    if (touched) {
      setErrors(validate({ ...form, country, region: '' }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Acquire ${artworkTitle}`}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2.5rem)',
        background: 'rgba(8, 3, 14, 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'acquire-fade-in 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflowY: 'auto',
      }}
    >
      {/* Close button */}
      <button
        ref={closeBtnRef}
        aria-label="Close acquisition form"
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,162,39,0.22)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,162,39,0.75)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,162,39,0.12)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,162,39,0.45)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <X size={18} color="rgba(230,195,90,1)" strokeWidth={1.5} />
      </button>

      {/* Modal content */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'min(92vw, 560px)',
          marginTop: 'clamp(2rem, 6vh, 4rem)',
          marginBottom: '2rem',
          padding: 'clamp(1.5rem, 4vw, 2.75rem)',
          background: 'linear-gradient(160deg, rgba(26,15,26,0.98) 0%, rgba(42,22,41,0.98) 100%)',
          border: '1px solid rgba(201,162,39,0.28)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,162,39,0.06), inset 0 1px 0 rgba(201,162,39,0.15)',
          animation: 'acquire-scale-in 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Artwork summary */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p
            className="luxury-subheading"
            style={{ color: 'rgba(201,162,39,0.85)', letterSpacing: '0.28em', marginBottom: '0.75rem' }}
          >
            Acquire This Original
          </p>
          <h3
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontSize: 'clamp(1.4rem, 3vw, 1.85rem)',
              color: '#fdfbf0',
              lineHeight: 1.2,
              marginBottom: '0.5rem',
            }}
          >
            {artworkTitle}
          </h3>
          <p
            style={{
              fontFamily: 'Jost, system-ui, sans-serif',
              fontWeight: 400,
              fontSize: '1.1rem',
              color: 'rgba(201,162,39,0.9)',
              letterSpacing: '0.06em',
            }}
          >
            {artworkPriceDisplay}
          </p>
          <div
            style={{
              width: '40px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.6), transparent)',
              margin: '1rem auto 0',
            }}
          />
        </div>

        {/* Shipping form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.25rem, 3vw, 1.75rem)' }}
        >
          {/* Full name */}
          <div>
            <label htmlFor="acquire-name" style={labelStyle}>Recipient Full Name</label>
            <input
              ref={firstFieldRef}
              id="acquire-name"
              type="text"
              autoComplete="name"
              value={form.fullName}
              placeholder="Full name"
              onChange={(e) => set('fullName', e.target.value)}
              onFocus={() => setFocused('fullName')}
              onBlur={() => setFocused(null)}
              style={inputStyle(!!errors.fullName, focused === 'fullName')}
            />
            {errors.fullName && <p style={errorTextStyle} role="alert">{errors.fullName}</p>}
          </div>

          {/* Country */}
          <div>
            <label htmlFor="acquire-country" style={labelStyle}>Country</label>
            <select
              id="acquire-country"
              value={form.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              onFocus={() => setFocused('country')}
              onBlur={() => setFocused(null)}
              style={selectStyle(!!errors.country, focused === 'country')}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value} style={{ color: '#2a1629', background: '#fdfbf0' }}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address line 1 */}
          <div>
            <label htmlFor="acquire-addr1" style={labelStyle}>Address Line 1</label>
            <input
              id="acquire-addr1"
              type="text"
              autoComplete="address-line1"
              value={form.addressLine1}
              placeholder="Street address"
              onChange={(e) => set('addressLine1', e.target.value)}
              onFocus={() => setFocused('addressLine1')}
              onBlur={() => setFocused(null)}
              style={inputStyle(!!errors.addressLine1, focused === 'addressLine1')}
            />
            {errors.addressLine1 && <p style={errorTextStyle} role="alert">{errors.addressLine1}</p>}
          </div>

          {/* Address line 2 */}
          <div>
            <label htmlFor="acquire-addr2" style={labelStyle}>
              Address Line 2{' '}
              <span style={{ opacity: 0.6, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: '11px' }}>
                (optional)
              </span>
            </label>
            <input
              id="acquire-addr2"
              type="text"
              autoComplete="address-line2"
              value={form.addressLine2}
              placeholder="Apartment, suite, unit"
              onChange={(e) => set('addressLine2', e.target.value)}
              onFocus={() => setFocused('addressLine2')}
              onBlur={() => setFocused(null)}
              style={inputStyle(false, focused === 'addressLine2')}
            />
          </div>

          {/* City + Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
            <div>
              <label htmlFor="acquire-city" style={labelStyle}>City</label>
              <input
                id="acquire-city"
                type="text"
                autoComplete="address-level2"
                value={form.city}
                placeholder="City"
                onChange={(e) => set('city', e.target.value)}
                onFocus={() => setFocused('city')}
                onBlur={() => setFocused(null)}
                style={inputStyle(!!errors.city, focused === 'city')}
              />
              {errors.city && <p style={errorTextStyle} role="alert">{errors.city}</p>}
            </div>
            <div>
              <label htmlFor="acquire-region" style={labelStyle}>
                {form.country === 'CA' ? 'Province' : 'State'}
              </label>
              <select
                id="acquire-region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                onFocus={() => setFocused('region')}
                onBlur={() => setFocused(null)}
                style={selectStyle(!!errors.region, focused === 'region')}
              >
                <option value="" style={{ color: '#2a1629', background: '#fdfbf0' }}>
                  Select…
                </option>
                {regions.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: '#2a1629', background: '#fdfbf0' }}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.region && <p style={errorTextStyle} role="alert">{errors.region}</p>}
            </div>
          </div>

          {/* Postal code + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
            <div>
              <label htmlFor="acquire-postal" style={labelStyle}>
                {form.country === 'CA' ? 'Postal Code' : 'ZIP Code'}
              </label>
              <input
                id="acquire-postal"
                type="text"
                autoComplete="postal-code"
                value={form.postalCode}
                placeholder={form.country === 'CA' ? 'A1A 1A1' : '12345'}
                onChange={(e) => set('postalCode', e.target.value)}
                onFocus={() => setFocused('postalCode')}
                onBlur={() => setFocused(null)}
                style={inputStyle(!!errors.postalCode, focused === 'postalCode')}
              />
              {errors.postalCode && <p style={errorTextStyle} role="alert">{errors.postalCode}</p>}
            </div>
            <div>
              <label htmlFor="acquire-phone" style={labelStyle}>
                Phone{' '}
                <span style={{ opacity: 0.6, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, fontFamily: 'Cormorant Garamond, serif', fontSize: '11px' }}>
                  (optional)
                </span>
              </label>
              <input
                id="acquire-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                placeholder="+1 (234) 567-8901"
                onChange={(e) => set('phone', e.target.value)}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
                style={inputStyle(!!errors.phone, focused === 'phone')}
              />
              {errors.phone && <p style={errorTextStyle} role="alert">{errors.phone}</p>}
            </div>
          </div>

          {/* Submit — non-operational in Phase 4A */}
          <button
            type="submit"
            className="luxury-btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Proceed to Secure Checkout
          </button>

          <p style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(220,195,120,0.55)' }}>
            Tracked, insured shipping with signature required. White-glove handling included.
          </p>
        </form>
      </div>

      <style>{`
        @keyframes acquire-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes acquire-scale-in {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 480px) {
          #acquire-modal-city-row,
          #acquire-modal-postal-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
