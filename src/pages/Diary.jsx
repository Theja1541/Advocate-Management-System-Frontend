import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
} from '../services/diaryService';
import { getCases } from '../services/caseService';
import { getAdvocates } from '../services/advocateService';
import { getCourts } from '../services/caseMastersService';
import { downloadDocument } from '../services/documentService';

const PAGE_SIZE = 10;

const emptyForm = {
  caseId: '',
  hearingDate: '',
  hearingTime: '10:30',
  courtId: '',
  advocateId: '',
  note: '',
  nextHearingDate: '',
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toApiTime = (value) => {
  const raw = String(value || '').trim();
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return `${String(hours).padStart(2, '0')}:${minutes}:00`;
  }
  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    return `${String(Number(match24[1])).padStart(2, '0')}:${match24[2]}:${match24[3] || '00'}`;
  }
  return raw;
};

const toInputTime = (value) => {
  if (!value) return '10:30';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '10:30';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const toDisplayTime = (value) => {
  if (!value) return '—';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

export default function Diary() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('diary', 'E');

  const [diaries, setDiaries] = useState([]);
  const [cases, setCases] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [courtFilter, setCourtFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formFiles, setFormFiles] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [diaryList, caseList, advocateList, courtList] = await Promise.all([
        getDiaries(),
        getCases(),
        getAdvocates(),
        getCourts(true),
      ]);
      setDiaries(diaryList);
      setCases(caseList);
      setAdvocates(advocateList);
      setCourts(courtList);
    } catch (err) {
      setError(err.message || 'Failed to load case diary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, courtFilter]);

  const getCaseNo = (entry) =>
    entry?.case?.caseNo ||
    cases.find((c) => String(c.id) === String(entry.caseId))?.caseNo ||
    '—';

  const getAdvocateName = (entry) =>
    entry?.advocate?.name ||
    advocates.find((a) => String(a.id) === String(entry.advocateId))?.name ||
    '—';

  const getCourtName = (entry) => {
    const court = courts.find((c) => Number(c.id) === Number(entry.courtId));
    return court ? court.name : '—';
  };

  const q = query.trim().toLowerCase();
  const filteredDiaries = diaries.filter((e) => {
    if (courtFilter !== 'all' && String(e.courtId) !== String(courtFilter)) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      getCaseNo(e),
      getAdvocateName(e),
      e.note,
      getCourtName(e),
      e.hearingDate,
      e.nextHearingDate,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredDiaries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedDiaries = filteredDiaries.slice(pageStart, pageStart + PAGE_SIZE);

  const openAddModal = () => {
    setEditingEntry(null);
    setForm({
      ...emptyForm,
      caseId: cases[0] ? String(cases[0].id) : '',
      advocateId: advocates[0] ? String(advocates[0].id) : '',
      courtId: courts[0] ? String(courts[0].id) : '',
      hearingDate: new Date().toISOString().slice(0, 10),
    });
    setFormFiles([]);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setForm({
      caseId: entry.caseId != null ? String(entry.caseId) : '',
      hearingDate: entry.hearingDate || '',
      hearingTime: toInputTime(entry.hearingTime),
      courtId: entry.courtId != null ? String(entry.courtId) : '',
      advocateId: entry.advocateId != null ? String(entry.advocateId) : '',
      note: entry.note || '',
      nextHearingDate: entry.nextHearingDate || '',
    });

    const initialFiles = (entry.attachments || []).map((att) => ({
      id: String(att.id),
      name: att.name,
      size: att.fileSize,
      isMock: false,
      dbId: att.id,
    }));
    setFormFiles(initialFiles);

    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setForm(emptyForm);
    setFormFiles([]);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caseId || !form.note.trim()) {
      setError('Please select a case and enter a summary note.');
      return;
    }
    if (!form.advocateId || !form.hearingDate || !form.hearingTime || !form.courtId) {
      setError('Please fill out date, time, court, and advocate.');
      return;
    }

    setSaving(true);
    setError('');

    const newFiles = formFiles.filter((f) => f.file).map((f) => f.file);
    const retainedIds = formFiles.filter((f) => f.dbId).map((f) => f.dbId);

    const payload = {
      caseId: Number(form.caseId),
      hearingDate: form.hearingDate,
      hearingTime: toApiTime(form.hearingTime),
      advocateId: Number(form.advocateId),
      courtId: Number(form.courtId),
      note: form.note.trim(),
      nextHearingDate: form.nextHearingDate || undefined,
      files: newFiles,
      retainedAttachmentIds: retainedIds,
    };

    try {
      if (editingEntry) {
        const updated = await updateDiary(editingEntry.id, payload);
        setDiaries((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        const created = await createDiary(payload);
        setDiaries((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save diary entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete diary entry for ${getCaseNo(entry)} on ${formatDisplayDate(entry.hearingDate)}?`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteDiary(entry.id);
      setDiaries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err.message || 'Failed to delete diary entry');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const mapped = selected.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file,
      }));
      setFormFiles((prev) => [...prev, ...mapped]);
    }
  };

  const removeFormFile = (id) => {
    setFormFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const headerActions = canEdit ? (
    <button
      className="btn"
      onClick={openAddModal}
      disabled={!cases.length || !advocates.length}
    >
      Add entry
    </button>
  ) : null;

  const courtFilters = [
    { key: 'all', label: 'All courts' },
    ...courts.map((c) => ({
      key: String(c.id),
      label: c.name.split(',')[0],
    })),
  ];

  return (
    <>
      <PageHeader
        title="Case Diary"
        description="What happened in court, in the advocate’s own words, with the next date carried forward."
        actions={headerActions}
      />

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search diary</label>
            <input
              type="text"
              placeholder="Case no., note, advocate, court…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        {courtFilters.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={courtFilter === btn.key ? 'on' : ''}
            onClick={() => setCourtFilter(btn.key)}
          >
            {btn.label}
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

      {loading ? (
        <div className="card mut" style={{ textAlign: 'center', padding: '24px' }}>
          Loading case diary…
        </div>
      ) : pagedDiaries.length === 0 ? (
        <div className="card mut" style={{ textAlign: 'center', padding: '24px' }}>
          {diaries.length === 0
            ? 'No diary entries yet.'
            : 'No diary entries match this search or filter.'}
        </div>
      ) : (
        pagedDiaries.map((e) => (
          <div
            className="card"
            style={{ borderLeft: '3px solid var(--brass)' }}
            key={e.id}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="cno-c">{getCaseNo(e)}</span>
                <div className="card-s" style={{ margin: '4px 0 0' }}>
                  {formatDisplayDate(e.hearingDate).toUpperCase()} ·{' '}
                  {toDisplayTime(e.hearingTime)} ·{' '}
                  {getCourtName(e).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mut" style={{ fontSize: '11.5px' }}>
                  {getAdvocateName(e)}
                </div>
                {e.attachmentsCount ? (
                  <div
                    className="mut mono"
                    style={{ fontSize: '10px', marginTop: '3px' }}
                  >
                    📎 {e.attachmentsCount} attachment
                    {e.attachmentsCount > 1 ? 's' : ''}
                  </div>
                ) : null}
              </div>
            </div>
            <p
              className="ser"
              style={{ fontSize: '14px', lineHeight: 1.6, margin: '11px 0' }}
            >
              {e.note}
            </p>
            {e.attachments && e.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '11px', marginTop: '-4px' }}>
                {e.attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    className="btn g sm"
                    style={{ fontSize: '10px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={async (ev) => {
                      ev.stopPropagation();
                      try {
                        await downloadDocument(att.id, att.name);
                      } catch (err) {
                        alert(err.message || 'Download failed');
                      }
                    }}
                  >
                    📎 {att.name} ({att.fileSize})
                  </button>
                ))}
              </div>
            )}
            <div
              style={{
                borderTop: '1px dashed var(--rule)',
                paddingTop: '9px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div>
                <span className="mut">Next date:</span>{' '}
                <b className="mono">{formatDisplayDate(e.nextHearingDate)}</b>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn g sm"
                    onClick={() => openEditModal(e)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleDelete(e)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--tape)',
                      color: 'var(--tape)',
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {!loading && filteredDiaries.length > 0 && (
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
          <div className="mut" style={{ fontSize: '11.5px' }}>
            Showing {pageStart + 1}–
            {Math.min(pageStart + PAGE_SIZE, filteredDiaries.length)} of{' '}
            {filteredDiaries.length}
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
            <button
              type="button"
              className="btn g sm"
              disabled
              style={{ cursor: 'default' }}
            >
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEntry ? 'Edit Case Diary Entry' : 'Add Case Diary Entry'}
      >
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
            <label>Date</label>
            <input
              type="date"
              value={form.hearingDate}
              onChange={setField('hearingDate')}
              required
            />
          </div>
          <div className="f">
            <label>Time</label>
            <input
              type="time"
              value={form.hearingTime}
              onChange={setField('hearingTime')}
              required
            />
          </div>
          <div className="f">
            <label>Court</label>
            <select value={form.courtId} onChange={setField('courtId')} required>
              <option value="">Select court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Representing Advocate</label>
            <select
              value={form.advocateId}
              onChange={setField('advocateId')}
              required
            >
              <option value="">Select advocate</option>
              {advocates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Hearing Note / Summary</label>
            <textarea
              placeholder="Record details..."
              rows="4"
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
          <div className="f">
            <label>Next Hearing Date</label>
            <input
              type="date"
              value={form.nextHearingDate}
              onChange={setField('nextHearingDate')}
            />
          </div>

          <div className="f" style={{ marginTop: '10px' }}>
            <label>Attachments</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ fontSize: '12px' }}
            />
            {formFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {formFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      background: 'var(--panel)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    <span>📎 {file.name} ({file.size})</span>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => removeFormFile(file.id)}
                      style={{
                        padding: '1px 4px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--tape)',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
