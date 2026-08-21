import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, AlertCircle, RotateCw } from 'lucide-react';
import { getStoredSession } from './auth';
import { fetchLeads } from './leadsApi';
import type { LeadListItem, LeadDetail, NormalizedFilter, DashboardView } from './leadsApi';
import { STATUS_OPTIONS, STATUS_LABELS, statusClass, statusLabel, filterClass } from './statusConfig';
import StatusSelect from './StatusSelect';
import LeadDetailDrawer from './LeadDetailDrawer';

const INQUIRY_LABELS: Record<string, string> = {
  available_work: 'Artwork Inquiry',
  commission: 'Commission Inquiry',
  general: 'General Inquiry',
};

type PresetKey = 'all_active' | 'new' | 'follow_up' | 'archived';

const DASHBOARD_VIEWS: Record<DashboardView, { label: string; empty: string }> = {
  new: { label: 'New Leads', empty: 'No new leads.' },
  active_conversations: { label: 'Active Conversations', empty: 'No active conversations.' },
  due_today: { label: 'Follow-Ups Due Today', empty: 'No follow-ups due today.' },
  overdue: { label: 'Overdue Follow-Ups', empty: 'No overdue follow-ups.' },
  won: { label: 'Won Leads', empty: 'No won leads.' },
};

const VALID_DASHBOARD_VIEWS = new Set<DashboardView>(Object.keys(DASHBOARD_VIEWS) as DashboardView[]);

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
  if (filter.view) return DASHBOARD_VIEWS[filter.view].empty;
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
  if (filter.view === 'active_conversations' && !['CONTACTED', 'ACTIVE_CONVERSATION', 'FOLLOW_UP', 'QUALIFIED'].includes(lead.status)) return false;
  if (filter.view === 'due_today' || filter.view === 'overdue') {
    if (!lead.follow_up_at) return false;
    const todayString = new Date().toISOString().slice(0, 10);
    const followUpDate = lead.follow_up_at.slice(0, 10);
    if (filter.view === 'due_today' && followUpDate !== todayString) return false;
    if (filter.view === 'overdue' && followUpDate >= todayString) return false;
  }
  if (filter.status && lead.status !== filter.status) return false;
  return true;
}

function filterFromSearch(search: string): NormalizedFilter {
  const params = new URLSearchParams(search);
  const viewParam = params.get('view');
  const view = viewParam && VALID_DASHBOARD_VIEWS.has(viewParam as DashboardView)
    ? viewParam as DashboardView
    : null;
  if (view === 'new') return { scope: 'active', status: 'NEW', view };
  if (view === 'won') return { scope: 'active', status: 'WON', view };
  if (view === 'active_conversations' || view === 'due_today' || view === 'overdue') {
    return { scope: 'active', status: '', view };
  }
  const scope = params.get('scope') === 'archived' ? 'archived' : 'active';
  const requestedStatus = params.get('status') || '';
  const status = STATUS_OPTIONS.some((option) => option.value === requestedStatus) ? requestedStatus : '';
  return { scope, status, view: null };
}

function searchForFilter(filter: NormalizedFilter): string {
  if (filter.view) return `?view=${filter.view}`;
  const params = new URLSearchParams();
  if (filter.scope === 'archived') params.set('scope', 'archived');
  if (filter.status) params.set('status', filter.status);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function LeadsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<NormalizedFilter>(() => filterFromSearch(location.search));
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const activePreset = useMemo(() => filterToPreset(filter), [filter]);
  const dashboardView = filter.view ? DASHBOARD_VIEWS[filter.view] : null;

  useEffect(() => {
    setFilter(filterFromSearch(location.search));
    setPage(1);
  }, [location.search]);

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
      view: filter.view,
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
    const nextFilter = presetToFilter(preset);
    setFilter(nextFilter);
    setPage(1);
    navigate({ search: searchForFilter(nextFilter) });
  };

  const handleStatusChange = (value: string) => {
    const nextFilter: NormalizedFilter = { scope: filter.scope, status: value, view: null };
    setFilter(nextFilter);
    setPage(1);
    navigate({ search: searchForFilter(nextFilter) });
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

        {dashboardView && (
          <div className="admin-leads-view-context" role="status">
            <span>Viewing: {dashboardView.label}</span>
            <button type="button" onClick={() => handlePresetChange('all_active')} aria-label="Clear dashboard view">
              × Clear
            </button>
          </div>
        )}

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
