import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getDocuments,
  getDocumentById,
  getDocumentText,
  uploadDocument,
  updateDocument,
  previewDocument,
  downloadDocument,
  deleteDocument,
} from '../services/documentService';
import { getDiaryById } from '../services/diaryService';
import { getCases } from '../services/caseService';
import { getDocumentCategories } from '../services/caseMastersService';
import { searchNotesAndDocuments } from '../services/searchService';
import { extractTextFromPdfBlob } from '../utils/pdfTextExtract';
import PdfFindViewer from '../components/documents/PdfFindViewer';

const emptyForm = {
  name: '',
  documentCategoryId: '',
  caseId: '',
  file: null,
  uploadType: 'file',
  textContent: '',
};

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt'];

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text, keyword) => {
  const content = String(text || '');
  const q = String(keyword || '').trim();
  if (!q) return content;
  const pattern = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = content.split(pattern);
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={`hl-${idx}`}
        style={{
          background: 'rgba(212, 175, 55, 0.24)',
          color: 'inherit',
          padding: '0 1px',
          borderRadius: '2px',
        }}
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={`tx-${idx}`}>{part}</React.Fragment>
    )
  );
};

const getNormalizedSearchTerm = (value) => String(value || '').trim();

export default function Docs() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('docs', 'E');

  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState({
    loading: false,
    error: '',
    results: [],
    total: 0,
  });
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    loading: false,
    error: '',
    title: '',
    type: '',
    content: '',
    previewUrl: '',
  });
  const [viewerSearch, setViewerSearch] = useState('');
  const [viewerActiveMatch, setViewerActiveMatch] = useState(0);
  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [pdfMatchCount, setPdfMatchCount] = useState(0);
  const viewerContentRef = useRef(null);
  const viewerPreviewUrlRef = useRef('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docList, caseList, catList] = await Promise.all([
        getDocuments(),
        getCases(),
        getDocumentCategories(true), // activeOnly = true
      ]);
      setDocuments(docList);
      setCases(caseList);
      setCategories(catList);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setSearchState({
        loading: false,
        error: '',
        results: [],
        total: 0,
      });
      return undefined;
    }

    let cancelled = false;
    setSearchState((prev) => ({ ...prev, loading: true, error: '' }));

    const timer = setTimeout(async () => {
      try {
        const data = await searchNotesAndDocuments({ keyword, limit: 50 });
        if (cancelled) return;
        setSearchState({
          loading: false,
          error: '',
          results: data.results || [],
          total: Number(data.total || 0),
        });
      } catch (err) {
        if (cancelled) return;
        setSearchState({
          loading: false,
          error: err.message || 'Search failed',
          results: [],
          total: 0,
        });
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const getCaseNo = (doc) =>
    doc?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(doc.caseId))?.caseNo ||
    '—';

  const getUploaderName = (doc) => doc?.uploader?.name || '—';

  const getCategoryName = (doc) =>
    doc?.documentCategory?.name || doc?.category || '—';

  const q = query.trim().toLowerCase();
  const filteredDocs = documents.filter((d) => {
    if (filter !== 'all' && String(d.documentCategoryId) !== String(filter)) return false;
    if (!q) return true;
    const haystack = [
      d.documentCode,
      d.name,
      getCategoryName(d),
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

  const showGlobalSearch = query.trim().length >= 2;
  const groupedSearch = useMemo(() => {
    const grouped = { notes: [], documents: [] };
    for (const item of searchState.results) {
      if (item?.type === 'NOTE') grouped.notes.push(item);
      else if (item?.type === 'DOCUMENT') grouped.documents.push(item);
    }
    return grouped;
  }, [searchState.results]);

  const viewerMatches = useMemo(() => {
    if (viewerState.previewUrl) {
      return Array.from({ length: pdfMatchCount }, (_, i) => i);
    }
    const needle = getNormalizedSearchTerm(viewerSearch).toLowerCase();
    const hay = String(viewerState.content || '').toLowerCase();
    if (!needle || !hay) return [];
    const indices = [];
    let startAt = 0;
    while (startAt < hay.length) {
      const idx = hay.indexOf(needle, startAt);
      if (idx === -1) break;
      indices.push(idx);
      startAt = idx + Math.max(needle.length, 1);
    }
    return indices;
  }, [viewerSearch, viewerState.content, viewerState.previewUrl, pdfMatchCount]);

  useEffect(() => {
    if (!viewerMatches.length) {
      setViewerActiveMatch(0);
      return;
    }
    if (viewerActiveMatch >= viewerMatches.length) {
      setViewerActiveMatch(0);
    }
  }, [viewerMatches, viewerActiveMatch]);

  useEffect(() => {
    if (viewerState.previewUrl) return;
    if (!viewerState.isOpen || !viewerMatches.length || !viewerSearch.trim()) return;
    const target = viewerContentRef.current?.querySelector(
      `#doc-view-match-${viewerActiveMatch}`
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [viewerState.isOpen, viewerState.previewUrl, viewerMatches, viewerActiveMatch, viewerSearch]);

  const openModal = () => {
    setEditingDoc(null);
    setForm({
      ...emptyForm,
      caseId: cases[0] ? String(cases[0].id) : '',
      documentCategoryId: categories[0] ? String(categories[0].id) : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = async (doc) => {
    setEditingDoc(doc);
    setError('');
    
    // Set initial values
    setForm({
      name: doc.name || '',
      documentCategoryId: doc.documentCategoryId != null ? String(doc.documentCategoryId) : (categories[0] ? String(categories[0].id) : ''),
      caseId: doc.caseId != null ? String(doc.caseId) : '',
      file: null,
      textContent: doc.fileType === 'TXT' ? 'Loading content...' : '',
    });
    setIsModalOpen(true);

    if (doc.fileType === 'TXT') {
      try {
        const blob = await previewDocument(doc.id);
        const textVal = await blob.text();
        setForm((prev) => ({
          ...prev,
          textContent: textVal,
        }));
      } catch (err) {
        setForm((prev) => ({
          ...prev,
          textContent: '',
        }));
        setError('Failed to load text document content.');
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
    setForm(emptyForm);
  };

  const revokeViewerPreviewUrl = () => {
    if (viewerPreviewUrlRef.current) {
      window.URL.revokeObjectURL(viewerPreviewUrlRef.current);
      viewerPreviewUrlRef.current = '';
    }
  };

  const closeViewer = () => {
    revokeViewerPreviewUrl();
    setViewerState({
      isOpen: false,
      loading: false,
      error: '',
      title: '',
      type: '',
      content: '',
      previewUrl: '',
    });
    setViewerSearch('');
    setViewerActiveMatch(0);
    setViewerFullscreen(false);
    setPdfMatchCount(0);
  };

  const openDocumentViewer = async (docId, fallbackTitle = 'Document', fallbackType = 'DOCUMENT') => {
    revokeViewerPreviewUrl();
    setViewerFullscreen(false);
    setPdfMatchCount(0);
    setViewerState({
      isOpen: true,
      loading: true,
      error: '',
      title: fallbackTitle,
      type: fallbackType,
      content: '',
      previewUrl: '',
    });
    setViewerSearch('');
    setViewerActiveMatch(0);

    try {
      const doc = await getDocumentById(docId);
      const fileType = String(doc?.fileType || fallbackType).toUpperCase();
      let contentText = String(doc?.searchContent || '').trim();
      let previewUrl = '';

      const [textPayload, blob] = await Promise.all([
        getDocumentText(docId).catch(() => ({ text: '' })),
        previewDocument(docId),
      ]);

      contentText = String(textPayload?.text || contentText || '').trim();

      if (fileType === 'PDF') {
        previewUrl = window.URL.createObjectURL(
          new Blob([blob], { type: 'application/pdf' })
        );
        viewerPreviewUrlRef.current = previewUrl;
        if (!contentText) {
          try {
            contentText = await extractTextFromPdfBlob(blob);
          } catch {
            contentText = '';
          }
        }
      } else if (fileType === 'TXT' && !contentText) {
        contentText = await blob.text();
      }

      setViewerState({
        isOpen: true,
        loading: false,
        error: '',
        title: doc?.name || fallbackTitle,
        type: fileType,
        content: contentText,
        previewUrl,
      });
    } catch (err) {
      setViewerState({
        isOpen: true,
        loading: false,
        error: err.message || 'Failed to load viewer content.',
        title: fallbackTitle,
        type: fallbackType,
        content: '',
        previewUrl: '',
      });
    }
  };

  const openNoteViewer = async (noteId, fallbackTitle = 'Note') => {
    revokeViewerPreviewUrl();
    setViewerFullscreen(false);
    setViewerState({
      isOpen: true,
      loading: true,
      error: '',
      title: fallbackTitle,
      type: 'NOTE',
      content: '',
      previewUrl: '',
    });
    setViewerSearch('');
    setViewerActiveMatch(0);

    try {
      const diary = await getDiaryById(noteId);
      setViewerState({
        isOpen: true,
        loading: false,
        error: '',
        title: fallbackTitle,
        type: 'NOTE',
        content: String(diary?.note || '').trim() || 'No note content available.',
        previewUrl: '',
      });
    } catch (err) {
      setViewerState({
        isOpen: true,
        loading: false,
        error: err.message || 'Failed to load note content.',
        title: fallbackTitle,
        type: 'NOTE',
        content: '',
        previewUrl: '',
      });
    }
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.caseId || !form.documentCategoryId) {
      setError('Please fill out all required fields.');
      return;
    }

    let fileToUpload = form.file;
    if (!fileToUpload && form.textContent.trim()) {
      const fileName = form.name.trim() ? `${form.name.trim().replace(/[\s/\\?%*:|"<>]/g, '_')}.txt` : 'document.txt';
      const blob = new Blob([form.textContent], { type: 'text/plain' });
      fileToUpload = new File([blob], fileName, { type: 'text/plain' });
    }

    if (!editingDoc && !fileToUpload) {
      setError('Please select a file to upload OR write some text content.');
      return;
    }

    if (fileToUpload) {
      const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(fileExt)) {
        setError('Invalid file format. Accepted types: PDF, DOC, DOCX, TXT.');
        return;
      }

      if (fileToUpload.size > MAX_DOCUMENT_SIZE_BYTES) {
        setError('File size must be less than or equal to 5MB.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      if (editingDoc) {
        await updateDocument(editingDoc.id, {
          name: form.name.trim(),
          documentCategoryId: Number(form.documentCategoryId),
          caseId: Number(form.caseId),
          file: fileToUpload,
        });
      } else {
        await uploadDocument({
          name: form.name.trim(),
          documentCategoryId: Number(form.documentCategoryId),
          caseId: Number(form.caseId),
          file: fileToUpload,
        });
      }
      await loadData();
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
      await openDocumentViewer(doc.id, doc.name || 'Document', doc.fileType || 'DOCUMENT');
    } catch (err) {
      setError(err.message || 'Failed to preview document');
    }
  };

  const highlightedViewerContent = useMemo(() => {
    const text = String(viewerState.content || '');
    const needle = getNormalizedSearchTerm(viewerSearch);
    if (!needle) return text;

    const escapedNeedle = escapeRegExp(needle);
    const regex = new RegExp(escapedNeedle, 'ig');
    const nodes = [];
    let lastIndex = 0;
    let matchIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(
          <React.Fragment key={`txt-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </React.Fragment>
        );
      }
      const isActive = matchIndex === viewerActiveMatch;
      nodes.push(
        <mark
          key={`mark-${match.index}-${matchIndex}`}
          id={`doc-view-match-${matchIndex}`}
          style={{
            background: isActive ? 'rgba(235, 94, 85, 0.28)' : 'rgba(212, 175, 55, 0.24)',
            color: 'inherit',
            padding: '0 1px',
            borderRadius: '2px',
          }}
        >
          {match[0]}
        </mark>
      );
      lastIndex = match.index + match[0].length;
      matchIndex += 1;
    }

    if (lastIndex < text.length) {
      nodes.push(
        <React.Fragment key={`txt-tail-${lastIndex}`}>
          {text.slice(lastIndex)}
        </React.Fragment>
      );
    }

    return nodes;
  }, [viewerState.content, viewerSearch, viewerActiveMatch]);

  const goToNextViewerMatch = () => {
    if (!viewerMatches.length) return;
    setViewerActiveMatch((prev) => (prev + 1) % viewerMatches.length);
  };

  const goToPrevViewerMatch = () => {
    if (!viewerMatches.length) return;
    setViewerActiveMatch((prev) => (prev - 1 + viewerMatches.length) % viewerMatches.length);
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(
      `Delete document "${doc.name}" (${doc.documentCode})?`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteDocument(doc.id);
      await loadData();
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
            <label>Search notes and documents</label>
            <input
              type="text"
              placeholder="Keyword in note or document..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showGlobalSearch && (
        <div className="card" style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div className="card-s" style={{ margin: 0 }}>
              Matching Notes & Documents
            </div>
            {!searchState.loading && !searchState.error && (
              <div className="mut mono" style={{ fontSize: '11px' }}>
                {searchState.total} result{searchState.total === 1 ? '' : 's'}
              </div>
            )}
          </div>

          {searchState.loading ? (
            <div className="mut" style={{ fontSize: '12.5px' }}>Searching…</div>
          ) : searchState.error ? (
            <div style={{ color: 'var(--tape)', fontSize: '12.5px' }}>{searchState.error}</div>
          ) : searchState.results.length === 0 ? (
            <div className="mut" style={{ fontSize: '12.5px' }}>No matching records found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupedSearch.documents.map((result) => (
                <div
                  key={`doc-search-${result.documentId}`}
                  style={{
                    border: '1px solid var(--rule)',
                    borderRadius: '6px',
                    padding: '10px',
                    background: 'var(--panel)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {highlightText(result.name, query)}
                      </div>
                      <div className="mono mut" style={{ fontSize: '10.5px', marginTop: '2px' }}>
                        DOCUMENT
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => openDocumentViewer(result.documentId, result.name, result.type)}
                    >
                      View
                    </button>
                  </div>
                  <div style={{ marginTop: '7px', fontSize: '12px', lineHeight: 1.5 }}>
                    {highlightText(result.snippet, query)}
                  </div>
                </div>
              ))}

              {groupedSearch.notes.map((result) => (
                <div
                  key={`note-search-${result.documentId}`}
                  style={{
                    border: '1px solid var(--rule)',
                    borderRadius: '6px',
                    padding: '10px',
                    background: 'var(--panel)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {highlightText(result.name, query)}
                      </div>
                      <div className="mono mut" style={{ fontSize: '10.5px', marginTop: '2px' }}>
                        NOTE
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => openNoteViewer(result.documentId, result.name)}
                    >
                      Open
                    </button>
                  </div>
                  <div style={{ marginTop: '7px', fontSize: '12px', lineHeight: 1.5 }}>
                    {highlightText(result.snippet, query)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="filt">
        <button
          type="button"
          className={filter === 'all' ? 'on' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={String(filter) === String(c.id) ? 'on' : ''}
            onClick={() => setFilter(String(c.id))}
          >
            {c.name}
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
            <tr key={d.id} onClick={() => handlePreview(d)} style={{ cursor: 'pointer' }} title="Click to view/preview document">
              <td>
                <span className="cno-c">{d.documentCode}</span>
              </td>
              <td>
                <span className="nm">{d.name}</span>
              </td>
              <td>
                <Chip type="c-ink" label={getCategoryName(d)} />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(d);
                  }}
                  style={{ marginRight: canEdit ? '6px' : 0 }}
                >
                  Download
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(d);
                      }}
                      style={{ marginRight: '6px' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d);
                      }}
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
          Accepted formats — PDF, DOC, DOCX, TXT. Max size: 5MB. Documents inherit the access rules of the case they are attached to.
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
            <select value={form.documentCategoryId} onChange={setField('documentCategoryId')} required>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            {editingDoc && (
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                Current file: <strong>{editingDoc.fileType}</strong> ({editingDoc.fileSize})
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
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
              required={false}
            />
          </div>
          <div style={{ textAlign: 'center', margin: '4px 0', fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold', letterSpacing: '0.1em' }}>— OR —</div>
          <div className="f">
            <label>{editingDoc ? 'Replace File with Text (Optional)' : 'Text Content'}</label>
            <textarea
              placeholder="Type or paste document content here to upload as a text file..."
              rows={5}
              value={form.textContent}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  textContent: e.target.value,
                  name: prev.name || 'Text Document',
                }))
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--rule)',
                borderRadius: '6px',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              required={false}
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

      <Modal
        isOpen={viewerState.isOpen}
        onClose={closeViewer}
        title={viewerState.title || `${viewerState.type || 'DOCUMENT'} Viewer`}
        className={`document-viewer-modal${viewerFullscreen ? ' is-fullscreen' : ''}`}
      >
        <div className="doc-viewer">
          <div className="doc-viewer-toolbar">
            <div className="doc-viewer-search">
              <input
                type="text"
                placeholder="Find in document…"
                value={viewerSearch}
                onChange={(e) => {
                  setViewerSearch(e.target.value);
                  setViewerActiveMatch(0);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (e.shiftKey) goToPrevViewerMatch();
                  else goToNextViewerMatch();
                }}
              />
              <span className="doc-viewer-count">
                {viewerState.loading
                  ? '…'
                  : getNormalizedSearchTerm(viewerSearch)
                    ? viewerMatches.length
                      ? `${viewerActiveMatch + 1} of ${viewerMatches.length}`
                      : 'No matches'
                    : ''}
              </span>
            </div>
            <div className="doc-viewer-actions">
              <button type="button" className="btn g sm" onClick={goToPrevViewerMatch} disabled={!viewerMatches.length}>
                Previous
              </button>
              <button type="button" className="btn g sm" onClick={goToNextViewerMatch} disabled={!viewerMatches.length}>
                Next
              </button>
              <button
                type="button"
                className="btn g sm"
                onClick={() => {
                  setViewerSearch('');
                  setViewerActiveMatch(0);
                }}
                disabled={!viewerSearch}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => setViewerFullscreen((prev) => !prev)}
              >
                {viewerFullscreen ? 'Exit full screen' : 'Full screen'}
              </button>
            </div>
          </div>

          <div className="doc-viewer-stage">
            {viewerState.loading ? (
              <div className="doc-viewer-empty">Loading document…</div>
            ) : viewerState.error ? (
              <div className="doc-viewer-empty is-error">{viewerState.error}</div>
            ) : viewerState.previewUrl ? (
              <PdfFindViewer
                fileUrl={viewerState.previewUrl}
                searchQuery={viewerSearch}
                activeMatchIndex={viewerActiveMatch}
                onMatchesChange={(count) => {
                  setPdfMatchCount(count);
                  if (!count) setViewerActiveMatch(0);
                }}
              />
            ) : (
              <div ref={viewerContentRef} className="doc-viewer-text is-main">
                {viewerState.content
                  ? highlightedViewerContent
                  : 'No readable text content available.'}
              </div>
            )}
          </div>

          <div className="doc-viewer-foot">
            <span className="mut mono" style={{ fontSize: '11px' }}>
              {viewerState.type || 'DOCUMENT'}
            </span>
            <button type="button" className="btn g" onClick={closeViewer}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
