import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  getMemberships,
  createMembership,
  updateMembership,
  renewMembership,
  deleteMembership,
} from '../services/membershipService';
import { getAdvocates } from '../services/advocateService';

const PAGE_SIZE = 10;

const MST = {
  active: ['Active', 'c-baize'],
  expiring: ['Expiring soon', 'c-brass'],
  expired: ['Expired', 'c-tape'],
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
];

const PLAN_OPTIONS = [
  'Firm — Annual',
  'Associate — Annual',
  'Associate — Half yearly',
  'Referral — Annual',
];

const emptyForm = {
  advocateId: '',
  planName: PLAN_OPTIONS[0],
  feeAmount: '',
  startDate: '',
  expiryDate: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const addOneYear = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export default function Member() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('member', 'E');

  const [members, setMembers] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewMember, setSelectedViewMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membershipList, advocateList] = await Promise.all([
        getMemberships(),
        getAdvocates(),
      ]);
      setMembers(membershipList);
      setAdvocates(advocateList);
    } catch (err) {
      setError(err.message || 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const getAdvocateName = (membership) =>
    membership?.advocate?.name ||
    advocates.find((a) => String(a.id) === String(membership.advocateId))?.name ||
    '—';

  const activeCount = members.filter((m) => m.status === 'active').length;
  const expiringCount = members.filter((m) => m.status === 'expiring').length;
  const totalValue = members.reduce((sum, m) => sum + Number(m.feeAmount || 0), 0);

  const q = query.trim().toLowerCase();
  const filteredMembers = members.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (!q) return true;
    const haystack = [
      getAdvocateName(m),
      m.planName,
      m.status,
      MST[m.status]?.[0],
      m.startDate,
      m.expiryDate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedMembers = filteredMembers.slice(pageStart, pageStart + PAGE_SIZE);

  const assignedAdvocateIds = new Set(members.map((m) => String(m.advocateId)));
  const availableAdvocates = advocates.filter((a) => {
    if (editingMember && String(a.id) === String(editingMember.advocateId)) return true;
    return !assignedAdvocateIds.has(String(a.id));
  });

  const openAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingMember(null);
    setForm({
      ...emptyForm,
      advocateId: availableAdvocates[0] ? String(availableAdvocates[0].id) : '',
      startDate: today,
      expiryDate: addOneYear(today),
      feeAmount: '12000',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (m) => {
    setEditingMember(m);
    setForm({
      advocateId: m.advocateId != null ? String(m.advocateId) : '',
      planName: m.planName || PLAN_OPTIONS[0],
      feeAmount: String(m.feeAmount ?? ''),
      startDate: m.startDate || '',
      expiryDate: m.expiryDate || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (m) => {
    setSelectedViewMember(m);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      if (key === 'startDate' && value && !editingMember) {
        return { ...prev, startDate: value, expiryDate: addOneYear(value) };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.advocateId || !form.planName || !form.feeAmount || !form.startDate || !form.expiryDate) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      advocateId: Number(form.advocateId),
      planName: form.planName.trim(),
      feeAmount: Number(form.feeAmount),
      startDate: form.startDate,
      expiryDate: form.expiryDate,
    };

    try {
      if (editingMember) {
        const updated = await updateMembership(editingMember.id, payload);
        setMembers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedViewMember(updated);
      } else {
        const created = await createMembership(payload);
        setMembers((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save membership');
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async (m) => {
    setActingId(m.id);
    setError('');
    try {
      const updated = await renewMembership(m.id);
      setMembers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedViewMember && selectedViewMember.id === m.id) {
        setSelectedViewMember(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to renew membership');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (m) => {
    const confirmed = window.confirm(
      `Delete membership for "${getAdvocateName(m)}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    try {
      await deleteMembership(m.id);
      setMembers((prev) => prev.filter((item) => item.id !== m.id));
      if (selectedViewMember && selectedViewMember.id === m.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete membership');
    }
  };

  const headers = [
    { label: 'Advocate' },
    { label: 'Plan' },
    { label: 'Fee', className: 'r' },
    { label: 'Start' },
    { label: 'Expiry' },
    { label: 'Status' },
    { label: '' },
  ];

  const headerActions = canEdit ? (
    <button
      className="btn"
      onClick={openAddModal}
      disabled={!availableAdvocates.length && !editingMember}
    >
      Add membership
    </button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Membership"
        description="Plans, renewal dates and the fees collected against them."
        actions={headerActions}
      />

      <div className="kpis">
        <KPICard label="Active plans" value={activeCount} status="in force" type="b" />
        <KPICard label="Expiring" value={expiringCount} status="within 30 days" type="r" />
        <KPICard
          label="Annual value"
          value={inr(totalValue)}
          status="all plans"
          valueStyle={{ fontSize: '21px' }}
        />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search memberships</label>
            <input
              type="text"
              placeholder="Advocate, plan, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={statusFilter === btn.key ? 'on' : ''}
            onClick={() => setStatusFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div
          className="card"
          style={{
            marginBottom: '12px',
            borderColor: 'var(--tape)',
            color: 'var(--tape)',
            fontSize: '12.5px',
          }}
        >
          {error}
        </div>
      )}

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">Loading memberships…</div>
            </td>
          </tr>
        ) : pagedMembers.length ? (
          pagedMembers.map((m) => {
            const statusChip = MST[m.status] || ['Unknown', 'c-grey'];
            return (
              <tr 
                key={m.id}
                onClick={() => openViewModal(m)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span className="nm">{getAdvocateName(m)}</span>
                </td>
                <td className="mut">{m.planName}</td>
                <td className="r mono">{inr(Number(m.feeAmount || 0))}</td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  {formatDate(m.startDate)}
                </td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  {formatDate(m.expiryDate)}
                </td>
                <td>
                  <Chip type={statusChip[1]} label={statusChip[0]} />
                </td>
                <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {canEdit && (m.status === 'expiring' || m.status === 'expired') ? (
                    <button
                      className="btn sm"
                      onClick={() => handleRenew(m)}
                      disabled={actingId === m.id}
                      style={{ marginRight: '6px' }}
                    >
                      {actingId === m.id ? 'Renewing…' : 'Renew'}
                    </button>
                  ) : null}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn g sm"
                        onClick={() => openEditModal(m)}
                        style={{ marginRight: '6px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleDelete(m)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--tape)',
                          color: 'var(--tape)',
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">No memberships in this filter.</div>
            </td>
          </tr>
        )}
      </DataTable>

      {/* Membership Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Membership Details"
      >
        {selectedViewMember && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Advocate</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{getAdvocateName(selectedViewMember)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Status</span>
                <Chip type={(MST[selectedViewMember.status] || ['Unknown', 'c-grey'])[1]} label={(MST[selectedViewMember.status] || ['Unknown', 'c-grey'])[0]} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Membership Plan</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewMember.planName}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Membership Fee</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{inr(Number(selectedViewMember.feeAmount || 0))}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px dashed var(--rule)', paddingTop: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Start Date</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{formatDate(selectedViewMember.startDate)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Expiry Date</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{formatDate(selectedViewMember.expiryDate)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (selectedViewMember.status === 'expiring' || selectedViewMember.status === 'expired') && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleRenew(selectedViewMember);
                  }}
                  disabled={actingId === selectedViewMember.id}
                >
                  {actingId === selectedViewMember.id ? 'Renewing…' : 'Renew Plan'}
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewMember);
                  }}
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMember ? 'Edit Membership' : 'Add Membership'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <label>Advocate</label>
            <select
              value={form.advocateId}
              onChange={setField('advocateId')}
              disabled={!!editingMember}
              required
            >
              {availableAdvocates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Membership Plan</label>
            <select value={form.planName} onChange={setField('planName')}>
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Fee Amount (₹)</label>
            <input
              type="number"
              value={form.feeAmount}
              onChange={setField('feeAmount')}
              required
            />
          </div>
          <div className="f">
            <label>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={setField('startDate')}
              required
            />
          </div>
          <div className="f">
            <label>Expiry Date</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={setField('expiryDate')}
              required
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
