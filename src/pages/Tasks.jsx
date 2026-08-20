import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getAdvocates } from '../services/advocateService';

const pageSize = 10;

const PRIORITIES = {
  high: ['High', 'danger'],
  medium: ['Medium', 'warning'],
  low: ['Low', 'ghost'],
};

const STATUSES = {
  pending: ['Pending', 'warning'],
  completed: ['Completed', 'success'],
};

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  status: 'pending',
  assignedTo: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Tasks() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('cases', 'E');
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tasksResult, advocatesResult] = await Promise.allSettled([
        getTasks(),
        getAdvocates(),
      ]);

      if (tasksResult.status === 'rejected') {
        throw tasksResult.reason;
      }

      setTasks(tasksResult.value || []);
      const advocateList = advocatesResult.status === 'fulfilled' ? advocatesResult.value || [] : [];
      setAdvocates(advocateList.filter((a) => a.userId));
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, priorityFilter]);

  const getAssignedName = (task) => {
    if (task.assignedUser) return task.assignedUser.name;
    const adv = advocates.find((a) => String(a.userId) === String(task.assignedTo));
    return adv ? adv.name : '—';
  };

  const getCreatorName = (task) => {
    return task.creator?.name || '—';
  };

  // KPIs
  const totalPending = tasks.filter((t) => t.status === 'pending').length;
  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const highPriority = tasks.filter((t) => t.priority === 'high' && t.status === 'pending').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter(
    (t) => t.status === 'pending' && t.dueDate && t.dueDate < todayStr
  ).length;

  const q = query.trim().toLowerCase();
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (!q) return true;
    const haystack = [
      t.title,
      t.description,
      getAssignedName(t),
      getCreatorName(t),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedTasks = filteredTasks.slice(pageStart, pageStart + pageSize);

  const openAddModal = () => {
    setEditingTask(null);
    setForm({
      ...emptyForm,
      dueDate: new Date().toISOString().slice(0, 10),
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTask(t);
    setForm({
      title: t.title || '',
      description: t.description || '',
      priority: t.priority || 'medium',
      dueDate: t.dueDate || '',
      status: t.status || 'pending',
      assignedTo: t.assignedTo != null ? String(t.assignedTo) : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      status: form.status,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
    };

    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, payload);
        setTasks((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        showToast('Task updated successfully!', 'success');
      } else {
        const created = await createTask(payload);
        setTasks((prev) => [created, ...prev]);
        showToast('Task created successfully!', 'success');
      }
      closeModal();
    } catch (err) {
      const msg = err.message || 'Failed to save task';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (t) => {
    setError('');
    const nextStatus = t.status === 'pending' ? 'completed' : 'pending';
    try {
      const updated = await updateTask(t.id, { status: nextStatus });
      setTasks((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      showToast(
        `Task marked as ${nextStatus === 'completed' ? 'completed' : 'pending'}`,
        'success'
      );
    } catch (err) {
      const msg = err.message || 'Failed to toggle status';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (t) => {
    const confirmed = window.confirm(`Delete task "${t.title}"?`);
    if (!confirmed) return;

    setError('');
    try {
      await deleteTask(t.id);
      setTasks((prev) => prev.filter((item) => item.id !== t.id));
      showToast('Task deleted successfully!', 'success');
    } catch (err) {
      const msg = err.message || 'Failed to delete task';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const headers = [
    { label: '' }, // Status checkbox
    { label: 'Title' },
    { label: 'Assigned to' },
    { label: 'Priority' },
    { label: 'Due date' },
    { label: 'Created by' },
    { label: 'Actions', className: 'c' },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Collaborative task board to track filings, office operations, and research."
        actions={
          canEdit && (
            <button className="btn primary" onClick={openAddModal}>
              New task
            </button>
          )
        }
      />

      <div className="kpis">
        <KPICard label="Pending tasks" value={totalPending} status="active" type="warning" />
        <KPICard label="Completed" value={totalCompleted} status="all time" type="success" />
        <KPICard label="High priority" value={highPriority} status="pending tasks" type="danger" />
        <KPICard label="Overdue" value={overdueCount} status="past deadline" type="danger" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="fgrid" style={{ gap: 'var(--space-3)' }}>
          <div className="f" style={{ flex: 2, minWidth: '220px' }}>
            <label>Search tasks</label>
            <input
              type="text"
              placeholder="Search title, details, assigned..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${statusFilter === 'all' ? 'primary' : 'secondary'}`}
          onClick={() => setStatusFilter('all')}
        >
          All Tasks
        </button>
        <button
          type="button"
          className={`btn ${statusFilter === 'pending' ? 'primary' : 'secondary'}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
        </button>
        <button
          type="button"
          className={`btn ${statusFilter === 'completed' ? 'primary' : 'secondary'}`}
          onClick={() => setStatusFilter('completed')}
        >
          Completed
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
          {error}
        </div>
      )}

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">Loading tasks…</div>
            </td>
          </tr>
        ) : pagedTasks.length === 0 ? (
          <tr>
            <td colSpan={headers.length}>
              <div className="empty">No tasks matching filters.</div>
            </td>
          </tr>
        ) : (
          pagedTasks.map((t) => {
            const priorityChip = PRIORITIES[t.priority] || ['Medium', 'warning'];
            const statusChip = STATUSES[t.status] || ['Pending', 'warning'];
            const isOverdue = t.status === 'pending' && t.dueDate && t.dueDate < todayStr;

            return (
              <tr key={t.id} style={{ opacity: t.status === 'completed' ? 0.7 : 1 }}>
                <td style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={t.status === 'completed'}
                    onChange={() => handleToggleStatus(t)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div style={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                    <span className="nm" style={{ fontWeight: '600', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{t.title}</span>
                    {t.description && (
                      <p className="mut" style={{ fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)' }}>{t.description}</p>
                    )}
                  </div>
                </td>
                <td className="mut" style={{ color: 'var(--text-secondary)' }}>{getAssignedName(t)}</td>
                <td>
                  <Chip type={priorityChip[1]} label={priorityChip[0]} />
                </td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)', color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {formatDate(t.dueDate)} {isOverdue && '⚠️'}
                </td>
                <td className="mut">{getCreatorName(t)}</td>
                <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => openEditModal(t)}
                        style={{ marginRight: 'var(--space-2)' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger outline sm"
                        onClick={() => handleDelete(t)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </DataTable>

      {!loading && filteredTasks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredTasks.length)} of {filteredTasks.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn ghost sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button type="button" className="btn ghost sm" disabled style={{ cursor: 'default' }}>{currentPage} / {totalPages}</button>
            <button type="button" className="btn ghost sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              {error}
            </div>
          )}

          <FormSection title="Task Details">
            <FormField label="Task Title" required={true}>
              <input
                type="text"
                placeholder="e.g. File vakalatnama in OS 214"
                value={form.title}
                onChange={setField('title')}
                style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                required
              />
            </FormField>

            <FormField label="Details / Notes" required={false}>
              <textarea
                placeholder="Enter brief description..."
                rows="3"
                value={form.description}
                onChange={setField('description')}
                style={{
                  fontSize: 'var(--text-sm)',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
            </FormField>

            <FormField label="Assignee" required={false}>
              <select value={form.assignedTo} onChange={setField('assignedTo')} style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <option value="">Unassigned</option>
                {advocates.map((a) => (
                  <option key={a.id} value={a.userId}>
                    {a.name} ({a.relation})
                  </option>
                ))}
              </select>
            </FormField>
          </FormSection>

          <FormSection title="Schedule & Status">
            <FormGrid columns={2}>
              <FormField label="Priority" required={false}>
                <select value={form.priority} onChange={setField('priority')} style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </FormField>
              <FormField label="Due Date" required={false}>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={setField('dueDate')}
                  style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                />
              </FormField>
            </FormGrid>
            {editingTask && (
              <FormField label="Status" required={false}>
                <select value={form.status} onChange={setField('status')} style={{ padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </FormField>
            )}
          </FormSection>

          <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0' }}>
            <button type="button" className="btn ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
