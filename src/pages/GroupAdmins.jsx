import React, { useState, useEffect } from 'react';
import {
  getGroupAdmins,
  createGroupAdmin,
  updateGroupAdmin,
  assignAdvocateToGroupAdmin,
  removeAdvocateFromGroupAdmin,
  getAssignedAdvocates,
} from '../services/groupAdminService';
import { getAdvocates, searchAdvocates } from '../services/advocateService';
import { resetUserPassword } from '../services/userService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function GroupAdmins() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [groupAdmins, setGroupAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGA, setEditingGA] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', status: 'active' });

  // Advocate Assignment Modal
  const [assigningGA, setAssigningGA] = useState(null);
  const [assignedAdvocates, setAssignedAdvocates] = useState([]);
  const [tenantAdvocates, setTenantAdvocates] = useState([]);
  const [advocateSearchQuery, setAdvocateSearchQuery] = useState('');
  const [selectedAdvocateId, setSelectedAdvocateId] = useState('');

  const fetchGroupAdmins = async () => {
    try {
      setLoading(true);
      const data = await getGroupAdmins();
      setGroupAdmins(data);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to fetch Group Admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupAdmins();
  }, []);

  const toastContext = useToast();
  const notify = (msg, type = 'success') => {
    if (toastContext.showToast) toastContext.showToast(msg, type);
    else if (toastContext.addToast) toastContext.addToast(msg, type);
    else alert(msg);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingGA) {
        await updateGroupAdmin(editingGA.id, formData);
        notify('Group Admin updated successfully', 'success');
      } else {
        await createGroupAdmin(formData);
        notify('Group Admin successfully created', 'success');
      }
      setIsCreateModalOpen(false);
      setEditingGA(null);
      setFormData({ name: '', email: '', password: '', status: 'active' });
      fetchGroupAdmins();
    } catch (err) {
      notify(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const openEditModal = (ga) => {
    setEditingGA(ga);
    setFormData({ name: ga.name, email: ga.email, password: '', status: ga.status || 'active' });
    setIsCreateModalOpen(true);
  };

  const openAssignModal = async (ga) => {
    setAssigningGA(ga);
    setSelectedAdvocateId('');
    try {
      const assigned = await getAssignedAdvocates(ga.id);
      setAssignedAdvocates(assigned);
      const allAdvs = await getAdvocates();
      setTenantAdvocates(allAdvs);
    } catch (err) {
      notify('Failed to load advocate details', 'error');
    }
  };

  const handleAssignAdvocate = async () => {
    if (!selectedAdvocateId) {
      notify('Please select an advocate to assign', 'warning');
      return;
    }
    try {
      await assignAdvocateToGroupAdmin(assigningGA.id, selectedAdvocateId);
      notify('Advocate assigned successfully', 'success');
      const updatedAssigned = await getAssignedAdvocates(assigningGA.id);
      setAssignedAdvocates(updatedAssigned);
      setSelectedAdvocateId('');
      fetchGroupAdmins();
    } catch (err) {
      notify(err.response?.data?.message || 'Assignment failed', 'error');
    }
  };

  const handleRemoveAdvocate = async (advocateId) => {
    try {
      await removeAdvocateFromGroupAdmin(assigningGA.id, advocateId);
      notify('Advocate assignment removed', 'info');
      const updatedAssigned = await getAssignedAdvocates(assigningGA.id);
      setAssignedAdvocates(updatedAssigned);
      fetchGroupAdmins();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to remove advocate', 'error');
    }
  };

  const handleResetPassword = async (ga) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${ga.name}?`)) return;
    try {
      const res = await resetUserPassword(ga.id);
      if (res.status === 'success') {
        notify(`Password reset successful.`, 'success');
        window.alert(`Temporary password for ${ga.name}:\n\n${res.tempPassword}\n\nPlease copy this securely and provide it to the user. It will not be shown again.`);
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  const handleAdvocateSearch = async (val) => {
    setAdvocateSearchQuery(val);
    if (val.trim().length > 1) {
      const results = await searchAdvocates(val);
      setTenantAdvocates(results);
    } else if (val.trim().length === 0) {
      const allAdvs = await getAdvocates();
      setTenantAdvocates(allAdvs);
    }
  };

  const filteredGAs = groupAdmins.filter(
    (ga) =>
      ga.name.toLowerCase().includes(search.toLowerCase()) ||
      ga.email.toLowerCase().includes(search.toLowerCase())
  );

  const userRoleStr = typeof user?.role === 'object' ? user?.role?.name || '' : String(user?.role || '');
  const userRoleLower = userRoleStr.toLowerCase();
  const isTenantAdminOrSuper =
    userRoleLower.includes('super admin') ||
    userRoleLower.includes('tenant admin') ||
    userRoleLower === 'admin';


  const isGroupAdmin = userRoleLower.includes('group admin');
  const canManageAdvocates =
    isTenantAdminOrSuper || (isGroupAdmin && assigningGA && Number(user?.id) === Number(assigningGA.id));

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main, #1e293b)', margin: 0 }}>
            Group Admins Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #64748b)', marginTop: '4px', margin: 0 }}>
            Manage legal group administrators and their assigned advocates within your organization.
          </p>
        </div>

        {isTenantAdminOrSuper && (
          <button
            onClick={() => {
              setEditingGA(null);
              setFormData({ name: '', email: '', password: '', status: 'active' });
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: '13.5px',
              fontWeight: '600',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Group Admin
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search Group Admins by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 14px',
            fontSize: '13.5px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-card, #ffffff)',
          }}
        />
      </div>

      {/* Table List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading Group Admins...</div>
      ) : filteredGAs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--muted, #94a3b8)" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
          <h3 style={{ marginTop: '12px', color: 'var(--text-main)' }}>No Group Admins Found</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {search ? 'No matching records found for search filter.' : 'Create a Group Admin to get started.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-header, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-muted, #475569)' }}>Name</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-muted, #475569)' }}>Email</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-muted, #475569)' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-muted, #475569)' }}>Assigned Advocates</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-muted, #475569)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGAs.map((ga) => (
                <tr
                  key={ga.id}
                  style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-main, #0f172a)' }}>
                    {ga.name}
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--muted, #64748b)' }}>{ga.email}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: ga.status === 'active' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: ga.status === 'active' ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {ga.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <button
                      onClick={() => openAssignModal(ga)}
                      style={{
                        background: 'rgba(37, 99, 235, 0.08)',
                        color: '#2563eb',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                      {ga.advocateCount || (ga.assignedAdvocates ? ga.assignedAdvocates.length : 0)} Advocate(s)
                    </button>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => openAssignModal(ga)}
                        className="btn btn-sm btn-outline-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Manage Advocates
                      </button>
                      {isTenantAdminOrSuper && (
                        <>
                          <button
                            onClick={() => handleResetPassword(ga)}
                            className="btn btn-sm btn-outline-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => openEditModal(ga)}
                            className="btn btn-sm btn-outline-primary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Group Admin Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700' }}>
              {editingGA ? 'Edit Group Admin' : 'Create Group Admin'}
            </h3>
            <form onSubmit={handleCreateOrUpdate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Password {editingGA ? '(Leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingGA}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Save Group Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Assigned Advocates Modal */}
      {assigningGA && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  Assigned Advocates: {assigningGA.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{assigningGA.email}</span>
              </div>
              <button
                onClick={() => setAssigningGA(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ×
              </button>
            </div>

            {/* Currently Assigned List */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '10px' }}>Currently Assigned ({assignedAdvocates.length})</h4>
              {assignedAdvocates.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>No advocates assigned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {assignedAdvocates.map((adv) => (
                    <div
                      key={adv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: '500',
                      }}
                    >
                      <span>{adv.name}</span>
                      {adv.enrolment && <span style={{ fontSize: '11px', opacity: 0.7 }}>({adv.enrolment})</span>}
                      {canManageAdvocates && (
                        <button
                          onClick={() => handleRemoveAdvocate(adv.id)}
                          title="Remove assignment"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '0 2px',
                            fontWeight: 'bold',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Existing Advocate Form */}
            {canManageAdvocates && (
              <div
                style={{
                  borderTop: '1px solid var(--border-color, #e2e8f0)',
                  paddingTop: '16px',
                }}
              >
                <h4 style={{ fontSize: '13.5px', fontWeight: '600', marginBottom: '10px' }}>Assign Advocate to this Group Admin</h4>

                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Search tenant advocates..."
                    value={advocateSearchQuery}
                    onChange={(e) => handleAdvocateSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                      marginBottom: '10px',
                    }}
                  />
                  <select
                    value={selectedAdvocateId}
                    onChange={(e) => setSelectedAdvocateId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">Select Advocate to Assign...</option>
                    {tenantAdvocates
                      .filter((adv) => !assignedAdvocates.some((aa) => aa.id === adv.id))
                      .map((adv) => (
                        <option key={adv.id} value={adv.id}>
                          {adv.name} {adv.enrolment ? `(${adv.enrolment})` : ''} - {adv.email || 'No email'}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAssigningGA(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignAdvocate}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Assign Advocate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
