import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import KPICard from '../components/ui/KPICard';
import SearchableSelect from '../components/ui/SearchableSelect';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { getCases, createCase, updateCase, deleteCase } from '../services/caseService';
import { getClients } from '../services/clientService';
import { getAdvocates } from '../services/advocateService';
import { getCaseTypes, getCaseStages, getCourts } from '../services/caseMastersService';

const PAGE_SIZE = 10;

const CST = {
  Active: ['Active', 'c-baize'],
  'Pending Approval': ['Pending Approval', 'c-brass'],
  Closed: ['Closed', 'c-grey'],
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'Pending Approval', label: 'Pending' },
  { key: 'Closed', label: 'Closed' },
];

const TITLE_META_SEP = ' :: ';
const TITLE_VS_SEP = ' — vs ';

const emptyForm = {
  caseNo: '',
  caseTypeId: '',
  clientId: '',
  opponent: '',
  courtId: '',
  advocateId: '',
  caseStageId: '',
  nextHearing: '',
  val: '',
  fee: '10',
  status: 'Pending Approval',
};

const buildTitle = ({ caseTypeName, opponent, stageName, val, fee }) =>
  `${caseTypeName.trim()}${TITLE_VS_SEP}${opponent.trim()}${TITLE_META_SEP}${stageName || 'Filing'}${TITLE_META_SEP}${val || 0}${TITLE_META_SEP}${fee || 10}`;

const parseTitle = (title = '') => {
  const [head = '', stage = 'Filing', val = '0', fee = '10'] = String(title).split(TITLE_META_SEP);
  let caseType = head;
  let opponent = '';
  const vsIdx = head.indexOf(TITLE_VS_SEP);
  if (vsIdx >= 0) {
    caseType = head.slice(0, vsIdx);
    opponent = head.slice(vsIdx + TITLE_VS_SEP.length);
  }
  return {
    caseType: caseType || title || '—',
    opponent: opponent || '—',
    stage: stage || 'Filing',
    val: Number(val) || 0,
    fee: Number(fee) || 0,
  };
};

