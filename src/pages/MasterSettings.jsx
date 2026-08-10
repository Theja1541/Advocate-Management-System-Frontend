import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { 
  getCaseTypes, createCaseType, updateCaseType, deactivateCaseType, activateCaseType,
  getCaseStages, createCaseStage, updateCaseStage, deactivateCaseStage, activateCaseStage,
  getCourts, createCourt, updateCourt, deactivateCourt, activateCourt,
  getDocumentCategories, createDocumentCategory, updateDocumentCategory, deactivateDocumentCategory, activateDocumentCategory
} from '../services/caseMastersService';
import { getPublicSettings, uploadSuperAdminLogo } from '../services/settingsService';

const INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TS', name: 'Telangana' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
  { code: 'KL', name: 'Kerala' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'HR', name: 'Haryana' },
  { code: 'PB', name: 'Punjab' },
  { code: 'OR', name: 'Odisha' },
  { code: 'BR', name: 'Bihar' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'AS', name: 'Assam' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'UT', name: 'Uttarakhand' },
];

export default function MasterSettings() {
  const [activeTab, setActiveTab] = useState('types'); // 'types', 'stages', 'courts', 'categories', 'stateFees'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);

  // Lists state
  const [types, setTypes] = useState([]);
  const [stages, setStages] = useState([]);
  const [courts, setCourts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stateFees, setStateFees] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Forms state
  const [typeForm, setTypeForm] = useState({ code: '', name: '', description: '', displayOrder: '0' });
  const [stageForm, setStageForm] = useState({ code: '', name: '', displayOrder: '0', color: 'c-baize', isClosed: false });
  const [courtForm, setCourtForm] = useState({ code: '', name: '', location: '' });
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '', displayOrder: '0' });
  const [stateFeeForm, setStateFeeForm] = useState({
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    ruleType: 'PERCENTAGE',
    fixedAmount: '0',
    percentageRate: '2.5',
    minFee: '0',
    maxFee: '0',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    actName: '',
    actVersion: '',
    notificationNo: '',
    defaultAdvocateFeePct: '10',
    processFee: '500',
    filingFee: '1000',
    miscCharges: '2000',
    isActive: true,
    notes: '',
    slabs: [
      { fromAmount: '0', toAmount: '100000', feeType: 'PERCENTAGE', feeValue: '2.5', minFee: '100', maxFee: '0', displayOrder: 1 },
      { fromAmount: '100001', toAmount: '', feeType: 'PERCENTAGE', feeValue: '2.0', minFee: '0', maxFee: '0', displayOrder: 2 },
    ],
  });

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
      } else if (activeTab === 'categories') {
        const data = await getDocumentCategories();
        setCategories(data);
      } else if (activeTab === 'systemLogo') {
        const settings = await getPublicSettings();
        if (settings?.logo) setCurrentLogo(settings.logo);
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
      } else if (activeTab === 'categories') {
        const updated = item.isActive ? await deactivateDocumentCategory(item.id) : await activateDocumentCategory(item.id);
        setCategories(prev => prev.map(c => c.id === item.id ? updated : c));
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
    } else if (activeTab === 'categories') {
      setCategoryForm({ code: '', name: '', description: '', displayOrder: '0' });
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
    } else if (activeTab === 'categories') {
      setCategoryForm({
        code: item.code,
        name: item.name,
        description: item.description || '',
        displayOrder: String(item.displayOrder || '0'),
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
      } else if (activeTab === 'categories') {
        if (!categoryForm.code.trim() || !categoryForm.name.trim()) throw new Error('Code and Name are required fields.');
        const payload = {
          code: categoryForm.code.toUpperCase().trim(),
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          displayOrder: Number(categoryForm.displayOrder) || 0,
        };
        if (editingItem) {
          const updated = await updateDocumentCategory(editingItem.id, payload);
          setCategories(prev => prev.map(c => c.id === editingItem.id ? updated : c));
        } else {
          const created = await createDocumentCategory(payload);
          setCategories(prev => [...prev, created]);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile) return;
    setSaving(true);
    setError('');
    try {
      const data = await uploadSuperAdminLogo(logoFile);
      if (data?.logo) {
        setCurrentLogo(data.logo);
        setLogoFile(null);
        alert('Super Admin logo updated successfully. Refresh the page to see changes across the app.');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload logo.');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredData = () => {
    const q = search.toLowerCase();
    if (activeTab === 'types') {
      return types.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    } else if (activeTab === 'stages') {
      return stages.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    } else if (activeTab === 'courts') {
      return courts.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    } else if (activeTab === 'categories') {
      return categories.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }
    return [];
  };

  const filteredData = getFilteredData();

  return (
    <>
      <PageHeader 
        title="Master Configuration" 
        description="Configure lookup attributes, case lifecycles, state fee rules, and institutional courts registers."
        actions={
          <button className="btn primary" onClick={handleOpenAdd}>
            {activeTab === 'types' 
              ? 'Add Case Type' 
              : activeTab === 'stages' 
                ? 'Add Case Stage' 
                : activeTab === 'courts' 
                  ? 'Add Court' 
                  : 'Add Document Category'}
          </button>
        }
      />

      {/* Tabs Row */}
      <div className="filt" style={{ marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <button 
          className={`btn ${activeTab === 'types' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('types')}
        >
          Case Types
        </button>
        <button 
          className={`btn ${activeTab === 'stages' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('stages')}
        >
          Case Stages
        </button>
        <button 
          className={`btn ${activeTab === 'courts' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('courts')}
        >
          Courts Master
        </button>
        <button 
          className={`btn ${activeTab === 'categories' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('categories')}
        >
          Document Categories
        </button>
        <button 
          className={`btn ${activeTab === 'stateFees' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('stateFees')}
        >
          🏛️ State Fee Rules
        </button>
        <button 
          className={`btn ${activeTab === 'systemLogo' ? 'primary' : 'ghost'}`} 
          onClick={() => setActiveTab('systemLogo')}
        >
          ⚙️ System Logo
        </button>
      </div>

      {activeTab !== 'systemLogo' && (
        <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="fgrid">
            <div className="f" style={{ flex: 1, minWidth: '220px' }}>
              <label>Search masters</label>
              <input 
                type="text" 
                placeholder="Search items by code, name, or act..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {/* Dynamic Data Table Rendering */}
      {activeTab === 'systemLogo' ? (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3>Global System Logo</h3>
          <p className="mut mb-4">This logo will be displayed on the public login page and the Super Admin sidebar.</p>
          
          {currentLogo && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>Current Logo</label>
              <img 
                src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${currentLogo}`} 
                alt="Current Super Admin Logo" 
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
            <button type="submit" className="btn primary" disabled={saving || !logoFile}>
              {saving ? 'Uploading...' : 'Upload Logo'}
            </button>
          </form>
        </div>
      ) : (
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
                        <Chip type={t.isActive ? 'success' : 'ghost'} label={t.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary sm" onClick={() => handleOpenEdit(t)} style={{ marginRight: 'var(--space-2)' }}>Edit</button>
                        <button className={`btn sm ${t.isActive ? 'danger' : 'primary'}`} onClick={() => handleToggleActive(t)}>{t.isActive ? 'Deactivate' : 'Activate'}</button>
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
                      <td><Chip type={s.color === 'c-baize' ? 'success' : s.color === 'c-tape' ? 'danger' : s.color === 'c-brass' ? 'warning' : 'ghost'} label={s.color || 'c-grey'} /></td>
                      <td>{s.isClosed ? 'Yes ✅' : 'No'}</td>
                      <td>
                        <Chip type={s.isActive ? 'success' : 'ghost'} label={s.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary sm" onClick={() => handleOpenEdit(s)} style={{ marginRight: 'var(--space-2)' }}>Edit</button>
                        <button className={`btn sm ${s.isActive ? 'danger' : 'primary'}`} onClick={() => handleToggleActive(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
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
                        <Chip type={c.isActive ? 'success' : 'ghost'} label={c.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary sm" onClick={() => handleOpenEdit(c)} style={{ marginRight: 'var(--space-2)' }}>Edit</button>
                        <button className={`btn sm ${c.isActive ? 'danger' : 'primary'}`} onClick={() => handleToggleActive(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'categories' && (
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
                  <tr><td colSpan="6" className="c mut">Loading document categories...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="6" className="c mut">No document categories found.</td></tr>
                ) : (
                  filteredData.map(c => (
                    <tr key={c.id}>
                      <td><span className="mono font-semibold">{c.code}</span></td>
                      <td><b>{c.name}</b></td>
                      <td className="mut">{c.description || '—'}</td>
                      <td>{c.displayOrder}</td>
                      <td>
                        <Chip type={c.isActive ? 'success' : 'ghost'} label={c.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary sm" onClick={() => handleOpenEdit(c)} style={{ marginRight: 'var(--space-2)' }}>Edit</button>
                        <button className={`btn sm ${c.isActive ? 'danger' : 'primary'}`} onClick={() => handleToggleActive(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          </table>
      </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingItem
            ? `Edit ${activeTab === 'types' ? 'Case Type' : activeTab === 'stages' ? 'Case Stage' : activeTab === 'courts' ? 'Court' : 'Document Category'}`
            : `Add ${activeTab === 'types' ? 'Case Type' : activeTab === 'stages' ? 'Case Stage' : activeTab === 'courts' ? 'Court' : 'Document Category'}`
        }
      >
        <form onSubmit={handleSave}>
          {activeTab === 'types' && (
            <FormGrid columns={1}>
              <FormField label="Code">
                <input type="text" value={typeForm.code} onChange={(e) => setTypeForm(p => ({...p, code: e.target.value}))} />
              </FormField>
              <FormField label="Name">
                <input type="text" value={typeForm.name} onChange={(e) => setTypeForm(p => ({...p, name: e.target.value}))} />
              </FormField>
              <FormField label="Description">
                <textarea value={typeForm.description} onChange={(e) => setTypeForm(p => ({...p, description: e.target.value}))} />
              </FormField>
              <FormField label="Display Order">
                <input type="number" value={typeForm.displayOrder} onChange={(e) => setTypeForm(p => ({...p, displayOrder: e.target.value}))} />
              </FormField>
            </FormGrid>
          )}

          {activeTab === 'stages' && (
            <FormGrid columns={1}>
              <FormField label="Code">
                <input type="text" value={stageForm.code} onChange={(e) => setStageForm(p => ({...p, code: e.target.value}))} />
              </FormField>
              <FormField label="Name">
                <input type="text" value={stageForm.name} onChange={(e) => setStageForm(p => ({...p, name: e.target.value}))} />
              </FormField>
              <FormField label="Display Order">
                <input type="number" value={stageForm.displayOrder} onChange={(e) => setStageForm(p => ({...p, displayOrder: e.target.value}))} />
              </FormField>
              <FormField label="Is Closed">
                <input type="checkbox" checked={stageForm.isClosed} onChange={(e) => setStageForm(p => ({...p, isClosed: e.target.checked}))} />
              </FormField>
            </FormGrid>
          )}

          {activeTab === 'courts' && (
            <FormGrid columns={1}>
              <FormField label="Code">
                <input type="text" value={courtForm.code} onChange={(e) => setCourtForm(p => ({...p, code: e.target.value}))} />
              </FormField>
              <FormField label="Name">
                <input type="text" value={courtForm.name} onChange={(e) => setCourtForm(p => ({...p, name: e.target.value}))} />
              </FormField>
              <FormField label="Location">
                <input type="text" value={courtForm.location} onChange={(e) => setCourtForm(p => ({...p, location: e.target.value}))} />
              </FormField>
            </FormGrid>
          )}

          {activeTab === 'categories' && (
            <FormGrid columns={1}>
              <FormField label="Code">
                <input type="text" value={categoryForm.code} onChange={(e) => setCategoryForm(p => ({...p, code: e.target.value}))} />
              </FormField>
              <FormField label="Name">
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({...p, name: e.target.value}))} />
              </FormField>
              <FormField label="Description">
                <textarea value={categoryForm.description} onChange={(e) => setCategoryForm(p => ({...p, description: e.target.value}))} />
              </FormField>
              <FormField label="Display Order">
                <input type="number" value={categoryForm.displayOrder} onChange={(e) => setCategoryForm(p => ({...p, displayOrder: e.target.value}))} />
              </FormField>
            </FormGrid>
          )}

          <div className="modal-foot" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" className="btn secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
