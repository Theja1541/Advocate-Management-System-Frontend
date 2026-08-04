import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { useAuth } from '../context/AuthContext';
import {
  getAdvocates,
  createAdvocate,
  updateAdvocate,
  deleteAdvocate,
} from '../services/advocateService';
import { getCases } from '../services/caseService';
import { getRoles } from '../services/roleService';

const emptyForm = {
  name: '',
  specialization: '',
  relation: 'Junior',
  experience: '',
  enrolment: '',
  mobile: '',
  email: '',
  status: 'active',
  createLogin: true,
  password: '',
  roleId: '',
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

const RELATION_FILTERS = [
  { key: 'all', label: 'All roles' },
  { key: 'Junior', label: 'Junior' },
  { key: 'Senior', label: 'Senior' },
  { key: 'Referral', label: 'Referral' },
];

const normalizeRelation = (relation = '') => {
  if (/senior/i.test(relation)) return 'Senior';
  if (/referral/i.test(relation)) return 'Referral';
  if (/junior/i.test(relation)) return 'Junior';
  return relation || 'Junior';
};

const relationChipType = (relation) => {
  const label = normalizeRelation(relation);
  if (label === 'Senior') return 'primary';
  if (label === 'Referral') return 'warning';
  return 'ghost';
};

const displayAdvocateId = (id) => `ADV-${String(id).padStart(2, '0')}`;

const experienceYears = (experience) => {
  if (experience == null || experience === '') return '—';
  const raw = String(experience).trim();
  if (/year/i.test(raw)) return raw;
  return `${raw} years`;
};

export default function Advs() {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('advs', 'E');

  const [advocates, setAdvocates] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [relationFilter, setRelationFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewAdvocate, setSelectedViewAdvocate] = useState(null);
  const [editingAdvocate, setEditingAdvocate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [roles, setRoles] = useState([]);

  const loadAdvocates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, caseList, roleList] = await Promise.all([getAdvocates(), getCases(), getRoles()]);
      setAdvocates(list);
      setCases(caseList);
      setRoles(roleList);
    } catch (err) {
      setError(err.message || 'Failed to load advocates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdvocates();
  }, [loadAdvocates]);

  const getCaseload = (id) => {
    return cases.filter(
      (c) => String(c.advocateId) === String(id) && c.status === 'Active'
    ).length;
  };

  const getInitials = (name = '') => {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const q = query.trim().toLowerCase();
  const filteredAdvocates = advocates.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (
      relationFilter !== 'all' &&
      normalizeRelation(a.relation) !== relationFilter
    ) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      a.name,
      a.specialization,
      a.enrolment,
      a.mobile,
      a.email,
      a.relation,
      displayAdvocateId(a.id),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const openAddModal = () => {
    setEditingAdvocate(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (advocate) => {
    setEditingAdvocate(advocate);
    setForm({
      name: advocate.name || '',
      specialization: advocate.specialization || '',
      relation: normalizeRelation(advocate.relation),
      experience: String(advocate.experience || '').replace(/\s*years?\s*/i, ''),
      enrolment: advocate.enrolment || '',
      mobile: advocate.mobile || '',
      email: advocate.email || '',
      status: advocate.status || 'active',
      createLogin: !advocate.hasLogin,
      password: '',
      roleId: advocate.roleId || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (advocate) => {
    setSelectedViewAdvocate(advocate);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdvocate(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.specialization.trim() || !form.experience || !form.enrolment.trim() || !form.mobile.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    const wantsLogin = editingAdvocate?.hasLogin
      ? Boolean(form.password.trim())
      : form.createLogin;

    if (wantsLogin && !form.email.trim()) {
      setError('Email is required to create an advocate login.');
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || undefined,
      specialization: form.specialization.trim(),
      enrolment: form.enrolment.trim(),
      experience: String(form.experience).trim(),
      relation: form.relation,
      status: form.status,
    };

    if (wantsLogin && !form.roleId) {
      // Find 'Advocate' role as default if not selected
      const defaultRole = roles.find(r => r.name === 'Advocate' || r.name === 'Sub Admin');
      if (defaultRole) payload.roleId = defaultRole.id;
    } else if (wantsLogin) {
      payload.roleId = form.roleId;
    }

    if (!editingAdvocate) {
      payload.createLogin = Boolean(form.createLogin && form.email.trim());
      if (form.password.trim()) payload.password = form.password.trim();
    } else if (!editingAdvocate.hasLogin && form.createLogin) {
      payload.createLogin = true;
      if (form.password.trim()) payload.password = form.password.trim();
    } else if (editingAdvocate.hasLogin && form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editingAdvocate) {
        const updated = await updateAdvocate(editingAdvocate.id, payload);
        setAdvocates((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        setSelectedViewAdvocate(updated);
      } else {
        const created = await createAdvocate(payload);
        setAdvocates((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save advocate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (advocate) => {
    const confirmed = window.confirm(
      `Delete advocate "${advocate.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteAdvocate(advocate.id);
      setAdvocates((prev) => prev.filter((a) => a.id !== advocate.id));
      if (selectedViewAdvocate && selectedViewAdvocate.id === advocate.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete advocate');
    }
  };

  const headerActions = canEdit ? (
    <button className="btn primary" onClick={openAddModal}>
      Add advocate
    </button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Advocates"
        description="Advocates associated with the firm — credentials, specialization and active caseload."
        actions={headerActions}
      />

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Search advocates</label>
            <input
              type="text"
              placeholder="Name, enrolment, specialization, mobile…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn sm ${statusFilter === btn.key ? 'primary' : 'ghost'}`}
            onClick={() => setStatusFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {RELATION_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={`btn sm ${relationFilter === btn.key ? 'primary' : 'ghost'}`}
            onClick={() => setRelationFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && !isModalOpen && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-3)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card mut" style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          Loading advocates…
        </div>
      ) : filteredAdvocates.length === 0 ? (
        <div className="card mut" style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          {advocates.length === 0
            ? 'No advocates yet. Add the first advocate to the register.'
            : 'No advocates match this search or filter.'}
        </div>
      ) : (
        <div className="grid3" style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filteredAdvocates.map((a) => {
            const relation = normalizeRelation(a.relation);
            return (
              <div 
                className="card" 
                style={{ margin: 0, cursor: 'pointer', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)' }} 
                key={a.id}
                onClick={() => openViewModal(a)}
              >
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'var(--card)',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-base)',
                    }}
                  >
                    {getInitials(a.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="card-t" style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {a.name}
                    </div>
                    <div className="mut" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      {a.specialization || '—'}
                    </div>
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      <Chip type={relationChipType(relation)} label={relation} />
                      {a.hasLogin && <Chip type="success" label="Login enabled" />}
                      {a.status === 'inactive' && (
                        <Chip type="ghost" label="Inactive" />
                      )}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    lineHeight: 1.9,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Advocate ID</span>
                    <b className="mono" style={{ color: 'var(--text-primary)' }}>{displayAdvocateId(a.id)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Enrolment</span>
                    <b className="mono" style={{ color: 'var(--text-primary)' }}>{a.enrolment || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Experience</span>
                    <b style={{ color: 'var(--text-primary)' }}>{experienceYears(a.experience)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Mobile</span>
                    <b className="mono" style={{ color: 'var(--text-primary)' }}>{a.mobile || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut" style={{ color: 'var(--text-secondary)' }}>Active cases</span>
                    <b style={{ color: 'var(--text-primary)' }}>{getCaseload(a.id)}</b>
                  </div>
                </div>
                {a.email && (
                  <div className="mut" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                    {a.email}
                  </div>
                )}
                {canEdit && (
                  <div
                    style={{
                      marginTop: 'var(--space-3)',
                      display: 'flex',
                      gap: 'var(--space-2)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 'var(--space-2)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => openEditModal(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => handleDelete(a)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Advocate Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Advocate Details"
      >
        {selectedViewAdvocate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Advocate ID</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{displayAdvocateId(selectedViewAdvocate.id)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Name</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedViewAdvocate.name}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Specialization</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewAdvocate.specialization || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Role / Relation</span>
                <Chip type={relationChipType(normalizeRelation(selectedViewAdvocate.relation))} label={normalizeRelation(selectedViewAdvocate.relation)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Mobile</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewAdvocate.mobile || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Email Address</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewAdvocate.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Enrolment Number</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewAdvocate.enrolment || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Experience</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{experienceYears(selectedViewAdvocate.experience)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Login Access</span>
                <Chip type={selectedViewAdvocate.hasLogin ? 'success' : 'ghost'} label={selectedViewAdvocate.hasLogin ? 'Enabled' : 'Disabled'} />
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Active Case Caseload</span>
                <span className="mono" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{getCaseload(selectedViewAdvocate.id)}</span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn secondary" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewAdvocate);
                  }}
                >
                  Edit Advocate Details
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAdvocate ? 'Edit Advocate' : 'Add Advocate'}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          {error && isModalOpen && (
            <div
              style={{
                padding: 'var(--space-2)',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}
          
          <FormSection title="Basic Details">
            <FormGrid columns={2}>
              <FormField label="Advocate Name" required>
                <input
                  type="text"
                  placeholder="e.g. M. Sailaja"
                  value={form.name}
                  onChange={setField('name')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Enrolment Number" required>
                <input
                  type="text"
                  placeholder="e.g. AP/1234/2020"
                  value={form.enrolment}
                  onChange={setField('enrolment')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Experience (Years)" required>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={form.experience}
                  onChange={setField('experience')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Relation / Role">
                <select 
                  value={form.relation} 
                  onChange={setField('relation')}
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                >
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Referral">Referral</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Contact Information">
            <FormGrid columns={2}>
              <FormField label="Mobile" required>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={form.mobile}
                  onChange={setField('mobile')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  placeholder="e.g. name@mail.in"
                  value={form.email}
                  onChange={setField('email')}
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Specialization" required>
                <input
                  type="text"
                  placeholder="e.g. Civil Suit, Property Disputes"
                  value={form.specialization}
                  onChange={setField('specialization')}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                />
              </FormField>
              <FormField label="Status">
                <select 
                  value={form.status} 
                  onChange={setField('status')}
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          {((!editingAdvocate && form.email) || (editingAdvocate && !editingAdvocate.hasLogin)) && (
            <FormSection title="Login Details">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={form.createLogin}
                  onChange={(e) => setForm(p => ({ ...p, createLogin: e.target.checked }))}
                />
                <label htmlFor="createLogin" style={{ textTransform: 'none', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Enable Advocate Portal Login</label>
              </div>
              {form.createLogin && (
                <FormGrid columns={2}>
                  <FormField label="Initial Password" required>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={setField('password')}
                      required
                      style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                    />
                  </FormField>
                  <FormField label="System Access Role" required>
                    <select
                      value={form.roleId}
                      onChange={setField('roleId')}
                      required
                      style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                    >
                      <option value="">Select Role</option>
                      {roles
                        .filter(r => user?.role === 'Super Admin' || r.name !== 'Super Admin')
                        .map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </FormField>
                </FormGrid>
              )}
            </FormSection>
          )}

          {editingAdvocate && editingAdvocate.hasLogin && (
            <FormSection title="Login Details">
              <FormGrid columns={2}>
                <FormField label="System Access Role" required>
                  <select
                    value={form.roleId}
                    onChange={setField('roleId')}
                    required
                    style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                  >
                    <option value="">Select Role</option>
                    {roles
                      .filter(r => user?.role === 'Super Admin' || r.name !== 'Super Admin')
                      .map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Reset Password (leave blank to keep current)">
                  <input
                    type="password"
                    placeholder="New password (min 6 chars)"
                    value={form.password}
                    onChange={setField('password')}
                    style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)' }}
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn secondary" onClick={closeModal} disabled={saving}>
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
