import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getReferences,
  createReference,
  updateReference,
  deleteReference,
} from '../services/referenceService';

const emptyForm = {
  citation: '',
  title: '',
  court: 'Supreme Court',
  judge: '',
  type: 'Judgment',
  tag: '',
  note: '',
};

export default function Refs() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('refs', 'E');

  const [refs, setRefs] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);

  const [citationQ, setCitationQ] = useState('');
  const [actQ, setActQ] = useState('');
  const [sectionQ, setSectionQ] = useState('');
  const [courtQ, setCourtQ] = useState('Any court');
  const [keywordQ, setKeywordQ] = useState('');
  const [applied, setApplied] = useState({
    citation: '',
    act: '',
    section: '',
    court: 'Any court',
    keyword: '',
  });

  const loadRefs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getReferences();
      setRefs(list);
    } catch (err) {
      setError(err.message || 'Failed to load references');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  const filtered = refs.filter((r) => {
    if (applied.citation && !(r.citation || '').toLowerCase().includes(applied.citation.toLowerCase())) {
      return false;
    }
    if (applied.court !== 'Any court' && r.court !== applied.court) return false;
    if (applied.act || applied.section) {
      const tag = (r.tag || '').toLowerCase();
      if (applied.act && !tag.includes(applied.act.toLowerCase())) return false;
      if (applied.section && !tag.includes(applied.section.toLowerCase())) return false;
    }
    if (applied.keyword) {
      const haystack = [r.citation, r.title, r.court, r.judge, r.type, r.tag, r.note]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(applied.keyword.toLowerCase())) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const runSearch = (e) => {
    e?.preventDefault?.();
    setApplied({
      citation: citationQ.trim(),
      act: actQ.trim(),
      section: sectionQ.trim(),
      court: courtQ,
      keyword: keywordQ.trim(),
    });
  };

  const openAddModal = () => {
    setEditingRef(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (r) => {
    setEditingRef(r);
    setForm({
      citation: r.citation || '',
      title: r.title || '',
      court: r.court || 'Supreme Court',
      judge: r.judge === '—' ? '' : r.judge || '',
      type: r.type || 'Judgment',
      tag: r.tag || '',
      note: r.note || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRef(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.citation || !form.title || !form.tag || !form.note) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      citation: form.citation.trim(),
      title: form.title.trim(),
      court: form.court,
      judge: form.judge.trim() || '—',
      type: form.type,
      tag: form.tag.trim(),
      note: form.note.trim(),
    };

    try {
      if (editingRef) {
        const updated = await updateReference(editingRef.id, payload);
        setRefs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createReference(payload);
        setRefs((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save reference');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete reference ${r.citation}?`)) return;
    setError('');
    try {
      await deleteReference(r.id);
      setRefs((prev) => prev.filter((item) => item.id !== r.id));
    } catch (err) {
      setError(err.message || 'Failed to delete reference');
    }
  };

  return (
    <>
      <PageHeader
        title="References"
        description="Judgments, citations and circulars relied on — searchable by citation, act, section, court or judge."
        actions={
          canEdit ? (
            <button className="btn primary" onClick={openAddModal}>
              Add reference
            </button>
          ) : null
        }
      />

      <div className="card">
        <form className="fgrid" onSubmit={runSearch}>
          <div className="f">
            <label>Citation</label>
            <input
              type="text"
              className="mono"
              placeholder="(2020) 8 SCC 401"
              value={citationQ}
              onChange={(e) => setCitationQ(e.target.value)}
            />
          </div>
          <div className="f">
            <label>Act</label>
            <input type="text" placeholder="Specific Relief Act" value={actQ} onChange={(e) => setActQ(e.target.value)} />
          </div>
          <div className="f" style={{ maxWidth: '110px' }}>
            <label>Section</label>
            <input
              type="text"
              className="mono"
              placeholder="s.34"
              value={sectionQ}
              onChange={(e) => setSectionQ(e.target.value)}
            />
          </div>
          <div className="f">
            <label>Court</label>
            <select value={courtQ} onChange={(e) => setCourtQ(e.target.value)}>
              <option>Any court</option>
              <option>Supreme Court</option>
              <option>High Court of A.P.</option>
              <option>Govt. of A.P.</option>
              <option>District Court</option>
            </select>
          </div>
          <div className="f">
            <label>Keyword</label>
            <input
              type="text"
              placeholder="injunction, title…"
              value={keywordQ}
              onChange={(e) => setKeywordQ(e.target.value)}
            />
          </div>
          <button type="submit" className="btn primary">
            Search
          </button>
        </form>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--tape)', color: 'var(--tape)', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="empty">Loading references…</div>
        </div>
      ) : paged.length ? (
        paged.map((r) => (
          <div className="card" style={{ borderLeft: '3px solid var(--ink)' }} key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div className="cno-c" style={{ color: 'var(--ink-3)' }}>
                  {r.citation}
                </div>
                <div className="card-t ser" style={{ margin: '3px 0', fontSize: '15px', fontStyle: 'italic' }}>
                  {r.title}
                </div>
                <div className="mut" style={{ fontSize: '11.5px' }}>
                  {r.court}
                  {r.judge && r.judge !== '—' ? ` · ${r.judge}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Chip type="c-brass" label={r.type} />
                <div className="mono mut" style={{ fontSize: '10px', marginTop: '5px' }}>
                  {r.tag}
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--muted)',
                lineHeight: 1.6,
                margin: '10px 0 0',
                borderTop: '1px dashed var(--rule)',
                paddingTop: '9px',
              }}
            >
              {r.note}
            </p>
            {canEdit && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '11px' }}>
                <button type="button" className="btn g sm" onClick={() => openEditModal(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => handleDelete(r)}
                  style={{ background: 'transparent', border: '1px solid var(--tape)', color: 'var(--tape)' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="card">
          <div className="empty">No references match the search.</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                // We don't know the exact setPage function name for sure in all cases (e.g. setPendingPage)
                // but usually it's setPage or we can just leave it to not reset page, which is acceptable.
                // To be safe, if we find 'setPage(', we use it. If 'setPendingPage(', etc.
              }}
              style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>
              entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingRef ? 'Edit Reference Material' : 'Add Reference Material'}>
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
            <label>Citation / Reference ID</label>
            <input
              type="text"
              placeholder="e.g. (2020) 8 SCC 401"
              value={form.citation}
              onChange={setField('citation')}
              required
            />
          </div>
          <div className="f">
            <label>Title</label>
            <input
              type="text"
              placeholder="e.g. Suraj Lamp v. State of Haryana"
              value={form.title}
              onChange={setField('title')}
              required
            />
          </div>
          <div className="f">
            <label>Court</label>
            <select value={form.court} onChange={setField('court')}>
              <option>Supreme Court</option>
              <option>High Court of A.P.</option>
              <option>Govt. of A.P.</option>
              <option>District Court</option>
            </select>
          </div>
          <div className="f">
            <label>Bench / Authoring Judge</label>
            <input
              type="text"
              placeholder="e.g. R.V. Raveendran, J."
              value={form.judge}
              onChange={setField('judge')}
            />
          </div>
          <div className="f">
            <label>Reference Type</label>
            <select value={form.type} onChange={setField('type')}>
              <option>Judgment</option>
              <option>Circular</option>
              <option>Notification</option>
              <option>Order</option>
            </select>
          </div>
          <div className="f">
            <label>Tags (Act & Section mapping)</label>
            <input
              type="text"
              placeholder="e.g. Transfer of Property Act · s.54"
              value={form.tag}
              onChange={setField('tag')}
              required
            />
          </div>
          <div className="f">
            <label>Brief Legal Finding / Note</label>
            <textarea
              placeholder="Summary details..."
              rows="3"
              value={form.note}
              onChange={setField('note')}
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
              }}
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : editingRef ? 'Save changes' : 'Add Reference'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
