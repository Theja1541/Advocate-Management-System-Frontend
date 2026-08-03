import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import { getAlerts, resolveAlertStatus, markAlertAsRead, markAlertAsUnread } from '../services/alertService';
import { useNavigate, useLocation } from 'react-router-dom';

const PAGE_SIZE = 10;

const SEV = {
  high: { chip: 'c-tape', label: 'High', border: 'tape' },
  medium: { chip: 'c-brass', label: 'Medium', border: 'brass' },
  low: { chip: 'c-ink', label: 'Low', border: 'ink-3' },
  tape: { chip: 'c-tape', label: 'Urgent', border: 'tape' },
  brass: { chip: 'c-brass', label: 'Due', border: 'brass' },
  ink: { chip: 'c-ink', label: 'Info', border: 'ink-3' },
};

export default function Alerts() {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(location.state?.query || '');
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || ''); 
  const [priorityFilter, setPriorityFilter] = useState(location.state?.priorityFilter || ''); 
  const [moduleFilter, setModuleFilter] = useState(location.state?.moduleFilter || ''); 
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (moduleFilter) filters.referenceType = moduleFilter;
      if (query.trim()) filters.message = query.trim();

      const list = await getAlerts(filters);
      setAlerts(list);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, moduleFilter, query]);

  useEffect(() => {
    // Only load if page is 1 or query/filters change
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, priorityFilter, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = alerts.slice(pageStart, pageStart + PAGE_SIZE);

  const handleResolve = async (a) => {
    setError('');
    try {
      const newStatus = a.status === 'resolved' ? 'active' : 'resolved';
      const updated = await resolveAlertStatus(a.id, newStatus);
      setAlerts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message || 'Failed to update notification');
    }
  };

  const handleToggleRead = async (a) => {
    setError('');
    try {
      let updated;
      if (a.isRead) {
        updated = await markAlertAsUnread(a.id);
      } else {
        updated = await markAlertAsRead(a.id);
      }
      setAlerts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message || 'Failed to update notification');
    }
  };

  const handleOpenRecord = (a) => {
    if (a.referenceType === 'Case') {
      navigate(`/cases`);
    } else if (a.referenceType === 'Payment') {
      navigate(`/pay`);
    } else if (a.referenceType === 'Task') {
      navigate(`/tasks`);
    } else if (a.referenceType === 'Document') {
      navigate(`/docs`);
    } else {
      alert(`Navigation for ${a.referenceType} is not implemented yet.`);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications Center"
        description="System-generated notifications for hearing dates, fee positions, and documents."
      />

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '200px' }}>
            <label>Search notifications</label>
            <input
              type="text"
              placeholder="Search by message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="f" style={{ minWidth: '120px' }}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="f" style={{ minWidth: '120px' }}>
            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="f" style={{ minWidth: '120px' }}>
            <label>Module</label>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="">All Modules</option>
              <option value="Case">Case</option>
              <option value="Hearing">Hearing</option>
              <option value="Payment">Payment</option>
              <option value="Document">Document</option>
              <option value="Task">Task</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--tape)', color: 'var(--tape)', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="empty">Loading notifications…</div>
        </div>
      ) : paged.length ? (
        paged.map((a) => {
          const sev = SEV[a.priority] || SEV[a.severity] || SEV.ink;
          const isResolved = a.status === 'resolved';
          return (
            <div
              key={a.id}
              className="card"
              style={{
                borderLeft: `3px solid var(--${sev.border})`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '13px 15px',
                opacity: isResolved ? 0.65 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: a.isRead ? 400 : 600 }}>
                  {a.alertType ? a.alertType.replace(/_/g, ' ') : a.type}
                  {isResolved ? (
                    <span className="mut" style={{ fontWeight: 400, marginLeft: '8px', fontSize: '11px' }}>
                      · resolved
                    </span>
                  ) : null}
                  {!a.isRead && !isResolved ? (
                    <span style={{ color: 'var(--brand)', marginLeft: '8px', fontSize: '18px', lineHeight: '10px' }}>
                      •
                    </span>
                  ) : null}
                </div>
                <div className="mut" style={{ fontSize: '12px', marginTop: '2px', fontWeight: a.isRead ? 400 : 500 }}>
                  {a.message || a.description}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="mono mut" style={{ fontSize: '10.5px' }}>
                  {a.referenceType} #{a.referenceId}
                </span>
                <Chip type={sev.chip} label={sev.label} />
                
                <button type="button" className="btn g sm" onClick={() => handleToggleRead(a)}>
                  {a.isRead ? 'Mark as Unread' : 'Mark as Read'}
                </button>
                <button type="button" className="btn g sm" onClick={() => handleResolve(a)}>
                  {isResolved ? 'Re-open' : 'Mark as Resolved'}
                </button>
                <button type="button" className="btn g sm" onClick={() => handleOpenRecord(a)}>
                  View Record
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="card">
          <div className="empty">No notifications match the current filters.</div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="tbl-foot" style={{ marginTop: '16px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
          <div>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, alerts.length)} of {alerts.length}
          </div>
          <div className="pager">
            <button
              type="button"
              className="btn g sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ margin: '0 10px', fontSize: '12px', color: 'var(--muted)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn g sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
