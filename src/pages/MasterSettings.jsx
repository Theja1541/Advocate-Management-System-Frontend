import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { 
  getCaseTypes, createCaseType, updateCaseType, deactivateCaseType, activateCaseType,
  getCaseStages, createCaseStage, updateCaseStage, deactivateCaseStage, activateCaseStage,
  getCourts, createCourt, updateCourt, deactivateCourt, activateCourt 
} from '../services/caseMastersService';

export default function MasterSettings() {
  const [activeTab, setActiveTab] = useState('types'); // 'types', 'stages', 'courts'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Lists state
  const [types, setTypes] = useState([]);
  const [stages, setStages] = useState([]);
  const [courts, setCourts] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Forms state
  const [typeForm, setTypeForm] = useState({ code: '', name: '', description: '', displayOrder: '0' });
  const [stageForm, setStageForm] = useState({ code: '', name: '', displayOrder: '0', color: 'c-baize', isClosed: false });
  const [courtForm, setCourtForm] = useState({ code: '', name: '', location: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'types') {
        const data = await getCaseTypes();
        setTypes(data);
      } else if (activeTab === 'stages') {
        const data = await getCaseStages();
        setStages(data);
      } else if (activeTab === 'courts') {
        const data = await getCourts();
        setCourts(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load master configuration.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
    setSearch('');
  }, [loadData, activeTab]);

  // Actions
  const handleToggleActive = async (item) => {
    setError('');
    try {
      if (activeTab === 'types') {
        const updated = item.isActive ? await deactivateCaseType(item.id) : await activateCaseType(item.id);
        setTypes(prev => prev.map(t => t.id === item.id ? updated : t));
      } else if (activeTab === 'stages') {
        const updated = item.isActive ? await deactivateCaseStage(item.id) : await activateCaseStage(item.id);
        setStages(prev => prev.map(s => s.id === item.id ? updated : s));
      } else if (activeTab === 'courts') {
        const updated = item.isActive ? await deactivateCourt(item.id) : await activateCourt(item.id);
        setCourts(prev => prev.map(c => c.id === item.id ? updated : c));
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setError('');
    if (activeTab === 'types') {
      setTypeForm({ code: '', name: '', description: '', displayOrder: '0' });
    } else if (activeTab === 'stages') {
      setStageForm({ code: '', name: '', displayOrder: '0', color: 'c-baize', isClosed: false });
    } else if (activeTab === 'courts') {
      setCourtForm({ code: '', name: '', location: '' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setError('');
    if (activeTab === 'types') {
      setTypeForm({
        code: item.code,
        name: item.name,
        description: item.description || '',
        displayOrder: String(item.displayOrder || '0'),
      });
    } else if (activeTab === 'stages') {
      setStageForm({
        code: item.code,
        name: item.name,
        displayOrder: String(item.displayOrder || '0'),
        color: item.color || 'c-baize',
        isClosed: !!item.isClosed,
      });
    } else if (activeTab === 'courts') {
      setCourtForm({
        code: item.code,
        name: item.name,
        location: item.location || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (activeTab === 'types') {
        if (!typeForm.code.trim() || !typeForm.name.trim()) throw new Error('Code and Name are required fields.');
        const payload = {
          code: typeForm.code.toUpperCase().trim(),
          name: typeForm.name.trim(),
          description: typeForm.description.trim(),
          displayOrder: Number(typeForm.displayOrder) || 0,
        };
        if (editingItem) {
          const updated = await updateCaseType(editingItem.id, payload);
          setTypes(prev => prev.map(t => t.id === editingItem.id ? updated : t));
        } else {
          const created = await createCaseType(payload);
          setTypes(prev => [...prev, created]);
        }
      } else if (activeTab === 'stages') {
        if (!stageForm.code.trim() || !stageForm.name.trim()) throw new Error('Code and Name are required fields.');
        const payload = {
          code: stageForm.code.toUpperCase().trim(),
          name: stageForm.name.trim(),
          displayOrder: Number(stageForm.displayOrder) || 0,
          color: stageForm.color,
          isClosed: stageForm.isClosed,
        };
        if (editingItem) {
          const updated = await updateCaseStage(editingItem.id, payload);
          setStages(prev => prev.map(s => s.id === editingItem.id ? updated : s));
        } else {
          const created = await createCaseStage(payload);
          setStages(prev => [...prev, created]);
        }
      } else if (activeTab === 'courts') {
        if (!courtForm.code.trim() || !courtForm.name.trim()) throw new Error('Code and Name are required fields.');
        const payload = {
          code: courtForm.code.toUpperCase().trim(),
          name: courtForm.name.trim(),
          location: courtForm.location.trim(),
        };
        if (editingItem) {
          const updated = await updateCourt(editingItem.id, payload);
          setCourts(prev => prev.map(c => c.id === editingItem.id ? updated : c));
        } else {
          const created = await createCourt(payload);
          setCourts(prev => [...prev, created]);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Filter computations
  const getFilteredData = () => {
    const q = search.toLowerCase();
    if (activeTab === 'types') {
      return types.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    } else if (activeTab === 'stages') {
      return stages.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    } else if (activeTab === 'courts') {
      return courts.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }
    return [];
  };

  const filteredData = getFilteredData();

  return (
    <>
      <PageHeader 
        title="Master Configuration" 
        description="Configure lookup attributes, case lifecycles, and institutional courts registers."
        actions={
          <button className="btn" onClick={handleOpenAdd}>
            {activeTab === 'types' ? 'Add Case Type' : activeTab === 'stages' ? 'Add Case Stage' : 'Add Court'}
          </button>
        }
      />

      {/* Tabs Row */}
      <div className="filt" style={{ marginBottom: '14px', borderBottom: '1px solid var(--rule)', paddingBottom: '8px' }}>
        <button 
          className={activeTab === 'types' ? 'on' : ''} 
          onClick={() => setActiveTab('types')}
          style={{ marginRight: '8px' }}
        >
          Case Types
        </button>
        <button 
          className={activeTab === 'stages' ? 'on' : ''} 
          onClick={() => setActiveTab('stages')}
          style={{ marginRight: '8px' }}
        >
          Case Stages
        </button>
        <button 
          className={activeTab === 'courts' ? 'on' : ''} 
          onClick={() => setActiveTab('courts')}
        >
          Courts Master
        </button>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search masters</label>
            <input 
              type="text" 
              placeholder="Search items by code or name..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--tape)', color: 'var(--tape)', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {/* Dynamic Data Table Rendering */}
      <div className="tbl-card">
        <table className="t">
          {activeTab === 'types' && (
            <>
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
                  <tr><td colSpan="6" className="c mut">Loading case types...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="6" className="c mut">No case types found.</td></tr>
                ) : (
                  filteredData.map(t => (
                    <tr key={t.id}>
                      <td><span className="mono font-semibold">{t.code}</span></td>
                      <td><b>{t.name}</b></td>
                      <td className="mut">{t.description || '—'}</td>
                      <td>{t.displayOrder}</td>
                      <td>
                        <span className={`chip ${t.isActive ? 'c-baize' : 'c-grey'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn g sm" onClick={() => handleOpenEdit(t)} style={{ marginRight: '6px' }}>Edit</button>
                        <button className={`btn sm ${t.isActive ? 't' : ''}`} onClick={() => handleToggleActive(t)}>{t.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'stages' && (
            <>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Display Order</th>
                  <th>Color Tag</th>
                  <th>Closed Stage</th>
                  <th>Status</th>
                  <th className="c">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="c mut">Loading case stages...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="7" className="c mut">No case stages found.</td></tr>
                ) : (
                  filteredData.map(s => (
                    <tr key={s.id}>
                      <td><span className="mono font-semibold">{s.code}</span></td>
                      <td><b>{s.name}</b></td>
                      <td>{s.displayOrder}</td>
                      <td><span className={`chip ${s.color || 'c-grey'}`}>{s.color || 'c-grey'}</span></td>
                      <td>{s.isClosed ? 'Yes ✅' : 'No'}</td>
                      <td>
                        <span className={`chip ${s.isActive ? 'c-baize' : 'c-grey'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn g sm" onClick={() => handleOpenEdit(s)} style={{ marginRight: '6px' }}>Edit</button>
                        <button className={`btn sm ${s.isActive ? 't' : ''}`} onClick={() => handleToggleActive(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'courts' && (
            <>
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
                  <tr><td colSpan="5" className="c mut">Loading courts...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="5" className="c mut">No courts found.</td></tr>
                ) : (
                  filteredData.map(c => (
                    <tr key={c.id}>
                      <td><span className="mono font-semibold">{c.code}</span></td>
                      <td><b>{c.name}</b></td>
                      <td className="mut">{c.location || '—'}</td>
                      <td>
                        <span className={`chip ${c.isActive ? 'c-baize' : 'c-grey'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn g sm" onClick={() => handleOpenEdit(c)} style={{ marginRight: '6px' }}>Edit</button>
                        <button className={`btn sm ${c.isActive ? 't' : ''}`} onClick={() => handleToggleActive(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Modals Form configurations */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          activeTab === 'types' 
            ? (editingItem ? 'Edit Case Type' : 'Add Case Type')
            : activeTab === 'stages'
              ? (editingItem ? 'Edit Case Stage' : 'Add Case Stage')
              : (editingItem ? 'Edit Court' : 'Add Court')
        }
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div className="card" style={{ borderColor: 'var(--tape)', color: 'var(--tape)', padding: '10px' }}>
              {error}
            </div>
          )}

          {activeTab === 'types' && (
            <>
              <div className="f">
                <label>Code (Unique identifier)</label>
                <input 
                  type="text" 
                  placeholder="e.g. PTN" 
                  value={typeForm.code} 
                  onChange={(e) => setTypeForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingItem}
                  required
                />
              </div>
              <div className="f">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Partition Suit" 
                  value={typeForm.name} 
                  onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="f">
                <label>Description</label>
                <textarea 
                  placeholder="Add details..." 
                  value={typeForm.description} 
                  onChange={(e) => setTypeForm(p => ({ ...p, description: e.target.value }))}
                  rows="3"
                />
              </div>
              <div className="f">
                <label>Display Order</label>
                <input 
                  type="number" 
                  value={typeForm.displayOrder} 
                  onChange={(e) => setTypeForm(p => ({ ...p, displayOrder: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          {activeTab === 'stages' && (
            <>
              <div className="f">
                <label>Code (Unique identifier)</label>
                <input 
                  type="text" 
                  placeholder="e.g. FIL" 
                  value={stageForm.code} 
                  onChange={(e) => setStageForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingItem}
                  required
                />
              </div>
              <div className="f">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Filing" 
                  value={stageForm.name} 
                  onChange={(e) => setStageForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="f">
                <label>Display Order</label>
                <input 
                  type="number" 
                  value={stageForm.displayOrder} 
                  onChange={(e) => setStageForm(p => ({ ...p, displayOrder: e.target.value }))}
                  required
                />
              </div>
              <div className="f">
                <label>Theme Badge Color Class</label>
                <select value={stageForm.color} onChange={(e) => setStageForm(p => ({ ...p, color: e.target.value }))}>
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
                  checked={stageForm.isClosed} 
                  onChange={(e) => setStageForm(p => ({ ...p, isClosed: e.target.checked }))}
                />
                <label htmlFor="isClosed" style={{ textTransform: 'none', margin: 0, fontSize: '13px' }}>Is litigation closed at this stage?</label>
              </div>
            </>
          )}

          {activeTab === 'courts' && (
            <>
              <div className="f">
                <label>Code (Unique identifier)</label>
                <input 
                  type="text" 
                  placeholder="e.g. SCJ_MDP" 
                  value={courtForm.code} 
                  onChange={(e) => setCourtForm(p => ({ ...p, code: e.target.value }))}
                  disabled={!!editingItem}
                  required
                />
              </div>
              <div className="f">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sr. Civil Judge Court, Madanapalle" 
                  value={courtForm.name} 
                  onChange={(e) => setCourtForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="f">
                <label>Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Madanapalle" 
                  value={courtForm.location} 
                  onChange={(e) => setCourtForm(p => ({ ...p, location: e.target.value }))}
                />
              </div>
            </>
          )}

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
