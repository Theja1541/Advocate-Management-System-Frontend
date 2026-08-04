import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
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


const PST = {
  paid: ['Paid', 'success'],
  part: ['Pending', 'danger'],
  pending: ['Pending', 'danger'],
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
];

const emptyForm = {
  receiptNo: '',
  caseId: '',
  partyType: 'Client',
  partyId: '',
  totalAmount: '',
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
  const [pageSize, setPageSize] = useState(10);
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

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedPayments = filteredPayments.slice(pageStart, pageStart + pageSize);

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
      totalAmount: String((Number(p.amountReceived) || 0) + (Number(p.amountOutstanding) || 0)),
      amountReceived: String(p.amountReceived ?? ''),
      amountOutstanding: String(p.amountOutstanding ?? ''),
      transactionDate: p.transactionDate || '',
      status: (p.status === 'part' || Number(p.amountOutstanding) > 0) ? 'pending' : 'paid',
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
      let newState = { ...prev, [key]: value };
      if (key === 'partyType') {
        const nextPartyId =
          value === 'Client'
            ? clients[0]
              ? String(clients[0].id)
              : ''
            : advocates[0]
              ? String(advocates[0].id)
              : '';
        newState = { ...newState, partyType: value, partyId: nextPartyId };
      }
      
      if (key === 'totalAmount' || key === 'amountReceived') {
        const total = Number(newState.totalAmount || 0);
        const received = Number(newState.amountReceived || 0);
        const outstanding = Math.max(0, total - received);
        newState.amountOutstanding = String(outstanding);
        newState.status = outstanding > 0 ? 'pending' : 'paid';
      }
      
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caseId || !form.partyId || !form.transactionDate) {
      setError('Please fill out all required fields.');
      return;
    }

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

    if (payload.amountReceived < 0 || payload.amountOutstanding < 0) {
      setError('Amounts must be non-negative.');
      return;
    }

    setSaving(true);
    setError('');

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
    { label: 'Total', className: 'r' },
    { label: 'Received', className: 'r' },
    { label: 'Pending Amount', className: 'r' },
    { label: 'Date' },
    { label: 'Status' },
    { label: '' },
  ];

  const headerActions = canEdit ? (
    <button
      className="btn primary"
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
        description="Client fees, advocate shares and what is still pending."
        actions={headerActions}
      />

      <div className="kpis">
        <KPICard
          label="Received"
          value={inr(totalReceived)}
          status="to date"
          type="b"
          valueStyle={{ fontSize: 'var(--text-base)' }}
        />
        <KPICard
          label="Pending Amount"
          value={inr(totalOutstanding)}
          status={`across ${outstandingMattersCount} matters`}
          type="t"
          valueStyle={{ fontSize: 'var(--text-base)' }}
        />
        <KPICard label="Receipts" value={receiptsCount} status="issued" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
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

      <div className="filt" style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={statusFilter === btn.key ? 'btn primary sm' : 'btn ghost sm'}
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
                <td className="r mono" style={{ color: 'var(--text-primary)' }}>
                  {received || due ? inr(received + due) : '—'}
                </td>
                <td className="r mono" style={{ color: 'var(--success)' }}>
                  {received ? inr(received) : '—'}
                </td>
                <td
                  className="r mono"
                  style={{ color: due ? 'var(--danger)' : 'var(--text-secondary)' }}
                >
                  {due ? inr(due) : '—'}
                </td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {formatDate(p.transactionDate)}
                </td>
                <td>
                  <Chip type={statusChip[1]} label={statusChip[0]} />
                </td>
                <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {received ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => handleReceipt(p)}
                      style={{ marginRight: canEdit ? 'var(--space-2)' : 0 }}
                    >
                      Receipt
                    </button>
                  ) : null}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => openEditModal(p)}
                        style={{ marginRight: 'var(--space-2)' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={() => handleDelete(p)}
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

      {!loading && filteredPayments.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>
              entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredPayments.length)} of {filteredPayments.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button type="button" className="btn ghost sm" disabled style={{ cursor: 'default' }}>
              {currentPage} / {totalPages}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Payment Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Payment Record Details"
      >
        {selectedViewPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Receipt No</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedViewPayment.receiptNo}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Status</span>
                <Chip type={(PST[selectedViewPayment.status] || ['Unknown', 'ghost'])[1]} label={(PST[selectedViewPayment.status] || ['Unknown', 'ghost'])[0]} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Party Name ({selectedViewPayment.partyType})</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{getPartyName(selectedViewPayment.partyType, selectedViewPayment.partyId)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Case Number</span>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{getCaseNo(selectedViewPayment)}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Total Amount</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{inr(Number(selectedViewPayment.amountReceived || 0) + Number(selectedViewPayment.amountOutstanding || 0))}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Amount Received</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--success)' }}>{inr(Number(selectedViewPayment.amountReceived || 0))}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Pending Amount</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--danger)' }}>{inr(Number(selectedViewPayment.amountOutstanding || 0))}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Transaction Date</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatDate(selectedViewPayment.transactionDate)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {Number(selectedViewPayment.amountReceived || 0) > 0 && (
                <button
                  type="button"
                  className="btn ghost"
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
                  className="btn primary"
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          )}

          <FormSection title="Transaction Info">
            <FormGrid columns={2}>
              <FormField label="Receipt Number (Leave blank to auto-generate)">
                <input
                  type="text"
                  placeholder="e.g. PY-047"
                  value={form.receiptNo}
                  onChange={setField('receiptNo')}
                  disabled={!!editingPayment}
                />
              </FormField>
              <FormField label="Transaction Date" required={true}>
                <input
                  type="date"
                  value={form.transactionDate}
                  onChange={setField('transactionDate')}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Payment Details">
            <FormField label="Case Matter">
              <SearchableSelect
                options={cases.map(c => ({ id: c.id, name: c.caseNo }))}
                value={form.caseId}
                onChange={(e) => setForm(p => ({ ...p, caseId: e.target.value }))}
                placeholder="Select Case"
                name="caseId"
              />
            </FormField>

            <FormGrid columns={2}>
              <FormField label="Party Type">
                <select value={form.partyType} onChange={setField('partyType')}>
                  <option value="Client">Client</option>
                  <option value="Advocate">Advocate</option>
                </select>
              </FormField>
              <FormField label="Recipient / Payer">
                <SearchableSelect
                  options={partyOptions}
                  value={form.partyId}
                  onChange={(e) => setForm(p => ({ ...p, partyId: e.target.value }))}
                  placeholder="Select Recipient/Payer"
                  name="partyId"
                />
              </FormField>
            </FormGrid>

            <FormGrid columns={3}>
              <FormField label="Total Amount (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.totalAmount}
                  onChange={setField('totalAmount')}
                />
              </FormField>
              <FormField label="Amount Received (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.amountReceived}
                  onChange={setField('amountReceived')}
                />
              </FormField>
              <FormField label="Pending Amount (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.amountOutstanding}
                  readOnly
                  style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                />
              </FormField>
            </FormGrid>

            <FormField label="Status">
              <select 
                value={form.status} 
                disabled 
                style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </FormField>
          </FormSection>

          <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
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
