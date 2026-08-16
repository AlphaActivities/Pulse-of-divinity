declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function pageContext(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return {
    page_location: window.location.href,
    page_title: document.title,
  };
}

function fireGtag(command: string, eventName: string, params: object): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag(command, eventName, { ...pageContext(), ...params });
}

const COLLECTION_LABELS: Record<string, string> = {
  'for-sale': 'available_works',
  'cherished': 'collected_archive',
};

function normalizeCollection(value: string): string {
  return COLLECTION_LABELS[value] ?? value;
}

function logDev(eventName: string, params: object): void {
  if (import.meta.env.DEV) {
    console.log('[GA4]', eventName, params);
  }
}

// ── Parameter interfaces ──────────────────────────────────────────────────────

interface ArtworkParams {
  artwork_id: string;
  artwork_title: string;
  artwork_collection: string;
  artwork_status: string;
  artwork_price: number | null;
}

interface InquiryParams {
  inquiry_type: 'available_work' | 'commission' | 'general';
  artwork_id?: string;
  artwork_title?: string;
  artwork_collection?: string;
  artwork_status?: string;
  artwork_price_numeric?: number | null;
  contact_method?: 'email' | 'call' | 'text';
}

interface ContactFormParams {
  inquiry_type?: 'available_work' | 'commission' | 'general';
  contact_method?: 'email' | 'call' | 'text';
  form_progress?: number;
}

interface ContactFormErrorParams {
  error_type: string;
  status_code?: number;
}

interface SectionParams {
  section_name: string;
}

interface LinkParams {
  link_location: 'contact_sidebar' | 'footer';
}

interface SocialParams {
  platform: 'instagram' | 'facebook';
  link_location: 'contact_sidebar' | 'footer';
}

interface CollectionParams {
  collection_name: 'available_works' | 'collected_archive';
  artwork_count: number;
}

interface PageViewParams {
  page_path: string;
  page_title: string;
}

// ── Exported helpers ──────────────────────────────────────────────────────────

export function trackPageView(params: PageViewParams): void {
  logDev('page_view', params);
  fireGtag('event', 'page_view', params);
}

export function trackSectionViewed(params: SectionParams): void {
  logDev('section_viewed', params);
  fireGtag('event', 'section_viewed', params);
}

export function trackArtworkLightboxOpen(params: ArtworkParams): void {
  const payload = { ...params, artwork_collection: normalizeCollection(params.artwork_collection) };
  logDev('artwork_lightbox_open', payload);
  fireGtag('event', 'artwork_lightbox_open', payload);
}

export function trackArtworkInquiryStart(params: InquiryParams): void {
  const payload = params.artwork_collection
    ? { ...params, artwork_collection: normalizeCollection(params.artwork_collection) }
    : params;
  logDev('artwork_inquiry_start', payload);
  fireGtag('event', 'artwork_inquiry_start', payload);
}

export function trackArtworkInquirySubmit(params: InquiryParams): void {
  const payload = params.artwork_collection
    ? { ...params, artwork_collection: normalizeCollection(params.artwork_collection) }
    : params;
  logDev('artwork_inquiry_submit', payload);
  fireGtag('event', 'artwork_inquiry_submit', payload);
}

export function trackCommissionInquiryStart(): void {
  const params = { inquiry_type: 'commission' as const };
  logDev('commission_inquiry_start', params);
  fireGtag('event', 'commission_inquiry_start', params);
}

export function trackCommissionInquirySubmit(params: Pick<InquiryParams, 'contact_method'>): void {
  const payload = { inquiry_type: 'commission' as const, ...params };
  logDev('commission_inquiry_submit', payload);
  fireGtag('event', 'commission_inquiry_submit', payload);
}

export function trackContactFormStart(): void {
  const params = { form_source: 'contact_section' };
  logDev('contact_form_start', params);
  fireGtag('event', 'contact_form_start', params);
}

export function trackContactFormSubmit(params: ContactFormParams): void {
  logDev('contact_form_submit', params);
  fireGtag('event', 'contact_form_submit', params);
}

export function trackContactFormError(params: ContactFormErrorParams): void {
  logDev('contact_form_error', params);
  fireGtag('event', 'contact_form_error', params);
}

export function trackContactMethodSelected(method: 'email' | 'call' | 'text'): void {
  const params = { contact_method: method };
  logDev('contact_method_selected', params);
  fireGtag('event', 'contact_method_selected', params);
}

export function trackEmailLinkClick(params: LinkParams): void {
  logDev('email_link_click', params);
  fireGtag('event', 'email_link_click', params);
}

export function trackPhoneLinkClick(params: LinkParams): void {
  logDev('phone_link_click', params);
  fireGtag('event', 'phone_link_click', params);
}

export function trackSocialLinkClick(params: SocialParams): void {
  logDev('social_link_click', params);
  fireGtag('event', 'social_link_click', params);
}

export function trackCollectionViewed(params: CollectionParams): void {
  logDev('collection_viewed', params);
  fireGtag('event', 'collection_viewed', params);
}
