import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { getCourts, createCourt, updateCourt, deactivateCourt, activateCourt } from '../services/caseMastersService';

const INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'PY', name: 'Puducherry' },
];

export default function CourtsSettings() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    location: '',
    stateCode: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCourts();
      setCourts(data);
    } catch (err) {
      setError(err.message || 'Failed to load courts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActive = async (item) => {
    try {
      if (item.isActive) {
        const updated = await deactivateCourt(item.id);
        setCourts(prev => prev.map(c => c.id === item.id ? updated : c));
      } else {
        const updated = await activateCourt(item.id);
        setCourts(prev => prev.map(c => c.id === item.id ? updated : c));
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOpenAdd = () => {
    setEditingCourt(null);
    setForm({ code: '', name: '', location: '', stateCode: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingCourt(item);
    setForm({
      code: item.code,
      name: item.name,
      location: item.location || '',
      stateCode: item.stateCode || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and Name are required fields.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      location: form.location.trim(),
      stateCode: form.stateCode || null,
    };

    try {
      if (editingCourt) {
        const updated = await updateCourt(editingCourt.id, payload);
        setCourts(prev => prev.map(c => c.id === editingCourt.id ? updated : c));
      } else {
        const created = await createCourt(payload);
        setCourts(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save court.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = courts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader 
        title="Courts Masters" 
        description="Configure dynamic courts options lookup details."
        actions={
          <button className="btn primary" onClick={handleOpenAdd}>Add Court</button>
        }
      />

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <input 
          type="text" 
          placeholder="Search by code or name..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ width: '100%' }}
        />
      </div>

      <div className="tbl-card">
        <table className="t">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>State</th>
              <th>Location</th>
              <th>Status</th>
              <th className="c">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="c">Loading courts...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="c">No courts found.</td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td><span className="mono font-semibold">{c.code}</span></td>
                  <td><b>{c.name}</b></td>
                  <td className="mut">{c.stateCode || '—'}</td>
                  <td className="mut">{c.location || '—'}</td>
                  <td>
                    <Chip type={c.isActive ? 'success' : 'ghost'} label={c.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="c" style={{ whiteSpace: 'nowrap' }}>
                    <button 
                      className="btn ghost sm" 
                      onClick={() => handleOpenEdit(c)}
                      style={{ marginRight: 'var(--space-2)' }}
                    >
                      Edit
                    </button>
                    <button 
                      className={`btn sm ${c.isActive ? 'danger' : 'outline'}`}
                      onClick={() => handleToggleActive(c)}
                    >
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourt ? 'Edit Court' : 'Add Court'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          <FormSection title="Court Details">
            <FormGrid columns={1}>
              <FormField label="Code (Unique identifier)" required={true}>
                <input 
                  type="text" 
                  placeholder="e.g. SCJ_MDP" 
                  value={form.code} 
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingCourt}
                  required
                />
              </FormField>

              <FormField label="Name" required={true}>
                <input 
                  type="text" 
                  placeholder="e.g. Sr. Civil Judge Court, Madanapalle" 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </FormField>

              <FormField label="Location" required={false}>
                <input 
                  type="text" 
                  placeholder="e.g. Madanapalle" 
                  value={form.location} 
                  onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
                />
              </FormField>

              <FormField label="State" required={false}>
                <select 
                  value={form.stateCode} 
                  onChange={(e) => setForm(p => ({ ...p, stateCode: e.target.value }))}
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0' }}>
            <button type="button" className="btn ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
