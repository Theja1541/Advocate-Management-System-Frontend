import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import KPICard from '../components/ui/KPICard';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { useAuth } from '../context/AuthContext';
import {
  getTenants,
  createTenant,
  updateTenant,

  getDashboardStats,
  uploadTenantLogo
} from '../services/tenantService';
import planService from '../services/subscriptionPlanService';

const emptyForm = {
  name: '',
  code: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  status: 'active',
  planId: '',
  storageLimit: '',
  maxUsers: '',
  subscriptionStart: '',
  subscriptionMonths: '',
  subscriptionEnd: '',
  website: '',
  gstNumber: '',
  adminName: '',
  adminEmail: '',
};

export default function Tenants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantsResult, statsResult, plansResult] = await Promise.allSettled([
        getTenants(),
        getDashboardStats(),
        planService.getAllPlans()
      ]);

      if (tenantsResult.status === 'rejected') {
        throw tenantsResult.reason;
      }

      setTenants(tenantsResult.value || []);
      setStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
      setPlans(plansResult.status === 'fulfilled' ? plansResult.value?.data || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const query = searchQuery.toLowerCase();
      const matchSearch = t.name.toLowerCase().includes(query) || 
                          (t.code && t.code.toLowerCase().includes(query));
      const matchStatus = filterStatus ? t.status === filterStatus : true;
      const matchPlan = filterPlan ? String(t.planId) === filterPlan : true;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [tenants, searchQuery, filterStatus, filterPlan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        status: form.status,
        planId: form.planId || null,
        storageLimit: form.storageLimit ? parseInt(form.storageLimit, 10) : null,
        maxUsers: form.maxUsers ? parseInt(form.maxUsers, 10) : null,
        subscriptionStart: form.subscriptionStart || null,
        subscriptionEnd: form.subscriptionEnd || null,
        website: form.website,
        gstNumber: form.gstNumber
      };

      if (selectedTenant) {
        await updateTenant(selectedTenant.id, payload);
      } else {
        await createTenant(payload, {
          name: form.adminName,
          email: form.adminEmail,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (tenant, newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} ${tenant.name}?`)) return;
    try {
      await updateTenant(tenant.id, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };


  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile || !selectedTenant) return;
    setUploadingLogo(true);
    try {
      await uploadTenantLogo(selectedTenant.id, logoFile);
      alert('Tenant logo uploaded successfully!');
      setLogoFile(null);
      loadData();
      setIsModalOpen(false); // Option to close or stay open
    } catch (err) {
      alert(err.message || 'Failed to upload tenant logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const headerActions = (
    <button
      className="btn primary"
      onClick={() => {
        setForm(emptyForm);
        setSelectedTenant(null);
        setError('');
        setIsModalOpen(true);
      }}
    >
      <i className="fi fi-rr-plus"></i> Add Law Firm
    </button>
  );

  const getAvatar = (name) => {
    const init = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        backgroundColor: 'var(--primary)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '14px', flexShrink: 0
      }}>
        {init}
      </div>
    );
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'success';
    if (status === 'suspended') return 'danger';
    return 'warning';
  };

  const calculateExpiry = (startDate, months) => {
    if (!startDate || !months || isNaN(months)) return '';
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + parseInt(months, 10));
    return date.toISOString().split('T')[0];
  };

  return (
    <>
      <PageHeader
        title="Tenants Management"
        description="Manage law firms, subscriptions, and system access"
        actions={headerActions}
      />

      {error && <div className="alert danger" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div className="kpis" style={{ marginBottom: 'var(--space-4)' }}>
        <KPICard label="Total Law Firms" value={stats?.totalTenants || 0} status="registered firms" />
        <KPICard label="Active" value={stats?.activeTenants || 0} status="currently active" type="success" />
        <KPICard label="Suspended" value={stats?.suspendedTenants || 0} status="access revoked" type="danger" />
        <KPICard label="System Users" value={stats?.totalUsers || 0} status="across all firms" type="warning" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
          <div className="f" style={{ flex: 1, minWidth: '200px' }}>
            <input 
              placeholder="Search by Firm Name or Tenant Code..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="f" style={{ width: '150px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button className="btn secondary" style={{ height: '42px' }} onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterPlan(''); }}>
            Clear
          </button>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '16px' }}>Law Firm</th>
                <th>Contact</th>
                <th>Group Admins</th>
                <th>Subscription</th>
                <th>Usage</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tenants...</td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tenants found.</td>
                </tr>
              ) : (
                filteredTenants.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getAvatar(t.name)}
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{t.contactPerson || t.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', fontWeight: 600, fontSize: '12.5px' }}>
                        👥 {t.groupAdminsCount ?? 0} Group Admins
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{t.plan?.name || 'Custom Plan'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Expires: {t.subscriptionEnd ? new Date(t.subscriptionEnd).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{t.storageLimit ? `${t.storageLimit} MB` : 'Unlimited'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.maxUsers ? `${t.maxUsers} Users` : 'Unlim. Users'}</div>
                    </td>
                    <td>
                      <Chip label={t.status.toUpperCase()} type={getStatusColor(t.status)} />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn outline sm" title="Edit" onClick={() => {
                          setSelectedTenant(t);
                          setForm({ ...emptyForm, ...t, subscriptionStart: t.subscriptionStart?.slice(0, 10) || '', subscriptionEnd: t.subscriptionEnd?.slice(0, 10) || '' });
                          setIsModalOpen(true);
                        }}>✏️</button>
                        
                        <button className="btn outline sm" title="View Details" onClick={() => navigate(`/tenants/${t.id}/details`)}>
                          👁️
                        </button>
                        
                        <button className="btn outline sm" title="Roles & Permissions" onClick={() => navigate(`/tenants/${t.id}/roles`)}>
                          🛡️
                        </button>
                        
                        

                        {t.status === 'active' ? (
                          <button className="btn outline sm" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }} title="Suspend" onClick={() => handleStatusChange(t, 'suspended')}>
                            ⏸️
                          </button>
                        ) : (
                          <button className="btn outline sm" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} title="Activate" onClick={() => handleStatusChange(t, 'active')}>
                            ▶️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={selectedTenant ? "Edit Law Firm" : "Add New Law Firm"}
        maxWidth="800px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <FormSection title="Basic Information">
            <FormGrid>
              <FormField label="Law Firm Name" required>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Firm Name" />
              </FormField>
              {!selectedTenant && (
                <FormField label="Tenant Code" required>
                  <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. LF001" />
                </FormField>
              )}
              <FormField label="Contact Person">
                <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Primary Contact" />
              </FormField>
              <FormField label="Email" required>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </FormField>
              <FormField label="Mobile Number">
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="Status" required>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          {selectedTenant && (
            <FormSection title="Tenant Logo">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {selectedTenant.logo && (
                  <img src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${selectedTenant.logo}`} alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border)' }} />
                )}
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => setLogoFile(e.target.files[0])} />
                  <button type="button" className="btn secondary" disabled={!logoFile || uploadingLogo} onClick={handleLogoUpload}>
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </div>
              </div>
            </FormSection>
          )}

          <FormSection title="Business Information">
            <FormGrid>
              <FormField label="Address" style={{ gridColumn: 'span 2' }}>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </FormField>
              <FormField label="City">
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </FormField>
              <FormField label="State">
                <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </FormField>
              <FormField label="Country">
                <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
              </FormField>
              <FormField label="Pincode">
                <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Subscription">
            <FormGrid>
              <FormField label="Subscription Plan">
                <select value={form.planId} onChange={e => {
                  const selectedPlan = plans.find(p => p.id === parseInt(e.target.value, 10));
                  setForm({ 
                    ...form, 
                    planId: e.target.value, 
                    storageLimit: selectedPlan ? selectedPlan.storageLimitMb : form.storageLimit, 
                    maxUsers: selectedPlan ? selectedPlan.maxUsers : form.maxUsers 
                  });
                }}>
                  <option value="">Custom (No Plan)</option>
                  {/* Option values should ideally be loaded from a plans API */}
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{Number(p.price).toLocaleString()}/{p.billingCycle === 'monthly' ? 'mo' : p.billingCycle === 'yearly' ? 'yr' : 'life'})</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Storage Limit (MB)">
                <input type="number" min="0" value={form.storageLimit} onChange={e => setForm({ ...form, storageLimit: e.target.value })} placeholder="Override plan limit" />
              </FormField>
              <FormField label="User Limit">
                <input type="number" min="1" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: e.target.value })} placeholder="Override plan limit" />
              </FormField>
                              {(() => {
                  const selectedPlan = plans.find(p => p.id === parseInt(form.planId, 10));
                  const isLifetime = selectedPlan && selectedPlan.billingCycle === 'lifetime';
                  return !isLifetime && (
                    <FormField label="Duration (Months)">
                      <input 
                        type="number" 
                        min="1" 
                        value={form.subscriptionMonths || ''} 
                        onChange={e => {
                          const m = e.target.value;
                          const newEnd = calculateExpiry(form.subscriptionStart, m);
                          setForm({ ...form, subscriptionMonths: m, subscriptionEnd: newEnd || form.subscriptionEnd });
                        }} 
                        placeholder="e.g. 1, 3, 12" 
                      />
                    </FormField>
                  );
                })()}

                <FormField label="Start Date">
                  <input type="date" value={form.subscriptionStart} onChange={e => {
                    const newStart = e.target.value;
                    const newEnd = calculateExpiry(newStart, form.subscriptionMonths);
                    setForm({ ...form, subscriptionStart: newStart, subscriptionEnd: newEnd || form.subscriptionEnd });
                  }} />
                </FormField>
                <FormField label="Expiry Date">
                  <input type="date" value={form.subscriptionEnd} onChange={e => setForm({ ...form, subscriptionEnd: e.target.value })} />
                </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Optional">
            <FormGrid>
              <FormField label="GST Number">
                <input value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} />
              </FormField>
              <FormField label="Website">
                <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
              </FormField>
            </FormGrid>
          </FormSection>

          {!selectedTenant && (
            <FormSection title="Tenant Admin Setup">
              <FormGrid>
                <FormField label="Admin Name" required>
                  <input required value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} />
                </FormField>
                <FormField label="Admin Email" required>
                  <input type="email" required value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Law Firm'}
            </button>
          </div>
        </form>
      </Modal>

      
    </>
  );
}







