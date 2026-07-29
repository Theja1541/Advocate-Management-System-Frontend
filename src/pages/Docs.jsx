import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { DOC_CATS } from '../data/mockData';
import {
  getDocuments,
  uploadDocument,
  updateDocument,
  previewDocument,
  downloadDocument,
  deleteDocument,
} from '../services/documentService';
import { getCases } from '../services/caseService';

const emptyForm = {
  name: '',
  category: DOC_CATS[0],
  caseId: '',
  file: null,
};

const formatUploadDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Docs() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('docs', 'E');

  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docList, caseList] = await Promise.all([getDocuments(), getCases()]);
      setDocuments(docList);
      setCases(caseList);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCaseNo = (doc) =>
    doc?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(doc.caseId))?.caseNo ||
    '—';

  const getUploaderName = (doc) => doc?.uploader?.name || '—';

  const q = query.trim().toLowerCase();
  const filteredDocs = documents.filter((d) => {
    if (filter !== 'all' && d.category !== filter) return false;
    if (!q) return true;
    const haystack = [
      d.documentCode,
      d.name,
      d.category,
      d.fileType,
      d.fileSize,
      getCaseNo(d),
      getUploaderName(d),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const openModal = () => {
    setEditingDoc(null);
    setForm({
      ...emptyForm,
      caseId: cases[0] ? String(cases[0].id) : '',
      category: DOC_CATS[0],
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setForm({
      name: doc.name || '',
      category: doc.category || DOC_CATS[0],
      caseId: doc.caseId != null ? String(doc.caseId) : '',
      file: null,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.caseId) {
      setError('Please fill out all required fields.');
      return;
    }
    if (!editingDoc && !form.file) {
      setError('Please select a file to upload.');
      return;
    }

    // Optional client-side size check (e.g., 10MB limit)
    if (form.file && form.file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingDoc) {
        const updated = await updateDocument(editingDoc.id, {
          name: form.name.trim(),
          category: form.category,
          caseId: Number(form.caseId),
          file: form.file,
        });
        setDocuments((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        const created = await uploadDocument({
          name: form.name.trim(),
          category: form.category,
          caseId: Number(form.caseId),
          file: form.file,
        });
        setDocuments((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (doc) => {
    setError('');
    try {
      await downloadDocument(doc.id, `${doc.documentCode}-${doc.name}`);
    } catch (err) {
      setError(err.message || 'Failed to download document');
    }
  };

  const handlePreview = async (doc) => {
    setError('');
    try {
      const blob = await previewDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to preview document');
    }
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(
      `Delete document "${doc.name}" (${doc.documentCode})?`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const headers = [
    { label: 'Ref' },
    { label: 'Document' },
    { label: 'Category' },
    { label: 'Case no.' },
    { label: 'Type' },
    { label: 'Size', className: 'r' },
    { label: 'Uploaded by' },
    { label: 'Date' },
    { label: 'Actions', className: 'c' },
  ];

  const headerActions = canEdit ? (
    <button className="btn" onClick={openModal} disabled={!cases.length}>
      Upload document
    </button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Documents"
        description="Everything filed, ordered or received — held against the case it belongs to."
        actions={headerActions}
      />

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search documents</label>
            <input
              type="text"
              placeholder="Ref, name, case no., category…"
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
        {DOC_CATS.map((c) => (
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

      {canEdit && !cases.length && !loading && (
        <div className="card mut" style={{ marginBottom: '12px', fontSize: '12.5px' }}>
          Add at least one case before uploading documents.
        </div>
      )}

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">Loading documents…</div>
            </td>
          </tr>
        ) : filteredDocs.length ? (
          filteredDocs.map((d) => (
            <tr key={d.id}>
              <td>
                <span className="cno-c">{d.documentCode}</span>
              </td>
              <td>
                <span className="nm">{d.name}</span>
              </td>
              <td>
                <Chip type="c-ink" label={d.category} />
              </td>
              <td>
                <span className="cno-c">{getCaseNo(d)}</span>
              </td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {d.fileType}
              </td>
              <td className="r mono" style={{ fontSize: '11px' }}>
                {d.fileSize}
              </td>
              <td className="mut">{getUploaderName(d)}</td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {formatUploadDate(d.uploadDate)}
              </td>
              <td className="c" style={{ whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  className="btn g sm"
                  onClick={() => handlePreview(d)}
                  style={{ marginRight: '6px' }}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="btn g sm"
                  onClick={() => handleDownload(d)}
                  style={{ marginRight: canEdit ? '6px' : 0 }}
                >
                  Download
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => openEditModal(d)}
                      style={{ marginRight: '6px' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleDelete(d)}
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
          ))
        ) : (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">No documents in this category.</div>
            </td>
          </tr>
        )}
      </DataTable>

      <div className="card">
        <div className="card-s" style={{ margin: 0 }}>
          Accepted formats — PDF, DOC, DOCX, JPG, PNG. Documents inherit the access rules of the case they are attached to.
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDoc ? 'Edit Document' : 'Upload Document'}>
        <form
          onSubmit={handleSubmit}
          className="fgrid"
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
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
            <label>Document Name</label>
            <input
              type="text"
              placeholder="e.g. Plaint copy"
              value={form.name}
              onChange={setField('name')}
              required
            />
          </div>
          <div className="f">
            <label>Category</label>
            <select value={form.category} onChange={setField('category')}>
              {DOC_CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Case Number</label>
            <select value={form.caseId} onChange={setField('caseId')} required>
              <option value="">Select case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNo}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>{editingDoc ? 'Replace File (Optional)' : 'File'}</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  file: e.target.files?.[0] || null,
                  name:
                    prev.name ||
                    (e.target.files?.[0]
                      ? e.target.files[0].name.replace(/\.[^.]+$/, '')
                      : ''),
                }))
              }
              required={!editingDoc}
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? (editingDoc ? 'Saving…' : 'Uploading…') : (editingDoc ? 'Save Changes' : 'Upload Document')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
