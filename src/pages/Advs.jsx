import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import Modal from '../components/ui/Modal';
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
  if (label === 'Senior') return 'c-tape';
  if (label === 'Referral') return 'c-brass';
  return 'c-ink';
};

const displayAdvocateId = (id) => `ADV-${String(id).padStart(2, '0')}`;

const experienceYears = (experience) => {
  if (experience == null || experience === '') return '—';
  const raw = String(experience).trim();
  if (/year/i.test(raw)) return raw;
  return `${raw} years`;
};

export default function Advs() {
  const { hasPermission } = useAuth();
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
    <button className="btn" onClick={openAddModal}>
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

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search advocates</label>
            <input
              type="text"
              placeholder="Name, enrolment, specialization, mobile…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        {STATUS_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={statusFilter === btn.key ? 'on' : ''}
            onClick={() => setStatusFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="filt">
        {RELATION_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={relationFilter === btn.key ? 'on' : ''}
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
          Loading advocates…
        </div>
      ) : filteredAdvocates.length === 0 ? (
        <div className="card mut" style={{ textAlign: 'center', padding: '24px' }}>
          {advocates.length === 0
            ? 'No advocates yet. Add the first advocate to the register.'
            : 'No advocates match this search or filter.'}
        </div>
      ) : (
        <div className="grid3">
          {filteredAdvocates.map((a) => {
            const relation = normalizeRelation(a.relation);
            return (
              <div 
                className="card" 
                style={{ margin: 0, cursor: 'pointer' }} 
                key={a.id}
                onClick={() => openViewModal(a)}
              >
                <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      color: 'var(--brass)',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Spectral', serif",
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                  >
                    {getInitials(a.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="card-t" style={{ fontSize: '14.5px' }}>
                      {a.name}
                    </div>
                    <div className="mut" style={{ fontSize: '11.5px' }}>
                      {a.specialization || '—'}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Chip type={relationChipType(relation)} label={relation} />
                      {a.hasLogin && <Chip type="c-baize" label="Login enabled" />}
                      {a.status === 'inactive' && (
                        <Chip type="c-grey" label="Inactive" />
                      )}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '11px',
                    fontSize: '11.5px',
                    lineHeight: 1.9,
                    borderTop: '1px dashed var(--rule)',
                    paddingTop: '9px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Advocate ID</span>
                    <b className="mono">{displayAdvocateId(a.id)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Enrolment</span>
                    <b className="mono">{a.enrolment || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Experience</span>
                    <b>{experienceYears(a.experience)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Mobile</span>
                    <b className="mono">{a.mobile || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mut">Active cases</span>
                    <b>{getCaseload(a.id)}</b>
                  </div>
                </div>
                {a.email && (
                  <div className="mut" style={{ fontSize: '10.5px', marginTop: '8px' }}>
                    {a.email}
                  </div>
                )}
                {canEdit && (
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      gap: '6px',
                      borderTop: '1px dashed var(--rule)',
                      paddingTop: '10px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => openEditModal(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleDelete(a)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Advocate ID</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{displayAdvocateId(selectedViewAdvocate.id)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Name</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewAdvocate.name}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Specialization</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewAdvocate.specialization || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Role / Relation</span>
                <Chip type={relationChipType(normalizeRelation(selectedViewAdvocate.relation))} label={normalizeRelation(selectedViewAdvocate.relation)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Mobile</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewAdvocate.mobile || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewAdvocate.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px dashed var(--rule)', paddingTop: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Enrolment Number</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewAdvocate.enrolment || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Experience</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{experienceYears(selectedViewAdvocate.experience)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Login Access</span>
                <Chip type={selectedViewAdvocate.hasLogin ? 'c-baize' : 'c-grey'} label={selectedViewAdvocate.hasLogin ? 'Enabled' : 'Disabled'} />
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Active Case Caseload</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{getCaseload(selectedViewAdvocate.id)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn"
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
            <label>Advocate Name</label>
            <input
              type="text"
              placeholder="e.g. M. Sailaja"
              value={form.name}
              onChange={setField('name')}
              required
            />
          </div>
          <div className="f">
            <label>Specialization</label>
            <input
              type="text"
              placeholder="e.g. Civil Suit, Property Disputes"
              value={form.specialization}
              onChange={setField('specialization')}
              required
            />
          </div>
          <div className="f">
            <label>Relation / Role</label>
            <select value={form.relation} onChange={setField('relation')}>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Referral">Referral</option>
            </select>
          </div>
          <div className="f">
            <label>Experience (Years)</label>
            <input
              type="number"
              placeholder="e.g. 5"
              value={form.experience}
              onChange={setField('experience')}
              required
            />
          </div>
          <div className="f">
            <label>Enrolment Number</label>
            <input
              type="text"
              placeholder="e.g. AP/1234/2020"
              value={form.enrolment}
              onChange={setField('enrolment')}
              required
            />
          </div>
          <div className="f">
            <label>Mobile</label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={form.mobile}
              onChange={setField('mobile')}
              required
            />
          </div>
          <div className="f">
            <label>Email</label>
            <input
              type="email"
              placeholder="e.g. name@mail.in"
              value={form.email}
              onChange={setField('email')}
            />
          </div>

          <div className="f">
            <label>Status</label>
            <select value={form.status} onChange={setField('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {((!editingAdvocate && form.email) || (editingAdvocate && !editingAdvocate.hasLogin)) && (
            <div style={{ marginTop: '12px', border: '1px solid var(--rule)', padding: '12px', borderRadius: '5px', background: 'var(--panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={form.createLogin}
                  onChange={(e) => setForm(p => ({ ...p, createLogin: e.target.checked }))}
                />
                <label htmlFor="createLogin" style={{ textTransform: 'none', fontSize: '12.5px', color: 'var(--ink)' }}>Enable Advocate Portal Login</label>
              </div>
              {form.createLogin && (
                <>
                  <div className="f">
                    <label>Initial Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={setField('password')}
                      required
                    />
                  </div>
                  <div className="f" style={{ marginTop: '12px' }}>
                    <label>System Access Role</label>
                    <select
                      value={form.roleId}
                      onChange={setField('roleId')}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {editingAdvocate && editingAdvocate.hasLogin && (
            <div style={{ marginTop: '12px', border: '1px solid var(--rule)', padding: '12px', borderRadius: '5px', background: 'var(--panel)' }}>
              <div className="f">
                <label>System Access Role</label>
                <select
                  value={form.roleId}
                  onChange={setField('roleId')}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="f" style={{ marginTop: '12px' }}>
                <label>Reset Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={form.password}
                  onChange={setField('password')}
                />
              </div>
            </div>
          )}

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
