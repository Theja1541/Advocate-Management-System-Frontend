import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import {
  getAmendments,
  createAmendment,
  updateAmendment,
  deleteAmendment,
  importAmendments,
} from '../services/actService';

const emptyForm = {
  sourceAct: '',
  targetAct: '',
  oldSection: '',
  oldTitle: '',
  newSection: '',
  newTitle: '',
  effectiveDate: '2024-07-01',
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Amend() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('acts', 'E');
  const { showToast } = useToast();

  const PAGE_SIZE = 10;

  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Custom filters
  const [sourceFilter, setSourceFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmendment, setEditingAmendment] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAmendments({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: query.trim() || undefined,
        sourceAct: sourceFilter.trim() || undefined,
        targetAct: targetFilter.trim() || undefined,
        effectiveDate: dateFilter || undefined,
      });
      setAmendments(res.amendments || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to load amendments');
    } finally {
      setLoading(false);
    }
  }, [page, query, sourceFilter, targetFilter, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter, targetFilter, dateFilter]);

  const groupAmendments = (amendmentList) => {
    const groups = new Map();
    amendmentList.forEach((row) => {
      const key = `${row.sourceAct} → ${row.targetAct}`;
      if (!groups.has(key)) {
        groups.set(key, {
          g: key,
          effectiveDate: row.effectiveDate,
          rows: [],
        });
      }
      groups.get(key).rows.push([
        row.oldSection,
        row.oldTitle,
        row.newSection,
        row.newTitle,
        row.id,
        row.creator?.name || row.createdBy || 'Admin',
        row.updater?.name || row.updatedBy || 'Admin',
        row.createdAt,
        row.updatedAt
      ]);
    });
    return Array.from(groups.values());
  };

  const getFilteredBlocks = () => {
    // Since search filter matches server-side query, group directly
    return groupAmendments(amendments);
  };

  const filteredBlocks = getFilteredBlocks();

  const formatHeaderDate = (dateStr) => {
    if (!dateStr) return '01 JULY 2024';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(dateStr).toUpperCase();
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  };

  const openAddModal = () => {
    setEditingAmendment(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const openEditModal = (amendItem) => {
    setEditingAmendment(amendItem);
    setForm({
      sourceAct: amendItem.sourceAct || '',
      targetAct: amendItem.targetAct || '',
      oldSection: amendItem.oldSection || '',
      oldTitle: amendItem.oldTitle || '',
      newSection: amendItem.newSection || '',
      newTitle: amendItem.newTitle || '',
      effectiveDate: amendItem.effectiveDate || '2024-07-01',
    });
    setError('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAmendment(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    // Clear validation error when editing field
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Comprehensive client-side validations
    const errors = {};
    let hasErrors = false;

    if (!form.sourceAct.trim()) {
      errors.sourceAct = 'Source Act is required.';
      hasErrors = true;
    }
    if (!form.targetAct.trim()) {
      errors.targetAct = 'Target Act is required.';
      hasErrors = true;
    }
    if (!form.oldSection.trim()) {
      errors.oldSection = 'Old Section is required.';
      hasErrors = true;
    }
    if (!form.oldTitle.trim()) {
      errors.oldTitle = 'Old Title is required.';
      hasErrors = true;
    }
    if (!form.newSection.trim()) {
      errors.newSection = 'New Section is required.';
      hasErrors = true;
    }
    if (!form.newTitle.trim()) {
      errors.newTitle = 'New Title is required.';
      hasErrors = true;
    }
    if (form.effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveDate)) {
      errors.effectiveDate = 'Date must be in YYYY-MM-DD format.';
      hasErrors = true;
    }

    // Check duplicate mapping locally
    const duplicate = amendments.find(
      (item) =>
        (editingAmendment ? item.id !== editingAmendment.id : true) &&
        item.sourceAct.trim().toLowerCase() === form.sourceAct.trim().toLowerCase() &&
        item.targetAct.trim().toLowerCase() === form.targetAct.trim().toLowerCase() &&
        item.oldSection.trim().toLowerCase() === form.oldSection.trim().toLowerCase() &&
        item.newSection.trim().toLowerCase() === form.newSection.trim().toLowerCase()
    );

    if (duplicate) {
      errors.newSection = 'An amendment mapping with these exact section relationships already exists.';
      hasErrors = true;
    }

    if (hasErrors) {
      setFormErrors(errors);
      setError('Please resolve all validation errors before saving.');
      return;
    }

    setSaving(true);
    setError('');
    setFormErrors({});

    const payload = {
      sourceAct: form.sourceAct.trim(),
      targetAct: form.targetAct.trim(),
      oldSection: form.oldSection.trim(),
      oldTitle: form.oldTitle.trim(),
      newSection: form.newSection.trim(),
      newTitle: form.newTitle.trim(),
      effectiveDate: form.effectiveDate || undefined,
    };

    try {
      if (editingAmendment) {
        const updated = await updateAmendment(editingAmendment.id, payload);
        setAmendments((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        showToast('Amendment mapping updated successfully!', 'success');
      } else {
        const created = await createAmendment(payload);
        setAmendments((prev) => [...prev, created]);
        showToast('Amendment mapping created successfully!', 'success');
      }
      closeModal();
    } catch (err) {
      const msg = err.message || 'Failed to save amendment mapping';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, oldSec, newSec) => {
    setDeleteConfirmTarget({ id, oldSec, newSec });
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setSaving(true);
    setError('');
    try {
      const res = await importAmendments(file);
      const msg = `Import complete: ${res.imported} imported, ${res.duplicates} duplicates skipped.`;
      if (res.errors && res.errors.length) {
        showToast(`${msg} (${res.errors.length} rows failed).`, 'warning');
        setError(`Failed rows:\n${res.errors.join('\n')}`);
      } else {
        showToast(msg, 'success');
      }
      loadData();
    } catch (err) {
      const msg = err.message || 'Import failed.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = async () => {
    setSaving(true);
    try {
      const res = await getAmendments({
        search: query.trim() || undefined,
        sourceAct: sourceFilter.trim() || undefined,
        targetAct: targetFilter.trim() || undefined,
        effectiveDate: dateFilter || undefined,
      });

      const list = res.amendments || res;
      if (!list || !list.length) {
        showToast('No data to export.', 'warning');
        return;
      }

      const headers = ['Source Act', 'Target Act', 'Old Section', 'Old Title', 'New Section', 'New Title', 'Effective Date'];
      const rows = list.map(r => [
        `"${(r.sourceAct || '').replace(/"/g, '""')}"`,
        `"${(r.targetAct || '').replace(/"/g, '""')}"`,
        `"${(r.oldSection || '').replace(/"/g, '""')}"`,
        `"${(r.oldTitle || '').replace(/"/g, '""')}"`,
        `"${(r.newSection || '').replace(/"/g, '""')}"`,
        `"${(r.newTitle || '').replace(/"/g, '""')}"`,
        `"${(r.effectiveDate || '').split('T')[0]}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `amendments-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showToast('Exported CSV successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteAmendment(deleteConfirmTarget.id);
      setAmendments((prev) => prev.filter((item) => item.id !== deleteConfirmTarget.id));
      showToast('Amendment mapping deleted successfully!', 'success');
      setDeleteConfirmTarget(null);
    } catch (err) {
      const msg = err.message || 'Failed to delete amendment mapping';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Amendment Tracker"
        description="Old law to new — section-by-section, with the date the change took effect."
        actions={
          canEdit && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn primary" onClick={openAddModal} disabled={loading || saving}>
                Add Mapping
              </button>
            </div>
          )
        }
      />

      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(37,99,235,0.1) 100%)', 
        border: '1px solid rgba(37,99,235,0.2)', 
        borderRadius: '12px', 
        padding: '24px',
        marginBottom: '24px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>Three codes replaced on 1 July 2024</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              IPC → BNS &nbsp;·&nbsp; CrPC → BNSS &nbsp;·&nbsp; EVIDENCE ACT → BSA
            </div>
          </div>
        </div>
        <div className="fgrid">
          <div className="f" style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by section number (e.g. 302, 65B) or keyword (e.g. cheating)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px 12px 42px', 
                  fontSize: '15px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  background: '#fff'
                }}
              />
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Advanced Filters</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn outline sm" onClick={handleExportCSV} disabled={loading || saving}>Export CSV</button>
            <button type="button" className="btn outline sm" onClick={() => window.print()} disabled={loading || saving}>Print / PDF</button>
            <button type="button" className="btn primary sm" onClick={() => { setSourceFilter(''); setTargetFilter(''); setDateFilter(''); }} disabled={loading}>Reset Filters</button>
          </div>
        </div>
        <div className="fgrid">
          <div className="f" style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Source Act (Old)</label>
            <input type="text" placeholder="e.g. Indian Penal Code, 1860" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }} />
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Target Act (New)</label>
            <input type="text" placeholder="e.g. Bharatiya Nyaya Sanhita, 2023" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }} />
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Effective Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }} />
          </div>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: '12px', padding: '16px' }}>
          {error}
        </div>
      )}

      <div id="amWrap" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {loading ? (
          <div className="card mut" style={{ textAlign: 'center', padding: '48px', borderRadius: '12px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: '28px', height: '28px', borderWidth: '3px' }}></div>
            Loading amendments…
          </div>
        ) : filteredBlocks.length ? (
          filteredBlocks.map((g, gi) => (
            <div key={gi} style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--background)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  {g.g}
                </div>
                <div className="chip c-grey" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>EFFECTIVE {formatHeaderDate(g.effectiveDate)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {g.rows.map((r, ri) => (
                  <div key={ri} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '20px',
                    borderBottom: ri === g.rows.length - 1 ? 'none' : '1px solid var(--border)',
                    transition: 'background 200ms ease',
                  }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '240px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--danger)' }}></div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>Section {r[0]}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r[1]}</div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '0 8px' }}>
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: '240px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--success)' }}></div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>Section {r[2]}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r[3]}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '24px', minWidth: '120px' }}>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <button
                            type="button"
                            className="btn secondary sm"
                            disabled={loading || saving}
                            onClick={() => openEditModal({
                              id: r[4], sourceAct: g.g.split(' → ')[0], targetAct: g.g.split(' → ')[1],
                              oldSection: r[0], oldTitle: r[1], newSection: r[2], newTitle: r[3], effectiveDate: g.effectiveDate
                            })}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn danger sm"
                            style={{ background: 'transparent', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                            disabled={loading || saving}
                            onClick={() => handleDelete(r[4], r[0], r[2])}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {canEdit && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textAlign: 'right', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
                          Updated by <b style={{ color: 'var(--text-primary)' }}>{r[6]}</b><br/>{formatDateTime(r[8])?.split(',')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="card empty-state" style={{ padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'transparent' }}>
            <svg width="48" height="48" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No amendments found</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Try adjusting your search or filters to find what you're looking for.</div>
          </div>
        )}
      </div>

      {!loading && totalCount > 0 && (
        <div className="tbl-foot" style={{ marginTop: '16.5px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
          <div className="mut" style={{ fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </div>
          <div className="pager" style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn g sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn g sm"
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAmendment ? 'Edit Amendment Mapping' : 'Add Amendment Mapping'}
      >
        <form onSubmit={handleSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '8px' }}>
              {error}
            </div>
          )}

          <div className="fgrid">
            <div className="f">
              <label>Source Act (Old)</label>
              <input
                type="text"
                placeholder="e.g. Indian Penal Code, 1860"
                value={form.sourceAct}
                onChange={setField('sourceAct')}
                required
              />
              {formErrors.sourceAct && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.sourceAct}</span>}
            </div>
            <div className="f">
              <label>Target Act (New)</label>
              <input
                type="text"
                placeholder="e.g. Bharatiya Nyaya Sanhita, 2023"
                value={form.targetAct}
                onChange={setField('targetAct')}
                required
              />
              {formErrors.targetAct && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.targetAct}</span>}
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '10px' }}>
            <div className="f">
              <label>Old Section Number</label>
              <input
                type="text"
                placeholder="e.g. 302"
                value={form.oldSection}
                onChange={setField('oldSection')}
                required
              />
              {formErrors.oldSection && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.oldSection}</span>}
            </div>
            <div className="f">
              <label>Old Section Title</label>
              <input
                type="text"
                placeholder="e.g. Punishment for murder"
                value={form.oldTitle}
                onChange={setField('oldTitle')}
                required
              />
              {formErrors.oldTitle && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.oldTitle}</span>}
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '10px' }}>
            <div className="f">
              <label>New Section Number</label>
              <input
                type="text"
                placeholder="e.g. 103"
                value={form.newSection}
                onChange={setField('newSection')}
                required
              />
              {formErrors.newSection && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.newSection}</span>}
            </div>
            <div className="f">
              <label>New Section Title</label>
              <input
                type="text"
                placeholder="e.g. Murder"
                value={form.newTitle}
                onChange={setField('newTitle')}
                required
              />
              {formErrors.newTitle && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.newTitle}</span>}
            </div>
          </div>

          <div className="f" style={{ marginTop: '10px' }}>
            <label>Effective Date</label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={setField('effectiveDate')}
            />
            {formErrors.effectiveDate && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.effectiveDate}</span>}
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
        isOpen={deleteConfirmTarget !== null}
        onClose={() => setDeleteConfirmTarget(null)}
        title="Confirm Deletion"
      >
        <div style={{ padding: '10px 0' }}>
          <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
            Are you sure you want to delete the amendment mapping for <b>Section {deleteConfirmTarget?.oldSec} → Section {deleteConfirmTarget?.newSec}</b>?
          </p>
          <p className="mut" style={{ fontSize: '11.5px', marginTop: '6px' }}>
            This action is permanent and cannot be undone.
          </p>
        </div>
        <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
          <button type="button" className="btn g" onClick={() => setDeleteConfirmTarget(null)}>
            Cancel
          </button>
          <button type="button" className="btn" style={{ background: 'var(--tape)' }} onClick={executeDelete}>
            Delete
          </button>
        </div>
      </Modal>

      {/* Printable Area Layout */}
      <div className="print-area" style={{ display: 'none', padding: '20px' }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: '24px', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '20px' }}>
          Advocate Management System — Amendment Tracker Report
        </h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #000', textAlign: 'left', fontWeight: 'bold' }}>
              <th style={{ padding: '8px' }}>Source Act (Old)</th>
              <th style={{ padding: '8px' }}>Old Section</th>
              <th style={{ padding: '8px' }}>Old Title</th>
              <th style={{ padding: '8px' }}>Target Act (New)</th>
              <th style={{ padding: '8px' }}>New Section</th>
              <th style={{ padding: '8px' }}>New Title</th>
              <th style={{ padding: '8px' }}>Effective Date</th>
            </tr>
          </thead>
          <tbody>
            {amendments.map((r, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px' }}>{r.sourceAct}</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>Section {r.oldSection}</td>
                <td style={{ padding: '8px' }}>{r.oldTitle}</td>
                <td style={{ padding: '8px' }}>{r.targetAct}</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>Section {r.newSection}</td>
                <td style={{ padding: '8px' }}>{r.newTitle}</td>
                <td style={{ padding: '8px' }}>{r.effectiveDate ? r.effectiveDate.split('T')[0] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
