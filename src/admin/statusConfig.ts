export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'ACTIVE_CONVERSATION'
  | 'FOLLOW_UP'
  | 'QUALIFIED'
  | 'WON'
  | 'CLOSED';

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ACTIVE_CONVERSATION: 'Active Conversation',
  FOLLOW_UP: 'Follow-Up',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  CLOSED: 'Closed',
};

export const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'ACTIVE_CONVERSATION', label: 'Active Conversation' },
  { value: 'FOLLOW_UP', label: 'Follow-Up' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'WON', label: 'Won' },
  { value: 'CLOSED', label: 'Closed' },
];

export const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.filter((o) => o.value !== '');

export function statusClass(status: string): string {
  return `admin-status-${status.toLowerCase()}`;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

// ── Centralized color tokens ──
// Single source of truth for every status/category accent color.
// Used by badges, filter chips, filter selects, and dashboard tiles.

export interface StatusColor {
  accent: string;
  bg: string;
  border: string;
}

export const STATUS_COLORS: Record<string, StatusColor> = {
  NEW: {
    accent: '#63C98B',
    bg: 'rgba(99, 201, 139, 0.10)',
    border: 'rgba(99, 201, 139, 0.30)',
  },
  CONTACTED: {
    accent: '#62C7C0',
    bg: 'rgba(98, 199, 192, 0.10)',
    border: 'rgba(98, 199, 192, 0.30)',
  },
  ACTIVE_CONVERSATION: {
    accent: '#B28ADB',
    bg: 'rgba(178, 138, 219, 0.10)',
    border: 'rgba(178, 138, 219, 0.30)',
  },
  FOLLOW_UP: {
    accent: '#DDAE52',
    bg: 'rgba(221, 174, 82, 0.10)',
    border: 'rgba(221, 174, 82, 0.30)',
  },
  QUALIFIED: {
    accent: '#7DA7E8',
    bg: 'rgba(125, 167, 232, 0.10)',
    border: 'rgba(125, 167, 232, 0.30)',
  },
  WON: {
    accent: '#F0D784',
    bg: 'rgba(224, 188, 90, 0.12)',
    border: 'rgba(224, 188, 90, 0.38)',
  },
  CLOSED: {
    accent: '#B98291',
    bg: 'rgba(185, 130, 145, 0.09)',
    border: 'rgba(185, 130, 145, 0.26)',
  },
  ARCHIVED: {
    accent: '#99909F',
    bg: 'rgba(153, 144, 159, 0.08)',
    border: 'rgba(153, 144, 159, 0.22)',
  },
};

// ── Dashboard metric → semantic color mapping ──
// Maps each metric tile key to the same approved color tokens.
// OVERDUE uses a distinct muted garnet/coral — separate from FOLLOW_UP amber.

export const METRIC_COLORS: Record<string, StatusColor> = {
  new: STATUS_COLORS.NEW,
  active: STATUS_COLORS.ACTIVE_CONVERSATION,
  due_today: STATUS_COLORS.FOLLOW_UP,
  overdue: {
    accent: '#C87872',
    bg: 'rgba(200, 120, 114, 0.10)',
    border: 'rgba(200, 120, 114, 0.28)',
  },
  won: STATUS_COLORS.WON,
};

// ── Primary filter → semantic class mapping ──
// Returns the status class name for a primary filter key, or '' for neutral.

export function filterClass(filterKey: string): string {
  switch (filterKey) {
    case 'new':
      return 'admin-status-new';
    case 'follow_up':
      return 'admin-status-follow_up';
    case 'archived':
      return 'admin-status-archived';
    default:
      return '';
  }
}
