import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { useAuth } from '../context/AuthContext';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '../services/clientService';
import { getCases } from '../services/caseService';
import {
  formatAadhaar,
  formatPan,
  formatMobile,
  displayAadhaar,
  displayPan,
  displayMobile,
} from '../utils/formatters';

const emptyForm = {
  name: '',
  mobile: '',
  email: '',
  village: '',
  aadhaarMasked: '',
  panMasked: '',
};

const isBlankId = (value) => !value || value === '—';

export default function Clients() {
  const { hasPermission, user } = useAuth();
  const rawRole = typeof user?.role === 'object' ? (user?.role?.name || '') : String(user?.role || '');
  const isGroupAdminUser = /group[\s_]?admin/i.test(rawRole);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewClient, setSelectedViewClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = hasPermission('clients', 'E');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientsResult, casesResult] = await Promise.allSettled([getClients(), getCases()]);

      if (clientsResult.status === 'rejected') {
        throw clientsResult.reason;
      }

      let rows = clientsResult.value || [];
      if (isGroupAdminUser && user?.id != null) {
        rows = rows.filter(
          (c) => Number(c.createdBy ?? c.created_by) === Number(user.id)
        );
      }
      setClients(rows);
      setCases(casesResult.status === 'fulfilled' ? casesResult.value || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [isGroupAdminUser, user?.id]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const getClientCaseCount = (clientId) => {
    return cases.filter((c) => String(c.clientId) === String(clientId)).length;
  };

  const openAddModal = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    const aadhaarRaw = client.aadhaarMasked;
    const panRaw = client.panMasked;
    const aadhaarIsLegacyMask =
      typeof aadhaarRaw === 'string' && /^XXXX\sXXXX\s\d{4}$/i.test(aadhaarRaw.trim());
    const panIsLegacyMask =
      typeof panRaw === 'string' && /^[A-Z]{5}[•*]{4}[A-Z]$/i.test(panRaw.trim());

    setEditingClient(client);
    setForm({
      name: client.name || '',
      mobile: isBlankId(client.mobile) ? '' : formatMobile(client.mobile),
      email: client.email || '',
      village: client.village || '',
      aadhaarMasked:
        isBlankId(aadhaarRaw) || aadhaarIsLegacyMask ? '' : formatAadhaar(aadhaarRaw),
      panMasked: isBlankId(panRaw) || panIsLegacyMask ? '' : formatPan(panRaw),
    });
    setError('');
    setIsModalOpen(true);
  };

  const openViewModal = (client) => {
    setSelectedViewClient(client);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const setFormattedField = (key, formatter) => (e) => {
    setForm((prev) => ({ ...prev, [key]: formatter(e.target.value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      setError('Please fill out Name and Mobile number.');
      return;
    }

    const aadhaarDigits = form.aadhaarMasked.replace(/\D/g, '');
    if (form.aadhaarMasked.trim() && aadhaarDigits.length !== 12) {
      setError('Aadhaar must be 12 digits (e.g. 1234 5678 9012).');
      return;
    }

    const pan = form.panMasked.trim().toUpperCase();
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      setError('PAN must be in format ABCDE1234F.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || undefined,
      village: form.village.trim() || undefined,
      aadhaarMasked: form.aadhaarMasked.trim() || undefined,
      panMasked: pan || undefined,
    };

    try {
      if (editingClient) {
        const updated = await updateClient(editingClient.id, payload);
        setClients((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        // Refresh the detail modal if currently open
        setSelectedViewClient(updated);
      } else {
        const created = await createClient(payload);
        setClients((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client) => {
    const confirmed = window.confirm(
      `Delete client "${client.name}" (${client.clientCode})? This cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await deleteClient(client.id);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      if (selectedViewClient && selectedViewClient.id === client.id) {
        setIsViewModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete client');
    }
  };

  const headers = [
    { label: 'ID' },
    { label: 'Client' },
    { label: 'Village / Town' },
    { label: 'Mobile' },
    { label: 'Email' },
    { label: 'Aadhaar' },
    { label: 'PAN' },
    { label: 'Docs', className: 'c' },
    { label: 'Cases', className: 'c' },
    ...(canEdit ? [{ label: 'Actions', className: 'c' }] : []),
  ];

  const headerActions = canEdit ? (
    <button className="btn primary" onClick={openAddModal}>
      Add client
    </button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Clients"
        description="Party details and the identity documents held on file."
        actions={headerActions}
      />

      {error && !isModalOpen && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-3)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length} className="mut" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              Loading clients…
            </td>
          </tr>
        ) : clients.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="mut" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              No clients yet. Add the first party to the register.
            </td>
          </tr>
        ) : (
          clients.map((c) => (
            <tr 
              key={c.id}
              onClick={() => openViewModal(c)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <span className="cno-c">{c.clientCode}</span>
              </td>
              <td>
                <span className="nm">{c.name}</span>
              </td>
              <td className="mut">{c.village || '—'}</td>
              <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                {displayMobile(c.mobile)}
              </td>
              <td className="mut" style={{ fontSize: 'var(--text-xs)' }}>
                {c.email || '—'}
              </td>
              <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                {displayAadhaar(c.aadhaarMasked)}
              </td>
              <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                {displayPan(c.panMasked)}
              </td>
              <td className="c mono">{c.docsCount ?? 0}</td>
              <td className="c mono">{getClientCaseCount(c.id)}</td>
              {canEdit && (
                <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => openEditModal(c)}
                    style={{ marginRight: 'var(--space-2)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn danger sm"
                    onClick={() => handleDelete(c)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))
        )}
      </DataTable>

      {/* Client Details View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Client Details"
      >
        {selectedViewClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Client ID</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedViewClient.clientCode}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Name</span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedViewClient.name}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Mobile Number</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{displayMobile(selectedViewClient.mobile)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Email Address</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewClient.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Village / Town</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedViewClient.village || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Active Cases Count</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{getClientCaseCount(selectedViewClient.id)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', borderTop: '1px dashed var(--border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Aadhaar Number</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{displayAadhaar(selectedViewClient.aadhaarMasked)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>PAN Card</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{displayPan(selectedViewClient.panMasked)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedViewClient);
                  }}
                >
                  Edit Client Details
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingClient ? 'Edit Client' : 'Add Client'}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {error && isModalOpen && (
            <div
              style={{
                padding: 'var(--space-2) var(--space-3)',
                marginBottom: 'var(--space-2)',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}

          <FormSection title="Personal Information">
            <FormGrid columns={2}>
              <FormField label="Client Name" required={true}>
                <input
                  type="text"
                  placeholder="e.g. K. Subbarayudu"
                  value={form.name}
                  onChange={setField('name')}
                  required
                />
              </FormField>
              <FormField label="Mobile" required={true}>
                <input
                  type="text"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  value={form.mobile}
                  onChange={setFormattedField('mobile', formatMobile)}
                  maxLength={17}
                  required
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  placeholder="e.g. name@mail.in"
                  value={form.email}
                  onChange={setField('email')}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Address Details">
            <FormGrid columns={1}>
              <FormField label="Village / Town">
                <input
                  type="text"
                  placeholder="e.g. Kalikiri"
                  value={form.village}
                  onChange={setField('village')}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Identity Documents">
            <FormGrid columns={2}>
              <FormField label="Aadhaar">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012"
                  value={form.aadhaarMasked}
                  onChange={setFormattedField('aadhaarMasked', formatAadhaar)}
                  maxLength={14}
                />
              </FormField>
              <FormField label="PAN">
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={form.panMasked}
                  onChange={setFormattedField('panMasked', formatPan)}
                  maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving
                ? 'Saving…'
                : editingClient
                  ? 'Save changes'
                  : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
