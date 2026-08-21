import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, AlertCircle, RotateCw } from 'lucide-react';
import { getStoredSession } from './auth';
import { fetchLeads } from './leadsApi';
import type { LeadListItem, LeadDetail, LeadScope, NormalizedFilter } from './leadsApi';
import { STATUS_OPTIONS, STATUS_LABELS, statusClass, statusLabel, filterClass } from './statusConfig';
import StatusSelect from './StatusSelect';
import LeadDetailDrawer from './LeadDetailDrawer';

const INQUIRY_LABELS: Record<string, string> = {
  available_work: 'Artwork Inquiry',
  commission: 'Commission Inquiry',
  general: 'General Inquiry',
};

type PresetKey = 'all_active' | 'new' | 'follow_up' | 'archived';

const PRIMARY_FILTERS: { key: PresetKey; label: string }[] = [
  { key: 'all_active', label: 'All Active' },
  { key: 'new', label: 'New' },
  { key: 'follow_up', label: 'Follow-Up' },
  { key: 'archived', label: 'Archived' },
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

function presetToFilter(preset: PresetKey): NormalizedFilter {
  switch (preset) {
    case 'all_active':
      return { scope: 'active', status: '' };
    case 'new':
      return { scope: 'active', status: 'NEW' };
    case 'follow_up':
      return { scope: 'active', status: 'FOLLOW_UP' };
    case 'archived':
      return { scope: 'archived', status: '' };
  }
}

function filterToPreset(filter: NormalizedFilter): PresetKey {
  if (filter.scope === 'archived') return 'archived';
  if (filter.status === 'NEW') return 'new';
  if (filter.status === 'FOLLOW_UP') return 'follow_up';
  return 'all_active';
}

function getEmptyMessage(filter: NormalizedFilter, hasSearch: boolean): string {
  if (hasSearch) return 'No leads match your search.';
  if (filter.scope === 'archived') {
    if (filter.status) return `No archived ${STATUS_LABELS[filter.status]?.toLowerCase() || filter.status.toLowerCase()} leads.`;
    return 'No archived leads.';
  }
  if (filter.status === 'NEW') return 'No new leads.';
  if (filter.status === 'FOLLOW_UP') return 'No leads currently require follow-up.';
  if (filter.status) return `No ${STATUS_LABELS[filter.status]?.toLowerCase() || filter.status.toLowerCase()} leads.`;
  return 'No active leads.';
}

function leadMatchesFilter(lead: LeadDetail, filter: NormalizedFilter): boolean {
  if (filter.scope === 'archived') return lead.archived;
  if (lead.archived) return false;
  if (filter.status && lead.status !== filter.status) return false;
  return true;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<NormalizedFilter>({ scope: 'active', status: '' });
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const activePreset = useMemo(() => filterToPreset(filter), [filter]);

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
      scope: filter.scope,
      status: filter.status,
      assignmentFilter: '',
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
  }, [filter, searchQuery, page]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handlePresetChange = (preset: PresetKey) => {
    setFilter(presetToFilter(preset));
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilter((prev) => {
      // If current preset is NEW or FOLLOW-UP and user picks a different status,
      // promote to ALL ACTIVE (scope stays active, status becomes the selection).
      const currentPreset = filterToPreset(prev);
      if (
        (currentPreset === 'new' || currentPreset === 'follow_up') &&
        value !== prev.status
      ) {
        return { scope: 'active' as LeadScope, status: value };
      }
      return { ...prev, status: value };
    });
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
    setLeads(prev => prev.map(l => {
      if (l.id !== updatedLead.id) return l;
      return {
        ...l,
        status: updatedLead.status,
        follow_up_at: updatedLead.follow_up_at,
      };
    }));

    if (!leadMatchesFilter(updatedLead, filter)) {
      loadLeads();
    }
  };

  const handleLeadArchived = (archivedLead: LeadDetail) => {
    if (filter.scope !== 'archived') {
      setLeads(prev => prev.filter(l => l.id !== archivedLead.id));
      setTotal(prev => prev - 1);
    } else {
      setLeads(prev => prev.map(l => l.id === archivedLead.id ? {
        ...l,
        archived: true,
        archived_at: archivedLead.archived_at,
      } : l));
    }
    setSelectedLeadId(null);
  };

  const handleLeadRestored = (restoredLead: LeadDetail) => {
    if (filter.scope === 'archived') {
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
              aria-selected={activePreset === f.key}
              className={`admin-filter-chip ${filterClass(f.key)} ${activePreset === f.key ? 'active' : ''}`}
              onClick={() => handlePresetChange(f.key)}
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
            <StatusSelect
              id="status-filter"
              options={STATUS_OPTIONS}
              value={filter.status}
              onChange={handleStatusChange}
              ariaLabel="Filter by status"
            />
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
            <p className="admin-empty-text">{getEmptyMessage(filter, !!searchQuery)}</p>
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
                        <span className={`admin-status-badge ${statusClass(lead.status)}`}>
                          {statusLabel(lead.status)}
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
                    <span className={`admin-status-badge ${statusClass(lead.status)}`}>
                      {statusLabel(lead.status)}
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
