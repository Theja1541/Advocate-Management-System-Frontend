import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import {
  toggleActBookmark,
  openActPdf,
  downloadActPdf,
  getActs,
  createAct,
  updateAct,
  replaceActPdf,
  deleteAct,
  restoreAct,
} from '../services/actService';

const formatActEffectiveDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (value === '2024-07-01') return `w.e.f. ${day}.${month}.${year}`;
  return String(year);
};

const toUiAct = (act) => ({
  id: act.id,
  n: act.name,
  ab: act.abbreviation,
  y: formatActEffectiveDate(act.effectiveDate),
  rawEffectiveDate: act.effectiveDate || '',
  ty: act.type,
  d: act.description || '',
  sec: act.sectionsCount || 0,
  bm: Boolean(act.isBookmarked),
  pdf: act.pdfOriginalName || act.pdfFile || `${act.abbreviation}.pdf`,
  version: act.versionNumber || 1,
  uploadedBy: act.uploadedBy || 'System',
  uploadedAt: act.uploadedAt ? new Date(act.uploadedAt).toLocaleDateString('en-IN') : 'System',
  deletedAt: act.deletedAt,
});

export default function BareActs() {
  const { acts, setActs, refreshAllData } = useLegalData();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('acts', 'E');

  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const newQuery = searchParams.get('search') || '';
    setQuery(newQuery);
  }, [searchParams]);

  const [sectionQuery, setSectionQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Admin & Soft-delete state
  const [showDeleted, setShowDeleted] = useState(false);
  const [displayActs, setDisplayActs] = useState([]);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAbbrev, setFormAbbrev] = useState('');
  const [formType, setFormType] = useState('Central');
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSections, setFormSections] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch acts including deleted ones if selected
  const fetchDisplayActs = useCallback(async () => {
    try {
      const data = await getActs({ includeDeleted: showDeleted });
      setDisplayActs(data.map(toUiAct));
    } catch (err) {
      setError('Failed to fetch acts from server');
    }
  }, [showDeleted, getActs]);

  useEffect(() => {
    fetchDisplayActs();
  }, [fetchDisplayActs, acts]);

  const clearAlerts = () => {
    setError('');
    setSuccess('');
  };

  const handleBookmark = async (act) => {
    if (!act.id || busyId === act.id) return;
    clearAlerts();
    setBusyId(act.id);
    try {
      const updated = await toggleActBookmark({ actId: act.id });
      const mapped = toUiAct(updated);
      setActs((prev) =>
        prev.map((item) => (item.id === mapped.id ? { ...item, ...mapped } : item))
      );
      setSuccess('Bookmark status updated.');
    } catch (err) {
      setError(err.message || 'Failed to update bookmark');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (act) => {
    if (!act.id || busyId === act.id) return;
    clearAlerts();
    setBusyId(act.id);
    try {
      await openActPdf(act.id, act.pdf || `${act.ab}.pdf`);
    } catch (err) {
      setError(err.message || 'Failed to open bare act');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (act) => {
    if (!act.id || busyId === act.id) return;
    clearAlerts();
    setBusyId(act.id);
    try {
      await downloadActPdf(act.id, act.pdf || `${act.ab}.pdf`);
    } catch (err) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setBusyId(null);
    }
  };

  // Create bare act submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formAbbrev || !formType) {
      setError('Please fill in all required fields.');
      return;
    }
    clearAlerts();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('abbreviation', formAbbrev);
      formData.append('type', formType);
      formData.append('effectiveDate', formDate);
      formData.append('description', formDesc);
      formData.append('sectionsCount', formSections);
      if (uploadFile) {
        formData.append('pdf', uploadFile);
      }

      await createAct(formData);
      setSuccess('Bare Act created successfully.');
      setShowCreateModal(false);
      resetForm();
      if (refreshAllData) await refreshAllData();
    } catch (err) {
      setError(err.message || 'Failed to create bare act');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit bare act submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formAbbrev || !formType) {
      setError('Please fill in all required fields.');
      return;
    }
    clearAlerts();
    setIsSubmitting(true);
    try {
      await updateAct(selectedAct.id, {
        name: formName,
        abbreviation: formAbbrev,
        type: formType,
        effectiveDate: formDate,
        description: formDesc,
        sectionsCount: formSections,
      });
      setSuccess('Bare Act metadata updated.');
      setShowEditModal(false);
      if (refreshAllData) await refreshAllData();
    } catch (err) {
      setError(err.message || 'Failed to update bare act');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replace PDF submit
  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a PDF file to upload.');
      return;
    }
    clearAlerts();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('pdf', uploadFile);
      await replaceActPdf(selectedAct.id, formData);
      setSuccess('PDF document replaced successfully.');
      setShowReplaceModal(false);
      setUploadFile(null);
      if (refreshAllData) await refreshAllData();
    } catch (err) {
      setError(err.message || 'Failed to replace PDF');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete bare act
  const handleDelete = async (act) => {
    if (!window.confirm(`Are you sure you want to delete "${act.n}"?`)) return;
    clearAlerts();
    try {
      await deleteAct(act.id);
      setSuccess('Bare Act soft-deleted successfully.');
      if (refreshAllData) await refreshAllData();
    } catch (err) {
      setError(err.message || 'Failed to delete bare act');
    }
  };

  // Restore bare act
  const handleRestore = async (act) => {
    clearAlerts();
    try {
      await restoreAct(act.id);
      setSuccess('Bare Act restored successfully.');
      if (refreshAllData) await refreshAllData();
    } catch (err) {
      setError(err.message || 'Failed to restore bare act');
    }
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (act) => {
    setSelectedAct(act);
    setFormName(act.n);
    setFormAbbrev(act.ab);
    setFormType(act.ty);
    setFormDate(act.rawEffectiveDate || '');
    setFormDesc(act.d);
    setFormSections(act.sec);
    setShowEditModal(true);
  };

  const openReplace = (act) => {
    setSelectedAct(act);
    setUploadFile(null);
    setShowReplaceModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormAbbrev('');
    setFormType('Central');
    setFormDate('');
    setFormDesc('');
    setFormSections(0);
    setUploadFile(null);
  };

  const filteredActs = displayActs.filter((a) => {
    const haystack = `${a.n}${a.ab}${a.d}`.toLowerCase();
    const matchesText = !query || haystack.includes(query.toLowerCase());
    const matchesSection =
      !sectionQuery ||
      String(a.sec).includes(sectionQuery.replace(/^s\.?/i, '').trim()) ||
      haystack.includes(sectionQuery.toLowerCase());
    return matchesText && matchesSection;
  });

  return (
    <>
      <PageHeader
        title="Bare Acts"
        description="The office legal library — central and state acts, searchable, bookmarkable, downloadable."
      />

      <div className="card">
        <div className="fgrid">
          <div className="f" style={{ flex: 3 }}>
            <label>Search by act name, abbreviation or subject</label>
            <input
              type="text"
              placeholder="e.g. BNS, evidence, transfer of property"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="f" style={{ maxWidth: '150px' }}>
            <label>Section search</label>
            <input
              type="text"
              className="mono"
              placeholder="s.63"
              value={sectionQuery}
              onChange={(e) => setSectionQuery(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            {canEdit && (
              <button
                type="button"
                className="btn"
                onClick={openCreate}
              >
                Add Act
              </button>
            )}
          </div>
        </div>

        {canEdit && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              id="showDeletedCheckbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <label htmlFor="showDeletedCheckbox" style={{ fontSize: '12px', cursor: 'pointer', margin: 0 }}>
              Show Deleted Acts (Restore Mode)
            </label>
          </div>
        )}

        {error && (
          <div className="mut" style={{ marginTop: '10px', color: 'var(--tape)', padding: '6px 0' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mut" style={{ marginTop: '10px', color: 'var(--grass)', padding: '6px 0' }}>
            {success}
          </div>
        )}
      </div>

      <div id="actGrid" className="grid3">
        {filteredActs.length ? (
          filteredActs.map((a) => {
            const isSoftDeleted = !!a.deletedAt;
            return (
              <div 
                className={`act-card ${isSoftDeleted ? 'soft-deleted-act' : ''}`} 
                key={a.id || a.ab}
                style={isSoftDeleted ? { opacity: 0.6, border: '1px dashed var(--rule)' } : {}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <h4>{a.ab} {isSoftDeleted && <span style={{ color: 'var(--tape)', fontSize: '10px' }}>(Deleted)</span>}</h4>
                    <div className="ay">{a.y} · {a.ty}</div>
                  </div>
                  {!isSoftDeleted && (
                    <button
                      type="button"
                      title={a.bm ? 'Bookmarked' : 'Not bookmarked'}
                      disabled={busyId === a.id}
                      style={{
                        fontSize: '15px',
                        color: a.bm ? 'var(--brass)' : 'var(--rule)',
                        cursor: busyId === a.id ? 'wait' : 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        lineHeight: 1,
                      }}
                      onClick={() => handleBookmark(a)}
                    >
                      {a.bm ? '★' : '☆'}
                    </button>
                  )}
                </div>
                <div className="ad">{a.n} — {a.d}</div>
                
                {canEdit && (
                  <div className="mono mut" style={{ fontSize: '9px', marginBottom: '8px' }}>
                    v{a.version} · Uploaded by: {a.uploadedBy} on {a.uploadedAt}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span className="mono mut" style={{ fontSize: '10px' }}>{a.sec} sections</span>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isSoftDeleted ? (
                      canEdit && (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => handleRestore(a)}
                        >
                          Restore
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn g sm"
                          disabled={busyId === a.id}
                          onClick={() => handleOpen(a)}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="btn g sm"
                          disabled={busyId === a.id}
                          onClick={() => handleDownload(a)}
                        >
                          PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {canEdit && !isSoftDeleted && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '6px',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--rule)'
                  }}>
                    <button
                      type="button"
                      className="btn sm g"
                      style={{ fontSize: '10px', padding: '2px 8px' }}
                      title="Edit metadata"
                      onClick={() => openEdit(a)}
                    >
                      Edit Metadata
                    </button>
                    <button
                      type="button"
                      className="btn sm g"
                      style={{ fontSize: '10px', padding: '2px 8px' }}
                      title="Replace PDF file"
                      onClick={() => openReplace(a)}
                    >
                      Replace PDF
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      style={{ color: 'var(--tape)', fontSize: '10px', padding: '2px 8px', border: '1px solid var(--tape)', background: 'none' }}
                      title="Soft delete"
                      onClick={() => handleDelete(a)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="empty">No act matches that search.</div>
          </div>
        )}
      </div>

      {/* Modal: Create Bare Act */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '450px', padding: '24px' }}>
            <h3>Create Bare Act</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div className="f">
                <label>Act Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="f">
                <label>Abbreviation *</label>
                <input type="text" placeholder="e.g. BNS" value={formAbbrev} onChange={(e) => setFormAbbrev(e.target.value)} required />
              </div>
              <div className="f">
                <label>Jurisdiction Type *</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="Central">Central</option>
                  <option value="State — A.P.">State — A.P.</option>
                  <option value="State — Other">State — Other</option>
                </select>
              </div>
              <div className="f">
                <label>Effective Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="f">
                <label>Description</label>
                <textarea rows="2" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}></textarea>
              </div>
              <div className="f">
                <label>Sections Count</label>
                <input type="number" min="0" value={formSections} onChange={(e) => setFormSections(e.target.value)} />
              </div>
              <div className="f">
                <label>Upload Act PDF *</label>
                <input type="file" accept="application/pdf" onChange={(e) => setUploadFile(e.target.files[0])} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn g" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Metadata */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '450px', padding: '24px' }}>
            <h3>Edit Act Details</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div className="f">
                <label>Act Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="f">
                <label>Abbreviation *</label>
                <input type="text" value={formAbbrev} onChange={(e) => setFormAbbrev(e.target.value)} required />
              </div>
              <div className="f">
                <label>Jurisdiction Type *</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="Central">Central</option>
                  <option value="State — A.P.">State — A.P.</option>
                  <option value="State — Other">State — Other</option>
                </select>
              </div>
              <div className="f">
                <label>Effective Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="f">
                <label>Description</label>
                <textarea rows="2" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}></textarea>
              </div>
              <div className="f">
                <label>Sections Count</label>
                <input type="number" min="0" value={formSections} onChange={(e) => setFormSections(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn g" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Replace PDF File */}
      {showReplaceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '450px', padding: '24px' }}>
            <h3>Replace PDF File</h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-light)', marginBottom: '12px' }}>
              Select a new PDF file to overwrite the document for <strong>{selectedAct?.ab}</strong>.
            </p>
            <form onSubmit={handleReplaceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="f">
                <label>Choose New PDF *</label>
                <input type="file" accept="application/pdf" onChange={(e) => setUploadFile(e.target.files[0])} required />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn g" onClick={() => setShowReplaceModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading...' : 'Replace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
