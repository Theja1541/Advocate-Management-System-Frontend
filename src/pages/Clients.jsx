import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
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
  const { hasPermission } = useAuth();
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
      const [list, caseList] = await Promise.all([getClients(), getCases()]);
      setClients(list);
      setCases(caseList);
    } catch (err) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

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
    <button className="btn" onClick={openAddModal}>
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
            marginBottom: '12px',
            borderColor: 'var(--tape)',
            color: 'var(--tape)',
            fontSize: '12.5px',
          }}
        >
          {error}
        </div>
      )}

      <DataTable headers={headers}>
        {loading ? (
          <tr>
            <td colSpan={headers.length} className="mut" style={{ textAlign: 'center', padding: '24px' }}>
              Loading clients…
            </td>
          </tr>
        ) : clients.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="mut" style={{ textAlign: 'center', padding: '24px' }}>
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
              <td className="mono" style={{ fontSize: '11px' }}>
                {displayMobile(c.mobile)}
              </td>
              <td className="mut" style={{ fontSize: '11.5px' }}>
                {c.email || '—'}
              </td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {displayAadhaar(c.aadhaarMasked)}
              </td>
              <td className="mono" style={{ fontSize: '11px' }}>
                {displayPan(c.panMasked)}
              </td>
              <td className="c mono">{c.docsCount ?? 0}</td>
              <td className="c mono">{getClientCaseCount(c.id)}</td>
              {canEdit && (
                <td className="c" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn g sm"
                    onClick={() => openEditModal(c)}
                    style={{ marginRight: '6px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => handleDelete(c)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--tape)',
                      color: 'var(--tape)',
                    }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--rule-2)', paddingBottom: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Client ID</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewClient.clientCode}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Name</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{selectedViewClient.name}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Mobile Number</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{displayMobile(selectedViewClient.mobile)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewClient.email || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Village / Town</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedViewClient.village || '—'}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Active Cases Count</span>
                <span className="mono" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)' }}>{getClientCaseCount(selectedViewClient.id)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px dashed var(--rule)', paddingTop: '12px' }}>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Aadhaar Number</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{displayAadhaar(selectedViewClient.aadhaarMasked)}</span>
              </div>
              <div>
                <span className="mono font-semibold" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>PAN Card</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{displayPan(selectedViewClient.panMasked)}</span>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn g" onClick={() => setIsViewModalOpen(false)}>Close</button>
              {canEdit && (
                <button
                  type="button"
                  className="btn"
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
          className="fgrid"
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
          {error && isModalOpen && (
            <div
              style={{
                padding: '8px 10px',
                marginBottom: '8px',
                backgroundColor: 'rgba(235, 94, 85, 0.1)',
                border: '1px solid var(--tape)',
                color: 'var(--tape)',
                borderRadius: '5px',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}
          <div className="f">
            <label>Client Name</label>
            <input
              type="text"
              placeholder="e.g. K. Subbarayudu"
              value={form.name}
              onChange={setField('name')}
              required
            />
          </div>
          <div className="f">
            <label>Mobile</label>
            <input
              type="text"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={form.mobile}
              onChange={setFormattedField('mobile', formatMobile)}
              maxLength={17}
              required
            />
          </div>
          <div className="f">
            <label>Email</label>
            <input
              type="email"
              placeholder="e.g. name@mail.in"
              value={form.email}
              onChange={setField('email')}
            />
          </div>
          <div className="f">
            <label>Village / Town</label>
            <input
              type="text"
              placeholder="e.g. Kalikiri"
              value={form.village}
              onChange={setField('village')}
            />
          </div>
          <div className="f">
            <label>Aadhaar</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012"
              value={form.aadhaarMasked}
              onChange={setFormattedField('aadhaarMasked', formatAadhaar)}
              maxLength={14}
            />
          </div>
          <div className="f">
            <label>PAN</label>
            <input
              type="text"
              placeholder="ABCDE1234F"
              value={form.panMasked}
              onChange={setFormattedField('panMasked', formatPan)}
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
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
