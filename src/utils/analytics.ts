declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function fireGtag(command: string, eventName: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag(command, eventName, params);
}

function logDev(eventName: string, params: Record<string, unknown>): void {
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
  logDev('artwork_lightbox_open', params);
  fireGtag('event', 'artwork_lightbox_open', params);
}

export function trackArtworkInquiryStart(params: InquiryParams): void {
  logDev('artwork_inquiry_start', params);
  fireGtag('event', 'artwork_inquiry_start', params);
}

export function trackArtworkInquirySubmit(params: InquiryParams): void {
  logDev('artwork_inquiry_submit', params);
  fireGtag('event', 'artwork_inquiry_submit', params);
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
