import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import PaymentReceipt from '../components/ui/PaymentReceipt';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from '../services/paymentService';
import { getCases } from '../services/caseService';
import { getClients } from '../services/clientService';
import { getAdvocates } from '../services/advocateService';

const PAGE_SIZE = 10;

const PST = {
  paid: ['Paid', 'c-baize'],
  part: ['Part paid', 'c-brass'],
  pending: ['Pending', 'c-tape'],
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'part', label: 'Part paid' },
  { key: 'pending', label: 'Pending' },
];

const emptyForm = {
  receiptNo: '',
  caseId: '',
  partyType: 'Client',
  partyId: '',
  amountReceived: '',
  amountOutstanding: '',
  transactionDate: '',
  status: 'paid',
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

export default function Pay() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('pay', 'E');

  const [payments, setPayments] = useState([]);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewPayment, setSelectedViewPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [receiptPayment, setReceiptPayment] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [paymentList, caseList, clientList, advocateList] = await Promise.all([
        getPayments(),
        getCases(),
        getClients(),
        getAdvocates(),
      ]);
      setPayments(paymentList);
      setCases(caseList);
      setClients(clientList);
      setAdvocates(advocateList);
    } catch (err) {
      setError(err.message || 'Failed to load payments');
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

  const getCaseNo = (p) =>
    p?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(p.caseId))?.caseNo ||
    '—';

  const getPartyName = (type, id) => {
    if (type === 'Client') {
      const client = clients.find((c) => String(c.id) === String(id));
      return client ? client.name : id ? String(id) : '—';
    }
    const adv = advocates.find((a) => String(a.id) === String(id));
    return adv ? adv.name : id ? String(id) : '—';
  };

  const totalOutstanding = payments.reduce(
    (sum, p) => sum + Number(p.amountOutstanding || 0),
    0
  );
  const totalReceived = payments.reduce(
    (sum, p) => sum + Number(p.amountReceived || 0),
    0
  );
  const outstandingMattersCount = payments.filter(
    (p) => Number(p.amountOutstanding || 0) > 0
  ).length;
  const receiptsCount = payments.filter(
    (p) => Number(p.amountReceived || 0) > 0
  ).length;

  const q = query.trim().toLowerCase();
  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!q) return true;
    const haystack = [
      p.receiptNo,
      getCaseNo(p),
      getPartyName(p.partyType, p.partyId),
      p.partyType,
      p.status,
      PST[p.status]?.[0],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedPayments = filteredPayments.slice(pageStart, pageStart + PAGE_SIZE);

  const openAddModal = () => {
    setEditingPayment(null);
    setForm({
      ...emptyForm,
      caseId: cases[0] ? String(cases[0].id) : '',
      partyType: 'Client',
      partyId: clients[0] ? String(clients[0].id) : '',
      transactionDate: new Date().toISOString().slice(0, 10),
      status: 'paid',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPayment(p);
    setForm({
      receiptNo: p.receiptNo || '',
      caseId: p.caseId != null ? String(p.caseId) : '',
      partyType: p.partyType || 'Client',
      partyId: p.partyId != null ? String(p.partyId) : '',
      amountReceived: String(p.amountReceived ?? ''),
      amountOutstanding: String(p.amountOutstanding ?? ''),
      transactionDate: p.transactionDate || '',
      status: p.status || 'pending',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (p) => {
    setSelectedViewPayment(p);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      if (key === 'partyType') {
        const nextPartyId =
          value === 'Client'
            ? clients[0]
              ? String(clients[0].id)
              : ''
            : advocates[0]
              ? String(advocates[0].id)
              : '';
        return { ...prev, partyType: value, partyId: nextPartyId };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caseId || !form.partyId || !form.transactionDate) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      receiptNo: form.receiptNo.trim() || undefined,
      caseId: Number(form.caseId),
      partyType: form.partyType,
      partyId: Number(form.partyId),
      amountReceived: Number(form.amountReceived || 0),
      amountOutstanding: Number(form.amountOutstanding || 0),
      transactionDate: form.transactionDate,
      status: form.status,
    };

    try {
      if (editingPayment) {
        const updated = await updatePayment(editingPayment.id, payload);
        setPayments((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setSelectedViewPayment(updated);
      } else {
        const created = await createPayment(payload);
        setPayments((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const confirmed = window.confirm(
      `Delete payment "${p.receiptNo}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    try {
      await deletePayment(p.id);
      setPayments((prev) => prev.filter((item) => item.id !== p.id));
      if (selectedViewPayment && selectedViewPayment.id === p.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete payment');
    }
  };

  const handleReceipt = (p) => {
    setReceiptPayment(p);
  };

  const headers = [
    { label: 'Receipt' },
    { label: 'Case no.' },
    { label: 'Party' },
    { label: 'Type' },
    { label: 'Received', className: 'r' },
    { label: 'Outstanding', className: 'r' },
    { label: 'Date' },
    { label: 'Status' },
    { label: '' },
  ];

  const headerActions = canEdit ? (
    <button
      className="btn"
      onClick={openAddModal}
      disabled={!cases.length || !clients.length}
    >
      Record payment
    </button>
  ) : null;

  const partyOptions =
    form.partyType === 'Client' ? clients : advocates;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Client fees, advocate shares and what is still outstanding."
        actions={headerActions}
      />

      <div className="kpis">
        <KPICard
          label="Received"
          value={inr(totalReceived)}
          status="to date"
          type="b"
          valueStyle={{ fontSize: '20px' }}
        />
        <KPICard
          label="Outstanding"
          value={inr(totalOutstanding)}
          status={`across ${outstandingMattersCount} matters`}
          type="t"
          valueStyle={{ fontSize: '20px' }}
        />
        <KPICard label="Receipts" value={receiptsCount} status="issued" />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search payments</label>
            <input
              type="text"
              placeholder="Receipt, case no., party…"
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
              <div className="empty">Loading payments…</div>
            </td>
          </tr>
        ) : pagedPayments.length ? (
          pagedPayments.map((p) => {
            const statusChip = PST[p.status] || ['Unknown', 'c-grey'];
            const received = Number(p.amountReceived || 0);
            const due = Number(p.amountOutstanding || 0);
            return (
              <tr 
                key={p.id}
                onClick={() => openViewModal(p)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span className="cno-c">{p.receiptNo}</span>
                </td>
                <td>
                  <span className="cno-c">{getCaseNo(p)}</span>
                </td>
                <td>
                  <span className="nm">
                    {getPartyName(p.partyType, p.partyId)}
                  </span>
                </td>
                <td className="mut">{p.partyType}</td>
                <td className="r mono" style={{ color: 'var(--baize)' }}>
                  {received ? inr(received) : '—'}
                </td>
                <td
                  className="r mono"
                  style={{ color: due ? 'var(--tape)' : 'var(--muted)' }}
                >
                  {due ? inr(due) : '—'}
                </td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  {formatDate(p.transactionDate)}
                </td>
                <td>
                  <Chip type={statusChip[1]} label={statusChip[0]} />
                </td>
                <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {received ? (
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => handleReceipt(p)}
                      style={{ marginRight: canEdit ? '6px' : 0 }}
                    >
                      Receipt
                    </button>
                  ) : null}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn g sm"
                        onClick={() => openEditModal(p)}
                        style={{ marginRight: '6px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleDelete(p)}
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
              <div className="empty">No payments match this selection.</div>
            </td>
          </tr>
        )}
      </DataTable>

      {/* Payment Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Payment Record Details"
      >
        {selectedViewPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Receipt No</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewPayment.receiptNo}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Status</span>
                <Chip type={(PST[selectedViewPayment.status] || ['Unknown', 'c-grey'])[1]} label={(PST[selectedViewPayment.status] || ['Unknown', 'c-grey'])[0]} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Party Name ({selectedViewPayment.partyType})</span>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{getPartyName(selectedViewPayment.partyType, selectedViewPayment.partyId)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Case Number</span>
                <span className="mono font-semibold" style={{ fontSize: '13px', color: 'var(--ink)' }}>{getCaseNo(selectedViewPayment)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Amount Received</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--baize)' }}>{inr(Number(selectedViewPayment.amountReceived || 0))}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Amount Outstanding</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--tape)' }}>{inr(Number(selectedViewPayment.amountOutstanding || 0))}</span>
              </div>
            </div>

            <div>
              <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Transaction Date</span>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{formatDate(selectedViewPayment.transactionDate)}</span>
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {Number(selectedViewPayment.amountReceived || 0) > 0 && (
                <button
                  type="button"
                  className="btn g"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleReceipt(selectedViewPayment);
                  }}
                >
                  View Receipt Slip
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewPayment);
                  }}
                >
                  Edit Record
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPayment ? 'Edit Payment Record' : 'Record Payment'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div className="fgrid">
            <div className="f">
              <label>Receipt Number (Leave blank to auto-generate)</label>
              <input
                type="text"
                placeholder="e.g. PY-047"
                value={form.receiptNo}
                onChange={setField('receiptNo')}
                disabled={!!editingPayment}
              />
            </div>
            <div className="f">
              <label>Transaction Date</label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={setField('transactionDate')}
                required
              />
            </div>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Case Matter</label>
            <SearchableSelect
              options={cases.map(c => ({ id: c.id, name: c.caseNo }))}
              value={form.caseId}
              onChange={(e) => setForm(p => ({ ...p, caseId: e.target.value }))}
              placeholder="Select Case"
              name="caseId"
            />
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Party Type</label>
              <select value={form.partyType} onChange={setField('partyType')}>
                <option value="Client">Client</option>
                <option value="Advocate">Advocate</option>
              </select>
            </div>
            <div className="f">
              <label>Recipient / Payer</label>
              <SearchableSelect
                options={partyOptions}
                value={form.partyId}
                onChange={(e) => setForm(p => ({ ...p, partyId: e.target.value }))}
                placeholder="Select Recipient/Payer"
                name="partyId"
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Amount Received (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={form.amountReceived}
                onChange={setField('amountReceived')}
              />
            </div>
            <div className="f">
              <label>Amount Outstanding (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={form.amountOutstanding}
                onChange={setField('amountOutstanding')}
              />
            </div>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Status</label>
            <select value={form.status} onChange={setField('status')}>
              <option value="paid">Paid</option>
              <option value="part">Part Paid</option>
              <option value="pending">Pending</option>
            </select>
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

      <Modal
        isOpen={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        className="receipt-modal"
        title="Payment Receipt"
      >
        {receiptPayment && (
          <PaymentReceipt
            payment={receiptPayment}
            caseNo={getCaseNo(receiptPayment)}
            partyName={getPartyName(
              receiptPayment.partyType,
              receiptPayment.partyId
            )}
            onClose={() => setReceiptPayment(null)}
          />
        )}
      </Modal>
    </>
  );
}
