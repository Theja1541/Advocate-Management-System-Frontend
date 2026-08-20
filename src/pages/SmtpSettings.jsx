import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { getSmtpSettings, updateSmtpSettings, testSmtpSettings } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SmtpSettings() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    provider: 'custom',
    sender_name: '',
    from_email: '',
    reply_to_email: '',
    smtp_host: '',
    smtp_port: 587,
    encryption_type: 'tls',
    smtp_auth_enabled: true,
    smtp_username: '',
    smtp_password: '', // This stays empty unless typing a new one
  });

  const [statusInfo, setStatusInfo] = useState({
    test_status: 'Not Tested',
    last_tested_at: null,
    last_test_result: '',
    passwordConfigured: false,
  });

  const [testEmail, setTestEmail] = useState('');

  const loadData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await getSmtpSettings();
      if (data) {
        setFormData({
          provider: data.provider || 'custom',
          sender_name: data.sender_name || '',
          from_email: data.from_email || '',
          reply_to_email: data.reply_to_email || '',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          encryption_type: data.encryption_type || 'tls',
          smtp_auth_enabled: data.smtp_auth_enabled !== false,
          smtp_username: data.smtp_username || '',
          smtp_password: '', // keep blank
        });
        setStatusInfo({
          test_status: data.test_status || 'Not Tested',
          last_tested_at: data.last_tested_at,
          last_test_result: data.last_test_result,
          passwordConfigured: data.passwordConfigured || false,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load SMTP configuration.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Auto-fill defaults for Gmail
    if (name === 'provider' && value === 'gmail') {
      setFormData(prev => ({
        ...prev,
        provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        encryption_type: 'tls',
        smtp_auth_enabled: true,
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    // Prevent accidentally sending empty strings for password if it wasn't edited
    const payload = { ...formData };
    if (!payload.smtp_password) {
      delete payload.smtp_password;
    }

    try {
      const res = await updateSmtpSettings(payload);
      if (res.data) {
        setStatusInfo(prev => ({
          ...prev,
          passwordConfigured: res.data.passwordConfigured
        }));
        setFormData(prev => ({ ...prev, smtp_password: '' })); // clear password field
      }
      addToast('SMTP settings saved successfully.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to save SMTP settings.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      setError('Please enter a test recipient email.');
      return;
    }
    setTesting(true);
    setError('');
    try {
      const res = await testSmtpSettings(testEmail);
      if (res.data) {
        setStatusInfo(prev => ({
          ...prev,
          test_status: res.data.test_status,
          last_tested_at: res.data.last_tested_at,
          last_test_result: res.data.last_test_result,
        }));
      }
      addToast('Test email sent successfully.', 'success');
      setTestEmail(''); // clear it
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to send test email.';
      setError(msg);
      addToast(msg, 'error');
      // Reload settings to grab updated test status
      loadData();
    } finally {
      setTesting(false);
    }
  };

  if (!isSuperAdmin) {
    return <div className="card">Unauthorized access. Only Super Admin can view this page.</div>;
  }

  return (
    <>
      <PageHeader 
        title="Global SMTP Settings" 
        description="Configure the central email provider used by the system."
      />

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">Loading settings...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 450px', gap: 'var(--space-4)', alignItems: 'start' }}>
          
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <FormSection title="Email Provider Configuration" description="Set up the SMTP server details for sending emails.">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <FormField label="Provider" required>
                  <select name="provider" value={formData.provider} onChange={handleChange} required>
                    <option value="custom">Custom SMTP</option>
                    <option value="gmail">Google Workspace / Gmail</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                    <option value="amazon_ses">Amazon SES</option>
                    <option value="office365">Office 365</option>
                  </select>
                </FormField>

                <FormGrid columns={2}>
                  <FormField label="Sender Name" required>
                    <input type="text" name="sender_name" value={formData.sender_name} onChange={handleChange} required placeholder="e.g. Legal Desk System" />
                  </FormField>
                  <FormField label="From Email" required>
                    <input type="email" name="from_email" value={formData.from_email} onChange={handleChange} required placeholder="noreply@example.com" />
                  </FormField>
                </FormGrid>

                <FormField label="Reply-To Email">
                  <input type="email" name="reply_to_email" value={formData.reply_to_email} onChange={handleChange} placeholder="support@example.com" />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-4)', }}>
                  <FormField label="SMTP Host" required>
                    <input type="text" name="smtp_host" value={formData.smtp_host} onChange={handleChange} required placeholder="smtp.example.com" />
                  </FormField>
                  <FormField label="Port" required>
                    <input type="number" name="smtp_port" value={formData.smtp_port} onChange={handleChange} required />
                  </FormField>
                  <FormField label="Encryption">
                    <select name="encryption_type" value={formData.encryption_type} onChange={handleChange}>
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                      <option value="none">None</option>
                    </select>
                  </FormField>
                </div>

                <div style={{ }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    <input type="checkbox" name="smtp_auth_enabled" checked={formData.smtp_auth_enabled} onChange={handleChange} />
                    Requires Authentication
                  </label>
                </div>

                {formData.smtp_auth_enabled && (
                  <FormGrid columns={2}>
                    <FormField label="SMTP Username" required={formData.smtp_auth_enabled}>
                      <input type="text" name="smtp_username" value={formData.smtp_username} onChange={handleChange} required={formData.smtp_auth_enabled} />
                    </FormField>
                    <FormField label={
                      <>
                        SMTP Password
                        {statusInfo.passwordConfigured && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--success)' }}>(Configured)</span>}
                      </>
                    } required={formData.smtp_auth_enabled && !statusInfo.passwordConfigured}>
                      <input 
                        type="password" 
                        name="smtp_password" 
                        value={formData.smtp_password} 
                        onChange={handleChange} 
                        placeholder={statusInfo.passwordConfigured ? "Enter new to replace" : "Enter password"} 
                        required={formData.smtp_auth_enabled && !statusInfo.passwordConfigured}
                      />
                    </FormField>
                  </FormGrid>
                )}

                <div>
                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </FormSection>
          </div>

          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <FormSection title="Connection Status" description="Verify your email server connectivity.">
              <div style={{ background: 'var(--bg-sec)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginTop: '4px' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: statusInfo.test_status === 'success' ? 'var(--success)' : (statusInfo.test_status === 'failed' ? 'var(--danger)' : 'var(--warning)')
                    }}></span>
                    {statusInfo.test_status === 'success' ? 'Connected' : (statusInfo.test_status === 'failed' ? 'Failed' : 'Not Tested')}
                  </div>
                </div>

                {statusInfo.last_tested_at && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Tested</label>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{new Date(statusInfo.last_tested_at).toLocaleString()}</div>
                  </div>
                )}

                {statusInfo.last_test_result && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Log Output</label>
                    <div style={{ 
                      fontSize: '12px', 
                      fontFamily: 'monospace', 
                      background: 'var(--bg)', 
                      padding: '10px', 
                      borderRadius: '6px',
                      wordBreak: 'break-word',
                      marginTop: '4px',
                      border: '1px solid var(--border)',
                      color: statusInfo.test_status === 'success' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {statusInfo.last_test_result}
                    </div>
                  </div>
                )}
              </div>

              <FormField label="Send Test Email To">
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="email" 
                    value={testEmail} 
                    onChange={(e) => setTestEmail(e.target.value)} 
                    placeholder="admin@example.com"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={handleTestConnection}
                    disabled={testing || !testEmail}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </FormField>
            </FormSection>
          </div>

        </div>
      )}
    </>
  );
}
