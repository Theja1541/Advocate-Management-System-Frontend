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
import { getClients } from '../services/clientService';
import { getCases } from '../services/caseService';
import SearchableSelect from '../components/ui/SearchableSelect';


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
  encumbranceStatus: 'clear',
  titleStatus: 'clear',
  caseId: '',
};

export default function Land() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('land', 'E');

  const [lands, setLands] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [landList, clientList, caseList] = await Promise.all([
        getLands(),
        getClients(),
        getCases(),
      ]);
      setLands(landList);
      setClients(clientList);
      setCases(caseList);
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
            <label>Client / Owner</label>
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
              <label>Encumbrance</label>
              <select value={form.encumbranceStatus} onChange={setField('encumbranceStatus')}>
                <option value="clear">Clear</option>
                <option value="noted">Encumbrance noted</option>
                <option value="pending">EC awaited</option>
              </select>
            </div>
            <div className="f">
              <label>Title Status</label>
              <select value={form.titleStatus} onChange={setField('titleStatus')}>
                <option value="clear">Clear title</option>
                <option value="disputed">Disputed</option>
                <option value="under_scrutiny">Under scrutiny</option>
              </select>
            </div>
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
