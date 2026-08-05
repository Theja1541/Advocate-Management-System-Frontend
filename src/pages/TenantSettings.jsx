import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { FormSection } from '../components/ui/FormLayout';
import { useAuth } from '../context/AuthContext';
import { uploadTenantLogo } from '../services/tenantService';

export default function TenantSettings() {
  const { user } = useAuth();
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile || !user?.tenantId) return;
    setUploadingLogo(true);
    try {
      await uploadTenantLogo(user.tenantId, logoFile);
      alert('Tenant logo uploaded successfully! Refresh the page to see changes.');
      setLogoFile(null);
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to upload tenant logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="page" style={{ padding: '24px' }}>
      <PageHeader title="Tenant Settings" />
      <div className="card" style={{ padding: '24px', maxWidth: '800px', marginTop: '24px' }}>
        <FormSection title="Tenant Logo">
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            Upload a custom logo for your law firm. This will be displayed in the sidebar for all your users.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {user?.tenant?.logo && (
              <img 
                src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${user.tenant.logo}`} 
                alt="Tenant Logo" 
                style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border)' }} 
              />
            )}
            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="file" 
                accept=".png,.jpg,.jpeg,.webp,.svg" 
                onChange={(e) => setLogoFile(e.target.files[0])} 
              />
              <button 
                type="button" 
                className="btn primary" 
                disabled={!logoFile || uploadingLogo} 
                onClick={handleLogoUpload}
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
