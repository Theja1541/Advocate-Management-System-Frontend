import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
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
import Chip from '../components/ui/Chip';

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

export default function Hearings() {
  const location = useLocation();
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formFiles, setFormFiles] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incomingQuery = params.get('search') || '';
    if (incomingQuery) {
      setQuery(incomingQuery);
      setViewMode('list');
    }
  }, [location.search]);

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
      const mappedDiaries = diaryList.map((d) => ({
        ...d,
        courtId: d.courtId !== undefined && d.courtId !== null ? String(d.courtId) : '',
      }));
      setDiaries(mappedDiaries);
      setCases(caseList);
      setAdvocates(advocateList);
      setCourts(courtList);
    } catch (err) {
      setError(err.message || 'Failed to load hearings');
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
    if (form.nextHearingDate && form.nextHearingDate < form.hearingDate) {
      setError('Next hearing date cannot be before the current hearing date.');
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
      courtIndex: Number(form.courtId),
      note: form.note.trim(),
      nextHearingDate: form.nextHearingDate || undefined,
      files: newFiles,
      retainedAttachmentIds: retainedIds,
    };

    try {
      if (editingEntry) {
        const updated = await updateDiary(editingEntry.id, payload);
        const mappedUpdated = {
          ...updated,
          courtId: updated.courtId !== undefined && updated.courtId !== null ? String(updated.courtId) : '',
        };
        setDiaries((prev) =>
          prev.map((item) => (item.id === mappedUpdated.id ? mappedUpdated : item))
        );
      } else {
        const created = await createDiary(payload);
        const mappedCreated = {
          ...created,
          courtId: created.courtId !== undefined && created.courtId !== null ? String(created.courtId) : '',
        };
        setDiaries((prev) => [mappedCreated, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save hearing');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete hearing for ${getCaseNo(entry)} on ${formatDisplayDate(entry.hearingDate)}?`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteDiary(entry.id);
      setDiaries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err.message || 'Failed to delete hearing');
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

  const calendarYear = currentDate.getFullYear();
  const calendarMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  const getHearingsForDate = (dayNum) => {
    const formattedDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return diaries.filter(d => d.hearingDate === formattedDate);
  };

  const headerActions = (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button
        type="button"
        className={`btn ${viewMode === 'list' ? 'outline' : 'ghost'}`}
        onClick={() => setViewMode('list')}
      >
        List View
      </button>
      <button
        type="button"
        className={`btn ${viewMode === 'calendar' ? 'outline' : 'ghost'}`}
        onClick={() => setViewMode('calendar')}
      >
        Calendar View
      </button>
      {canEdit && (
        <button
          className="btn primary"
          onClick={openAddModal}
          disabled={!cases.length || !advocates.length}
        >
          Add entry
        </button>
      )}
    </div>
  );

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
        description="Track hearing status, outcomes, next dates, and adjournments."
        actions={headerActions}
      />

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search hearings</label>
            <input
              type="text"
              placeholder="Case no., note, advocate, court…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button type="button" className={`btn sm ${statusFilter === 'all' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('all')}>All Statuses</button>
        <button type="button" className={`btn sm ${statusFilter === 'Scheduled' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('Scheduled')}>Scheduled</button>
        <button type="button" className={`btn sm ${statusFilter === 'In Progress' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('In Progress')}>In Progress</button>
        <button type="button" className={`btn sm ${statusFilter === 'Completed' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('Completed')}>Completed</button>
        <button type="button" className={`btn sm ${statusFilter === 'Adjourned' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('Adjourned')}>Adjourned</button>
        <button type="button" className={`btn sm ${statusFilter === 'Cancelled' ? 'primary' : 'outline'}`} onClick={() => setStatusFilter('Cancelled')}>Cancelled</button>
      </div>
      <div className="filt" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {courtFilters.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn sm ${courtFilter === btn.key ? 'primary' : 'outline'}`}
            onClick={() => setCourtFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {viewMode === 'calendar' ? (
        <div className="card" style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.5px' }}>
              {monthNames[calendarMonth]} {calendarYear}
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn g sm" onClick={handlePrevMonth}>&larr; Prev</button>
              <button type="button" className="btn g sm" onClick={() => setCurrentDate(new Date())}>Today</button>
              <button type="button" className="btn g sm" onClick={handleNextMonth}>Next &rarr;</button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '600', fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {Array(firstDayIndex).fill(null).map((_, index) => (
              <div key={`empty-${index}`} style={{ minHeight: '90px', background: 'transparent' }}></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayHearings = getHearingsForDate(day);
              const isToday = new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    if (dayHearings.length > 0) {
                      setViewMode('list');
                      setQuery(dateStr);
                    }
                  }}
                  style={{
                    minHeight: '90px',
                    border: isToday ? '1.5px solid var(--brass)' : '1px solid var(--rule)',
                    borderRadius: '5px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: dayHearings.length > 0 ? 'pointer' : 'default',
                    background: isToday ? 'rgba(212, 175, 55, 0.05)' : 'var(--panel)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: isToday ? 'var(--brass)' : 'var(--ink)', alignSelf: 'flex-start' }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                    {dayHearings.slice(0, 2).map((h) => (
                      <div
                        key={h.id}
                        style={{
                          fontSize: '9px',
                          background: 'var(--card)',
                          borderLeft: '2px solid var(--brass)',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${getCaseNo(h)} - ${h.note}`}
                      >
                        {toDisplayTime(h.hearingTime)} {getCaseNo(h)}
                      </div>
                    ))}
                    {dayHearings.length > 2 && (
                      <div style={{ fontSize: '8px', color: 'var(--muted)', textAlign: 'center', fontWeight: 'bold' }}>
                        + {dayHearings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="card mut" style={{ textAlign: 'center', padding: '24px' }}>
              Loading hearings…
            </div>
          ) : pagedDiaries.length === 0 ? (
            <div className="card mut" style={{ textAlign: 'center', padding: '24px' }}>
              {diaries.length === 0
                ? 'No hearings yet.'
                : 'No hearings match this search or filter.'}
            </div>
          ) : (
            pagedDiaries.map((e) => (
              <div
                className="card"
                style={{ borderLeft: '3px solid var(--primary)', cursor: 'pointer', marginBottom: 'var(--space-3)' }}
                key={e.id}
                onClick={() => setViewingEntry(e)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span className="cno-c" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{getCaseNo(e)}</span> 
                      {e.status === 'Completed' && <Chip type="success" label="COMPLETED" />}
                      {e.status === 'Adjourned' && <Chip type="danger" label="ADJOURNED" />}
                      {e.status === 'Scheduled' && <Chip type="primary" label="SCHEDULED" />}
                      {e.status === 'In Progress' && <Chip type="warning" label="IN PROGRESS" />}
                      {e.status === 'Cancelled' && <Chip type="ghost" label="CANCELLED" />}

                    <div className="card-s" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)' }}>
                      {formatDisplayDate(e.hearingDate).toUpperCase()} ·{' '}
                      {toDisplayTime(e.hearingTime)} ·{' '}
                      {getCourtName(e).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mut" style={{ fontSize: 'var(--text-sm)' }}>
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
                  style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 'var(--space-2) 0', color: 'var(--text-primary)' }}
                >
                  {e.note}
                </p>
                {e.attachments && e.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                    {e.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        className="btn outline sm"
                        style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
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
                    borderTop: '1px dashed var(--border)',
                    paddingTop: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Next date:</span>{' '}
                    <b className="mono" style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(e.nextHearingDate)}</b>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEditModal(e);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleDelete(e);
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

          
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEntry ? 'Edit Hearing Entry' : 'Add Hearing Entry'}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}
        >
          {error && isModalOpen && (
            <div
              style={{
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-2)',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}

          <FormSection title="Case Details">
            <FormGrid columns={1}>
              <FormField label="Case Number" required>
                <select value={form.caseId} onChange={setField('caseId')} required>
                  <option value="">Select case</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Hearing Schedule">
            <FormGrid columns={2}>
              <FormField label="Date" required>
                <input
                  type="date"
                  value={form.hearingDate}
                  onChange={setField('hearingDate')}
                  required
                />
              </FormField>
              <FormField label="Time" required>
                <input
                  type="time"
                  value={form.hearingTime}
                  onChange={setField('hearingTime')}
                  required
                />
              </FormField>
              <FormField label="Court" required>
                <select value={form.courtId} onChange={setField('courtId')} required>
                  <option value="">Select court</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Representing Advocate" required>
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
              </FormField>
              <FormField label="Status" required>
                <select value={form.status} onChange={setField('status')} required>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Adjourned">Adjourned</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </FormField>
              <FormField label="Hearing Type / Purpose">
                <input type="text" placeholder="e.g., Evidence, Arguments" value={form.hearingType} onChange={setField('hearingType')} />
              </FormField>
              <FormField label="Judge Name">
                <input type="text" placeholder="Judge Name" value={form.judge} onChange={setField('judge')} />
              </FormField>
              <FormField label="Conducted By (Advocate)">
                <select value={form.conductedBy} onChange={setField('conductedBy')}>
                  <option value="">Select advocate (optional)</option>
                  {advocates.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Actual Start Time">
                <input type="time" value={form.actualStartTime} onChange={setField('actualStartTime')} />
              </FormField>
              <FormField label="Actual End Time">
                <input type="time" value={form.actualEndTime} onChange={setField('actualEndTime')} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Hearing Notes">
            <FormGrid columns={1}>
              {form.status === 'Adjourned' && (
                <FormField label="Adjournment Reason" required>
                  <textarea placeholder="Reason for adjournment..." rows="2" value={form.adjournmentReason} onChange={setField('adjournmentReason')} required={form.status === 'Adjourned'} style={{ border: '1px solid var(--tape)', background: '#fff0f0' }} />
                </FormField>
              )}
              <FormField label="Outcome / Order Summary">
                <textarea placeholder="Outcome or order details..." rows="2" value={form.outcome} onChange={setField('outcome')} />
              </FormField>
              <FormField label="Next Action Required">
                <input type="text" placeholder="e.g., File reply, Bring witness" value={form.nextAction} onChange={setField('nextAction')} />
              </FormField>
              <FormField label="Hearing Note / Summary" required>
                <textarea
                  placeholder="Record details..."
                  rows="4"
                  value={form.note}
                  onChange={setField('note')}
                  required
                  style={{
                    fontSize: 'var(--text-sm)',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
              </FormField>
            </FormGrid>
            <FormGrid columns={2}>
              <FormField label="Next Hearing Date">
                <input
                  type="date"
                  value={form.nextHearingDate}
                  onChange={setField('nextHearingDate')}
                />
              </FormField>
              <FormField label="Attachments">
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
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="modal-foot" style={{ margin: 'var(--space-2) calc(-1 * var(--space-4)) calc(-1 * var(--space-4))', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {viewingEntry && (
        <Modal
          isOpen={!!viewingEntry}
          onClose={() => setViewingEntry(null)}
          title="Hearing Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Case Number</label>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-1)' }}>{getCaseNo(viewingEntry)}</div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Representing Advocate</label>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-1)' }}>{getAdvocateName(viewingEntry)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hearing Date</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{formatDisplayDate(viewingEntry.hearingDate)}</div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hearing Time</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{toDisplayTime(viewingEntry.hearingTime)}</div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Court</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{getCourtName(viewingEntry)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', fontWeight: 'bold' }}>{viewingEntry.status}</div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hearing Type</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{viewingEntry.hearingType || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Judge</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{viewingEntry.judge || '—'}</div>
              </div>
            </div>
            
            {viewingEntry.status === 'Adjourned' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', color: 'var(--danger)' }}>
                <label style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Adjournment Reason</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{viewingEntry.adjournmentReason}</div>
              </div>
            )}
            
            {(viewingEntry.outcome || viewingEntry.nextAction) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                {viewingEntry.outcome && (
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outcome</label>
                    <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', whiteSpace: 'pre-wrap' }}>{viewingEntry.outcome}</div>
                  </div>
                )}
                {viewingEntry.nextAction && (
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Action</label>
                    <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{viewingEntry.nextAction}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hearing Note / Summary</label>
              <div style={{ fontSize: 'var(--text-base)', lineHeight: 1.6, marginTop: 'var(--space-1)', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                {viewingEntry.note}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Hearing Date</label>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', fontWeight: 'bold' }}>{formatDisplayDate(viewingEntry.nextHearingDate)}</div>
              </div>
            </div>

            {viewingEntry.attachments && viewingEntry.attachments.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)', display: 'block' }}>Attachments</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {viewingEntry.attachments.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      className="btn outline sm"
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                      onClick={async () => {
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
              </div>
            )}

            <div className="modal-foot" style={{ margin: 'var(--space-4) calc(-1 * var(--space-4)) calc(-1 * var(--space-4))', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setViewingEntry(null)}
              >
                Close
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    const entryToEdit = viewingEntry;
                    setViewingEntry(null);
                    openEditModal(entryToEdit);
                  }}
                >
                  Edit Entry
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
