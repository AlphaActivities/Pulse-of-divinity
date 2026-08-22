import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mail, Phone, Archive, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { getStoredSession } from './auth';
import { fetchLeadDetail, updateLead, fetchNotes, addNote } from './leadsApi';
import type { LeadDetail, UpdateLeadBody, LeadNote } from './leadsApi';
import { STATUS_SELECT_OPTIONS } from './statusConfig';
import StatusSelect from './StatusSelect';

interface Props {
  leadId: string;
  onClose: () => void;
  onLeadUpdated: (lead: LeadDetail) => void;
  onLeadArchived: (lead: LeadDetail) => void;
  onLeadRestored: (lead: LeadDetail) => void;
}

const INQUIRY_LABELS: Record<string, string> = {
  available_work: 'Artwork Inquiry',
  commission: 'Commission Inquiry',
  general: 'General Inquiry',
};

const CONTACT_LABELS: Record<string, string> = {
  email: 'Email',
  call: 'Phone Call',
  text: 'Text Message',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOverdue(followUpAt: string | null, archived: boolean): boolean {
  if (!followUpAt || archived) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(followUpAt);
  followUp.setHours(0, 0, 0, 0);
  return followUp < today;
}

function isToday(followUpAt: string | null): boolean {
  if (!followUpAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(followUpAt);
  followUp.setHours(0, 0, 0, 0);
  return followUp.getTime() === today.getTime();
}

export default function LeadDetailDrawer({
  leadId,
  onClose,
  onLeadUpdated,
  onLeadArchived,
  onLeadRestored,
}: Props) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable form state
  const [status, setStatus] = useState('');
  const [followUpAt, setFollowUpAt] = useState<string>('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Archive confirmation
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [closing, setClosing] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const loadLead = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = getStoredSession();
    if (!session) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    const { data, error: fetchError, status } = await fetchLeadDetail(session.access_token, leadId);

    if (fetchError || !data) {
      if (status === 401 || status === 403) {
        setError('Access denied. Please log in again.');
      } else if (status === 404) {
        setError('This lead could not be found.');
      } else {
        setError(fetchError || 'Unable to load this lead.');
      }
      setLoading(false);
      return;
    }

    setLead(data);
    setStatus(data.status);
    setFollowUpAt(toDateInputValue(data.follow_up_at));
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const loadNotes = useCallback(async () => {
    if (!leadId) return;
    setNotesLoading(true);
    const session = getStoredSession();
    if (!session) {
      setNotesLoading(false);
      return;
    }
    const { data } = await fetchNotes(session.access_token, leadId);
    setNotes(data ?? []);
    setNotesLoading(false);
  }, [leadId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async () => {
    if (!lead || noteSaving || !noteText.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    const session = getStoredSession();
    if (!session) {
      setNoteError('Session expired. Please log in again.');
      setNoteSaving(false);
      return;
    }
    const { data, error: addError } = await addNote(session.access_token, lead.id, noteText.trim());
    if (addError || !data) {
      setNoteError(addError || 'Unable to add note.');
      setNoteSaving(false);
      return;
    }
    setNotes(prev => [data, ...prev]);
    setNoteText('');
    setNoteSaving(false);
  };

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }, [closing, onClose]);

  // Focus management and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !showArchiveConfirm) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => closeBtnRef.current?.focus(), 100);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, saving, showArchiveConfirm]);

  const hasChanges = (): boolean => {
    if (!lead) return false;
    if (status !== lead.status) return true;
    if (toDateInputValue(followUpAt || null) !== toDateInputValue(lead.follow_up_at)) return true;
    return false;
  };

  const handleSave = async () => {
    if (!lead || saving) return;

    setSaving(true);
    setSaveError(null);

    const session = getStoredSession();
    if (!session) {
      setSaveError('Session expired. Please log in again.');
      setSaving(false);
      return;
    }

    const body: UpdateLeadBody = { id: lead.id };

    if (status !== lead.status) body.status = status;

    const currentDateVal = toDateInputValue(lead.follow_up_at);
    const newDateVal = followUpAt ? followUpAt : '';
    if (newDateVal !== currentDateVal) {
      body.follow_up_at = followUpAt ? followUpAt : null;
    }

    const { data, error: updateError } = await updateLead(session.access_token, body);

    if (updateError || !data) {
      setSaveError(updateError || 'Unable to save changes. Please try again.');
      setSaving(false);
      return;
    }

    setLead(data);
    setStatus(data.status);
    setFollowUpAt(toDateInputValue(data.follow_up_at));
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    onLeadUpdated(data);
  };

  const handleArchive = async () => {
    if (!lead || saving) return;

    setSaving(true);
    setSaveError(null);

    const session = getStoredSession();
    if (!session) {
      setSaveError('Session expired. Please log in again.');
      setSaving(false);
      return;
    }

    const { data, error: updateError } = await updateLead(session.access_token, {
      id: lead.id,
      archived: true,
    });

    if (updateError || !data) {
      setSaveError(updateError || 'Unable to archive this lead.');
      setSaving(false);
      return;
    }

    setLead(data);
    setSaving(false);
    setShowArchiveConfirm(false);
    onLeadArchived(data);
  };

  const handleRestore = async () => {
    if (!lead || saving) return;

    setSaving(true);
    setSaveError(null);

    const session = getStoredSession();
    if (!session) {
      setSaveError('Session expired. Please log in again.');
      setSaving(false);
      return;
    }

    const { data, error: updateError } = await updateLead(session.access_token, {
      id: lead.id,
      archived: false,
    });

    if (updateError || !data) {
      setSaveError(updateError || 'Unable to restore this lead.');
      setSaving(false);
      return;
    }

    setLead(data);
    setSaving(false);
    onLeadRestored(data);
  };

  const overdue = lead ? isOverdue(lead.follow_up_at, lead.archived) : false;
  const today = lead ? isToday(lead.follow_up_at) : false;

  return (
    <>
      <div className={`admin-drawer-overlay${closing ? ' admin-overlay-exiting' : ''}`} onClick={() => !saving && handleClose()} aria-hidden="true" />
      <div
        ref={drawerRef}
        className={`admin-lead-drawer${closing ? ' admin-drawer-exiting' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Lead detail"
      >
        <div className="admin-drawer-header admin-drawer-section-enter" style={{ animationDelay: '0ms' }}>
          <h2 className="admin-drawer-title">Lead Details</h2>
          <button
            ref={closeBtnRef}
            className="admin-drawer-close"
            onClick={handleClose}
            disabled={saving || closing}
            aria-label="Close lead detail"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="admin-drawer-body">
          {loading ? (
            <div className="admin-leads-loading">
              <div className="admin-loading-spinner" />
              <p className="admin-loading-text">Loading lead...</p>
            </div>
          ) : error ? (
            <div className="admin-leads-error">
              <AlertCircle size={24} strokeWidth={1.2} className="admin-error-icon" />
              <p className="admin-error-text">{error}</p>
            </div>
          ) : lead ? (
            <>
              {/* Collector Section */}
              <section className="admin-detail-section admin-drawer-section-enter" style={{ animationDelay: '50ms' }}>
                <h3 className="admin-detail-section-title">Collector</h3>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Name</span>
                  <span className="admin-detail-value">{lead.name}</span>
                </div>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Email</span>
                  <div className="admin-detail-value-with-action">
                    <span>{lead.email}</span>
                    <a href={`mailto:${lead.email}`} className="admin-detail-action" aria-label={`Email ${lead.name}`}>
                      <Mail size={14} strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
                {lead.phone && (
                  <div className="admin-detail-field">
                    <span className="admin-detail-label">Phone</span>
                    <div className="admin-detail-value-with-action">
                      <span>{lead.phone}</span>
                      <a href={`tel:${lead.phone}`} className="admin-detail-action" aria-label={`Call ${lead.name}`}>
                        <Phone size={14} strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>
                )}
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Preferred Contact</span>
                  <span className="admin-detail-value">
                    {CONTACT_LABELS[lead.contact_method] || lead.contact_method}
                  </span>
                </div>
              </section>

              {/* Inquiry Section */}
              <section className="admin-detail-section admin-drawer-section-enter" style={{ animationDelay: '100ms' }}>
                <h3 className="admin-detail-section-title">Inquiry</h3>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Type</span>
                  <span className="admin-detail-value">
                    {INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type}
                  </span>
                </div>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Interest</span>
                  <span className="admin-detail-value">{lead.interest}</span>
                </div>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Message</span>
                  <p className="admin-detail-message">{lead.message}</p>
                </div>
                <div className="admin-detail-field">
                  <span className="admin-detail-label">Date Received</span>
                  <span className="admin-detail-value">{formatDate(lead.created_at)}</span>
                </div>
              </section>

              {/* Artwork Section */}
              {lead.artwork_title && (
                <section className="admin-detail-section admin-drawer-section-enter" style={{ animationDelay: '150ms' }}>
                  <h3 className="admin-detail-section-title">Artwork</h3>
                  <div className="admin-detail-field">
                    <span className="admin-detail-label">Title</span>
                    <span className="admin-detail-value">{lead.artwork_title}</span>
                  </div>
                  {lead.artwork_collection && (
                    <div className="admin-detail-field">
                      <span className="admin-detail-label">Collection</span>
                      <span className="admin-detail-value">{lead.artwork_collection}</span>
                    </div>
                  )}
                  {lead.artwork_price_display && (
                    <div className="admin-detail-field">
                      <span className="admin-detail-label">Price at Inquiry</span>
                      <span className="admin-detail-value">{lead.artwork_price_display}</span>
                    </div>
                  )}
                  {lead.artwork_id && (
                    <div className="admin-detail-field admin-detail-field-minor">
                      <span className="admin-detail-label">Artwork ID</span>
                      <span className="admin-detail-value admin-detail-value-minor">{lead.artwork_id}</span>
                    </div>
                  )}
                </section>
              )}

              {/* CRM Management Section */}
              <section className={`admin-detail-section admin-drawer-section-enter${statusMenuOpen ? ' admin-detail-section-status-open' : ''}`} style={{ animationDelay: '200ms' }}>
                <h3 className="admin-detail-section-title">CRM Management</h3>

                <div className="admin-detail-field">
                  <label htmlFor="detail-status" className="admin-detail-label">Status</label>
                  <StatusSelect
                    id="detail-status"
                    options={STATUS_SELECT_OPTIONS}
                    value={status}
                    onChange={setStatus}
                    disabled={saving}
                    ariaLabel="Lead status"
                    className="admin-detail-select-wrapper"
                    onOpenChange={setStatusMenuOpen}
                  />
                </div>

                <div className="admin-detail-field">
                  <label htmlFor="detail-followup" className="admin-detail-label">Follow-Up Date</label>
                  <div className="admin-followup-row">
                    <input
                      id="detail-followup"
                      type="date"
                      value={followUpAt}
                      onChange={(e) => setFollowUpAt(e.target.value)}
                      className="admin-filter-select admin-detail-select"
                      disabled={saving}
                    />
                    {followUpAt && (
                      <button
                        type="button"
                        className="admin-followup-clear"
                        onClick={() => setFollowUpAt('')}
                        disabled={saving}
                        aria-label="Clear follow-up date"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {(overdue || today) && !lead.archived && (
                    <span className={`admin-followup-indicator ${overdue ? 'overdue' : 'today'}`}>
                      {overdue ? 'Overdue' : 'Due today'}
                    </span>
                  )}
                </div>
              </section>

              {/* Internal Notes Section */}
              <section className="admin-detail-section admin-drawer-section-enter" style={{ animationDelay: '250ms' }}>
                <h3 className="admin-detail-section-title">Internal Notes</h3>

                {notesLoading ? (
                  <div className="admin-notes-loading">
                    <div className="admin-loading-spinner admin-loading-spinner-sm" />
                    <span className="admin-loading-text">Loading notes...</span>
                  </div>
                ) : notes.length === 0 ? (
                  <p className="admin-notes-empty">No notes yet.</p>
                ) : (
                  <div className="admin-notes-timeline">
                    {notes.map((note) => (
                      <div key={note.id} className="admin-note-item">
                        <div className="admin-note-header">
                          <span className="admin-note-author">{note.author_name || 'Admin'}</span>
                          <span className="admin-note-date">{formatDateTime(note.created_at)}</span>
                        </div>
                        <p className="admin-note-body">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="admin-note-input-area">
                  <label htmlFor="note-input" className="admin-sr-only">New note</label>
                  <textarea
                    id="note-input"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an internal note..."
                    className="admin-note-textarea"
                    maxLength={5000}
                    disabled={noteSaving}
                    rows={3}
                  />
                  <div className="admin-note-input-footer">
                    {noteError && <span role="alert" className="admin-note-error">{noteError}</span>}
                    <span className="admin-note-char-count">{noteText.length}/5000</span>
                    <button
                      className="admin-btn-primary admin-note-add-btn"
                      onClick={handleAddNote}
                      disabled={noteSaving || !noteText.trim()}
                    >
                      {noteSaving ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Save + Archive/Restore */}
              <div className="admin-detail-actions admin-drawer-section-enter" style={{ animationDelay: '300ms' }}>
                {saveError && (
                  <div role="alert" className="admin-auth-error admin-detail-save-error">
                    {saveError}
                  </div>
                )}
                {savedFlash && (
                  <div role="status" className="admin-detail-saved-flash">
                    <Check size={14} strokeWidth={1.5} />
                    <span>Saved</span>
                  </div>
                )}
                <div className="admin-detail-action-row">
                  <button
                    className="admin-btn-primary admin-detail-save-btn"
                    onClick={handleSave}
                    disabled={saving || !hasChanges()}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {lead.archived ? (
                    <button
                      className="admin-btn-secondary admin-restore-btn"
                      onClick={handleRestore}
                      disabled={saving}
                    >
                      <RotateCcw size={14} strokeWidth={1.5} />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      className="admin-btn-secondary admin-archive-btn"
                      onClick={() => setShowArchiveConfirm(true)}
                      disabled={saving}
                    >
                      <Archive size={14} strokeWidth={1.5} />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && lead && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="Archive confirmation">
          <div className="admin-modal-card admin-modal-card-enter">
            <h3 className="admin-modal-title">Archive this lead?</h3>
            <p className="admin-modal-text">
              Archived leads are removed from active views but remain stored and can be restored.
            </p>
            <div className="admin-modal-actions">
              <button
                className="admin-btn-secondary admin-modal-cancel"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="admin-btn-primary admin-modal-confirm"
                onClick={handleArchive}
                disabled={saving}
              >
                {saving ? 'Archiving...' : 'Archive Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
