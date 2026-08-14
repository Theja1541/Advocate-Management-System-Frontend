import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { inr, TODAY } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { DB_CATS } from '../data/mockData';
import {
  getDaybookEntries,
  createDaybookEntry,
  updateDaybookEntry,
  deleteDaybookEntry,
} from '../services/daybookService';
import { getPayments } from '../services/paymentService';
import { getCases } from '../services/caseService';
import { getClients } from '../services/clientService';

const emptyForm = {
  transactionDate: new Date().toISOString().slice(0, 10),
  category: DB_CATS[0],
  particulars: '',
  paymentMode: 'Cash',
  type: 'out',
  amount: '',
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-CA');
};

export default function Daybook() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('daybook', 'E');

  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(emptyForm);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [showEntryForm, setShowEntryForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entriesResult, paymentsResult, casesResult, clientsResult] = await Promise.allSettled([
        getDaybookEntries(),
        getPayments(),
        getCases(),
        getClients(),
      ]);

      if (entriesResult.status === 'rejected') {
        throw entriesResult.reason;
      }

      setEntries(entriesResult.value || []);
      setPayments(paymentsResult.status === 'fulfilled' ? paymentsResult.value || [] : []);
      setCases(casesResult.status === 'fulfilled' ? casesResult.value || [] : []);
      setClients(clientsResult.status === 'fulfilled' ? clientsResult.value || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load day book');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, typeFilter]);

  const getCaseNo = (payment) =>
    payment?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(payment.caseId))?.caseNo ||
    '—';

  const getClientName = (id) => {
    const client = clients.find((c) => String(c.id) === String(id));
    return client ? client.name : id ? String(id) : '—';
  };

  const sortedRows = [...entries].sort((a, b) => {
    const dateCmp = String(a.transactionDate).localeCompare(String(b.transactionDate));
    if (dateCmp !== 0) return dateCmp;
    return Number(a.id) - Number(b.id);
  });

  let currentRun = 0;
  const runningBalances = {};
  sortedRows.forEach((r) => {
    currentRun += r.type === 'in' ? Number(r.amount) : -Number(r.amount);
    runningBalances[r.id] = currentRun;
  });

  const q = query.trim().toLowerCase();
  const shownRows = sortedRows.filter((r) => {
    if (filter !== 'all' && r.category !== filter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (!q) return true;
    const haystack = [
      r.daybookCode,
      r.category,
      r.particulars,
      r.paymentMode,
      r.recorder?.name,
      r.transactionDate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalIn = sortedRows
    .filter((r) => r.type === 'in')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalOut = sortedRows
    .filter((r) => r.type === 'out')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(shownRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedRows = shownRows.slice(pageStart, pageStart + pageSize);

  const paymentHistory = [...payments]
    .filter((p) => Number(p.amountReceived || 0) > 0)
    .sort((a, b) =>
      String(b.transactionDate || '').localeCompare(String(a.transactionDate || ''))
    )
    .slice(0, 8);

  const setField = (setter) => (key) => (e) => {
    setter((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(form.amount);
    if (!form.transactionDate || !form.particulars.trim() || !parsedAmount || parsedAmount <= 0) {
      setError('Enter a date, particulars and an amount greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await createDaybookEntry({
        transactionDate: form.transactionDate,
        category: form.category,
        particulars: form.particulars.trim(),
        paymentMode: form.paymentMode,
        type: form.type,
        amount: parsedAmount,
      });
      setEntries((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, particulars: '', amount: '' }));
      setShowEntryForm(false);
    } catch (err) {
      setError(err.message || 'Failed to add day book entry');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      transactionDate: entry.transactionDate || '',
      category: entry.category || DB_CATS[0],
      particulars: entry.particulars || '',
      paymentMode: entry.paymentMode || 'Cash',
      type: entry.type || 'out',
      amount: String(entry.amount ?? ''),
    });
    setError('');
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingEntry(null);
    setEditForm(emptyForm);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(editForm.amount);
    if (
      !editForm.transactionDate ||
      !editForm.particulars.trim() ||
      !parsedAmount ||
      parsedAmount <= 0
    ) {
      setError('Enter a date, particulars and an amount greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await updateDaybookEntry(editingEntry.id, {
        transactionDate: editForm.transactionDate,
        category: editForm.category,
        particulars: editForm.particulars.trim(),
        paymentMode: editForm.paymentMode,
        type: editForm.type,
        amount: parsedAmount,
      });
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      closeEdit();
    } catch (err) {
      setError(err.message || 'Failed to update day book entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete day book entry "${entry.daybookCode}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    try {
      await deleteDaybookEntry(entry.id);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err.message || 'Failed to delete day book entry');
    }
  };

  const headers = [
    { label: 'Ref' },
    { label: 'Date' },
    { label: 'Activity' },
    { label: 'Particulars' },
    { label: 'Mode' },
    { label: 'By' },
    { label: 'In', className: 'r' },
    { label: 'Out', className: 'r' },
    { label: 'Balance', className: 'r' },
    ...(canEdit ? [{ label: '', className: 'c' }] : []),
  ];

  const paymentHeaders = [
    { label: 'Receipt' },
    { label: 'Case no.' },
    { label: 'Party' },
    { label: 'Received', className: 'r' },
    { label: 'Date' },
    { label: 'Status' },
  ];

  return (
    <>
      <PageHeader
        title="Day Book"
        description="The office day book — party meetings, court and field visits, and every rupee in or out."
      />

      <div className="kpis">
        <KPICard
          label="Received"
          value={inr(totalIn)}
          status="this month"
          type="b"
          valueStyle={{ fontSize: '20px' }}
        />
        <KPICard
          label="Paid out"
          value={inr(totalOut)}
          status="this month"
          type="t"
          valueStyle={{ fontSize: '20px' }}
        />
        <KPICard
          label="Balance"
          value={inr(totalIn - totalOut)}
          status={`as on ${TODAY}`}
          valueStyle={{ fontSize: '20px' }}
        />
        <KPICard label="Entries" value={sortedRows.length} status="recorded" />
      </div>

      {canEdit && !showEntryForm && (
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={() => setShowEntryForm(true)}>
            Add Entry
          </button>
        </div>
      )}



      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search day book</label>
            <input
              type="text"
              placeholder="Ref, particulars, activity, mode…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        <button
          type="button"
          className={filter === 'all' ? 'on' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {DB_CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={filter === c ? 'on' : ''}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="filt">
        {[
          { key: 'all', label: 'All movements' },
          { key: 'in', label: 'Received' },
          { key: 'out', label: 'Paid out' },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={typeFilter === btn.key ? 'on' : ''}
            onClick={() => setTypeFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isEditOpen && !showEntryForm && (
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
              <div className="empty">Loading day book…</div>
            </td>
          </tr>
        ) : pagedRows.length ? (
          pagedRows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="cno-c">{r.daybookCode}</span>
              </td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {formatDisplayDate(r.transactionDate)}
              </td>
              <td>
                <Chip
                  type={r.type === 'in' ? 'c-baize' : 'c-grey'}
                  label={r.category}
                />
              </td>
              <td>
                <span className="nm" style={{ fontSize: '13px' }}>
                  {r.particulars}
                </span>
              </td>
              <td className="mut">{r.paymentMode}</td>
              <td className="mut" style={{ fontSize: '11.5px' }}>
                {r.recorder?.name || '—'}
              </td>
              <td className="r mono" style={{ color: 'var(--baize)' }}>
                {r.type === 'in' ? inr(Number(r.amount)) : ''}
              </td>
              <td className="r mono" style={{ color: 'var(--tape)' }}>
                {r.type === 'out' ? inr(Number(r.amount)) : ''}
              </td>
              <td className="r mono" style={{ fontWeight: 600 }}>
                {inr(runningBalances[r.id])}
              </td>
              {canEdit && (
                <td className="c" style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn g sm"
                    onClick={() => openEdit(r)}
                    style={{ marginRight: '6px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleDelete(r)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--tape)',
                      color: 'var(--tape)',
                    }}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">Nothing recorded under this activity yet.</div>
            </td>
          </tr>
        )}
      </DataTable>

      {!loading && shownRows.length > 0 && (
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
              entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, shownRows.length)} of {shownRows.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn g sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button type="button" className="btn g sm" disabled style={{ cursor: 'default' }}>
              {currentPage} / {totalPages}
            </button>
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



      <Modal isOpen={isEditOpen} onClose={closeEdit} title="Edit Day Book Entry">
        <form
          onSubmit={handleEditSubmit}
          className="fgrid"
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
          {error && isEditOpen && (
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
            <label>Date</label>
            <input
              type="date"
              value={editForm.transactionDate}
              onChange={setField(setEditForm)('transactionDate')}
              required
            />
          </div>
          <div className="f">
            <label>Activity</label>
            <select
              value={editForm.category}
              onChange={setField(setEditForm)('category')}
            >
              {DB_CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Particulars</label>
            <input
              type="text"
              value={editForm.particulars}
              onChange={setField(setEditForm)('particulars')}
              required
            />
          </div>
          <div className="f">
            <label>Mode</label>
            <select
              value={editForm.paymentMode}
              onChange={setField(setEditForm)('paymentMode')}
            >
              <option>Cash</option>
              <option>Bank</option>
              <option>UPI</option>
              <option>Cheque</option>
            </select>
          </div>
          <div className="f">
            <label>In / Out</label>
            <select value={editForm.type} onChange={setField(setEditForm)('type')}>
              <option value="out">Paid out</option>
              <option value="in">Received</option>
            </select>
          </div>
          <div className="f">
            <label>Amount</label>
            <input
              type="number"
              className="mono"
              min="0"
              step="0.01"
              value={editForm.amount}
              onChange={setField(setEditForm)('amount')}
              required
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeEdit} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEntryForm && canEdit} onClose={() => setShowEntryForm(false)} title="Record a day book entry">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="fgrid"
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
          {error && showEntryForm && (
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
            <label>Date</label>
            <input
              type="date"
              value={form.transactionDate}
              onChange={setField(setForm)('transactionDate')}
              required
            />
          </div>
          <div className="f">
            <label>Activity</label>
            <select
              value={form.category}
              onChange={setField(setForm)('category')}
            >
              {DB_CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Particulars</label>
            <input
              type="text"
              value={form.particulars}
              onChange={setField(setForm)('particulars')}
              required
            />
          </div>
          <div className="f">
            <label>Mode</label>
            <select
              value={form.paymentMode}
              onChange={setField(setForm)('paymentMode')}
            >
              <option>Cash</option>
              <option>Bank</option>
              <option>UPI</option>
              <option>Cheque</option>
            </select>
          </div>
          <div className="f">
            <label>In / Out</label>
            <select value={form.type} onChange={setField(setForm)('type')}>
              <option value="out">Paid out</option>
              <option value="in">Received</option>
            </select>
          </div>
          <div className="f">
            <label>Amount</label>
            <input
              type="number"
              className="mono"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={setField(setForm)('amount')}
              required
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={() => setShowEntryForm(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
