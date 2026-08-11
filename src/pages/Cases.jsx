import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import KPICard from '../components/ui/KPICard';
import SearchableSelect from '../components/ui/SearchableSelect';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { getCases, createCase, updateCase, deleteCase } from '../services/caseService';
import { getClients } from '../services/clientService';
import { getAdvocates } from '../services/advocateService';
import { getCaseTypes, getCaseStages, getCourts } from "../services/caseMastersService";
import { calculateCourtFeeClient } from '../services/courtFeeCalculator.service';

const PAGE_SIZE = 10;
const TITLE_VS_SEP = ' — vs ';

const CST = {
  Active: ['Active', 'success'],
  'Pending Approval': ['Pending Approval', 'warning'],
  Closed: ['Closed', 'ghost'],
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'Pending Approval', label: 'Pending' },
  { key: 'Closed', label: 'Closed' },
];



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

const emptyForm = {
  caseNo: '',
  title: '',
  description: '',
  clientId: '',
  caseTypeId: '',
  caseStageId: '',
  courtId: '',
  opponent: '',
  advocateId: '',
  filingDate: '',
  nextHearing: '',
  status: 'Pending Approval',
  priority: 'Medium',
  tags: '',
  suitValue: '',
  feePercentage: '',
  processFee: '',
  filingFee: '',
  miscCharges: '',
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
  const [livePreview, setLivePreview] = useState(null);

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
      const settled = await Promise.allSettled([
        getCases(),
        getClients(),
        getAdvocates(),
        getCaseTypes(true),
        getCaseStages(true),
        getCourts(true),
      ]);

      const [
        casesResult,
        clientsResult,
        advocatesResult,
        typesResult,
        stagesResult,
        courtsResult,
      ] = settled;

      if (casesResult.status === 'rejected') {
        throw casesResult.reason;
      }

      setCases(casesResult.value || []);
      setClients(clientsResult.status === 'fulfilled' ? clientsResult.value || [] : []);
      setAdvocates(advocatesResult.status === 'fulfilled' ? advocatesResult.value || [] : []);
      setCaseTypes(typesResult.status === 'fulfilled' ? typesResult.value || [] : []);
      setCaseStages(stagesResult.status === 'fulfilled' ? stagesResult.value || [] : []);
      setCourts(courtsResult.status === 'fulfilled' ? courtsResult.value || [] : []);
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

  useEffect(() => {
    if (!isModalOpen) {
      setLivePreview(null);
      return;
    }

    const sv = Number(form.val) || 0;
    const fp = Number(form.fee) || 0;
    const pf = Number(form.processFee) || 0;
    const ff = Number(form.filingFee) || 0;
    const mc = Number(form.miscCharges) || 0;
    const advFee = (sv * fp) / 100;

    let courtStateCode = null;
    const selectedCourt = courts.find(c => String(c.id) === String(form.courtId));
    if (selectedCourt) {
      courtStateCode = selectedCourt.stateCode;
    }

    if (!courtStateCode) {
      setLivePreview({
        advocateFee: advFee,
        courtFee: 0,
        processFee: pf,
        filingFee: ff,
        miscCharges: mc,
        totalPayable: advFee + pf + ff + mc,
        status: 'PARTIAL',
        warning: 'This Court has no State assigned. Court Fee cannot be calculated.',
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await calculateCourtFeeClient(courtStateCode, 'MONEY_SUIT', sv);
        setLivePreview({
          advocateFee: advFee,
          courtFee: result ? result.courtFee : 0,
          processFee: pf,
          filingFee: ff,
          miscCharges: mc,
          totalPayable: advFee + (result ? result.courtFee : 0) + pf + ff + mc,
          status: 'COMPLETE',
          warning: null,
        });
      } catch (err) {
        if (err.status === 501) {
          setLivePreview({
            advocateFee: advFee,
            courtFee: 0,
            processFee: pf,
            filingFee: ff,
            miscCharges: mc,
            totalPayable: advFee + pf + ff + mc,
            status: 'PARTIAL',
            warning: 'Court Fee Calculator is not yet available for the selected state.',
          });
        } else {
          setLivePreview({
            advocateFee: advFee,
            courtFee: 0,
            processFee: pf,
            filingFee: ff,
            miscCharges: mc,
            totalPayable: advFee + pf + ff + mc,
            status: 'ERROR',
            warning: 'Error calculating fee. Using fallback totals.',
          });
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.val, form.fee, form.processFee, form.filingFee, form.miscCharges, form.courtId, isModalOpen, courts]);

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
      let opponent = '—';
      const vsIdx = String(c.title || '').indexOf(' — vs ');
      if (vsIdx >= 0) {
        opponent = String(c.title).slice(vsIdx + ' — vs '.length);
      }

      return {
        ...c,
        opponent,
        val: Number(c.suitValue) || 0,
        fee: Number(c.feePercentage) || 0,
        caseTypeDisplay: c.caseType?.name || '—',
        caseStageDisplay: c.currentStage?.name || 'Filing',
        caseStageColor: c.currentStage?.color ? c.currentStage.color.replace('c-baize', 'success').replace('c-brass', 'warning').replace('c-grey', 'ghost') : 'success',
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
    { label: 'Total Payable', className: 'r' },
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
      val: c.suitValue != null ? String(c.suitValue) : (c.val ? String(c.val) : ''),
      fee: c.feePercentage != null ? String(c.feePercentage) : (c.fee ? String(c.fee) : '10'),
      processFee: c.processFee != null ? String(c.processFee) : '0',
      filingFee: c.filingFee != null ? String(c.filingFee) : '0',
      miscCharges: c.miscCharges != null ? String(c.miscCharges) : '0',
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
      title: `${selectedType ? selectedType.name.trim() : 'Unknown'}${TITLE_VS_SEP}${form.opponent.trim()}`,
      status: form.status || 'Pending Approval',
      nextHearing: form.nextHearing || undefined,
      clientId: Number(form.clientId),
      advocateId: Number(form.advocateId),
      approvalLevel: form.status === 'Pending Approval' ? 1 : form.status === 'Closed' ? 4 : 4,
      suitValue: Number(form.val) || 0,
      feePercentage: Number(form.fee) || 0,
      processFee: Number(form.processFee) || 0,
      filingFee: Number(form.filingFee) || 0,
      miscCharges: Number(form.miscCharges) || 0,
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
      className="btn primary"
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

      <div className="kpis" style={{ marginBottom: 'var(--space-4)' }}>
        <KPICard label="Total Matters" value={statusCounts.all} />
        <KPICard label="Active Cases" value={statusCounts.Active} status="issued" type="success" />
        <KPICard label="Pending Approval" value={statusCounts['Pending Approval']} status="warning" type="warning" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
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

      <div className="filt" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn sm ${filter === btn.key ? 'primary' : 'outline'}`}
            onClick={() => setFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: 'var(--space-3)' }}>
          {error}
        </div>
      )}

      {canEdit && (!clients.length || !advocates.length) && !loading && (
        <div className="card" style={{ borderColor: 'var(--warning)', color: 'var(--warning)', marginBottom: 'var(--space-3)' }}>
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
                      <span className="cno-c" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{c.caseNo}</span>
                    </td>
                    <td className="mut" style={{ fontSize: 'var(--text-sm)' }}>{c.caseTypeDisplay}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{getClientName(c.clientId)}</span>
                      <div className="mut" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                        vs {c.opponent}
                      </div>
                    </td>
                    <td className="mut" style={{ fontSize: 'var(--text-sm)', maxWidth: '160px' }}>
                      {c.courtDisplay}
                    </td>
                    <td className="mut" style={{ fontSize: 'var(--text-sm)' }}>{getAdvocateName(c.advocateId)}</td>
                    <td>
                      <Chip type={c.caseStageColor} label={c.caseStageDisplay} />
                    </td>
                    <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>
                      {formatHearing(c.nextHearing)}
                    </td>
                    <td className="r mono" style={{ fontSize: 'var(--text-sm)' }}>{inr(c.val)}</td>
                    <td className="r mono" style={{ fontSize: 'var(--text-sm)' }}>
                      {inr(c.totalPayable)}
                      <div style={{ marginTop: '4px' }}>
                        <Chip 
                          type={
                            c.feeCalculationStatus === 'COMPLETE' ? 'success' :
                            c.feeCalculationStatus === 'PARTIAL' ? 'warning' :
                            c.feeCalculationStatus === 'ERROR' ? 'danger' : 'primary'
                          } 
                          label={c.feeCalculationStatus}
                        />
                      </div>
                    </td>
                    <td>
                      <Chip type={statusChip[1]} label={statusChip[0]} />
                    </td>
                    {canEdit && (
                      <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => openEditModal(c)}
                          style={{ marginRight: '6px' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn danger sm"
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

      

      {/* Case Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Case Details"
      >
        {selectedViewCase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Case Number</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedViewCase.caseNo}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Status</span>
                <Chip
                  type={(CST[selectedViewCase.status] || ['Unknown', 'ghost'])[1]}
                  label={(CST[selectedViewCase.status] || ['Unknown', 'ghost'])[0]}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Case Type</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewCase.caseTypeDisplay}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Current Stage</span>
                <Chip type={selectedViewCase.caseStageColor} label={selectedViewCase.caseStageDisplay} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Client</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{getClientName(selectedViewCase.clientId)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Opponent Party</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewCase.opponent}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Assigned Court</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewCase.courtDisplay}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Assigned Advocate</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{getAdvocateName(selectedViewCase.advocateId)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Suit Value</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{inr(selectedViewCase.val)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Next Hearing Date</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{formatHearing(selectedViewCase.nextHearing)}</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '14px' }}>Financial Summary</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span className="mut" style={{ fontSize: '12px', fontWeight: 'bold' }}>CALCULATION STATUS</span>
                  <Chip 
                    type={
                      selectedViewCase.feeCalculationStatus === 'COMPLETE' ? 'success' :
                      selectedViewCase.feeCalculationStatus === 'PARTIAL' ? 'warning' :
                      selectedViewCase.feeCalculationStatus === 'ERROR' ? 'danger' : 'primary'
                    } 
                    label={selectedViewCase.feeCalculationStatus}
                  />
                </div>
                
                {selectedViewCase.feeCalculationStatus === 'PARTIAL' && (
                  <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: 'var(--space-3)' }}>
                    ⚠️ Court Fee could not be calculated because this Court has no assigned State.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Advocate Fee ({selectedViewCase.fee}%):</span>
                  <span className="mono">{inr(selectedViewCase.advocateFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Court Fee:</span>
                  <span className="mono">{inr(selectedViewCase.courtFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Process Fee:</span>
                  <span className="mono">{inr(selectedViewCase.processFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Filing Fee:</span>
                  <span className="mono">{inr(selectedViewCase.filingFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Misc Charges:</span>
                  <span className="mono">{inr(selectedViewCase.miscCharges)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)' 
                }}>
                  <span>Total Payable:</span>
                  <span className="mono" style={{ color: 'var(--accent)' }}>{inr(selectedViewCase.totalPayable)}</span>
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ margin: 'var(--space-2) calc(-1 * var(--space-4)) calc(-1 * var(--space-4))', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn primary"
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          <FormSection title="General Details">
            <FormGrid columns={2}>
              <FormField label="Case Number" required>
                <input
                  type="text"
                  placeholder="e.g. O.S. 214/2026"
                  value={form.caseNo}
                  onChange={setField('caseNo')}
                  required
                />
              </FormField>
              <FormField label="Case Type">
                <SearchableSelect
                  options={caseTypes}
                  value={form.caseTypeId}
                  onChange={(e) => setForm(p => ({ ...p, caseTypeId: e.target.value }))}
                  placeholder="Select Case Type"
                  name="caseTypeId"
                />
              </FormField>
              <FormField label="Court">
                <SearchableSelect
                  options={courts}
                  value={form.courtId}
                  onChange={(e) => setForm(p => ({ ...p, courtId: e.target.value }))}
                  placeholder="Select court"
                  name="courtId"
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Parties Involved">
            <FormGrid columns={2}>
              <FormField label="Client">
                <SearchableSelect
                  options={clients}
                  value={form.clientId}
                  onChange={(e) => setForm(p => ({ ...p, clientId: e.target.value }))}
                  placeholder="Select client"
                  name="clientId"
                />
              </FormField>
              <FormField label="Assigned Advocate">
                <SearchableSelect
                  options={advocates}
                  value={form.advocateId}
                  onChange={(e) => setForm(p => ({ ...p, advocateId: e.target.value }))}
                  placeholder="Select advocate"
                  name="advocateId"
                />
              </FormField>
            </FormGrid>
            <FormGrid columns={1}>
              <FormField label="Opponent name & details" required>
                <input
                  type="text"
                  placeholder="e.g. K. Venkataramana & others"
                  value={form.opponent}
                  onChange={setField('opponent')}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Status & Financials">
            <FormGrid columns={2}>
              <FormField label="Current Stage">
                <SearchableSelect
                  options={caseStages}
                  value={form.caseStageId}
                  onChange={(e) => setForm(p => ({ ...p, caseStageId: e.target.value }))}
                  placeholder="Select stage"
                  name="caseStageId"
                />
              </FormField>
              <FormField label="Next Hearing Date">
                <input
                  type="date"
                  value={form.nextHearing}
                  onChange={setField('nextHearing')}
                />
              </FormField>
              <FormField label="Suit value (₹)" required>
                <input
                  type="number"
                  placeholder="0"
                  value={form.val}
                  onChange={setField('val')}
                  required
                />
              </FormField>
              <FormField label="Fee %">
                <input
                  type="number"
                  placeholder="10"
                  value={form.fee}
                  onChange={setField('fee')}
                />
              </FormField>
              <FormField label="Process Fee (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.processFee}
                  onChange={setField('processFee')}
                />
              </FormField>
              <FormField label="Filing Fee (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.filingFee}
                  onChange={setField('filingFee')}
                />
              </FormField>
              <FormField label="Misc Charges (₹)">
                <input
                  type="number"
                  placeholder="0"
                  value={form.miscCharges}
                  onChange={setField('miscCharges')}
                />
              </FormField>
              {editingCase && (
                <FormField label="Status">
                  <select value={form.status} onChange={setField('status')}>
                    <option value="Active">Active</option>
                    <option value="Pending Approval">Pending approval</option>
                    <option value="Closed">Closed</option>
                  </select>
                </FormField>
              )}
            </FormGrid>
          </FormSection>

          {/* Live Preview Fee Summary */}
          {livePreview && (
            <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h4 style={{ margin: 0 }}>Fee Summary (Live Preview)</h4>
                <Chip 
                  type={livePreview.status === 'COMPLETE' ? 'success' : livePreview.status === 'PARTIAL' ? 'warning' : 'danger'} 
                  label={livePreview.status} 
                />
              </div>
              
              {livePreview.warning && (
                <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: 'var(--space-3)' }}>
                  ⚠️ {livePreview.warning}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Advocate Fee ({form.fee}%):</span>
                  <span className="mono">{inr(livePreview.advocateFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Court Fee:</span>
                  <span className="mono">{inr(livePreview.courtFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Process Fee:</span>
                  <span className="mono">{inr(livePreview.processFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Filing Fee:</span>
                  <span className="mono">{inr(livePreview.filingFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span className="mut">Misc Charges:</span>
                  <span className="mono">{inr(livePreview.miscCharges)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)' 
                }}>
                  <span>Total Payable:</span>
                  <span className="mono" style={{ color: 'var(--accent)' }}>{inr(livePreview.totalPayable)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="modal-foot" style={{ margin: 'var(--space-2) calc(-1 * var(--space-4)) calc(-1 * var(--space-4))', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
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
