import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getLands,
  createLand,
  updateLand,
  deleteLand,
} from '../services/landService';
import { getClients, createClient } from '../services/clientService';
import { getCases } from '../services/caseService';
import { getAdvocates } from '../services/advocateService';
import { getTitleSearches, createTitleSearch, deleteTitleSearch } from '../services/titleSearchService';
import { getDocuments, uploadDocument, downloadDocument, deleteDocument } from '../services/documentService';
import { getDocumentCategories } from '../services/caseMastersService';
import SearchableSelect from '../components/ui/SearchableSelect';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { formatAadhaar, formatPan, formatMobile } from '../utils/formatters';


const ENC = {
  clear: ['Clear', 'c-baize'],
  noted: ['Encumbrance noted', 'c-tape'],
  pending: ['EC awaited', 'c-brass'],
};

const TIS = {
  clear: ['Clear title', 'c-baize'],
  disputed: ['Disputed', 'c-tape'],
  under_scrutiny: ['Under scrutiny', 'c-brass'],
};

const emptyForm = {
  surveyNo: '',
  clientId: '',
  village: '',
  mandal: '',
  district: 'Annamayya',
  extent: '',
  classification: 'Agricultural (Dry)',
  pattaNo: '',
  subDivisionNo: '',
  sro: '',
  registrationDistrict: '',
  documentNo: '',
  documentYear: '',
  registrationDate: '',
  acquisitionType: '',
  currentOwnerName: '',
  remarks: '',
  encumbranceStatus: 'clear',
  titleStatus: 'clear',
  caseId: '',
};

