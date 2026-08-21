import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { getPublicSettings, uploadSuperAdminLogo } from '../services/settingsService';
import { uploadTenantLogo } from '../services/tenantService';
import { useAuth } from '../context/AuthContext';

export default function MasterSettings() {
  const { user, updateUserContext } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const tenantId = user?.tenantId || user?.tenant?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const settings = await getPublicSettings();
        if (settings?.logo) setCurrentLogo(settings.logo);
      } else {
        if (user?.tenant?.logo) setCurrentLogo(user.tenant.logo);
      }
    } catch (err) {
      setError(err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSystemLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile) return;
    setSaving(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const data = await uploadSuperAdminLogo(logoFile);
        if (data?.logo) {
          setCurrentLogo(data.logo);
          setLogoFile(null);
          alert('Super Admin logo updated successfully.');
          window.location.reload();
        }
      } else {
        if (!tenantId) throw new Error("Tenant ID not found.");
        const data = await uploadTenantLogo(tenantId, logoFile);
        if (data?.logo) {
          setCurrentLogo(data.logo);
          setLogoFile(null);
          alert('Tenant logo updated successfully.');
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to upload logo.');
    } finally {
      setSaving(false);
    }
  };

  const titleText = isSuperAdmin ? "Global System Logo" : "Tenant Logo";
  const descText = isSuperAdmin 
    ? "This logo will be displayed on the public login page and the Super Admin sidebar." 
    : "This logo will be displayed on the sidebar for all users in your tenant.";

  return (
    <>
      <PageHeader 
        title="Settings" 
        description="Configure system preferences and branding."
      />

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3>{titleText}</h3>
          <p className="mut mb-4">{descText}</p>
          
          {currentLogo && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>Current Logo</label>
              <img 
                src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${currentLogo}`} 
                alt="Current Logo" 
                style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }} 
              />
            </div>
          )}

          <form onSubmit={handleSystemLogoUpload}>
            <div className="f mb-4">
              <label>Upload New Logo (PNG, JPG, WEBP, SVG)</label>
              <input 
                type="file" 
                accept=".png,.jpg,.jpeg,.webp,.svg"
                onChange={(e) => setLogoFile(e.target.files[0])}
              />
            </div>
            <button type="submit" className="btn primary" style={{ marginTop: '16px' }} disabled={saving || !logoFile}>
              {saving ? 'Uploading...' : 'Upload Logo'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
