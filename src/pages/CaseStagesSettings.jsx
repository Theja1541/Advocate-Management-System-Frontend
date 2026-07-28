import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { getCaseStages, createCaseStage, updateCaseStage, deactivateCaseStage, activateCaseStage } from '../services/caseMastersService';

export default function CaseStagesSettings() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    displayOrder: '0',
    color: 'c-baize',
    isClosed: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCaseStages();
      setStages(data);
    } catch (err) {
      setError(err.message || 'Failed to load case stages.');
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
        const updated = await deactivateCaseStage(item.id);
        setStages(prev => prev.map(s => s.id === item.id ? updated : s));
      } else {
        const updated = await activateCaseStage(item.id);
        setStages(prev => prev.map(s => s.id === item.id ? updated : s));
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOpenAdd = () => {
    setEditingStage(null);
    setForm({ code: '', name: '', displayOrder: '0', color: 'c-baize', isClosed: false });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingStage(item);
    setForm({
      code: item.code,
      name: item.name,
      displayOrder: String(item.displayOrder || '0'),
      color: item.color || 'c-baize',
      isClosed: !!item.isClosed,
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
      displayOrder: Number(form.displayOrder) || 0,
      color: form.color,
      isClosed: form.isClosed,
    };

    try {
      if (editingStage) {
        const updated = await updateCaseStage(editingStage.id, payload);
        setStages(prev => prev.map(s => s.id === editingStage.id ? updated : s));
      } else {
        const created = await createCaseStage(payload);
        setStages(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save case stage.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = stages.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader 
        title="Case Stages Masters" 
        description="Configure lookup values and sequencing flow for litigation stages."
        actions={
          <button className="btn" onClick={handleOpenAdd}>Add Case Stage</button>
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
              <th>Display Order</th>
              <th>Color Code</th>
              <th>Closed Stage</th>
              <th>Status</th>
              <th className="c">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="c">Loading case stages...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="c">No case stages found.</td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="mono font-semibold">{s.code}</span></td>
                  <td><b>{s.name}</b></td>
                  <td>{s.displayOrder}</td>
                  <td>
                    <span className={`chip ${s.color || 'c-grey'}`}>{s.color || 'c-grey'}</span>
                  </td>
                  <td>{s.isClosed ? 'Yes ✅' : 'No'}</td>
                  <td>
                    <span className={`chip ${s.isActive ? 'c-baize' : 'c-grey'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="c" style={{ whiteSpace: 'nowrap' }}>
                    <button 
                      className="btn g sm" 
                      onClick={() => handleOpenEdit(s)}
                      style={{ marginRight: '6px' }}
                    >
                      Edit
                    </button>
                    <button 
                      className={`btn sm ${s.isActive ? 't' : ''}`}
                      onClick={() => handleToggleActive(s)}
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
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
        title={editingStage ? 'Edit Case Stage' : 'Add Case Stage'}
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
              placeholder="e.g. FIL" 
              value={form.code} 
              onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
              disabled={!!editingStage}
              required
            />
          </div>

          <div className="f">
            <label>Name</label>
            <input 
              type="text" 
              placeholder="e.g. Filing" 
              value={form.name} 
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="f">
            <label>Display Order</label>
            <input 
              type="number" 
              value={form.displayOrder} 
              onChange={(e) => setForm(p => ({ ...p, displayOrder: e.target.value }))}
              required
            />
          </div>

          <div className="f">
            <label>Theme Badge Color Class</label>
            <select value={form.color} onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))}>
              <option value="c-baize">Green (c-baize)</option>
              <option value="c-brass">Yellow (c-brass)</option>
              <option value="c-grey">Grey (c-grey)</option>
              <option value="c-tape">Red (c-tape)</option>
            </select>
          </div>

          <div className="f" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="isClosed" 
              checked={form.isClosed} 
              onChange={(e) => setForm(p => ({ ...p, isClosed: e.target.checked }))}
            />
            <label htmlFor="isClosed" style={{ margin: 0, cursor: 'pointer' }}>Is Closed Stage (E.g. Disposed / Settled)</label>
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
