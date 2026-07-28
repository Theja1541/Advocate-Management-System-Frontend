import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
} from '../services/alertService';

const PAGE_SIZE = 10;

const SEV = {
  tape: { chip: 'c-tape', label: 'Urgent', border: 'tape' },
  brass: { chip: 'c-brass', label: 'Due', border: 'brass' },
  ink: { chip: 'c-ink', label: 'Open', border: 'ink-3' },
};

const emptyForm = {
  type: '',
  description: '',
  severity: 'brass',
  dueInfo: '',
  isResolved: false,
};

export default function Alerts() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('cases', 'E');

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getAlerts();
      setAlerts(list);
    } catch (err) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const q = query.trim().toLowerCase();
  const filtered = alerts.filter((a) => {
    if (filter === 'open' && a.isResolved) return false;
    if (filter === 'resolved' && !a.isResolved) return false;
    if (filter === 'tape' || filter === 'brass' || filter === 'ink') {
      if (a.severity !== filter) return false;
    }
    if (!q) return true;
    const haystack = [a.type, a.description, a.dueInfo, a.severity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const openAddModal = () => {
    setEditingAlert(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (a) => {
    setEditingAlert(a);
    setForm({
      type: a.type || '',
      description: a.description || '',
      severity: a.severity || 'brass',
      dueInfo: a.dueInfo || '',
      isResolved: !!a.isResolved,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAlert(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.description) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      type: form.type.trim(),
      description: form.description.trim(),
      severity: form.severity,
      dueInfo: form.dueInfo.trim() || undefined,
      isResolved: !!form.isResolved,
    };

    try {
      if (editingAlert) {
        const updated = await updateAlert(editingAlert.id, payload);
        setAlerts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createAlert(payload);
        setAlerts((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save alert');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (a) => {
    setError('');
    try {
      const updated = await updateAlert(a.id, { isResolved: !a.isResolved });
      setAlerts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message || 'Failed to update alert');
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete alert “${a.type}”?`)) return;
    setError('');
    try {
      await deleteAlert(a.id);
      setAlerts((prev) => prev.filter((item) => item.id !== a.id));
    } catch (err) {
      setError(err.message || 'Failed to delete alert');
    }
  };

  const filterButtons = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
    { key: 'tape', label: 'Urgent' },
    { key: 'brass', label: 'Due' },
    { key: 'ink', label: 'Info' },
  ];

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Raised automatically from hearing dates, fee position, documents and membership expiry."
        actions={
          canEdit ? (
            <button className="btn" onClick={openAddModal}>
              Add alert
            </button>
          ) : null
        }
      />

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search alerts</label>
            <input
              type="text"
              placeholder="Type, description, due…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={filter === btn.key ? 'on' : ''}
            onClick={() => setFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--tape)', color: 'var(--tape)', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="empty">Loading alerts…</div>
        </div>
      ) : paged.length ? (
        paged.map((a) => {
          const sev = SEV[a.severity] || SEV.ink;
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
                opacity: a.isResolved ? 0.65 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {a.type}
                  {a.isResolved ? (
                    <span className="mut" style={{ fontWeight: 400, marginLeft: '8px', fontSize: '11px' }}>
                      · resolved
                    </span>
                  ) : null}
                </div>
                <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>
                  {a.description}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="mono mut" style={{ fontSize: '10.5px' }}>
                  {a.dueInfo || '—'}
                </span>
                <Chip type={sev.chip} label={sev.label} />
                {canEdit && (
                  <>
                    <button type="button" className="btn g sm" onClick={() => handleResolve(a)}>
                      {a.isResolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button type="button" className="btn g sm" onClick={() => openEditModal(a)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleDelete(a)}
                      style={{ background: 'transparent', border: '1px solid var(--tape)', color: 'var(--tape)' }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="card">
          <div className="empty">No alerts match the current filters.</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="tbl-foot" style={{ marginTop: '16px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
          <div>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
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

      <div className="card">
        <div className="card-t">Delivery channels</div>
        <div className="card-s">HOW ALERTS REACH THE OFFICE</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
          <Chip type="c-baize" label="SMS — live" />
          <Chip type="c-baize" label="Email — live" />
          <Chip type="c-grey" label="WhatsApp — planned" />
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAlert ? 'Edit Alert' : 'Add Alert'}>
        <form onSubmit={handleSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {error && isModalOpen && (
            <div
              style={{
                padding: '8px 10px',
                marginBottom: '8px',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--tape)',
                color: 'var(--tape)',
                borderRadius: '5px',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}
          <div className="f">
            <label>Alert type</label>
            <input
              type="text"
              placeholder="e.g. Hearing tomorrow"
              value={form.type}
              onChange={setField('type')}
              required
            />
          </div>
          <div className="f">
            <label>Description</label>
            <textarea
              placeholder="What needs attention…"
              rows="3"
              value={form.description}
              onChange={setField('description')}
              required
              style={{
                fontSize: '12.5px',
                padding: '8px 10px',
                border: '1px solid var(--rule)',
                background: 'var(--card)',
                color: 'var(--ink)',
                borderRadius: '5px',
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div className="f">
            <label>Severity</label>
            <select value={form.severity} onChange={setField('severity')}>
              <option value="tape">Urgent</option>
              <option value="brass">Due</option>
              <option value="ink">Open / info</option>
            </select>
          </div>
          <div className="f">
            <label>Due / window</label>
            <input
              type="text"
              placeholder="e.g. Tomorrow 10:30"
              value={form.dueInfo}
              onChange={setField('dueInfo')}
            />
          </div>
          {editingAlert && (
            <div className="f" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input
                id="alert-resolved"
                type="checkbox"
                checked={form.isResolved}
                onChange={setField('isResolved')}
              />
              <label htmlFor="alert-resolved" style={{ margin: 0 }}>
                Marked resolved
              </label>
            </div>
          )}
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : editingAlert ? 'Save changes' : 'Add Alert'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
