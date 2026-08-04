import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Chip from '../components/ui/Chip';
import { FormSection, FormGrid, FormField } from '../components/ui/FormLayout';
import { 
  getCaseTypes, createCaseType, updateCaseType, deactivateCaseType, activateCaseType,
  getCaseStages, createCaseStage, updateCaseStage, deactivateCaseStage, activateCaseStage,
  getCourts, createCourt, updateCourt, deactivateCourt, activateCourt,
  getDocumentCategories, createDocumentCategory, updateDocumentCategory, deactivateDocumentCategory, activateDocumentCategory,
  getStateFeeConfigs, createStateFeeConfig, updateStateFeeConfig, activateStateFeeConfig, deactivateStateFeeConfig
} from '../services/caseMastersService';

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
];

export default function MasterSettings() {
  const [activeTab, setActiveTab] = useState('types'); // 'types', 'stages', 'courts', 'categories', 'stateFees'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      } else if (activeTab === 'stateFees') {
        const data = await getStateFeeConfigs();
        setStateFees(data);
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
      } else if (activeTab === 'stateFees') {
        const updated = item.isActive ? await deactivateStateFeeConfig(item.id) : await activateStateFeeConfig(item.id);
        setStateFees(prev => prev.map(f => f.id === item.id ? updated : f));
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
    } else if (activeTab === 'stateFees') {
      setStateFeeForm({
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
    } else if (activeTab === 'stateFees') {
      setStateFeeForm({
        stateCode: item.stateCode,
        stateName: item.stateName,
        ruleType: item.ruleType || 'PERCENTAGE',
        fixedAmount: String(item.fixedAmount || '0'),
        percentageRate: String(item.percentageRate || '0'),
        minFee: String(item.minFee || '0'),
        maxFee: String(item.maxFee || '0'),
        effectiveFrom: item.effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo: item.effectiveTo || '',
        actName: item.actName || '',
        actVersion: item.actVersion || '',
        notificationNo: item.notificationNo || '',
        defaultAdvocateFeePct: String(item.defaultAdvocateFeePct || '10'),
        processFee: String(item.processFee || '500'),
        filingFee: String(item.filingFee || '1000'),
        miscCharges: String(item.miscCharges || '2000'),
        isActive: !!item.isActive,
        notes: item.notes || '',
        slabs: (item.slabs && item.slabs.length > 0)
          ? item.slabs.map((s, idx) => ({
              fromAmount: String(s.fromAmount || '0'),
              toAmount: s.toAmount !== null && s.toAmount !== undefined ? String(s.toAmount) : '',
              feeType: s.feeType || 'PERCENTAGE',
              feeValue: String(s.feeValue || '0'),
              minFee: String(s.minFee || '0'),
              maxFee: String(s.maxFee || '0'),
              displayOrder: s.displayOrder || idx + 1,
            }))
          : [
              { fromAmount: '0', toAmount: '100000', feeType: 'PERCENTAGE', feeValue: '2.5', minFee: '100', maxFee: '0', displayOrder: 1 },
              { fromAmount: '100001', toAmount: '', feeType: 'PERCENTAGE', feeValue: '2.0', minFee: '0', maxFee: '0', displayOrder: 2 },
            ],
      });
    }
    setIsModalOpen(true);
  };

  const handleStateSelectChange = (code) => {
    const matched = INDIAN_STATES.find(s => s.code === code);
    setStateFeeForm(p => ({
      ...p,
      stateCode: code,
      stateName: matched ? matched.name : code,
    }));
  };

  // Slab Manager helpers
  const handleAddSlabRow = () => {
    setStateFeeForm(p => {
      const prevSlabs = p.slabs;
      const lastSlab = prevSlabs[prevSlabs.length - 1];
      const nextFrom = lastSlab && lastSlab.toAmount ? String(Number(lastSlab.toAmount) + 1) : '0';
      return {
        ...p,
        slabs: [
          ...prevSlabs,
          {
            fromAmount: nextFrom,
            toAmount: '',
            feeType: 'PERCENTAGE',
            feeValue: '1.5',
            minFee: '0',
            maxFee: '0',
            displayOrder: prevSlabs.length + 1,
          },
        ],
      };
    });
  };

  const handleRemoveSlabRow = (index) => {
    setStateFeeForm(p => ({
      ...p,
      slabs: p.slabs.filter((_, idx) => idx !== index),
    }));
  };

  const handleSlabChange = (index, field, val) => {
    setStateFeeForm(p => {
      const updatedSlabs = [...p.slabs];
      updatedSlabs[index] = { ...updatedSlabs[index], [field]: val };
      return { ...p, slabs: updatedSlabs };
    });
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
      } else if (activeTab === 'stateFees') {
        if (!stateFeeForm.stateCode || !stateFeeForm.stateName) throw new Error('State Code and Name are required.');
        if (!stateFeeForm.effectiveFrom) throw new Error('Effective From date is required.');

        const payload = {
          stateCode: stateFeeForm.stateCode.toUpperCase().trim(),
          stateName: stateFeeForm.stateName.trim(),
          ruleType: stateFeeForm.ruleType,
          fixedAmount: Number(stateFeeForm.fixedAmount) || 0,
          percentageRate: Number(stateFeeForm.percentageRate) || 0,
          minFee: Number(stateFeeForm.minFee) || 0,
          maxFee: Number(stateFeeForm.maxFee) || 0,
          effectiveFrom: stateFeeForm.effectiveFrom,
          effectiveTo: stateFeeForm.effectiveTo || null,
          actName: stateFeeForm.actName.trim(),
          actVersion: stateFeeForm.actVersion.trim(),
          notificationNo: stateFeeForm.notificationNo.trim(),
          defaultAdvocateFeePct: Number(stateFeeForm.defaultAdvocateFeePct) || 10,
          processFee: Number(stateFeeForm.processFee) || 0,
          filingFee: Number(stateFeeForm.filingFee) || 0,
          miscCharges: Number(stateFeeForm.miscCharges) || 0,
          isActive: stateFeeForm.isActive,
          notes: stateFeeForm.notes.trim(),
          slabs: stateFeeForm.slabs.map((s, idx) => ({
            fromAmount: Number(s.fromAmount) || 0,
            toAmount: s.toAmount !== '' && s.toAmount !== null && s.toAmount !== undefined ? Number(s.toAmount) : null,
            feeType: s.feeType,
            feeValue: Number(s.feeValue) || 0,
            minFee: Number(s.minFee) || 0,
            maxFee: Number(s.maxFee) || 0,
            displayOrder: idx + 1,
          })),
        };

        if (editingItem) {
          const updated = await updateStateFeeConfig(editingItem.id, payload);
          setStateFees(prev => prev.map(f => f.id === editingItem.id ? updated : f));
        } else {
          const created = await createStateFeeConfig(payload);
          setStateFees(prev => [...prev, created]);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save configuration.');
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
    } else if (activeTab === 'categories') {
      return categories.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    } else if (activeTab === 'stateFees') {
      return stateFees.filter(f => f.stateName.toLowerCase().includes(q) || f.stateCode.toLowerCase().includes(q) || (f.actName && f.actName.toLowerCase().includes(q)));
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
                  : activeTab === 'categories'
                    ? 'Add Document Category'
                    : 'Add State Fee Rule'}
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
      </div>

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

      {error && !isModalOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
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

          {activeTab === 'stateFees' && (
            <>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Rule Mode</th>
                  <th>Rule Summary</th>
                  <th>Effective Window</th>
                  <th>Government Act & Notification</th>
                  <th>Separate Charges</th>
                  <th>Status</th>
                  <th className="c">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="c mut">Loading state court fee rules...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="8" className="c mut">No state fee rules configured.</td></tr>
                ) : (
                  filteredData.map(f => (
                    <tr key={f.id}>
                      <td>
                        <span className="mono font-bold" style={{ display: 'inline-block', minWidth: '32px' }}>{f.stateCode}</span>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{f.stateName}</div>
                      </td>
                      <td>
                        <Chip type={f.ruleType === 'SLAB' ? 'warning' : f.ruleType === 'PERCENTAGE' ? 'success' : 'ghost'} label={f.ruleType} />
                      </td>
                      <td>
                        {f.ruleType === 'FIXED' && <span className="mono">Fixed ₹{Number(f.fixedAmount).toLocaleString('en-IN')}</span>}
                        {f.ruleType === 'PERCENTAGE' && (
                          <span className="mono">{f.percentageRate}% {f.minFee > 0 ? `(Min ₹${Number(f.minFee).toLocaleString('en-IN')})` : ''}</span>
                        )}
                        {f.ruleType === 'SLAB' && (
                          <span className="mono font-semibold" style={{ color: 'var(--accent)' }}>
                            {f.slabs ? f.slabs.length : 0} Slabs Configured
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        <div>From: <b>{f.effectiveFrom}</b></div>
                        <div>To: {f.effectiveTo ? <b>{f.effectiveTo}</b> : <span className="mut">Present</span>}</div>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600 }}>{f.actName || 'State Court Fees Act'}</div>
                        <div className="mut">Ver: {f.actVersion || '—'} | Notif: {f.notificationNo || '—'}</div>
                      </td>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        <div>Process: ₹{Number(f.processFee).toLocaleString('en-IN')}</div>
                        <div>Filing: ₹{Number(f.filingFee).toLocaleString('en-IN')}</div>
                        <div>Misc: ₹{Number(f.miscCharges).toLocaleString('en-IN')}</div>
                      </td>
                      <td>
                        <Chip type={f.isActive ? 'success' : 'ghost'} label={f.isActive ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="c" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary sm" onClick={() => handleOpenEdit(f)} style={{ marginRight: 'var(--space-2)' }}>Edit</button>
                        <button className={`btn sm ${f.isActive ? 'danger' : 'primary'}`} onClick={() => handleToggleActive(f)}>{f.isActive ? 'Deactivate' : 'Activate'}</button>
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
              : activeTab === 'courts'
                ? (editingItem ? 'Edit Court' : 'Add Court')
                : activeTab === 'categories'
                  ? (editingItem ? 'Edit Document Category' : 'Add Document Category')
                  : (editingItem ? 'Edit State Fee Rule' : 'Add State Fee Rule')
        }
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {error && (
            <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          {activeTab === 'types' && (
            <FormSection title="General Settings">
              <FormGrid columns={1}>
                <FormField label="Code (Unique identifier)" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. PTN" 
                    value={typeForm.code} 
                    onChange={(e) => setTypeForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editingItem}
                    required
                  />
                </FormField>
                <FormField label="Name" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. Partition Suit" 
                    value={typeForm.name} 
                    onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Description">
                  <textarea 
                    placeholder="Add details..." 
                    value={typeForm.description} 
                    onChange={(e) => setTypeForm(p => ({ ...p, description: e.target.value }))}
                    rows="3"
                  />
                </FormField>
                <FormField label="Display Order" required={true}>
                  <input 
                    type="number" 
                    value={typeForm.displayOrder} 
                    onChange={(e) => setTypeForm(p => ({ ...p, displayOrder: e.target.value }))}
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {activeTab === 'stages' && (
            <FormSection title="General Settings">
              <FormGrid columns={1}>
                <FormField label="Code (Unique identifier)" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. FIL" 
                    value={stageForm.code} 
                    onChange={(e) => setStageForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editingItem}
                    required
                  />
                </FormField>
                <FormField label="Name" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. Filing" 
                    value={stageForm.name} 
                    onChange={(e) => setStageForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Display Order" required={true}>
                  <input 
                    type="number" 
                    value={stageForm.displayOrder} 
                    onChange={(e) => setStageForm(p => ({ ...p, displayOrder: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Theme Badge Color Class">
                  <select value={stageForm.color} onChange={(e) => setStageForm(p => ({ ...p, color: e.target.value }))}>
                    <option value="c-baize">Green (c-baize)</option>
                    <option value="c-brass">Yellow (c-brass)</option>
                    <option value="c-grey">Grey (c-grey)</option>
                    <option value="c-tape">Red (c-tape)</option>
                  </select>
                </FormField>
                <FormField label="Is litigation closed at this stage?">
                  <input 
                    type="checkbox" 
                    id="isClosed" 
                    checked={stageForm.isClosed} 
                    onChange={(e) => setStageForm(p => ({ ...p, isClosed: e.target.checked }))}
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {activeTab === 'courts' && (
            <FormSection title="General Settings">
              <FormGrid columns={1}>
                <FormField label="Code (Unique identifier)" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. SCJ_MDP" 
                    value={courtForm.code} 
                    onChange={(e) => setCourtForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editingItem}
                    required
                  />
                </FormField>
                <FormField label="Name" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. Sr. Civil Judge Court, Madanapalle" 
                    value={courtForm.name} 
                    onChange={(e) => setCourtForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {activeTab === 'categories' && (
            <FormSection title="General Settings">
              <FormGrid columns={1}>
                <FormField label="Code (Unique identifier)" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. PETN" 
                    value={categoryForm.code} 
                    onChange={(e) => setCategoryForm(p => ({ ...p, code: e.target.value }))}
                    disabled={!!editingItem}
                    required
                  />
                </FormField>
                <FormField label="Name" required={true}>
                  <input 
                    type="text" 
                    placeholder="e.g. Petitions" 
                    value={categoryForm.name} 
                    onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Description">
                  <textarea 
                    placeholder="Add details..." 
                    value={categoryForm.description} 
                    onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                    rows="3"
                  />
                </FormField>
                <FormField label="Display Order" required={true}>
                  <input 
                    type="number" 
                    value={categoryForm.displayOrder} 
                    onChange={(e) => setCategoryForm(p => ({ ...p, displayOrder: e.target.value }))}
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          {activeTab === 'stateFees' && (
            <>
              <FormSection title="General Settings">
                <FormGrid columns={2}>
                  <FormField label="Select State">
                    <select 
                      value={stateFeeForm.stateCode} 
                      onChange={(e) => handleStateSelectChange(e.target.value)}
                    >
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Rule Calculation Mode">
                    <select 
                      value={stateFeeForm.ruleType} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, ruleType: e.target.value }))}
                    >
                      <option value="PERCENTAGE">Percentage-Based (%)</option>
                      <option value="SLAB">Slab-Wise Tiered Rules</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                    </select>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title="Effective Window">
                <FormGrid columns={2}>
                  <FormField label="Effective From Date" required={true}>
                    <input 
                      type="date" 
                      value={stateFeeForm.effectiveFrom} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, effectiveFrom: e.target.value }))}
                      required
                    />
                  </FormField>
                  <FormField label="Effective To Date (Leave blank for open-ended)">
                    <input 
                      type="date" 
                      value={stateFeeForm.effectiveTo} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, effectiveTo: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title="Government Act & Notification Details">
                <FormGrid columns={2}>
                  <FormField label="Government Act Name">
                    <input 
                      type="text" 
                      placeholder="e.g. AP Court Fees and Suits Valuation Act, 1956" 
                      value={stateFeeForm.actName} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, actName: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Act Version">
                    <input 
                      type="text" 
                      placeholder="e.g. Amended 2022" 
                      value={stateFeeForm.actVersion} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, actVersion: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
                <FormGrid columns={1}>
                  <FormField label="Notification / G.O. Reference No.">
                    <input 
                      type="text" 
                      placeholder="e.g. G.O.Ms.No. 42 / Legal Affairs" 
                      value={stateFeeForm.notificationNo} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, notificationNo: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              {stateFeeForm.ruleType === 'FIXED' && (
                <FormSection title="Fixed Rule Details">
                  <FormGrid columns={1}>
                    <FormField label="Fixed Court Fee Amount (₹)" required={true}>
                      <input 
                        type="number" 
                        className="mono" 
                        value={stateFeeForm.fixedAmount} 
                        onChange={(e) => setStateFeeForm(p => ({ ...p, fixedAmount: e.target.value }))}
                        required
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {stateFeeForm.ruleType === 'PERCENTAGE' && (
                <FormSection title="Percentage Rule Details">
                  <FormGrid columns={3}>
                    <FormField label="Court Fee Percentage Rate (%)" required={true}>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="mono" 
                        value={stateFeeForm.percentageRate} 
                        onChange={(e) => setStateFeeForm(p => ({ ...p, percentageRate: e.target.value }))}
                        required
                      />
                    </FormField>
                    <FormField label="Minimum Fee Cap (₹)">
                      <input 
                        type="number" 
                        className="mono" 
                        value={stateFeeForm.minFee} 
                        onChange={(e) => setStateFeeForm(p => ({ ...p, minFee: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Maximum Fee Cap (₹)">
                      <input 
                        type="number" 
                        className="mono" 
                        value={stateFeeForm.maxFee} 
                        onChange={(e) => setStateFeeForm(p => ({ ...p, maxFee: e.target.value }))}
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {stateFeeForm.ruleType === 'SLAB' && (
                <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--card)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>Dynamic Relational Slabs Manager</div>
                    <button type="button" className="btn secondary sm" onClick={handleAddSlabRow}>+ Add Slab Tier</button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="t sm" style={{ fontSize: 'var(--text-xs)' }}>
                      <thead>
                        <tr>
                          <th>From Amount (₹)</th>
                          <th>To Amount (₹)</th>
                          <th>Fee Type</th>
                          <th>Rate / Fee</th>
                          <th>Min Cap (₹)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateFeeForm.slabs.map((slab, idx) => (
                          <tr key={idx}>
                            <td>
                              <input 
                                type="number" 
                                className="mono sm" 
                                style={{ width: '90px' }} 
                                value={slab.fromAmount} 
                                onChange={(e) => handleSlabChange(idx, 'fromAmount', e.target.value)} 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="mono sm" 
                                placeholder="Infinity" 
                                style={{ width: '90px' }} 
                                value={slab.toAmount} 
                                onChange={(e) => handleSlabChange(idx, 'toAmount', e.target.value)} 
                              />
                            </td>
                            <td>
                              <select 
                                style={{ padding: 'var(--space-1)', fontSize: 'var(--text-xs)' }}
                                value={slab.feeType}
                                onChange={(e) => handleSlabChange(idx, 'feeType', e.target.value)}
                              >
                                <option value="PERCENTAGE">% Rate</option>
                                <option value="FIXED">Fixed ₹</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="0.01"
                                className="mono sm" 
                                style={{ width: '70px' }} 
                                value={slab.feeValue} 
                                onChange={(e) => handleSlabChange(idx, 'feeValue', e.target.value)} 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="mono sm" 
                                style={{ width: '70px' }} 
                                value={slab.minFee} 
                                onChange={(e) => handleSlabChange(idx, 'minFee', e.target.value)} 
                              />
                            </td>
                            <td>
                              {stateFeeForm.slabs.length > 1 && (
                                <button 
                                  type="button" 
                                  className="btn danger sm" 
                                  onClick={() => handleRemoveSlabRow(idx)}
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <FormSection title="Separate Additional Charges">
                <FormGrid columns={4}>
                  <FormField label="Process Fee (₹)">
                    <input 
                      type="number" 
                      className="mono" 
                      value={stateFeeForm.processFee} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, processFee: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Filing Fee (₹)">
                    <input 
                      type="number" 
                      className="mono" 
                      value={stateFeeForm.filingFee} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, filingFee: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Misc. Charges (₹)">
                    <input 
                      type="number" 
                      className="mono" 
                      value={stateFeeForm.miscCharges} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, miscCharges: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Advocate Fee Default %">
                    <input 
                      type="number" 
                      step="0.5" 
                      className="mono" 
                      value={stateFeeForm.defaultAdvocateFeePct} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, defaultAdvocateFeePct: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title="Additional Notes & Status">
                <FormGrid columns={1}>
                  <FormField label="Notes / Act References">
                    <textarea 
                      placeholder="Notes, Gazette citations, or exemption clauses..." 
                      value={stateFeeForm.notes} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, notes: e.target.value }))}
                      rows="2"
                    />
                  </FormField>
                  <FormField label="Is this state fee configuration active?">
                    <input 
                      type="checkbox" 
                      id="stateFeeActive" 
                      checked={stateFeeForm.isActive} 
                      onChange={(e) => setStateFeeForm(p => ({ ...p, isActive: e.target.checked }))}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>
            </>
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
