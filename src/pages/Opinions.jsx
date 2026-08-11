import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getOpinions,
  createOpinion,
  updateOpinion,
  deleteOpinion,
  submitOpinionForReview,
  approveOpinion,
  rejectOpinion,
  issueOpinion,
} from '../services/opinionService';
import { downloadDocument, previewDocument } from '../services/documentService';
import { getClients } from '../services/clientService';
import { getAdvocates } from '../services/advocateService';
import { getLands } from '../services/landService';
import { useSmartText } from '../hooks/useSmartText';
import SmartTextGroupModal from '../components/ui/SmartTextGroupModal';
import SmartTextContextPanel from '../components/ui/SmartTextContextPanel';

const OP_TYPES = [
  'Title Search Opinion',
  'Title Scrutiny Opinion',
  'Bank Title Opinion',
  'Assigned Land Opinion',
  'Succession Opinion',
];

const TIS = {
  clear: ['Clear title', 'c-baize'],
  disputed: ['Disputed', 'c-tape'],
  under_scrutiny: ['Under scrutiny', 'c-brass'],
};

const STATUS_BADGES = {
  draft: ['Draft', 'c-grey'],
  pending_review: ['Pending Review', 'c-brass'],
  approved: ['Approved', 'c-baize'],
  rejected: ['Rejected', 'c-tape'],
  issued: ['Issued', 'c-ink'],
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  referenceNo: '',
  clientId: '',
  landId: '',
  surveyNo: '',
  village: '',
  opinionType: OP_TYPES[0],
  issueDate: todayISO(),
  titleStatus: 'clear',
  advocateId: '',
  findingsNote: '',
};

