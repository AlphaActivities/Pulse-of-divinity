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
