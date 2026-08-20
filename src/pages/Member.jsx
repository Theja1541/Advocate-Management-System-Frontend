import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  getMemberships,
  createMembership,
  updateMembership,
  renewMembership,
  deleteMembership,
} from '../services/membershipService';
import { getGroupAdmins } from '../services/groupAdminService';



const MST = {
  active: ['Active', 'success'],
  expiring: ['Expiring soon', 'warning'],
  expired: ['Expired', 'danger'],
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
  groupAdminId: '',
  planName: PLAN_OPTIONS[0],
  feeAmount: '',
  startDate: '',
  expiryDate: '',
  durationMonths: '',
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

const addMonths = (dateStr, months) => {
  if (!dateStr || !months || isNaN(months)) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + parseInt(months, 10));
  return d.toISOString().slice(0, 10);
};

export default function Member() {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('member', 'E');

  const [members, setMembers] = useState([]);
  const [groupAdmins, setGroupAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewMember, setSelectedViewMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membershipsResult, groupAdminsResult] = await Promise.allSettled([
        getMemberships(),
        getGroupAdmins(user?.tenantId), // Passing tenantId to ensure tenant isolation if needed by the service
      ]);

      if (membershipsResult.status === 'rejected') {
        throw membershipsResult.reason;
      }

      setMembers(membershipsResult.value || []);
      setGroupAdmins(groupAdminsResult.status === 'fulfilled' ? groupAdminsResult.value || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const getGroupAdminName = (membership) =>
    membership?.groupAdmin?.name ||
    groupAdmins.find((ga) => String(ga.id) === String(membership.groupAdminId))?.name ||
    '—';

  const activeCount = members.filter((m) => m.status === 'active').length;
  const expiringCount = members.filter((m) => m.status === 'expiring').length;
  const totalValue = members.reduce((sum, m) => sum + Number(m.feeAmount || 0), 0);

  const q = query.trim().toLowerCase();
  const filteredMembers = members.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (!q) return true;
    const haystack = [
      getGroupAdminName(m),
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

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedMembers = filteredMembers.slice(pageStart, pageStart + pageSize);

  const assignedGroupAdminIds = new Set(members.map((m) => String(m.groupAdminId)));
  const availableGroupAdmins = groupAdmins.filter((ga) => {
    if (editingMember && String(ga.id) === String(editingMember.groupAdminId)) return true;
    return !assignedGroupAdminIds.has(String(ga.id));
  });

  const openAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingMember(null);
    setForm({
      ...emptyForm,
      groupAdminId: availableGroupAdmins[0] ? String(availableGroupAdmins[0].id) : '',
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
      groupAdminId: m.groupAdminId != null ? String(m.groupAdminId) : '',
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
      if (key === 'durationMonths') {
        const newEnd = addMonths(prev.startDate, value);
        return { ...prev, durationMonths: value, expiryDate: newEnd || prev.expiryDate };
      }
      if (key === 'startDate' && value) {
        if (prev.durationMonths) {
          return { ...prev, startDate: value, expiryDate: addMonths(value, prev.durationMonths) || prev.expiryDate };
        } else if (!editingMember) {
          return { ...prev, startDate: value, expiryDate: addOneYear(value) };
        }
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.groupAdminId || !form.planName || !form.feeAmount || !form.startDate || !form.expiryDate) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      groupAdminId: Number(form.groupAdminId),
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
      `Delete membership for "${getGroupAdminName(m)}"? This cannot be undone.`
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
    { label: 'Group Admin' },
    { label: 'Plan' },
    { label: 'Fee', className: 'r' },
    { label: 'Start' },
    { label: 'Expiry' },
    { label: 'Status' },
    { label: '' },
  ];

  const headerActions = canEdit ? (
    <button
      className="btn primary"
      onClick={openAddModal}
      disabled={!availableGroupAdmins.length && !editingMember}
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

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Search memberships</label>
            <input
              type="text"
              placeholder="Group Admin, plan, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
            />
          </div>
        </div>
      </div>

      <div className="filt" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn sm ${statusFilter === btn.key ? 'primary' : 'outline'}`}
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
            marginBottom: 'var(--space-3)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)'
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
                  <span className="nm">{getGroupAdminName(m)}</span>
                </td>
                <td className="mut">{m.planName}</td>
                <td className="r mono">{inr(Number(m.feeAmount || 0))}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {formatDate(m.startDate)}
                </td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {formatDate(m.expiryDate)}
                </td>
                <td>
                  <Chip type={statusChip[1]} label={statusChip[0]} />
                </td>
                <td style={{ whiteSpace: 'nowrap', gap: 'var(--space-2)', display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  {canEdit && (m.status === 'expiring' || m.status === 'expired') ? (
                    <button
                      className="btn primary sm"
                      onClick={() => handleRenew(m)}
                      disabled={actingId === m.id}
                    >
                      {actingId === m.id ? 'Renewing…' : 'Renew'}
                    </button>
                  ) : null}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => openEditModal(m)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={() => handleDelete(m)}
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

      {!loading && filteredMembers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredMembers.length)} of {filteredMembers.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn ghost sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button type="button" className="btn ghost sm" disabled style={{ cursor: 'default' }}>{currentPage} / {totalPages}</button>
            <button type="button" className="btn ghost sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {/* Membership Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Membership Details"
      >
        {selectedViewMember && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Group Admin</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{getGroupAdminName(selectedViewMember)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Status</span>
                <Chip type={(MST[selectedViewMember.status] || ['Unknown', 'ghost'])[1]} label={(MST[selectedViewMember.status] || ['Unknown', 'ghost'])[0]} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Membership Plan</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewMember.planName}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Membership Fee</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{inr(Number(selectedViewMember.feeAmount || 0))}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px dashed var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Start Date</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(selectedViewMember.startDate)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Expiry Date</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(selectedViewMember.expiryDate)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (selectedViewMember.status === 'expiring' || selectedViewMember.status === 'expired') && (
                <button
                  type="button"
                  className="btn primary"
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
                  className="btn secondary"
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && isModalOpen && (
            <div
              style={{
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-2)',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}
          <FormSection title="Account & Role">
            <FormGrid columns={2}>
              <FormField label="Group Admin" required={true}>
                <select
                  value={form.groupAdminId}
                  onChange={setField('groupAdminId')}
                  disabled={!!editingMember}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                >
                  {availableGroupAdmins.map((ga) => (
                    <option key={ga.id} value={ga.id}>
                      {ga.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Membership Plan" required={false}>
                <select value={form.planName} onChange={setField('planName')} style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}>
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Fee Amount (₹)" required={true}>
                <input
                  type="number"
                  value={form.feeAmount}
                  onChange={setField('feeAmount')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Membership Details">
            <FormGrid>
              <FormField label="Duration (Months)" required={false}>
                <input
                  type="number"
                  min="1"
                  value={form.durationMonths || ''}
                  onChange={setField('durationMonths')}
                  placeholder="e.g. 1, 3, 12"
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>

              <FormField label="Start Date" required={true}>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={setField('startDate')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>

              <FormField label="Expiry Date" required={true}>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={setField('expiryDate')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
            </FormGrid>
          </FormSection>
          <div className="modal-foot" style={{ paddingTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