const formatHearing = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Cases() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('cases', 'E');

  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [caseStages, setCaseStages] = useState([]);
  const [courts, setCourts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const newQuery = searchParams.get('search') || '';
    setQuery(newQuery);
  }, [searchParams]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewCase, setSelectedViewCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [caseList, clientList, advocateList, typeList, stageList, courtList] = await Promise.all([
        getCases(),
        getClients(),
        getAdvocates(),
        getCaseTypes(true),
        getCaseStages(true),
        getCourts(true),
      ]);
      setCases(caseList);
      setClients(clientList);
      setAdvocates(advocateList);
      setCaseTypes(typeList);
      setCaseStages(stageList);
      setCourts(courtList);
    } catch (err) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const getClientName = (id) => {
    const client = clients.find((c) => String(c.id) === String(id));
    return client ? client.name : id ? String(id) : '—';
  };

  const getAdvocateName = (id) => {
    const adv = advocates.find((a) => String(a.id) === String(id));
    return adv ? adv.name : id ? String(id) : '—';
  };

  const enrichedCases = useMemo(
    () => cases.map((c) => {
      const legacyParsed = parseTitle(c.title);
      return {
        ...c,
        opponent: legacyParsed.opponent,
        val: legacyParsed.val,
        fee: legacyParsed.fee,
        caseTypeDisplay: c.caseType?.name || legacyParsed.caseType,
        caseStageDisplay: c.currentStage?.name || legacyParsed.stage,
        caseStageColor: c.currentStage?.color || 'c-baize',
        courtDisplay: c.assignedCourt?.name || c.court || '—',
      };
    }),
    [cases]
  );

  const statusCounts = useMemo(() => {
    const counts = { all: enrichedCases.length, Active: 0, 'Pending Approval': 0, Closed: 0 };
    enrichedCases.forEach((c) => {
      if (counts[c.status] != null) counts[c.status] += 1;
    });
    return counts;
  }, [enrichedCases]);

  const q = query.trim().toLowerCase();
  const filteredCases = enrichedCases.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (!q) return true;
    const haystack = [
      c.caseNo,
      c.caseTypeDisplay,
      c.opponent,
      c.courtDisplay,
      c.caseStageDisplay,
      c.status,
      getClientName(c.clientId),
      getAdvocateName(c.advocateId),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedCases = filteredCases.slice(pageStart, pageStart + PAGE_SIZE);

  const headers = [
    { label: 'Case no.' },
    { label: 'Type' },
    { label: 'Parties' },
    { label: 'Court' },
    { label: 'Advocate' },
    { label: 'Stage' },
    { label: 'Next date' },
    { label: 'Suit value', className: 'r' },
    { label: 'Fee @%', className: 'r' },
    { label: 'Status' },
    ...(canEdit ? [{ label: 'Actions', className: 'c' }] : []),
  ];

  const openAddModal = () => {
    setEditingCase(null);
    setForm({
      ...emptyForm,
      clientId: '',
      advocateId: '',
      courtId: '',
      caseTypeId: '',
      caseStageId: caseStages[0]?.id || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCase(c);
    setForm({
      caseNo: c.caseNo || '',
      caseTypeId: c.caseTypeId != null ? String(c.caseTypeId) : '',
      clientId: c.clientId != null ? String(c.clientId) : '',
      opponent: c.opponent === '—' ? '' : c.opponent || '',
      courtId: c.courtId != null ? String(c.courtId) : '',
      advocateId: c.advocateId != null ? String(c.advocateId) : '',
      caseStageId: c.caseStageId != null ? String(c.caseStageId) : '',
      nextHearing: c.nextHearing || '',
      val: c.val ? String(c.val) : '',
      fee: c.fee ? String(c.fee) : '10',
      status: c.status || 'Pending Approval',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (c) => {
    setSelectedViewCase(c);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCase(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caseNo.trim() || !form.caseTypeId || !form.opponent.trim() || !form.val) {
      setError('Please fill out all required fields.');
      return;
    }
    if (!form.clientId || !form.advocateId) {
      setError('Please select a client and an advocate.');
      return;
    }

    setSaving(true);
    setError('');

    const selectedType = caseTypes.find(t => String(t.id) === String(form.caseTypeId));
    const selectedStage = caseStages.find(s => String(s.id) === String(form.caseStageId));
    const selectedCourt = courts.find(c => String(c.id) === String(form.courtId));

    const payload = {
      caseNo: form.caseNo.trim(),
      caseTypeId: Number(form.caseTypeId),
      caseStageId: form.caseStageId ? Number(form.caseStageId) : undefined,
      courtId: form.courtId ? Number(form.courtId) : undefined,
      court: selectedCourt ? selectedCourt.name : undefined,
      title: buildTitle({
        caseTypeName: selectedType ? selectedType.name : 'Unknown',
        opponent: form.opponent,
        stageName: selectedStage ? selectedStage.name : 'Filing',
        val: form.val,
        fee: form.fee,
      }),
      status: form.status || 'Pending Approval',
      nextHearing: form.nextHearing || undefined,
      clientId: Number(form.clientId),
      advocateId: Number(form.advocateId),
      approvalLevel: form.status === 'Pending Approval' ? 1 : form.status === 'Closed' ? 4 : 4,
    };

    try {
      if (editingCase) {
        const updated = await updateCase(editingCase.id, payload);
        setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCase({
          ...payload,
          status: 'Pending Approval',
          approvalLevel: 1,
        });
        setCases((prev) => [...prev, created]);
      }
      closeModal();
      // If we are editing from view modal, reload the viewing details card
      if (editingCase) {
        const enriched = {
          ...editingCase,
          ...payload,
          caseTypeDisplay: selectedType ? selectedType.name : editingCase.caseTypeDisplay,
          caseStageDisplay: selectedStage ? selectedStage.name : editingCase.caseStageDisplay,
          caseStageColor: selectedStage ? selectedStage.color : editingCase.caseStageColor,
          courtDisplay: selectedCourt ? selectedCourt.name : editingCase.courtDisplay,
        };
        setSelectedViewCase(enriched);
      }
    } catch (err) {
      setError(err.message || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    const confirmed = window.confirm(
      `Delete case "${c.caseNo}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteCase(c.id);
      setCases((prev) => prev.filter((item) => item.id !== c.id));
      if (selectedViewCase && selectedViewCase.id === c.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete case');
    }
  };

  const headerActions = canEdit ? (
    <button
      type="button"
      className="btn"
      onClick={openAddModal}
      disabled={!clients.length || !advocates.length}
    >
      Create civil case
    </button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Civil Cases"
        description="Matters lookup config flow — organised for chambers work."
        actions={headerActions}
      />

      <div className="kpis">
        <KPICard label="Total Matters" value={statusCounts.all} />
        <KPICard label="Active Cases" value={statusCounts.Active} status="issued" />
        <KPICard label="Pending Approval" value={statusCounts['Pending Approval']} status="warning" />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search cases</label>
            <input
              type="text"
              placeholder="Search case no., party, court, advocate…"
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
            className={filter === btn.key ? 'on' : ''}
            onClick={() => setFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {canEdit && (!clients.length || !advocates.length) && !loading && (
        <div className="card" style={{ borderColor: 'var(--brass)', color: 'var(--brass)', marginBottom: '14px' }}>
          Add at least one client and one advocate before creating a case.
        </div>
      )}

      <div className="tbl-card">
        <table className="t">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={h.className || ''}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="c">
                  <div className="empty">Loading cases…</div>
                </td>
              </tr>
            ) : pagedCases.length ? (
              pagedCases.map((c) => {
                const statusChip = CST[c.status] || ['Unknown', 'c-grey'];
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => openViewModal(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="cno-c">{c.caseNo}</span>
                    </td>
                    <td className="mut">{c.caseTypeDisplay}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{getClientName(c.clientId)}</span>
                      <div className="mut" style={{ fontSize: '11.5px', marginTop: 2 }}>
                        vs {c.opponent}
                      </div>
                    </td>
                    <td className="mut" style={{ fontSize: '12px', maxWidth: 160 }}>
                      {c.courtDisplay}
                    </td>
                    <td className="mut">{getAdvocateName(c.advocateId)}</td>
                    <td>
                      <Chip type={c.caseStageColor} label={c.caseStageDisplay} />
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px' }}>
                      {formatHearing(c.nextHearing)}
                    </td>
                    <td className="r mono">{inr(c.val)}</td>
                    <td className="r mono">
                      {inr((c.val * c.fee) / 100)}
                      <div className="mut" style={{ fontSize: '10px' }}>
                        {c.fee}%
                      </div>
                    </td>
                    <td>
                      <Chip type={statusChip[1]} label={statusChip[0]} />
                    </td>
                    {canEdit && (
                      <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn g sm"
                          onClick={() => openEditModal(c)}
                          style={{ marginRight: 6 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn t sm"
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={headers.length} className="c">
                  <div className="empty">
                    No cases found. Try another filter or search term.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredCases.length > 0 && (
        <div className="tbl-foot">
          <div>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredCases.length)} of {filteredCases.length}
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

      {/* Case Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Case Details"
      >
        {selectedViewCase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Case Number</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewCase.caseNo}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Status</span>
                <Chip
                  type={(CST[selectedViewCase.status] || ['Unknown', 'c-grey'])[1]}
                  label={(CST[selectedViewCase.status] || ['Unknown', 'c-grey'])[0]}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Case Type</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewCase.caseTypeDisplay}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Current Stage</span>
                <Chip type={selectedViewCase.caseStageColor} label={selectedViewCase.caseStageDisplay} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Client</span>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{getClientName(selectedViewCase.clientId)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Opponent Party</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewCase.opponent}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Assigned Court</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewCase.courtDisplay}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Assigned Advocate</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{getAdvocateName(selectedViewCase.advocateId)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Suit Value</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{inr(selectedViewCase.val)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Estimated Fee</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>
                  {inr((selectedViewCase.val * selectedViewCase.fee) / 100)} <span style={{ fontSize: '10.5px', fontWeight: 400, color: 'var(--muted)' }}>({selectedViewCase.fee}%)</span>
                </span>
              </div>
            </div>

            <div>
              <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Next Hearing Date</span>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{formatHearing(selectedViewCase.nextHearing)}</span>
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewCase);
                  }}
                >
                  Edit Case Details
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCase ? 'Edit Civil Case' : 'Create Civil Case'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div className="fgrid">
            <div className="f">
              <label>Case Number</label>
              <input
                type="text"
                placeholder="e.g. O.S. 214/2026"
                value={form.caseNo}
                onChange={setField('caseNo')}
                required
              />
            </div>
            <div className="f">
              <label>Case Type</label>
              <SearchableSelect
                options={caseTypes}
                value={form.caseTypeId}
                onChange={(e) => setForm(p => ({ ...p, caseTypeId: e.target.value }))}
                placeholder="Select Case Type"
                name="caseTypeId"
              />
            </div>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Client</label>
            <SearchableSelect
              options={clients}
              value={form.clientId}
              onChange={(e) => setForm(p => ({ ...p, clientId: e.target.value }))}
              placeholder="Select client"
              name="clientId"
            />
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Opponent name & details</label>
            <input
              type="text"
              placeholder="e.g. K. Venkataramana & others"
              value={form.opponent}
              onChange={setField('opponent')}
              required
            />
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Court</label>
              <SearchableSelect
                options={courts}
                value={form.courtId}
                onChange={(e) => setForm(p => ({ ...p, courtId: e.target.value }))}
                placeholder="Select court"
                name="courtId"
              />
            </div>
            <div className="f">
              <label>Assigned Advocate</label>
              <SearchableSelect
                options={advocates}
                value={form.advocateId}
                onChange={(e) => setForm(p => ({ ...p, advocateId: e.target.value }))}
                placeholder="Select advocate"
                name="advocateId"
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Current Stage</label>
              <SearchableSelect
                options={caseStages}
                value={form.caseStageId}
                onChange={(e) => setForm(p => ({ ...p, caseStageId: e.target.value }))}
                placeholder="Select stage"
                name="caseStageId"
              />
            </div>
            <div className="f">
              <label>Next Hearing Date</label>
              <input
                type="date"
                value={form.nextHearing}
                onChange={setField('nextHearing')}
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Suit value (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={form.val}
                onChange={setField('val')}
                required
              />
            </div>
            <div className="f">
              <label>Fee %</label>
              <input
                type="number"
                placeholder="10"
                value={form.fee}
                onChange={setField('fee')}
              />
            </div>
          </div>

          {editingCase && (
            <div className="f" style={{ marginTop: '12px' }}>
              <label>Status</label>
              <select value={form.status} onChange={setField('status')}>
                <option value="Active">Active</option>
                <option value="Pending Approval">Pending approval</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          )}

          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving
                ? 'Saving…'
                : editingCase
                  ? 'Save changes'
                  : 'Create Filing'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
