import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { getCaseTypes, createCaseType, updateCaseType, deactivateCaseType, activateCaseType } from '../services/caseMastersService';

export default function CaseTypesSettings() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    displayOrder: '0',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCaseTypes();
      setTypes(data);
    } catch (err) {
      setError(err.message || 'Failed to load case types.');
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
        const updated = await deactivateCaseType(item.id);
        setTypes(prev => prev.map(t => t.id === item.id ? updated : t));
      } else {
        const updated = await activateCaseType(item.id);
        setTypes(prev => prev.map(t => t.id === item.id ? updated : t));
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOpenAdd = () => {
    setEditingType(null);
    setForm({ code: '', name: '', description: '', displayOrder: '0' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingType(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || '',
      displayOrder: String(item.displayOrder || '0'),
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
      description: form.description.trim(),
      displayOrder: Number(form.displayOrder) || 0,
    };

    try {
      if (editingType) {
        const updated = await updateCaseType(editingType.id, payload);
        setTypes(prev => prev.map(t => t.id === editingType.id ? updated : t));
      } else {
        const created = await createCaseType(payload);
        setTypes(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save case type.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = types.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader 
        title="Case Types Masters" 
        description="Configure lookup values for enterprise matter types."
        actions={
          <button className="btn primary" onClick={handleOpenAdd}>Add Case Type</button>
        }
      />

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <input 
          type="text" 
          placeholder="Search by code or name..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        />
      </div>

      <div className="tbl-card">
        <table className="t">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Description</th>
              <th>Display Order</th>
              <th>Status</th>
              <th className="c">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="c">Loading case types...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="c">No case types found.</td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id}>
                  <td><span className="mono font-semibold">{t.code}</span></td>
                  <td><b>{t.name}</b></td>
                  <td className="mut">{t.description || '—'}</td>
                  <td>{t.displayOrder}</td>
                  <td>
                    <Chip type={t.isActive ? "success" : "ghost"} label={t.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="c" style={{ whiteSpace: 'nowrap' }}>
                    <button 
                      className="btn outline sm" 
                      onClick={() => handleOpenEdit(t)}
                      style={{ marginRight: 'var(--space-2)' }}
                    >
                      Edit
                    </button>
                    <button 
                      className={`btn sm ${t.isActive ? 'danger' : 'success'}`}
                      onClick={() => handleToggleActive(t)}
                    >
                      {t.isActive ? 'Deactivate' : 'Activate'}
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
        title={editingType ? 'Edit Case Type' : 'Add Case Type'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          <FormSection title="Type Details">
            <FormGrid columns={1}>
              <FormField label="Code (Unique identifier)" required={true}>
                <input 
                  type="text" 
                  placeholder="e.g. PTN" 
                  value={form.code} 
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingType}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </FormField>

              <FormField label="Name" required={true}>
                <input 
                  type="text" 
                  placeholder="e.g. Partition Suit" 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </FormField>

              <FormField label="Description" required={false}>
                <textarea 
                  placeholder="Add details about this case type..." 
                  value={form.description} 
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  rows="3"
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </FormField>

              <FormField label="Display Order" required={true}>
                <input 
                  type="number" 
                  value={form.displayOrder} 
                  onChange={(e) => setForm(p => ({ ...p, displayOrder: e.target.value }))}
                  required
                  style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="modal-foot" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) 0 0', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
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
