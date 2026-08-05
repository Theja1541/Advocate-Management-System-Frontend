import React, { useCallback, useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import KPICard from '../components/ui/KPICard';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import planService from '../services/subscriptionPlanService';

const emptyForm = {
  name: '',
  code: '',
  description: '',
  price: '',
  billingCycle: 'monthly',
  maxUsers: 5,
  storageLimitMb: 1024,
  isTrial: false,
  trialDays: 14,
  status: 'active',
  displayOrder: 0
};

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [filterBilling, setFilterBilling] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await planService.getAllPlans();
      const plansData = res.data || [];
      setPlans(plansData);
      
      setStats({
        total: plansData.length,
        active: plansData.filter(p => p.status === 'active').length,
        trial: plansData.filter(p => p.isTrial).length,
        assigned: plansData.reduce((acc, curr) => acc + (curr.assignedCount || 0), 0)
      });
    } catch (err) {
      setError(err.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchName.toLowerCase());
      const matchCode = searchCode ? p.code.toLowerCase().includes(searchCode.toLowerCase()) : true;
      const matchBilling = filterBilling ? p.billingCycle === filterBilling : true;
      const matchStatus = filterStatus ? p.status === filterStatus : true;
      return matchName && matchCode && matchBilling && matchStatus;
    });
  }, [plans, searchName, searchCode, filterBilling, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (selectedPlan) {
        await planService.updatePlan(selectedPlan.id, payload);
      } else {
        await planService.createPlan(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (plan) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${plan.name}?`)) return;
    try {
      await planService.updatePlan(plan.id, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (plan) => {
    if (plan.assignedCount > 0) {
      alert(`Cannot delete ${plan.name} because it is assigned to ${plan.assignedCount} tenant(s).`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${plan.name}? This action is permanent.`)) return;
    try {
      await planService.deletePlan(plan.id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete plan');
    }
  };

  const handleDuplicate = async (plan) => {
    if (!window.confirm(`Duplicate ${plan.name}?`)) return;
    try {
      const payload = { ...plan };
      delete payload.id;
      delete payload.assignedCount;
      payload.name = `${payload.name} (Copy)`;
      payload.code = `${payload.code}-COPY-${Date.now().toString().slice(-4)}`;
      await planService.createPlan(payload);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to duplicate plan');
    }
  };

  const headerActions = (
    <button
      className="btn primary"
      onClick={() => {
        setForm(emptyForm);
        setSelectedPlan(null);
        setError('');
        setIsModalOpen(true);
      }}
    >
      <i className="fi fi-rr-plus"></i> Add Plan
    </button>
  );

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="Manage pricing plans and system limits for tenants"
        actions={headerActions}
      />

      {error && <div className="alert danger" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div className="kpis" style={{ marginBottom: 'var(--space-4)' }}>
        <KPICard label="Total Plans" value={stats?.total || 0} status="all plans" />
        <KPICard label="Active" value={stats?.active || 0} status="available for tenants" type="success" />
        <KPICard label="Trial Supported" value={stats?.trial || 0} status="plans with trial" type="warning" />
        <KPICard label="Assigned Plans" value={stats?.assigned || 0} status="active tenant subscriptions" type="info" />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
          <div className="f" style={{ flex: 1, minWidth: '200px' }}>
            <input 
              placeholder="Search by Name..." 
              value={searchName} 
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
          <div className="f" style={{ width: '150px' }}>
            <input 
              placeholder="Plan Code..." 
              value={searchCode} 
              onChange={e => setSearchCode(e.target.value)}
            />
          </div>
          <div className="f" style={{ width: '150px' }}>
            <select value={filterBilling} onChange={e => setFilterBilling(e.target.value)}>
              <option value="">Billing Cycle</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div className="f" style={{ width: '150px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button className="btn secondary" style={{ height: '42px' }} onClick={() => { setSearchName(''); setSearchCode(''); setFilterStatus(''); setFilterBilling(''); }}>
            Clear
          </button>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '16px' }}>Plan</th>
                <th>Pricing</th>
                <th>Limits</th>
                <th>Trial</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Tenants</th>
                <th style={{ textAlign: 'right', paddingRight: '16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading plans...</td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No plans found.</td>
                </tr>
              ) : (
                filteredPlans.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.code}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>₹{Number(p.price).toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.billingCycle}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{p.storageLimitMb >= 1024 ? `${(p.storageLimitMb/1024).toFixed(1)} GB` : `${p.storageLimitMb} MB`}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.maxUsers} Users</div>
                    </td>
                    <td>
                      {p.isTrial ? (
                        <Chip label={`${p.trialDays} Days`} type="warning" />
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>None</span>
                      )}
                    </td>
                    <td>
                      <Chip label={p.status.toUpperCase()} type={p.status === 'active' ? 'success' : 'secondary'} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold' }}>{p.assignedCount || 0}</div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn outline sm" title="Edit" onClick={() => {
                          setSelectedPlan(p);
                          setForm({ ...emptyForm, ...p });
                          setIsModalOpen(true);
                        }}>✏️</button>
                        
                        <button className="btn outline sm" title="Duplicate" onClick={() => handleDuplicate(p)}>
                          📋
                        </button>

                        <button className="btn outline sm" style={{ color: p.status === 'active' ? 'var(--warning)' : 'var(--success)', borderColor: p.status === 'active' ? 'var(--warning)' : 'var(--success)' }} title={p.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => handleStatusToggle(p)}>
                          {p.status === 'active' ? '⏸️' : '▶️'}
                        </button>
                        
                        <button className="btn outline sm text-danger" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Delete" onClick={() => handleDelete(p)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={selectedPlan ? "Edit Subscription Plan" : "Add Subscription Plan"}
        maxWidth="800px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <FormSection title="Basic Information">
            <FormGrid>
              <FormField label="Plan Name" required>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Plan" />
              </FormField>
              <FormField label="Plan Code" required>
                <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. PREMIUM_YEARLY" />
              </FormField>
              <FormField label="Description" style={{ gridColumn: 'span 2' }}>
                <input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the plan features..." />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Pricing">
            <FormGrid>
              <FormField label="Price (₹)" required>
                <input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </FormField>
              <FormField label="Billing Cycle" required>
                <select required value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Limits">
            <FormGrid>
              <FormField label="Maximum Users" required>
                <input type="number" min="1" required value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: e.target.value })} />
              </FormField>
              <FormField label="Storage Limit (MB)" required>
                <input type="number" min="1" required value={form.storageLimitMb} onChange={e => setForm({ ...form, storageLimitMb: e.target.value })} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Trial & Status">
            <FormGrid>
              <FormField label="Trial Enabled">
                <select value={form.isTrial} onChange={e => setForm({ ...form, isTrial: e.target.value === 'true' })}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </FormField>
              {form.isTrial && (
                <FormField label="Trial Days" required>
                  <input type="number" min="1" required value={form.trialDays} onChange={e => setForm({ ...form, trialDays: e.target.value })} />
                </FormField>
              )}
              <FormField label="Status" required>
                <select required value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
              <FormField label="Display Order">
                <input type="number" min="0" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} />
              </FormField>
            </FormGrid>
          </FormSection>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
