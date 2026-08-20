import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Chip from '../components/ui/Chip';
import { getTenantById } from '../services/tenantService';
import { getAdvocates } from '../services/advocateService';
import { getGroupAdmins, updateGroupAdmin } from '../services/groupAdminService';
import { getClients } from '../services/clientService';
import { getDaybookEntries } from '../services/daybookService';
import { getPayments } from '../services/paymentService';
import { updateUser } from '../services/userService';

export default function TenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState('');
  
  const [activeTab, setActiveTab] = useState('advocates');
  
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState('');

  // Fetch Tenant Info
  useEffect(() => {
    let isMounted = true;
    const fetchTenant = async () => {
      try {
        setTenantLoading(true);
        const data = await getTenantById(id);
        if (isMounted) setTenant(data);
      } catch (err) {
        if (isMounted) setTenantError(err.message || 'Failed to load tenant details');
      } finally {
        if (isMounted) setTenantLoading(false);
      }
    };
    fetchTenant();
    return () => { isMounted = false; };
  }, [id]);

  // Fetch Tab Data
  useEffect(() => {
    let isMounted = true;
    const fetchTabData = async () => {
      try {
        setTabLoading(true);
        setTabError('');
        setTabData([]);
        
        let data = [];
        if (activeTab === 'advocates') {
          data = await getAdvocates(id);
        } else if (activeTab === 'groupAdmins') {
          data = await getGroupAdmins(id);
        } else if (activeTab === 'clients') {
          data = await getClients(id);
        } else if (activeTab === 'daybook') {
          data = await getDaybookEntries(id);
        } else if (activeTab === 'payments') {
          data = await getPayments(id);
        }
        
        if (isMounted) setTabData(data);
      } catch (err) {
        if (isMounted) setTabError(err.message || `Failed to load ${activeTab}`);
      } finally {
        if (isMounted) setTabLoading(false);
      }
    };
    
    if (id) {
      fetchTabData();
    }
    
    return () => { isMounted = false; };
  }, [id, activeTab]);

  const handleTenantAdminStatusChange = async (user, newStatus) => {
    if (newStatus === 'inactive' && !window.confirm('Deactivating this Tenant Admin will also deactivate all Group Admins in this Tenant. Are you sure you want to proceed?')) {
      return;
    }
    try {
      await updateUser(user.id, { status: newStatus });
      setTenant(prev => ({
        ...prev,
        tenantAdmin: { ...prev.tenantAdmin, status: newStatus }
      }));
      // If we are currently viewing Group Admins and we just deactivated the Tenant Admin, 
      // we should refresh the tab to reflect the cascade.
      if (activeTab === 'groupAdmins' && newStatus === 'inactive') {
        const data = await getGroupAdmins(id);
        setTabData(data);
      }
    } catch (err) {
      alert(err.message || 'Failed to update Tenant Admin status');
    }
  };

  const handleGroupAdminStatusChange = async (ga, newStatus) => {
    try {
      await updateGroupAdmin(ga.id, { status: newStatus });
      setTabData(prev => prev.map(item => item.id === ga.id ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert(err.message || 'Failed to update Group Admin status');
    }
  };

  const headerActions = (
    <button className="btn outline" onClick={() => navigate('/tenants')}>
      <i className="fi fi-rr-arrow-left"></i> Back to Tenants
    </button>
  );

  if (tenantLoading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading Tenant Details...</div>;
  }

  if (tenantError) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div className="alert danger">{tenantError}</div>
        {headerActions}
      </div>
    );
  }

  if (!tenant) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Tenant not found. {headerActions}</div>;
  }

  const tabs = [
    { id: 'advocates', label: 'Advocates' },
    { id: 'groupAdmins', label: 'Group Admins' },
    { id: 'clients', label: 'Clients' },
    { id: 'daybook', label: 'Daybook' },
    { id: 'payments', label: 'Payments' }
  ];

  const renderTabContent = () => {
    if (tabLoading) {
      return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading {activeTab}...</div>;
    }
    if (tabError) {
      return <div className="alert danger">{tabError}</div>;
    }
    if (tabData.length === 0) {
      return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No records found.</div>;
    }

    if (activeTab === 'advocates') {
      return (
        <DataTable headers={[{label:'Name'}, {label:'Email'}, {label:'Phone'}, {label:'Status'}]}>
          {tabData.map(a => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.email}</td>
              <td>{a.phone || '-'}</td>
              <td><Chip label={a.status || 'Active'} type={a.status === 'inactive' ? 'danger' : 'success'} /></td>
            </tr>
          ))}
        </DataTable>
      );
    }
    
    if (activeTab === 'groupAdmins') {
      return (
        <DataTable headers={[{label:'Name'}, {label:'Email'}, {label:'Status'}, {label:'Actions'}]}>
          {tabData.map(ga => (
            <tr key={ga.id}>
              <td>{ga.name}</td>
              <td>{ga.email}</td>
              <td><Chip label={ga.status || 'active'} type={ga.status === 'inactive' ? 'danger' : 'success'} /></td>
              <td>
                {ga.status !== 'inactive' ? (
                  <button className="btn outline sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Deactivate" onClick={() => handleGroupAdminStatusChange(ga, 'inactive')}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn outline sm" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} title="Activate" onClick={() => handleGroupAdminStatusChange(ga, 'active')}>
                    Activate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      );
    }
    
    if (activeTab === 'clients') {
      return (
        <DataTable headers={[{label:'Client Name'}, {label:'Email'}, {label:'Phone'}, {label:'City'}]}>
          {tabData.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email || '-'}</td>
              <td>{c.phone || '-'}</td>
              <td>{c.city || '-'}</td>
            </tr>
          ))}
        </DataTable>
      );
    }

    if (activeTab === 'daybook') {
      return (
        <DataTable headers={[{label:'Date'}, {label:'Code'}, {label:'Particulars'}, {label:'Type'}, {label:'Amount'}]}>
          {tabData.map(d => (
            <tr key={d.id}>
              <td>{d.transactionDate ? new Date(d.transactionDate).toLocaleDateString() : '-'}</td>
              <td>{d.daybookCode}</td>
              <td>{d.particulars}</td>
              <td>
                <Chip label={d.type ? d.type.toUpperCase() : 'UNKNOWN'} type={d.type === 'in' ? 'success' : 'danger'} />
              </td>
              <td>₹{d.amount}</td>
            </tr>
          ))}
        </DataTable>
      );
    }

    if (activeTab === 'payments') {
      return (
        <DataTable headers={[{label:'Date'}, {label:'Receipt No'}, {label:'Case'}, {label:'Received'}, {label:'Status'}]}>
          {tabData.map(p => (
            <tr key={p.id}>
              <td>{p.transactionDate ? new Date(p.transactionDate).toLocaleDateString() : '-'}</td>
              <td>{p.receiptNo}</td>
              <td>{p.case ? p.case.title : '-'}</td>
              <td>₹{p.amountReceived}</td>
              <td><Chip label={p.status ? p.status.toUpperCase() : 'UNKNOWN'} type={p.status === 'paid' ? 'success' : p.status === 'part' ? 'warning' : 'danger'} /></td>
            </tr>
          ))}
        </DataTable>
      );
    }

    return null;
  };

  return (
    <>
      <PageHeader
        title={`Tenant Details: ${tenant.name}`}
        description={`Code: ${tenant.code} | Plan: ${tenant.plan?.name || 'Custom'} | Status: ${tenant.status}`}
        actions={headerActions}
      />
      
      {tenant.tenantAdmin && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Tenant Admin</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              <strong>Name:</strong> {tenant.tenantAdmin.name} | <strong>Email:</strong> {tenant.tenantAdmin.email} | <strong>Status:</strong> <Chip label={tenant.tenantAdmin.status || 'active'} type={tenant.tenantAdmin.status === 'inactive' ? 'danger' : 'success'} />
            </div>
          </div>
          <div>
            {tenant.tenantAdmin.status !== 'inactive' ? (
              <button className="btn outline sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleTenantAdminStatusChange(tenant.tenantAdmin, 'inactive')}>
                Deactivate Tenant Admin
              </button>
            ) : (
              <button className="btn outline sm" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleTenantAdminStatusChange(tenant.tenantAdmin, 'active')}>
                Activate Tenant Admin
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '0' }}>
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}
