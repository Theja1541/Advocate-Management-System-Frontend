import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import {
  getLegalTexts,
  createLegalText,
  updateLegalText,
  deleteLegalText,
} from '../services/legalTextService';
import { useSmartText } from '../hooks/useSmartText';
import SmartTextGroupModal from '../components/ui/SmartTextGroupModal';
import SmartTextContextPanel from '../components/ui/SmartTextContextPanel';
import jsPDF from 'jspdf';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const emptyForm = {
  title: '',
  content: '',
  category: '',
};

const CATEGORIES = ['Civil', 'Criminal', 'Bail', 'Property', 'Family', 'General'];

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

export default function LegalTexts() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('legalTexts', 'E');
  const { showToast } = useToast();
  const fileInputRef = React.useRef(null);

  const PAGE_SIZE = 10;

  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const {
    searchQuery,
    searchResults,
    isGroupModalOpen,
    handleSaveIntercept,
    onGroupChoice,
    onIndependentChoice,
    onCancelModal,
    performGrouping,
    performAppend
  } = useSmartText('LegalText', form.content, !!editingText);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLegalTexts({
        limit: PAGE_SIZE,
        page: page,
        search: query.trim() || undefined,
        category: categoryFilter || undefined,
      });
      setTexts(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load legal texts');
    } finally {
      setLoading(false);
    }
  }, [page, query, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter]);

  const openAddModal = () => {
    setEditingText(null);
    setForm(emptyForm);
    setError('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    let extractedText = '';
    let title = file.name.replace(/\.[^/.]+$/, "");

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        extractedText = fullText;
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      }

      setForm({
        title: title,
        content: extractedText.trim(),
        category: 'General',
      });
      setEditingText(null);
      setError('');
      setFormErrors({});
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Error parsing file', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openEditModal = (item) => {
    setEditingText(item);
    setForm({
      title: item.title || '',
      content: item.content || '',
      category: item.category || '',
    });
    setError('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingText(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e, forceAction = null) => {
    if (e) e.preventDefault();
    
    handleSaveIntercept(async (groupingInfo) => {
      
      if (groupingInfo && groupingInfo.isAppended) {
        setSaving(true);
        setFormErrors({});
        try {
          await performAppend(form.content.trim(), groupingInfo);
          showToast('Appended to existing text successfully!', 'success');
          loadData();
          closeModal();
        } catch (err) {
          const msg = err.response?.data?.message || err.message || 'Failed to append text';
          setFormErrors({ _global: msg });
          showToast(msg, 'error');
        } finally {
          setSaving(false);
        }
        return; // Skip new record creation
      }

      const errors = {};
      let hasErrors = false;

      let finalTitle = form.title.trim();
      let finalCategory = form.category;

      if (groupingInfo && groupingInfo.selectedExisting) {
        if (!finalTitle) finalTitle = `Related to ${groupingInfo.phrase}`;
        if (!finalCategory) finalCategory = 'General';
      }

      if (!finalTitle) {
        errors.title = 'Title is required.';
        hasErrors = true;
      }
      if (!form.content.trim()) {
        errors.content = 'Content is required.';
        hasErrors = true;
      }
      if (!finalCategory) {
        errors.category = 'Category is required.';
        hasErrors = true;
      }

      if (hasErrors) {
        setFormErrors(errors);
        return;
      }

      setSaving(true);
      setFormErrors({});

      const payload = {
        title: finalTitle,
        content: form.content.trim(),
        category: finalCategory,
      };

      try {
        let savedRecord;
        if (editingText) {
          savedRecord = await updateLegalText(editingText.id, payload);
          showToast('Legal Text updated successfully!', 'success');
        } else {
          savedRecord = await createLegalText(payload);
          showToast('Legal Text created successfully!', 'success');
        }

        if (groupingInfo) {
          await performGrouping(savedRecord.data.id, groupingInfo);
        }

        loadData();
        closeModal();
      } catch (err) {
        const msg = err.message || 'Failed to save legal text';
        setFormErrors({ _global: msg });
        showToast(msg, 'error');
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = (item) => {
    setDeleteConfirmTarget(item);
  };

  const executeDelete = async () => {
    if (!deleteConfirmTarget) return;
    setSaving(true);
    try {
      await deleteLegalText(deleteConfirmTarget.id);
      showToast('Legal Text deleted successfully!', 'success');
      loadData();
      setDeleteConfirmTarget(null);
    } catch (err) {
      const msg = err.message || 'Failed to delete legal text';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (item, format) => {
    if (format === 'txt') {
      const element = document.createElement("a");
      const file = new Blob([`${item.title}\n\n${item.content}`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else if (format === 'doc') {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + `<h1>${item.title}</h1><p>${item.content.replace(/\n/g, '<br>')}</p>` + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(item.title, 170);
      doc.text(titleLines, 20, 20);
      doc.setFontSize(12);
      const titleHeight = titleLines.length * 7;
      const splitText = doc.splitTextToSize(item.content, 170);
      doc.text(splitText, 20, 20 + titleHeight + 5);
      doc.save(`${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    }
  };

  return (
    <>
      <PageHeader
        title="Smart Legal Text Library"
        description="Save and reuse common legal paragraphs, templates, and clauses."
        actions={
          canEdit && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.pdf,.docx"
                onChange={handleFileUpload}
              />
              <button className="btn outline" onClick={() => fileInputRef.current?.click()} disabled={loading || saving}>
                Upload
              </button>
              <button className="btn primary" onClick={openAddModal} disabled={loading || saving}>
                Add Text
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
        <div className="fgrid">
          <div className="f" style={{ flex: 2 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by title, content, or category..."
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
          <div className="f" style={{ flex: 1 }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#fff',
                height: '46px'
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: '12px', padding: '16px' }}>
          {error}
        </div>
      )}

      <div id="textsWrap" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="card mut" style={{ textAlign: 'center', padding: '48px', borderRadius: '12px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', display: 'block', width: '28px', height: '28px', borderWidth: '3px' }}></div>
            Loading legal texts…
          </div>
        ) : texts.length > 0 ? (
          texts.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s', ':hover': { boxShadow: 'var(--shadow-md)' } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{item.title}</h3>
                  <span className="chip" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>{item.category}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" className="btn g sm" onClick={() => handleDownload(item, 'pdf')} title="Download PDF">PDF</button>
                    <button type="button" className="btn g sm" onClick={() => handleDownload(item, 'doc')} title="Download Word">Word</button>
                    <button type="button" className="btn g sm" onClick={() => handleDownload(item, 'txt')} title="Download Text">TXT</button>
                  </div>
                  {canEdit && (
                    <>
                      <button type="button" className="btn outline sm" onClick={() => openEditModal(item)} disabled={saving}>Edit</button>
                      <button type="button" className="btn danger sm outline" onClick={() => handleDelete(item)} disabled={saving}>Delete</button>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                {item.content}
              </div>

              <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Created: {formatDateTime(item.createdAt)}</span>
                {item.updatedAt !== item.createdAt && <span>Updated: {formatDateTime(item.updatedAt)}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="card empty-state" style={{ padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'transparent' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No legal texts found</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Try adjusting your search or add a new text.</div>
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
        title={editingText ? 'Edit Legal Text' : 'Add Legal Text'}
        allowFullscreen={true}
      >
        <form onSubmit={handleSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch', flex: 1, display: 'flex' }}>
          {formErrors._global && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '8px', flexShrink: 0 }}>
              {formErrors._global}
            </div>
          )}

          <style>{`
            .title-category-row { display: flex; gap: 12px; }
            .modal-content:not(.fullscreen) .title-category-row { flex-direction: column; gap: 0; }
          `}</style>
          
          <div className="title-category-row" style={{ flexShrink: 0 }}>
            <div className="f" style={{ marginBottom: '12px', flex: 1 }}>
              <label>Title</label>
              <input
                type="text"
                placeholder="Enter title..."
                value={form.title}
                onChange={setField('title')}
              />
              {formErrors.title && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.title}</span>}
            </div>

            <div className="f" style={{ marginBottom: '12px', flex: 1 }}>
              <label>Category</label>
              <select value={form.category} onChange={setField('category')}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {formErrors.category && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block' }}>{formErrors.category}</span>}
            </div>
          </div>

          <div className="f" style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label style={{ flexShrink: 0 }}>Content</label>
            <textarea
              placeholder="Enter legal text or paragraph..."
              value={form.content}
              onChange={setField('content')}
              style={{ minHeight: '150px', resize: 'vertical', width: '100%', padding: '10px', flex: 1 }}
            />
            {formErrors.content && <span style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '3px', display: 'block', flexShrink: 0 }}>{formErrors.content}</span>}
            <SmartTextContextPanel occurrences={searchResults?.occurrences} searchQuery={searchQuery} />
          </div>

          <div className="modal-foot" style={{ marginTop: 'auto', padding: '12px 0 0', flexShrink: 0 }}>
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
            Are you sure you want to delete <b>{deleteConfirmTarget?.title}</b>?
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

      <SmartTextGroupModal
        isOpen={isGroupModalOpen}
        onClose={onCancelModal}
        onGroup={onGroupChoice}
        onIndependent={onIndependentChoice}
        data={{ query: searchQuery, occurrences: searchResults?.occurrences, phraseGroup: searchResults?.phraseGroup }}
      />
    </>
  );
}
