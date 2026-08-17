import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, AlertCircle, RotateCw } from 'lucide-react';
import { getStoredSession } from './auth';
import { fetchLeads } from './leadsApi';
import type { LeadListItem, LeadDetail, PrimaryFilter } from './leadsApi';
import LeadDetailDrawer from './LeadDetailDrawer';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ACTIVE_CONVERSATION: 'Active Conversation',
  FOLLOW_UP: 'Follow-Up',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  CLOSED: 'Closed',
};

const INQUIRY_LABELS: Record<string, string> = {
  available_work: 'Artwork Inquiry',
  commission: 'Commission Inquiry',
  general: 'General Inquiry',
};

const PRIMARY_FILTERS: { key: PrimaryFilter; label: string }[] = [
  { key: 'all_active', label: 'All Active' },
  { key: 'new', label: 'New' },
  { key: 'follow_up', label: 'Follow-Up' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'ACTIVE_CONVERSATION', label: 'Active Conversation' },
  { value: 'FOLLOW_UP', label: 'Follow-Up' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'WON', label: 'Won' },
  { value: 'CLOSED', label: 'Closed' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(followUpAt: string | null, archived: boolean): boolean {
  if (!followUpAt || archived) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(followUpAt);
  followUp.setHours(0, 0, 0, 0);
  return followUp < today;
}

function getEmptyMessage(primary: PrimaryFilter, hasSearch: boolean): string {
  if (hasSearch) return 'No leads match your search.';
  if (primary === 'archived') return 'No archived leads.';
  if (primary === 'new') return 'No new leads.';
  if (primary === 'follow_up') return 'No leads currently require follow-up.';
  return 'No collector inquiries yet.';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilter>('all_active');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = getStoredSession();
    if (!session) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    const { data, error: fetchError, status } = await fetchLeads(session.access_token, {
      primaryFilter,
      statusFilter,
      search: searchQuery,
      page,
    });

    if (fetchError || !data) {
      if (status === 401 || status === 403) {
        setError('Access denied. Please log in again.');
      } else {
        setError(fetchError || 'Failed to load leads.');
      }
      setLeads([]);
      setTotal(0);
      setTotalPages(0);
    } else {
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    }
    setLoading(false);
  }, [primaryFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handlePrimaryFilterChange = (filter: PrimaryFilter) => {
    setPrimaryFilter(filter);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleDrawerClose = () => {
    setSelectedLeadId(null);
  };

  const handleLeadUpdated = (updatedLead: LeadDetail) => {
    // Update the lead in the list with new CRM fields
    setLeads(prev => prev.map(l => {
      if (l.id !== updatedLead.id) return l;
      return {
        ...l,
        status: updatedLead.status,
        follow_up_at: updatedLead.follow_up_at,
      };
    }));

    // If the updated lead no longer matches the current filter, reload
    if (!leadMatchesFilter(updatedLead, primaryFilter)) {
      loadLeads();
    }
  };

  const handleLeadArchived = (archivedLead: LeadDetail) => {
    // Archived lead should leave active views
    if (primaryFilter !== 'archived') {
      setLeads(prev => prev.filter(l => l.id !== archivedLead.id));
      setTotal(prev => prev - 1);
    } else {
      // Already in archived view, just update the list item
      setLeads(prev => prev.map(l => l.id === archivedLead.id ? {
        ...l,
        archived: true,
        archived_at: archivedLead.archived_at,
      } : l));
    }
    setSelectedLeadId(null);
  };

  const handleLeadRestored = (restoredLead: LeadDetail) => {
    // Restored lead should leave archived view
    if (primaryFilter === 'archived') {
      setLeads(prev => prev.filter(l => l.id !== restoredLead.id));
      setTotal(prev => prev - 1);
    } else {
      setLeads(prev => prev.map(l => l.id === restoredLead.id ? {
        ...l,
        archived: false,
        archived_at: null,
      } : l));
    }
    setSelectedLeadId(null);
  };

  return (
    <div className="admin-leads-page">
      <div className="admin-leads-header">
        <div className="admin-leads-title-row">
          <h1 className="admin-page-heading">Leads</h1>
          <span className="admin-leads-count">{total} total</span>
        </div>
      </div>

      <div className="admin-leads-filters">
        <div className="admin-primary-filters" role="tablist" aria-label="Primary filters">
          {PRIMARY_FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={primaryFilter === f.key}
              className={`admin-filter-chip ${primaryFilter === f.key ? 'active' : ''}`}
              onClick={() => handlePrimaryFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="admin-secondary-filters">
          <form onSubmit={handleSearchSubmit} className="admin-search-form" role="search">
            <label htmlFor="lead-search" className="admin-sr-only">Search leads</label>
            <div className="admin-search-wrapper">
              <Search size={15} className="admin-search-icon" strokeWidth={1.5} />
              <input
                id="lead-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, phone, artwork..."
                className="admin-search-input"
                maxLength={200}
              />
              {searchInput && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={handleSearchClear}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </form>

          <div className="admin-select-group">
            <label htmlFor="status-filter" className="admin-sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="admin-filter-select"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="admin-leads-content">
        {loading ? (
          <div className="admin-leads-loading">
            <div className="admin-loading-spinner" />
            <p className="admin-loading-text">Loading leads...</p>
          </div>
        ) : error ? (
          <div className="admin-leads-error">
            <AlertCircle size={24} strokeWidth={1.2} className="admin-error-icon" />
            <p className="admin-error-text">{error}</p>
            <button className="admin-btn-secondary admin-retry-btn" onClick={loadLeads}>
              <RotateCw size={14} strokeWidth={1.5} />
              <span>Retry</span>
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="admin-leads-empty">
            <p className="admin-empty-text">{getEmptyMessage(primaryFilter, !!searchQuery)}</p>
          </div>
        ) : (
          <>
            <div className="admin-leads-table-wrapper admin-desktop-only">
              <table className="admin-leads-table">
                <thead>
                  <tr>
                    <th scope="col">Collector</th>
                    <th scope="col">Inquiry</th>
                    <th scope="col">Artwork</th>
                    <th scope="col">Status</th>
                    <th scope="col">Follow-Up</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="admin-lead-row"
                      onClick={() => handleLeadClick(lead.id)}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLeadClick(lead.id); }}
                    >
                      <td>
                        <div className="admin-lead-collector">
                          <span className="admin-lead-name">{lead.name}</span>
                          <span className="admin-lead-email">{lead.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-lead-inquiry">
                          {INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type}
                        </span>
                      </td>
                      <td>
                        <span className="admin-lead-artwork">
                          {lead.artwork_title || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-status-badge admin-status-${lead.status.toLowerCase()}`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-lead-followup ${isOverdue(lead.follow_up_at, lead.archived) ? 'overdue' : ''}`}>
                          {formatDate(lead.follow_up_at)}
                        </span>
                      </td>
                      <td>
                        <span className="admin-lead-received">{formatDate(lead.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-leads-cards admin-mobile-only">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="admin-lead-card admin-lead-card-clickable"
                  onClick={() => handleLeadClick(lead.id)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLeadClick(lead.id); }}
                >
                  <div className="admin-lead-card-top">
                    <span className="admin-lead-card-name">{lead.name}</span>
                    <span className={`admin-status-badge admin-status-${lead.status.toLowerCase()}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>
                  <div className="admin-lead-card-row">
                    <span className="admin-lead-card-label">Inquiry</span>
                    <span className="admin-lead-card-value">
                      {INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type}
                    </span>
                  </div>
                  {lead.artwork_title && (
                    <div className="admin-lead-card-row">
                      <span className="admin-lead-card-label">Artwork</span>
                      <span className="admin-lead-card-value">{lead.artwork_title}</span>
                    </div>
                  )}
                  <div className="admin-lead-card-row">
                    <span className="admin-lead-card-label">Follow-Up</span>
                    <span className={`admin-lead-card-value ${isOverdue(lead.follow_up_at, lead.archived) ? 'overdue' : ''}`}>
                      {formatDate(lead.follow_up_at)}
                    </span>
                  </div>
                  <div className="admin-lead-card-row">
                    <span className="admin-lead-card-label">Received</span>
                    <span className="admin-lead-card-value">{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="admin-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                  <span>Prev</span>
                </button>
                <span className="admin-page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="admin-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedLeadId && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          onClose={handleDrawerClose}
          onLeadUpdated={handleLeadUpdated}
          onLeadArchived={handleLeadArchived}
          onLeadRestored={handleLeadRestored}
        />
      )}
    </div>
  );
}

function leadMatchesFilter(lead: LeadDetail, filter: PrimaryFilter): boolean {
  switch (filter) {
    case 'all_active':
      return !lead.archived;
    case 'new':
      return !lead.archived && lead.status === 'NEW';
    case 'follow_up':
      return !lead.archived && lead.status === 'FOLLOW_UP';
    case 'archived':
      return lead.archived;
    default:
      return true;
  }
}
