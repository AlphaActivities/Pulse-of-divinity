import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCw, Clock, Calendar, Trophy, Users, Sparkles } from 'lucide-react';
import { getStoredSession } from './auth';
import type { AdminProfile } from './auth';
import { fetchDashboardSummary } from './leadsApi';
import type { DashboardSummary } from './leadsApi';
import MetricIcon from './MetricIcon';
import { statusClass, statusLabel, METRIC_COLORS } from './statusConfig';

interface Props {
  profile: AdminProfile;
  onLeadClick: (leadId: string) => void;
  justLoggedIn?: boolean;
  onRevealed?: () => void;
}

const INQUIRY_LABELS: Record<string, string> = {
  available_work: 'Artwork Inquiry',
  commission: 'Commission Inquiry',
  general: 'General Inquiry',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardHome({ profile, onLeadClick, justLoggedIn, onRevealed }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const session = getStoredSession();
    if (!session) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }
    const { data: summary, error: fetchError, status } = await fetchDashboardSummary(session.access_token);
    if (fetchError || !summary) {
      if (status === 401 || status === 403) {
        setError('Access denied. Please log in again.');
      } else {
        setError(fetchError || 'Unable to load dashboard information.');
      }
    } else {
      setData(summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (justLoggedIn && onRevealed) {
      const t = setTimeout(onRevealed, 600);
      return () => clearTimeout(t);
    }
  }, [justLoggedIn, onRevealed]);

  const handleCardClick = (scope: string, status: string) => {
    const params = new URLSearchParams();
    if (scope === 'archived') params.set('scope', 'archived');
    if (status) params.set('status', status);
    const query = params.toString();
    navigate(query ? `/leads?${query}` : '/leads');
  };

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-leads-loading">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-leads-error">
          <AlertCircle size={24} strokeWidth={1.2} className="admin-error-icon" />
          <p className="admin-error-text">{error}</p>
          <button className="admin-btn-secondary admin-retry-btn" onClick={loadDashboard}>
            <RotateCw size={14} strokeWidth={1.5} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-leads-loading">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { key: 'new', label: 'New Leads', value: data.summary.new, icon: Sparkles, onClick: () => handleCardClick('active', 'NEW') },
    { key: 'active', label: 'Active Conversations', value: data.summary.active, icon: Users, onClick: () => handleCardClick('active', 'ACTIVE_CONVERSATION') },
    { key: 'due_today', label: 'Follow-Ups Due', value: data.summary.due_today, icon: Calendar, onClick: () => handleCardClick('active', 'FOLLOW_UP') },
    { key: 'overdue', label: 'Overdue', value: data.summary.overdue, icon: Clock, onClick: () => handleCardClick('active', 'FOLLOW_UP') },
    { key: 'won', label: 'Won', value: data.summary.won, icon: Trophy, onClick: () => handleCardClick('active', 'WON') },
  ];
  return (
    <div className={`admin-dashboard-page${justLoggedIn ? ' admin-dashboard-reveal' : ''}`}>
      <div className="admin-dashboard-header">
        <h1 className="admin-page-heading admin-entrance-heading">Collector Intelligence</h1>
        <p className="admin-dashboard-subtext admin-entrance-subtext">
          Welcome, {profile.display_name}. Here's what requires your attention.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="admin-summary-cards">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const metricColor = METRIC_COLORS[card.key];
          return (
            <button
              key={card.key}
              className={`admin-summary-card admin-metric-${card.key}`}
              onClick={card.onClick}
              aria-label={`${card.label}: ${card.value}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <MetricIcon icon={Icon} index={index} color={metricColor} />
              <span className="admin-summary-card-value">{card.value}</span>
              <span className="admin-summary-card-label">{card.label}</span>
            </button>
          );
        })}
      </div>

      {/* Follow-Up Attention */}
      <section className="admin-dashboard-section admin-entrance-section" style={{ animationDelay: '480ms' }}>
        <div className="admin-dashboard-section-header">
          <h2 className="admin-dashboard-section-title">Follow-Up Attention</h2>
        </div>
        {data.attention.length === 0 ? (
          <div className="admin-dashboard-empty">
            <p className="admin-empty-text">You're all caught up.</p>
          </div>
        ) : (
          <div className="admin-attention-list">
            {data.attention.map((lead) => (
              <button
                key={lead.id}
                className="admin-attention-item"
                onClick={() => onLeadClick(lead.id)}
              >
                <div className="admin-attention-info">
                  <span className="admin-attention-name">{lead.name}</span>
                  <span className="admin-attention-detail">
                    {lead.artwork_title || INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type}
                  </span>
                </div>
                <div className="admin-attention-meta">
                  <span className={`admin-attention-date ${lead.overdue ? 'overdue' : 'today'}`}>
                    {formatDate(lead.follow_up_at)}
                  </span>
                  <span className={`admin-attention-badge ${lead.overdue ? 'overdue' : 'today'}`}>
                    {lead.overdue ? 'Overdue' : 'Today'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recent Collector Inquiries */}
      <section className="admin-dashboard-section admin-entrance-section" style={{ animationDelay: '620ms' }}>
        <div className="admin-dashboard-section-header">
          <h2 className="admin-dashboard-section-title">Recent Collector Inquiries</h2>
          <button className="admin-view-all-btn" onClick={() => navigate('/leads')}>
            View All Leads
          </button>
        </div>
        {data.recent.length === 0 ? (
          <div className="admin-dashboard-empty">
            <p className="admin-empty-text">No collector inquiries yet.</p>
          </div>
        ) : (
          <div className="admin-recent-list">
            {data.recent.map((lead) => (
              <button
                key={lead.id}
                className="admin-recent-item"
                onClick={() => onLeadClick(lead.id)}
              >
                <div className="admin-recent-info">
                  <span className="admin-recent-name">{lead.name}</span>
                  <span className="admin-recent-detail">
                    {lead.artwork_title || INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type}
                  </span>
                </div>
                <div className="admin-recent-meta">
                  <span className={`admin-status-badge ${statusClass(lead.status)}`}>
                    {statusLabel(lead.status)}
                  </span>
                  <span className="admin-recent-date">{formatDate(lead.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
