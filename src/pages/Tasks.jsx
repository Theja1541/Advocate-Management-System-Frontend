import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getAdvocates } from '../services/advocateService';

const PAGE_SIZE = 10;

const PRIORITIES = {
  high: ['High', 'c-tape'],
  medium: ['Medium', 'c-brass'],
  low: ['Low', 'c-baize'],
};

const STATUSES = {
  pending: ['Pending', 'c-brass'],
  completed: ['Completed', 'c-baize'],
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskList, advocateList] = await Promise.all([
        getTasks(),
        getAdvocates(),
      ]);
      setTasks(taskList);
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

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedTasks = filteredTasks.slice(pageStart, pageStart + PAGE_SIZE);

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
            <button className="btn" onClick={openAddModal}>
              New task
            </button>
          )
        }
      />

      <div className="kpis">
        <KPICard label="Pending tasks" value={totalPending} status="active" type="brass" />
        <KPICard label="Completed" value={totalCompleted} status="all time" type="baize" />
        <KPICard label="High priority" value={highPriority} status="pending tasks" type="tape" />
        <KPICard label="Overdue" value={overdueCount} status="past deadline" type="tape" />
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 2, minWidth: '220px' }}>
            <label>Search tasks</label>
            <input
              type="text"
              placeholder="Search title, details, assigned..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="filt">
        <button
          type="button"
          className={statusFilter === 'all' ? 'on' : ''}
          onClick={() => setStatusFilter('all')}
        >
          All Tasks
        </button>
        <button
          type="button"
          className={statusFilter === 'pending' ? 'on' : ''}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
        </button>
        <button
          type="button"
          className={statusFilter === 'completed' ? 'on' : ''}
          onClick={() => setStatusFilter('completed')}
        >
          Completed
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--tape)', color: 'var(--tape)' }}>
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
            const priorityChip = PRIORITIES[t.priority] || ['Medium', 'c-brass'];
            const statusChip = STATUSES[t.status] || ['Pending', 'c-brass'];
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
                    <span className="nm" style={{ fontWeight: '600' }}>{t.title}</span>
                    {t.description && (
                      <p className="mut" style={{ fontSize: '11.5px', margin: '2px 0 0' }}>{t.description}</p>
                    )}
                  </div>
                </td>
                <td className="mut">{getAssignedName(t)}</td>
                <td>
                  <Chip type={priorityChip[1]} label={priorityChip[0]} />
                </td>
                <td className="mono" style={{ fontSize: '11px', color: isOverdue ? 'var(--tape)' : 'inherit' }}>
                  {formatDate(t.dueDate)} {isOverdue && '⚠️'}
                </td>
                <td className="mut">{getCreatorName(t)}</td>
                <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="btn g sm"
                        onClick={() => openEditModal(t)}
                        style={{ marginRight: '6px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleDelete(t)}
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
            );
          })
        )}
      </DataTable>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleSubmit} className="fgrid" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {error && isModalOpen && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px', marginBottom: '8px' }}>
              {error}
            </div>
          )}

          <div className="f">
            <label>Task Title</label>
            <input
              type="text"
              placeholder="e.g. File vakalatnama in OS 214"
              value={form.title}
              onChange={setField('title')}
              required
            />
          </div>

          <div className="f">
            <label>Details / Notes</label>
            <textarea
              placeholder="Enter brief description..."
              rows="3"
              value={form.description}
              onChange={setField('description')}
              style={{
                fontSize: '12.5px',
                padding: '8px 10px',
                border: '1px solid var(--rule)',
                background: 'var(--card)',
                color: 'var(--ink)',
                borderRadius: '5px',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div className="fgrid" style={{ marginTop: '10px' }}>
            <div className="f">
              <label>Priority</label>
              <select value={form.priority} onChange={setField('priority')}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="f">
              <label>Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={setField('dueDate')}
              />
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '10px' }}>
            <div className="f">
              <label>Assignee</label>
              <select value={form.assignedTo} onChange={setField('assignedTo')}>
                <option value="">Unassigned</option>
                {advocates.map((a) => (
                  <option key={a.id} value={a.userId}>
                    {a.name} ({a.relation})
                  </option>
                ))}
              </select>
            </div>
            {editingTask && (
              <div className="f">
                <label>Status</label>
                <select value={form.status} onChange={setField('status')}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
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
