import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { getCourts, createCourt, updateCourt, deactivateCourt, activateCourt } from '../services/caseMastersService';

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
    setForm({ code: '', name: '', location: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingCourt(item);
    setForm({
      code: item.code,
      name: item.name,
      location: item.location || '',
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
          <button className="btn" onClick={handleOpenAdd}>Add Court</button>
        }
      />

      <div className="card" style={{ marginBottom: '14px' }}>
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
                  <td className="mut">{c.location || '—'}</td>
                  <td>
                    <span className={`chip ${c.isActive ? 'c-baize' : 'c-grey'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="c" style={{ whiteSpace: 'nowrap' }}>
                    <button 
                      className="btn g sm" 
                      onClick={() => handleOpenEdit(c)}
                      style={{ marginRight: '6px' }}
                    >
                      Edit
                    </button>
                    <button 
                      className={`btn sm ${c.isActive ? 't' : ''}`}
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
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px' }}>
              {error}
            </div>
          )}

          <div className="f">
            <label>Code (Unique identifier)</label>
            <input 
              type="text" 
              placeholder="e.g. SCJ_MDP" 
              value={form.code} 
              onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
              disabled={!!editingCourt}
              required
            />
          </div>

          <div className="f">
            <label>Name</label>
            <input 
              type="text" 
              placeholder="e.g. Sr. Civil Judge Court, Madanapalle" 
              value={form.name} 
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="f">
            <label>Location</label>
            <input 
              type="text" 
              placeholder="e.g. Madanapalle" 
              value={form.location} 
              onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
            />
          </div>

          <div className="modal-foot" style={{ marginTop: '16px', padding: '12px 0 0' }}>
            <button type="button" className="btn g" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
