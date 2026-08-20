import React, { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import Modal from '../components/ui/Modal';
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
    <>
      <PageHeader
        title="Group Admins Management"
        description="Manage legal group administrators and their assigned advocates within your organization."
        actions={
          isTenantAdminOrSuper ? (
            <button
              onClick={() => {
                setFormData({ name: '', email: '', status: 'active' });
                setEditingGA(null);
                setIsCreateModalOpen(true);
              }}
              className="btn primary"
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}
            >
              + Add New Group Admin
            </button>
          ) : null
        }
      />

      {loading ? (
        <p style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>Loading group admins...</p>
      ) : groupAdmins.length === 0 ? (
        <p style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No group admins found.</p>
      ) : (
        <div className="card" style={{ marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>Email</th>
                
                <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupAdmins.map((ga) => (
                <tr key={ga.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{ga.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--muted)" }}>{ga.email || "-"}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <Chip type={ga.status === 'active' ? 'success' : 'danger'} label={(ga.status || 'unknown').toUpperCase()} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {isTenantAdminOrSuper && (
                        <button
                          onClick={() => openEditModal(ga)}
                          className="btn btn-sm btn-outline-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
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
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingGA ? 'Edit Group Admin' : 'Add New Group Admin'}
        maxWidth="500px"
      >
        <form onSubmit={handleCreateOrUpdate}>
          <FormSection>
            <FormGrid>
              <FormField label="Name" required>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>
              <FormField label="Email" required>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormField>
              <FormField label="Status" required>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {editingGA ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}





