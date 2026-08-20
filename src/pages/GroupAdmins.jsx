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
  const [formData, setFormData] = useState({ name: '', email: '',  status: 'active' });

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
      setFormData({ name: '', email: '',  status: 'active' });
      fetchGroupAdmins();
    } catch (err) {
      notify(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const openEditModal = (ga) => {
    setEditingGA(ga);
    setFormData({ name: ga.name, email: ga.email,  status: ga.status || 'active' });
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

  const handleAssignAdvocate = async (advId) => {
    const idToAssign = advId || selectedAdvocateId;
    if (!idToAssign) {
      notify('Please select an advocate to assign', 'warning');
      return;
    }
    try {
      await assignAdvocateToGroupAdmin(assigningGA.id, idToAssign);
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
              padding: '0',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-header, #f8fafc)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
                  Manage Advocates
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>For {assigningGA.name} ({assigningGA.email})</span>
              </div>
              <button
                onClick={() => setAssigningGA(null)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Currently Assigned List */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  Currently Assigned ({assignedAdvocates.length})
                </h4>
                
                {assignedAdvocates.length === 0 ? (
                  <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
                    No advocates are currently assigned to this Group Admin.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--rule)', borderRadius: '8px', overflow: 'hidden' }}>
                    {assignedAdvocates.map((adv, idx) => (
                      <div
                        key={adv.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: idx % 2 === 0 ? 'var(--card)' : 'var(--surface)',
                          borderBottom: idx === assignedAdvocates.length - 1 ? 'none' : '1px solid var(--rule)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{adv.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{adv.enrolment || adv.email || 'No additional details'}</div>
                        </div>
                        {canManageAdvocates && (
                          <button
                            onClick={() => handleRemoveAdvocate(adv.id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Remove assignment"
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'transparent' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign Existing Advocate Form */}
              {canManageAdvocates && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Assign New Advocates
                  </h4>

                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '10px' }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search advocates by name or email..."
                      value={advocateSearchQuery}
                      onChange={(e) => handleAdvocateSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '13.5px',
                        background: 'var(--surface)'
                      }}
                    />
                  </div>
                  
                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'var(--card)' }}>
                    {tenantAdvocates.filter((adv) => !assignedAdvocates.some((aa) => aa.id === adv.id)).length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
                        {advocateSearchQuery ? 'No advocates match your search.' : 'All available advocates are already assigned.'}
                      </div>
                    ) : (
                      tenantAdvocates
                        .filter((adv) => !assignedAdvocates.some((aa) => aa.id === adv.id))
                        .map((adv) => (
                          <div
                            key={adv.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              borderBottom: '1px solid var(--rule, #f1f5f9)'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{adv.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{adv.email || adv.enrolment || 'No email'}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdvocateId(adv.id);
                                handleAssignAdvocate(adv.id);
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
                            >
                              Assign
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--rule)', background: 'var(--bg-header, #f8fafc)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAssigningGA(null)}
                className="btn outline"
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