export default function Land() {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('land', 'E');

  const [lands, setLands] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [titleSearches, setTitleSearches] = useState([]);
  const [isTitleSearchModalOpen, setIsTitleSearchModalOpen] = useState(false);
  const [titleSearchForm, setTitleSearchForm] = useState({
    searchDate: new Date().toISOString().slice(0, 10),
    periodFrom: '',
    periodTo: '',
    ecStatus: 'clear',
    ecReferenceNo: '',
    revenueRecordsVerified: false,
    registrationRecordsVerified: false,
    litigationChecked: false,
    documentsVerified: false,
    remarks: '',
    conductedBy: '',
  });

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    documentCategoryId: '',
    file: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewLand, setSelectedViewLand] = useState(null);
  const [editingLand, setEditingLand] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    mobile: '',
    email: '',
    village: '',
    aadhaarMasked: '',
    panMasked: '',
  });
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState('');

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.mobile.trim()) {
      setClientError('Please fill out Name and Mobile number.');
      return;
    }
    const aadhaarDigits = clientForm.aadhaarMasked.replace(/\D/g, '');
    if (clientForm.aadhaarMasked.trim() && aadhaarDigits.length !== 12) {
      setClientError('Aadhaar must be 12 digits.');
      return;
    }
    const pan = clientForm.panMasked.trim().toUpperCase();
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      setClientError('PAN must be in format ABCDE1234F.');
      return;
    }
    setClientSaving(true);
    setClientError('');
    const payload = {
      name: clientForm.name.trim(),
      mobile: clientForm.mobile.trim(),
      email: clientForm.email.trim() || undefined,
      village: clientForm.village.trim() || undefined,
      aadhaarMasked: clientForm.aadhaarMasked.trim() || undefined,
      panMasked: pan || undefined,
    };
    try {
      const created = await createClient(payload);
      setClients((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, clientId: String(created.id) }));
      setIsAddClientModalOpen(false);
      setClientForm({ name: '', mobile: '', email: '', village: '', aadhaarMasked: '', panMasked: '' });
    } catch (err) {
      setClientError(err.message || 'Failed to create client');
    } finally {
      setClientSaving(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        landsResult,
        clientsResult,
        casesResult,
        advocatesResult,
        titleSearchesResult,
        docsResult,
        catsResult,
      ] = await Promise.allSettled([
        getLands(),
        getClients(),
        getCases(),
        getAdvocates(),
        getTitleSearches(),
        hasPermission('docs', 'V') ? getDocuments() : Promise.resolve([]),
        getDocumentCategories(),
      ]);

      if (landsResult.status === 'rejected') {
        throw landsResult.reason;
      }

      setLands(landsResult.value || []);
      setClients(clientsResult.status === 'fulfilled' ? clientsResult.value || [] : []);
      setCases(casesResult.status === 'fulfilled' ? casesResult.value || [] : []);
      setAdvocates(advocatesResult.status === 'fulfilled' ? advocatesResult.value || [] : []);
      setTitleSearches(titleSearchesResult.status === 'fulfilled' ? titleSearchesResult.value || [] : []);
      setDocuments(docsResult.status === 'fulfilled' ? docsResult.value || [] : []);
      setCategories(catsResult.status === 'fulfilled' ? catsResult.value || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load land records');
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

  const getClientName = (land) =>
    land?.client?.name ||
    clients.find((c) => String(c.id) === String(land.clientId))?.name ||
    '—';

  const getCaseNo = (land) =>
    land?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(land.caseId))?.caseNo ||
    '—';

  const q = query.trim().toLowerCase();
  const filteredLands = lands.filter((l) => {
    if (filter !== 'all' && l.titleStatus !== filter) return false;
    if (!q) return true;
    const haystack = [
      l.surveyNo,
      getClientName(l),
      l.village,
      l.mandal,
      l.district,
      l.classification,
      l.pattaNo,
      getCaseNo(l),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredLands.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedLands = filteredLands.slice(pageStart, pageStart + pageSize);

  const clearCount = lands.filter((l) => l.titleStatus === 'clear').length;
  const disputedCount = lands.filter((l) => l.titleStatus === 'disputed').length;
  const pendingEcCount = lands.filter((l) => l.encumbranceStatus === 'pending').length;

  const openAddModal = () => {
    setEditingLand(null);
    setForm({
      ...emptyForm,
      clientId: clients[0] ? String(clients[0].id) : '',
      caseId: cases[0] ? String(cases[0].id) : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (l) => {
    setEditingLand(l);
    setForm({
      surveyNo: l.surveyNo || '',
      clientId: l.clientId != null ? String(l.clientId) : '',
      village: l.village || '',
      mandal: l.mandal || '',
      district: l.district || 'Annamayya',
      extent: l.extent || '',
      classification: l.classification || 'Agricultural (Dry)',
      pattaNo: l.pattaNo || '',
      subDivisionNo: l.subDivisionNo || '',
      sro: l.sro || '',
      registrationDistrict: l.registrationDistrict || '',
      documentNo: l.documentNo || '',
      documentYear: l.documentYear != null ? String(l.documentYear) : '',
      registrationDate: l.registrationDate || '',
      acquisitionType: l.acquisitionType || '',
      currentOwnerName: l.currentOwnerName || '',
      remarks: l.remarks || '',
      encumbranceStatus: l.encumbranceStatus || 'clear',
      titleStatus: l.titleStatus || 'clear',
      caseId: l.caseId != null ? String(l.caseId) : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (l) => {
    setSelectedViewLand(l);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLand(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.surveyNo || !form.village || !form.mandal || !form.extent || !form.pattaNo || !form.clientId) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      surveyNo: form.surveyNo.trim(),
      clientId: Number(form.clientId),
      village: form.village.trim(),
      mandal: form.mandal.trim(),
      district: form.district.trim(),
      extent: form.extent.trim(),
      classification: form.classification.trim(),
      pattaNo: form.pattaNo.trim(),
      subDivisionNo: form.subDivisionNo.trim() || undefined,
      sro: form.sro.trim() || undefined,
      registrationDistrict: form.registrationDistrict.trim() || undefined,
      documentNo: form.documentNo.trim() || undefined,
      documentYear: form.documentYear ? Number(form.documentYear) : undefined,
      registrationDate: form.registrationDate || undefined,
      acquisitionType: form.acquisitionType.trim() || undefined,
      currentOwnerName: form.currentOwnerName.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
      encumbranceStatus: form.encumbranceStatus,
      titleStatus: form.titleStatus,
      caseId: form.caseId ? Number(form.caseId) : undefined,
    };

    try {
      if (editingLand) {
        const updated = await updateLand(editingLand.id, payload);
        setLands((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedViewLand(updated);
      } else {
        const created = await createLand(payload);
        setLands((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save land record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (l) => {
    if (!window.confirm(`Delete land record Sy. ${l.surveyNo}?`)) return;
    setError('');
    try {
      await deleteLand(l.id);
      setLands((prev) => prev.filter((item) => item.id !== l.id));
      if (selectedViewLand && selectedViewLand.id === l.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete land record');
    }
  };

  const handleTitleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!titleSearchForm.periodFrom || !titleSearchForm.periodTo || !titleSearchForm.conductedBy) {
      alert('Please fill out all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        landId: selectedViewLand.id,
        searchDate: titleSearchForm.searchDate,
        periodFrom: titleSearchForm.periodFrom,
        periodTo: titleSearchForm.periodTo,
        ecStatus: titleSearchForm.ecStatus,
        ecReferenceNo: titleSearchForm.ecReferenceNo.trim() || undefined,
        revenueRecordsVerified: !!titleSearchForm.revenueRecordsVerified,
        registrationRecordsVerified: !!titleSearchForm.registrationRecordsVerified,
        litigationChecked: !!titleSearchForm.litigationChecked,
        documentsVerified: !!titleSearchForm.documentsVerified,
        remarks: titleSearchForm.remarks.trim() || undefined,
        conductedBy: Number(titleSearchForm.conductedBy),
      };
      const created = await createTitleSearch(payload);
      setTitleSearches((prev) => [...prev, created]);
      setIsTitleSearchModalOpen(false);
      setTitleSearchForm({
        searchDate: new Date().toISOString().slice(0, 10),
        periodFrom: '',
        periodTo: '',
        ecStatus: 'clear',
        ecReferenceNo: '',
        revenueRecordsVerified: false,
        registrationRecordsVerified: false,
        litigationChecked: false,
        documentsVerified: false,
        remarks: '',
        conductedBy: '',
      });
    } catch (err) {
      alert(err.message || 'Failed to save title search record');
    } finally {
      setSaving(false);
    }
  };

  const handleTitleSearchDelete = async (searchId) => {
    if (!window.confirm('Delete this title search record?')) return;
    try {
      await deleteTitleSearch(searchId);
      setTitleSearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (err) {
      alert(err.message || 'Failed to delete title search record');
    }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.name || !docForm.documentCategoryId || !docForm.file) {
      alert('Please fill out all required fields and select a file.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: docForm.name.trim(),
        documentCategoryId: Number(docForm.documentCategoryId),
        landId: selectedViewLand.id,
        file: docForm.file,
      };
      const created = await uploadDocument(payload);
      setDocuments((prev) => [created, ...prev]);
      setIsDocModalOpen(false);
      setDocForm({
        name: '',
        documentCategoryId: '',
        file: null,
      });
    } catch (err) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setSaving(false);
    }
  };

  const handleDocDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDocDownload = async (doc) => {
    try {
      await downloadDocument(doc.id, doc.name);
    } catch (err) {
      alert(err.message || 'Failed to download document');
    }
  };

  const headers = [
    { label: 'Survey no.' },
    { label: 'Client' },
    { label: 'Village / Mandal' },
    { label: 'District' },
    { label: 'Extent', className: 'r' },
    { label: 'Classification' },
    { label: 'Patta no.' },
    { label: 'Encumbrance' },
    { label: 'Title status' },
    { label: 'Case no.' },
    ...(canEdit ? [{ label: '', className: 'c' }] : []),
  ];

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'clear', label: 'Clear title' },
    { key: 'under_scrutiny', label: 'Under scrutiny' },
    { key: 'disputed', label: 'Disputed' },
  ];

  return (
    <>
      <PageHeader
        title="Land Details"
        description="Survey-wise land records — extent, patta, encumbrance and the title position behind each matter."
        actions={
          canEdit ? (
            <button className="btn primary" onClick={openAddModal} disabled={!clients.length}>
              Add land record
            </button>
          ) : null
        }
      />

      <div className="kpis">
        <KPICard label="Land records" value={lands.length} status="on file" />
        <KPICard label="Clear title" value={clearCount} status="marketable" type="b" />
        <KPICard label="Disputed" value={disputedCount} status="before the courts" type="t" />
        <KPICard label="EC awaited" value={pendingEcCount} status="encumbrance pending" type="r" />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search land records</label>
            <input
              type="text"
              placeholder="Survey no., client, village, patta…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn ${filter === btn.key ? 'primary' : 'secondary'}`}
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

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">Loading land records…</div>
            </td>
          </tr>
        ) : pagedLands.length ? (
          pagedLands.map((l) => (
            <tr 
              key={l.id}
              onClick={() => openViewModal(l)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <span className="cno-c">Sy. {l.surveyNo}</span>
              </td>
              <td>
                <span className="nm">{getClientName(l)}</span>
              </td>
              <td className="mut">
                {l.village} / {l.mandal}
              </td>
              <td className="mut">{l.district}</td>
              <td className="r mono">{l.extent}</td>
              <td className="mut" style={{ fontSize: '11.5px' }}>
                {l.classification}
              </td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {l.pattaNo}
              </td>
              <td>
                <Chip type={ENC[l.encumbranceStatus]?.[1] || 'c-grey'} label={ENC[l.encumbranceStatus]?.[0] || l.encumbranceStatus} />
              </td>
              <td>
                <Chip type={TIS[l.titleStatus]?.[1] || 'c-grey'} label={TIS[l.titleStatus]?.[0] || l.titleStatus} />
              </td>
              <td>
                <span className="cno-c">{getCaseNo(l)}</span>
              </td>
              {canEdit && (
                <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn g sm" onClick={() => openEditModal(l)} style={{ marginRight: '6px' }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleDelete(l)}
                    style={{ background: 'transparent', border: '1px solid var(--tape)', color: 'var(--tape)' }}
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
              <div className="empty">No land records with that title status.</div>
            </td>
          </tr>
        )}
      </DataTable>

      {!loading && filteredLands.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
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
              entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredLands.length)} of {filteredLands.length}
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

      {/* Land Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Land Record Details"
      >
        {selectedViewLand && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Survey Number</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>Sy. {selectedViewLand.surveyNo}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Client</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{getClientName(selectedViewLand)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Village & Mandal</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.village} / {selectedViewLand.mandal}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>District</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.district}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Extent (Area)</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewLand.extent}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Patta Number</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.pattaNo}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Land Classification</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.classification}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Linked Case</span>
                <span className="mono font-semibold" style={{ fontSize: '13px', color: 'var(--ink)' }}>{getCaseNo(selectedViewLand)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--rule-2)', paddingTop: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Sub Division Number</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.subDivisionNo || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Sub Registrar Office (SRO)</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.sro || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Registration District</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.registrationDistrict || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Document Number & Year</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>
                  {selectedViewLand.documentNo ? `${selectedViewLand.documentNo} / ${selectedViewLand.documentYear || '—'}` : '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Registration Date</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.registrationDate ? formatDate(selectedViewLand.registrationDate) : '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Acquisition Type</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewLand.acquisitionType || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Current Owner Name</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewLand.currentOwnerName || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Remarks</span>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{selectedViewLand.remarks || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px dashed var(--rule)', paddingTop: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Encumbrance Status</span>
                <Chip type={ENC[selectedViewLand.encumbranceStatus]?.[1] || 'c-grey'} label={ENC[selectedViewLand.encumbranceStatus]?.[0] || selectedViewLand.encumbranceStatus} />
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Title Marketability</span>
                <Chip type={TIS[selectedViewLand.titleStatus]?.[1] || 'c-grey'} label={TIS[selectedViewLand.titleStatus]?.[0] || selectedViewLand.titleStatus} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>Title Search History</h4>
                {canEdit && (
                  <button
                    type="button"
                    className="btn sm primary"
                    onClick={() => {
                      setTitleSearchForm({
                        searchDate: new Date().toISOString().slice(0, 10),
                        periodFrom: '',
                        periodTo: '',
                        ecStatus: 'clear',
                        ecReferenceNo: '',
                        revenueRecordsVerified: false,
                        registrationRecordsVerified: false,
                        litigationChecked: false,
                        documentsVerified: false,
                        remarks: '',
                        conductedBy: advocates[0] ? String(advocates[0].userId || '') : '',
                      });
                      setIsTitleSearchModalOpen(true);
                    }}
                  >
                    + Add Title Search
                  </button>
                )}
              </div>

              {titleSearches.filter(s => String(s.landId) === String(selectedViewLand.id)).length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px', border: '1px dashed var(--rule)', borderRadius: '6px' }}>
                  No title search history found for this property asset.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--rule-2)', borderRadius: '6px' }}>
                  <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--rule)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Search Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Period (From - To)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>EC Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Conducted By</th>
                        {canEdit && <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {titleSearches
                        .filter(s => String(s.landId) === String(selectedViewLand.id))
                        .map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--rule-2)' }}>
                            <td style={{ padding: '8px 10px' }}>{formatDate(s.searchDate)}</td>
                            <td style={{ padding: '8px 10px' }}>{formatDate(s.periodFrom)} to {formatDate(s.periodTo)}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <Chip type={ENC[s.ecStatus]?.[1] || 'c-grey'} label={ENC[s.ecStatus]?.[0] || s.ecStatus} />
                            </td>
                            <td style={{ padding: '8px 10px' }}>{s.conductedByUser?.name || '—'}</td>
                            {canEdit && (
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn sm danger-text"
                                  style={{ padding: '2px 6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tape)' }}
                                  onClick={() => handleTitleSearchDelete(s.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>Linked Documents</h4>
                {canEdit && (
                  <button
                    type="button"
                    className="btn sm primary"
                    onClick={() => {
                      setDocForm({
                        name: '',
                        documentCategoryId: '',
                        file: null,
                      });
                      setIsDocModalOpen(true);
                    }}
                  >
                    + Upload Document
                  </button>
                )}
              </div>

              {documents.filter(d => String(d.landId) === String(selectedViewLand.id)).length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px', border: '1px dashed var(--rule)', borderRadius: '6px' }}>
                  No linked documents found for this property asset.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--rule-2)', borderRadius: '6px' }}>
                  <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--rule)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Code</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Type & Size</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents
                        .filter(d => String(d.landId) === String(selectedViewLand.id))
                        .map(d => (
                          <tr key={d.id} style={{ borderBottom: '1px solid var(--rule-2)' }}>
                            <td style={{ padding: '8px 10px' }} className="mono">{d.documentCode}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 500 }}>{d.name}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <Chip type="ghost" label={d.documentCategory?.name || '—'} />
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: '10.5px' }} className="mono">
                              {d.fileType} ({d.fileSize})
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="btn sm ghost"
                                style={{ marginRight: '6px', padding: '2px 8px' }}
                                onClick={() => handleDocDownload(d)}
                              >
                                Download
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="btn sm danger-text"
                                  style={{ padding: '2px 6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tape)' }}
                                  onClick={() => handleDocDelete(d.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewLand);
                  }}
                >
                  Edit Land Details
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLand ? 'Edit Land Record' : 'Add Land Record'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div className="fgrid">
            <div className="f">
              <label>Survey Number</label>
              <input
                type="text"
                placeholder="e.g. 214/2"
                value={form.surveyNo}
                onChange={setField('surveyNo')}
                required
              />
            </div>
            <div className="f">
              <label>Patta Number</label>
              <input
                type="text"
                placeholder="e.g. Patta 482"
                value={form.pattaNo}
                onChange={setField('pattaNo')}
                required
              />
            </div>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ margin: 0 }}>Client / Owner</label>
              <button
                type="button"
                className="btn sm"
                style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                onClick={() => {
                  setClientForm({ name: '', mobile: '', email: '', village: '', aadhaarMasked: '', panMasked: '' });
                  setClientError('');
                  setIsAddClientModalOpen(true);
                }}
              >
                + Add Client
              </button>
            </div>
            <SearchableSelect
              options={clients}
              value={form.clientId}
              onChange={(e) => setForm(p => ({ ...p, clientId: e.target.value }))}
              placeholder="Select client"
              name="clientId"
            />
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Village</label>
              <input
                type="text"
                placeholder="e.g. Kalikiri"
                value={form.village}
                onChange={setField('village')}
                required
              />
            </div>
            <div className="f">
              <label>Mandal</label>
              <input
                type="text"
                placeholder="e.g. Kalikiri Mandal"
                value={form.mandal}
                onChange={setField('mandal')}
                required
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>District</label>
              <input
                type="text"
                placeholder="e.g. Annamayya"
                value={form.district}
                onChange={setField('district')}
              />
            </div>
            <div className="f">
              <label>Extent (Area)</label>
              <input
                type="text"
                placeholder="e.g. Ac 2.14 cents"
                value={form.extent}
                onChange={setField('extent')}
                required
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Land Classification</label>
              <input
                type="text"
                placeholder="e.g. Agricultural (Dry)"
                value={form.classification}
                onChange={setField('classification')}
              />
            </div>
            <div className="f">
              <label>Linked Case</label>
              <SearchableSelect
                options={cases.map(c => ({ id: c.id, name: c.caseNo }))}
                value={form.caseId}
                onChange={(e) => setForm(p => ({ ...p, caseId: e.target.value }))}
                placeholder="Select case matter"
                name="caseId"
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Sub Division Number</label>
              <input
                type="text"
                placeholder="e.g. 2A"
                value={form.subDivisionNo}
                onChange={setField('subDivisionNo')}
              />
            </div>
            <div className="f">
              <label>Sub Registrar Office (SRO)</label>
              <input
                type="text"
                placeholder="e.g. Madanapalle SRO"
                value={form.sro}
                onChange={setField('sro')}
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Registration District</label>
              <input
                type="text"
                placeholder="e.g. Chittoor"
                value={form.registrationDistrict}
                onChange={setField('registrationDistrict')}
              />
            </div>
            <div className="f">
              <label>Document Number</label>
              <input
                type="text"
                placeholder="e.g. 1024"
                value={form.documentNo}
                onChange={setField('documentNo')}
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Document Year</label>
              <input
                type="number"
                placeholder="e.g. 2024"
                value={form.documentYear}
                onChange={setField('documentYear')}
              />
            </div>
            <div className="f">
              <label>Registration Date</label>
              <input
                type="date"
                value={form.registrationDate}
                onChange={setField('registrationDate')}
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Acquisition Type</label>
              <input
                type="text"
                placeholder="e.g. Sale Deed / Gift Deed"
                value={form.acquisitionType}
                onChange={setField('acquisitionType')}
              />
            </div>
            <div className="f">
              <label>Current Owner Name</label>
              <input
                type="text"
                placeholder="e.g. K. Subbarayudu"
                value={form.currentOwnerName}
                onChange={setField('currentOwnerName')}
              />
            </div>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Remarks</label>
            <textarea
              placeholder="Any additional notes..."
              value={form.remarks}
              onChange={setField('remarks')}
              rows="2"
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

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f">
              <label>Encumbrance</label>
              <select value={form.encumbranceStatus} onChange={setField('encumbranceStatus')}>
                <option value="clear">Clear</option>
                <option value="noted">Encumbrance noted</option>
                <option value="pending">EC awaited</option>
              </select>
              <span className="mut" style={{ fontSize: '10px', marginTop: '4px', display: 'block', lineHeight: '1.3' }}>
                Mortgage/loan charges verification (Clear = No liabilities, Noted = Charges exist, Awaited = Search pending).
              </span>
            </div>
            <div className="f">
              <label>Title Status</label>
              <select value={form.titleStatus} onChange={setField('titleStatus')}>
                <option value="clear">Clear title</option>
                <option value="disputed">Disputed</option>
                <option value="under_scrutiny">Under scrutiny</option>
              </select>
              <span className="mut" style={{ fontSize: '10px', marginTop: '4px', display: 'block', lineHeight: '1.3' }}>
                Ownership marketability status (Clear = Clean title, Disputed = Court dispute, Scrutiny = Link docs validation in progress).
              </span>
            </div>
          </div>

          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Title Search Modal */}
      <Modal
        isOpen={isTitleSearchModalOpen}
        onClose={() => setIsTitleSearchModalOpen(false)}
        title="Add Title Search Record"
      >
        <form onSubmit={handleTitleSearchSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="fgrid" style={{ gap: '12px' }}>
            <div className="f">
              <label>Search Date</label>
              <input
                type="date"
                value={titleSearchForm.searchDate}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, searchDate: e.target.value }))}
                required
              />
            </div>
            <div className="f">
              <label>Conducted By</label>
              <select
                value={titleSearchForm.conductedBy}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, conductedBy: e.target.value }))}
                required
              >
                <option value="">Select legal team member</option>
                {advocates.map((a) => (
                  <option key={a.id} value={a.userId || ''}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fgrid" style={{ gap: '12px', marginTop: '12px' }}>
            <div className="f">
              <label>Search Period From</label>
              <input
                type="date"
                value={titleSearchForm.periodFrom}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, periodFrom: e.target.value }))}
                required
              />
            </div>
            <div className="f">
              <label>Search Period To</label>
              <input
                type="date"
                value={titleSearchForm.periodTo}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, periodTo: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="fgrid" style={{ gap: '12px', marginTop: '12px' }}>
            <div className="f">
              <label>EC Status</label>
              <select
                value={titleSearchForm.ecStatus}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, ecStatus: e.target.value }))}
                required
              >
                <option value="clear">Clear</option>
                <option value="noted">Encumbrance noted</option>
                <option value="pending">EC awaited</option>
              </select>
            </div>
            <div className="f">
              <label>EC Reference Number</label>
              <input
                type="text"
                placeholder="e.g. EC-1024/2026"
                value={titleSearchForm.ecReferenceNo}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, ecReferenceNo: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--rule-2)', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={titleSearchForm.revenueRecordsVerified}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, revenueRecordsVerified: e.target.checked }))}
              />
              Revenue Records Verified
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={titleSearchForm.registrationRecordsVerified}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, registrationRecordsVerified: e.target.checked }))}
              />
              Registration Records Verified
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={titleSearchForm.litigationChecked}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, litigationChecked: e.target.checked }))}
              />
              Litigation Checked
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
              <input
                type="checkbox"
                checked={titleSearchForm.documentsVerified}
                onChange={(e) => setTitleSearchForm(p => ({ ...p, documentsVerified: e.target.checked }))}
              />
              Original Docs Verified
            </label>
          </div>

          <div className="f" style={{ marginTop: '12px' }}>
            <label>Search Remarks / Notes</label>
            <textarea
              placeholder="e.g. Verified link records at sub-registrar office, found no active mortgage..."
              value={titleSearchForm.remarks}
              onChange={(e) => setTitleSearchForm(p => ({ ...p, remarks: e.target.value }))}
              rows="3"
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

          <div className="modal-foot" style={{ marginTop: '20px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn g" onClick={() => setIsTitleSearchModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Adding...' : 'Add Search'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Land Document"
      >
        <form onSubmit={handleDocSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="f" style={{ marginBottom: '12px' }}>
            <label>Document Name</label>
            <input
              type="text"
              placeholder="e.g. Sale Deed copy"
              value={docForm.name}
              onChange={(e) => setDocForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="f" style={{ marginBottom: '12px' }}>
            <label>Category</label>
            <select
              value={docForm.documentCategoryId}
              onChange={(e) => setDocForm(p => ({ ...p, documentCategoryId: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="f" style={{ marginBottom: '16px' }}>
            <label>File Selection</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setDocForm(p => ({
                  ...p,
                  file,
                  name: p.name || (file ? file.name.replace(/\.[^.]+$/, '') : ''),
                }));
              }}
              required
            />
            <span className="mut" style={{ fontSize: '10px', marginTop: '4px', display: 'block' }}>
              Accepted file types: PDF, DOC, DOCX, TXT. Max size: 5MB.
            </span>
          </div>

          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn g" onClick={() => setIsDocModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        title="Add Client"
      >
        <form onSubmit={handleAddClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {clientError && (
            <div style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'rgba(235, 94, 85, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
              {clientError}
            </div>
          )}
          <FormSection title="Personal Information">
            <FormGrid columns={2}>
              <FormField label="Client Name" required={true}>
                <input type="text" placeholder="e.g. K. Subbarayudu" value={clientForm.name} onChange={(e) => setClientForm(p => ({ ...p, name: e.target.value }))} required />
              </FormField>
              <FormField label="Mobile" required={true}>
                <input type="text" inputMode="tel" placeholder="+91 98765 43210" value={clientForm.mobile} onChange={(e) => setClientForm(p => ({ ...p, mobile: formatMobile(e.target.value) }))} maxLength={17} required />
              </FormField>
              <FormField label="Email">
                <input type="email" placeholder="e.g. name@mail.in" value={clientForm.email} onChange={(e) => setClientForm(p => ({ ...p, email: e.target.value }))} />
              </FormField>
            </FormGrid>
          </FormSection>
          <FormSection title="Address Details">
            <FormGrid columns={1}>
              <FormField label="Village / Town">
                <input type="text" placeholder="e.g. Kalikiri" value={clientForm.village} onChange={(e) => setClientForm(p => ({ ...p, village: e.target.value }))} />
              </FormField>
            </FormGrid>
          </FormSection>
          <FormSection title="Identity Documents">
            <FormGrid columns={2}>
              <FormField label="Aadhaar">
                <input type="text" inputMode="numeric" placeholder="1234 5678 9012" value={clientForm.aadhaarMasked} onChange={(e) => setClientForm(p => ({ ...p, aadhaarMasked: formatAadhaar(e.target.value) }))} maxLength={14} />
              </FormField>
              <FormField label="PAN">
                <input type="text" placeholder="ABCDE1234F" value={clientForm.panMasked} onChange={(e) => setClientForm(p => ({ ...p, panMasked: formatPan(e.target.value) }))} maxLength={10} style={{ textTransform: 'uppercase' }} />
              </FormField>
            </FormGrid>
          </FormSection>
          <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={() => setIsAddClientModalOpen(false)} disabled={clientSaving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={clientSaving}>{clientSaving ? 'Saving…' : 'Add Client'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
