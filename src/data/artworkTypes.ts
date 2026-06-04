export type ArtworkCollection = 'for-sale' | 'cherished';

export type ArtworkStatusCode =
  | 'available'
  | 'reserved'
  | 'collected'
  | 'commissioned'
  | 'gifted'
  | 'archived';

export interface Artwork {
  // Identity
  id: string;
  collection: ArtworkCollection;

  // Display
  title: string;
  teaser: string;
  story: string;
  tag: string;

  // Status
  statusCode: ArtworkStatusCode;
  statusLabel: string;

  // Pricing
  priceNumeric: number | null;
  priceDisplay: string;
  valueDisplay: string;

  // Media
  image: string;
  imageAlt: string;

  // Inquiry eligibility — drives contact dropdown and CTA visibility
  inquiryEligible: boolean;

  // Display ordering
  sortOrder: number;
}