export default function Opinions() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('opinions', 'E');

  const [opinions, setOpinions] = useState([]);
  const [clients, setClients] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [lands, setLands] = useState([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ id: null, rejectReason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpinion, setEditingOpinion] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const {
    searchQuery: smartSearchQuery,
    searchResults: smartSearchResults,
    isGroupModalOpen: isSmartGroupModalOpen,
    handleSaveIntercept: handleSmartSaveIntercept,
    onGroupChoice: onSmartGroupChoice,
    onIndependentChoice: onSmartIndependentChoice,
    onCancelModal: onSmartCancelModal,
    performGrouping: performSmartGrouping,
    performAppend: performSmartAppend
  } = useSmartText('Opinion', form.findingsNote, !!editingOpinion);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [opinionsResult, clientsResult, advocatesResult, landsResult] = await Promise.allSettled([
        getOpinions(),
        getClients(),
        getAdvocates(),
        getLands(),
      ]);

      if (opinionsResult.status === 'rejected') {
        throw opinionsResult.reason;
      }

      setOpinions(opinionsResult.value || []);
      setClients(clientsResult.status === 'fulfilled' ? clientsResult.value || [] : []);
      setAdvocates(advocatesResult.status === 'fulfilled' ? advocatesResult.value || [] : []);
      setLands(landsResult.status === 'fulfilled' ? landsResult.value || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load opinions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getClientName = (o) =>
    o?.client?.name ||
    clients.find((c) => String(c.id) === String(o.clientId))?.name ||
    '—';

  const getAdvocateName = (o) =>
    o?.advocate?.name ||
    advocates.find((a) => String(a.id) === String(o.advocateId))?.name ||
    '—';

  const q = query.trim().toLowerCase();
  const filtered = opinions.filter((o) => {
    if (filter !== 'all' && o.titleStatus !== filter) return false;
    if (!q) return true;
    const haystack = [
      o.referenceNo,
      getClientName(o),
      o.surveyNo,
      o.village,
      o.opinionType,
      getAdvocateName(o),
      o.findingsNote,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const clearCount = opinions.filter((o) => o.titleStatus === 'clear').length;
  const adverseCount = opinions.filter((o) => o.titleStatus === 'disputed').length;
  const scrutinyCount = opinions.filter((o) => o.titleStatus === 'under_scrutiny').length;

  const openAddModal = () => {
    setEditingOpinion(null);
    setForm({
      ...emptyForm,
      issueDate: todayISO(),
      clientId: clients[0] ? String(clients[0].id) : '',
      advocateId: advocates[0] ? String(advocates[0].id) : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (o) => {
    setEditingOpinion(o);
    setForm({
      referenceNo: o.referenceNo || '',
      clientId: o.clientId != null ? String(o.clientId) : '',
      landId: o.landId != null ? String(o.landId) : '',
      surveyNo: o.surveyNo || '',
      village: o.village || '',
      opinionType: o.opinionType || OP_TYPES[0],
      issueDate: o.issueDate || todayISO(),
      titleStatus: o.titleStatus || 'clear',
      advocateId: o.advocateId != null ? String(o.advocateId) : '',
      findingsNote: o.findingsNote || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOpinion(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    handleSmartSaveIntercept(async (groupingInfo) => {
      if (groupingInfo && groupingInfo.isAppended) {
        setSaving(true);
        setError('');
        try {
          await performSmartAppend(form.findingsNote.trim(), groupingInfo);
          alert('Appended to existing text successfully!');
          loadData();
          closeModal();
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Failed to append text');
        } finally {
          setSaving(false);
        }
        return;
      }

      if (
        !form.referenceNo ||
        !form.surveyNo ||
        !form.village ||
        !form.findingsNote ||
        !form.clientId ||
        !form.advocateId
      ) {
        setError('Please fill out all required fields.');
        return;
      }
      setSaving(true);
      setError('');
      const payload = {
        referenceNo: form.referenceNo.trim(),
        clientId: Number(form.clientId),
        surveyNo: form.surveyNo.trim(),
        village: form.village.trim(),
        opinionType: form.opinionType,
        issueDate: form.issueDate,
        titleStatus: form.titleStatus,
        advocateId: Number(form.advocateId),
        landId: form.landId ? Number(form.landId) : null,
        findingsNote: form.findingsNote.trim(),
      };

      try {
        let savedOpinionId;
        if (editingOpinion) {
          const updated = await updateOpinion(editingOpinion.id, payload);
          savedOpinionId = editingOpinion.id;
          setOpinions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } else {
          const created = await createOpinion(payload);
          savedOpinionId = created.id || created.data?.id;
          setOpinions((prev) => [...prev, created]);
        }

        if (groupingInfo && savedOpinionId) {
          await performSmartGrouping(savedOpinionId, groupingInfo);
        }

        closeModal();
      } catch (err) {
        setError(err.message || 'Failed to save opinion');
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`Delete opinion ${o.referenceNo}?`)) return;
    setError('');
    try {
      await deleteOpinion(o.id);
      setOpinions((prev) => prev.filter((item) => item.id !== o.id));
    } catch (err) {
      setError(err.message || 'Failed to delete opinion');
    }
  };

  const handleWorkflowSubmit = async (id) => {
    if (!window.confirm('Submit this opinion for supervisor review?')) return;
    setError('');
    try {
      const updated = await submitOpinionForReview(id);
      setOpinions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err.message || 'Failed to submit opinion for review');
    }
  };

  const handleWorkflowApprove = async (id) => {
    if (!window.confirm('Approve this legal opinion?')) return;
    setError('');
    try {
      const updated = await approveOpinion(id);
      setOpinions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err.message || 'Failed to approve opinion');
    }
  };

  const handleWorkflowRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectForm.rejectReason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    setError('');
    try {
      const updated = await rejectOpinion(rejectForm.id, rejectForm.rejectReason.trim());
      setOpinions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setIsRejectModalOpen(false);
      setRejectForm({ id: null, rejectReason: '' });
    } catch (err) {
      alert(err.message || 'Failed to reject opinion');
    }
  };

  const handleWorkflowIssue = async (id) => {
    if (!window.confirm('Issue this approved opinion? This action is permanent and locks the record.')) return;
    setError('');
    try {
      const updated = await issueOpinion(id);
      setOpinions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err.message || 'Failed to issue opinion');
    }
  };

  const handleViewCertificate = async (documentId, name) => {
    setError('');
    try {
      const blob = await previewDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke after a short delay to let the tab open
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert(err.message || 'Failed to open certificate');
    }
  };

  const handleDownloadCertificate = async (documentId, name) => {
    setError('');
    try {
      await downloadDocument(documentId, name || 'legal-opinion-certificate.pdf');
    } catch (err) {
      alert(err.message || 'Failed to download certificate');
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'clear', label: 'Clear' },
    { key: 'under_scrutiny', label: 'Under scrutiny' },
    { key: 'disputed', label: 'Adverse' },
  ];

  return (
    <>
      <PageHeader
        title="Legal Opinions"
        description="Title opinions issued to clients and banks — the finding, the reasoning and the land it concerns."
        actions={
          canEdit ? (
            <button className="btn primary" onClick={openAddModal} disabled={!clients.length || !advocates.length}>
              Draft opinion
            </button>
          ) : null
        }
      />

      <div className="card" style={{ 
        backgroundColor: 'rgba(37, 99, 235, 0.04)', 
        borderColor: 'rgba(37, 99, 235, 0.15)', 
        padding: '16px 20px', 
        marginBottom: '20px', 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'flex-start' 
      }}>
        <div style={{
          background: 'var(--primary)',
          color: '#fff',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 'bold',
          fontSize: '15px'
        }}>?</div>
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>Why is this module here?</h4>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'var(--muted)' }}>
            Before purchasing land or sanctioning a bank loan, purchasers/banks require a certified legal examination of property link records. Advocates use this page to draft and register formal <strong>Title Search Scrutiny Opinions</strong>. It catalogs whether a specific survey number is marketable (Clear), undergoing court litigation (Adverse), or awaiting verify validation (Scrutiny).
          </p>
        </div>
      </div>

      <div className="kpis">
        <KPICard label="Opinions issued" value={opinions.length} status="on file" />
        <KPICard label="Clear" value={clearCount} status="fit to proceed" type="b" />
        <KPICard label="Adverse" value={adverseCount} status="not marketable" type="t" />
        <KPICard label="Under scrutiny" value={scrutinyCount} status="awaiting documents" type="r" />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search opinions</label>
            <input
              type="text"
              placeholder="Reference, client, survey, village…"
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
          <div className="empty">Loading opinions…</div>
        </div>
      ) : filtered.length ? (
        filtered.map((o) => (
          <div
            key={o.id}
            className="card"
            style={{
              borderLeft: `3px solid var(--${o.titleStatus === 'clear' ? 'baize' : o.titleStatus === 'disputed' ? 'tape' : 'brass'})`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '230px' }}>
                <div className="cno-c">{o.referenceNo}</div>
                <div className="card-t ser" style={{ margin: '3px 0', fontSize: '15px' }}>
                  {getClientName(o)}
                </div>
                <div className="mut" style={{ fontSize: '11.5px' }}>
                  Sy. {o.surveyNo}, {o.village} &nbsp;·&nbsp; {getAdvocateName(o)} &nbsp;·&nbsp; issued{' '}
                  {formatDate(o.issueDate)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Chip type="c-ink" label={o.opinionType} />
                <div style={{ marginTop: '5px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <Chip type={STATUS_BADGES[o.status]?.[1] || 'c-grey'} label={STATUS_BADGES[o.status]?.[0] || o.status} />
                  <Chip type={TIS[o.titleStatus]?.[1] || 'c-grey'} label={TIS[o.titleStatus]?.[0] || o.titleStatus} />
                </div>
              </div>
            </div>
            <p
              className="ser"
              style={{
                fontSize: '13.5px',
                lineHeight: 1.65,
                margin: '11px 0 0',
                borderTop: '1px dashed var(--rule)',
                paddingTop: '10px',
              }}
            >
              {o.findingsNote}
            </p>
            {o.status === 'rejected' && o.rejectReason && (
              <div style={{ margin: '8px 0 0', padding: '8px 12px', background: 'rgba(235, 94, 85, 0.08)', border: '1px solid var(--tape)', borderRadius: '5px', fontSize: '12.5px', color: 'var(--tape)' }}>
                <strong>Rejection Reason:</strong> {o.rejectReason}
              </div>
            )}

            {(o.status === 'approved' || o.status === 'issued') && (o.approver || o.issuer) && (
              <div className="mut" style={{ margin: '8px 0 0', fontSize: '11px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {o.approver && <span>Approved by: <strong>{o.approver.name}</strong> ({formatDate(o.approvalDate)})</span>}
                {o.issuer && <span>Issued by: <strong>{o.issuer.name}</strong> ({formatDate(o.issueDate)})</span>}
              </div>
            )}

            {canEdit && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '11px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(o.status === 'draft' || o.status === 'rejected') && (
                  <>
                    <button type="button" className="btn g sm" onClick={() => openEditModal(o)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleDelete(o)}
                      style={{ background: 'transparent', border: '1px solid var(--tape)', color: 'var(--tape)' }}
                    >
                      Delete
                    </button>
                    <button type="button" className="btn primary sm" onClick={() => handleWorkflowSubmit(o.id)}>
                      Submit for Review
                    </button>
                  </>
                )}

                {o.status === 'pending_review' && (
                  <>
                    <button type="button" className="btn primary sm" onClick={() => handleWorkflowApprove(o.id)}>
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        setRejectForm({ id: o.id, rejectReason: '' });
                        setIsRejectModalOpen(true);
                      }}
                      style={{ background: 'transparent', border: '1px solid var(--tape)', color: 'var(--tape)' }}
                    >
                      Reject
                    </button>
                  </>
                )}

                {o.status === 'approved' && (
                  <button type="button" className="btn primary sm" onClick={() => handleWorkflowIssue(o.id)}>
                    Issue Final Opinion
                  </button>
                )}

                {o.status === 'issued' && (
                  <>
                    {o.finalPdf && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'rgba(37, 99, 235, 0.05)',
                        border: '1px solid rgba(37, 99, 235, 0.18)',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        color: 'var(--muted)',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <strong style={{ color: 'var(--ink)' }}>{o.finalPdf.name}</strong>
                        </span>
                        {o.finalPdf.fileSize && (
                          <span>{o.finalPdf.fileSize}</span>
                        )}
                        {o.finalPdf.uploadDate && (
                          <span>Stored: {formatDate(o.finalPdf.uploadDate)}</span>
                        )}
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            className="btn g sm"
                            onClick={() => handleViewCertificate(o.finalPdf.id, o.finalPdf.name)}
                          >
                            View Certificate
                          </button>
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() => handleDownloadCertificate(o.finalPdf.id, o.finalPdf.name)}
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    )}
                    {!o.finalPdf && (
                      <span className="mut" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                        Permanently issued &amp; locked. Certificate pending.
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="card">
          <div className="empty">No opinions match the current filters.</div>
        </div>
      )}

      <div className="card">
        <div className="card-t">Opinion types in use</div>
        <div className="card-s">TEMPLATES AVAILABLE WHEN DRAFTING</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {OP_TYPES.map((t) => (
            <Chip key={t} type="c-brass" label={t} />
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingOpinion ? 'Edit Legal Opinion' : 'Draft Legal Opinion'}>
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
            <label>Reference ID</label>
            <input type="text" placeholder="e.g. OP-2026/023" value={form.referenceNo} onChange={setField('referenceNo')} required />
          </div>
          <div className="f">
            <label>Client</label>
            <select value={form.clientId} onChange={setField('clientId')} required>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Link Property Asset (Land Record)</label>
            <select
              value={form.landId}
              onChange={(e) => {
                const lid = e.target.value;
                const matchedLand = lands.find(l => String(l.id) === String(lid));
                setForm(p => ({
                  ...p,
                  landId: lid,
                  surveyNo: matchedLand ? matchedLand.surveyNo : '',
                  village: matchedLand ? matchedLand.village : ''
                }));
              }}
              required
            >
              <option value="">Select property asset...</option>
              {lands.map((l) => (
                <option key={l.id} value={l.id}>
                  Sy. {l.surveyNo} ({l.village}) - Patta {l.pattaNo}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Survey Number (Auto-populated)</label>
            <input type="text" value={form.surveyNo} disabled style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }} required />
          </div>
          <div className="f">
            <label>Village (Auto-populated)</label>
            <input type="text" value={form.village} disabled style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }} required />
          </div>
          <div className="f">
            <label>Opinion Type</label>
            <select value={form.opinionType} onChange={setField('opinionType')}>
              {OP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Issue date</label>
            <input type="date" value={form.issueDate} onChange={setField('issueDate')} required />
          </div>
          <div className="f">
            <label>Title Finding status</label>
            <select value={form.titleStatus} onChange={setField('titleStatus')}>
              {Object.entries(TIS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[0]}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Responsible Advocate</label>
            <select value={form.advocateId} onChange={setField('advocateId')} required>
              <option value="">Select advocate</option>
              {advocates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f" style={{ overflow: 'visible' }}>
            <label>Opinion Findings summary</label>
            <textarea
              placeholder="Summarize legal finding..."
              rows="4"
              value={form.findingsNote}
              onChange={setField('findingsNote')}
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
                resize: 'vertical',
                minHeight: '80px',
              }}
            />

          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : editingOpinion ? 'Save changes' : 'Draft Opinion'}
            </button>
          </div>
        </form>
      </Modal>

      <SmartTextGroupModal
        isOpen={isSmartGroupModalOpen}
        onClose={onSmartCancelModal}
        onGroup={onSmartGroupChoice}
        onIndependent={onSmartIndependentChoice}
        data={{ query: smartSearchQuery, occurrences: smartSearchResults?.occurrences, phraseGroup: smartSearchResults?.phraseGroup }}
      />

      {/* Rejection Confirmation Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Legal Opinion"
      >
        <form onSubmit={handleWorkflowRejectSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="f" style={{ marginBottom: '12px' }}>
            <label>Reason for Rejection</label>
            <textarea
              placeholder="e.g. Findings summary needs to include verification of secondary link document page 3..."
              value={rejectForm.rejectReason}
              onChange={(e) => setRejectForm(p => ({ ...p, rejectReason: e.target.value }))}
              rows="4"
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
                resize: 'vertical',
              }}
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn g" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" style={{ background: 'var(--tape)', borderColor: 'var(--tape)' }}>
              Reject Opinion
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
