import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Chip from '../ui/Chip';
import { FormGrid, FormField } from '../ui/FormLayout';
import DataTable from '../ui/DataTable';
import { 
  getDocumentCategories, createDocumentCategory, updateDocumentCategory, 
  deactivateDocumentCategory, activateDocumentCategory
} from '../../services/caseMastersService';

export default function DocumentCategoriesModal({ isOpen, onClose }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '', displayOrder: '0' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDocumentCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to load document categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSearch('');
      setIsFormOpen(false);
    }
  }, [isOpen, loadData]);

  const handleToggleActive = async (item) => {
    setError('');
    try {
      const updated = item.isActive 
        ? await deactivateDocumentCategory(item.id) 
        : await activateDocumentCategory(item.id);
      setCategories(prev => prev.map(c => c.id === item.id ? updated : c));
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setError('');
    setCategoryForm({ code: '', name: '', description: '', displayOrder: '0' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setError('');
    setCategoryForm({
      code: item.code,
      name: item.name,
      description: item.description || '',
      displayOrder: String(item.displayOrder || '0'),
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
        throw new Error('Code and Name are required fields.');
      }
      
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
      setIsFormOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const headers = [
    { label: 'Code' },
    { label: 'Name' },
    { label: 'Status' },
    { label: 'Actions', className: 'c' }
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Categories"
      className="report-modal"
    >
      {!isFormOpen ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input 
                type="text" 
                placeholder="Search categories by code or name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--rule)', borderRadius: '6px' }}
              />
            </div>
            <button className="btn primary" onClick={handleOpenAdd} style={{ whiteSpace: 'nowrap' }}>
              + Add Category
            </button>
          </div>

          {error && (
            <div className="card" style={{ marginBottom: '12px', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '13px', padding: '10px' }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
            <DataTable headers={headers}>
              {loading ? (
                <tr><td colSpan="4" className="c mut" style={{ padding: '24px' }}>Loading document categories...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="4" className="c mut" style={{ padding: '24px' }}>No document categories found.</td></tr>
              ) : (
                filteredData.map(c => (
                  <tr key={c.id}>
                    <td><span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.code}</span></td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>
                      <Chip type={c.isActive ? 'c-baize' : 'c-grey'} label={c.isActive ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="c" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm ghost" onClick={() => handleOpenEdit(c)} style={{ marginRight: '8px' }}>Edit</button>
                      <button 
                        className={`btn sm ${c.isActive ? 'danger-text' : 'primary-text'}`} 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => handleToggleActive(c)}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="btn ghost sm" onClick={() => setIsFormOpen(false)} style={{ padding: '4px 8px' }}>
              &larr; Back
            </button>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{editingItem ? 'Edit Category' : 'Add Category'}</h3>
          </div>

          {error && (
            <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '13px', padding: '10px' }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <FormGrid columns={1}>
              <FormField label="Category Code" required>
                <input 
                  type="text" 
                  placeholder="e.g. OPINION" 
                  value={categoryForm.code} 
                  onChange={(e) => setCategoryForm(p => ({...p, code: e.target.value}))} 
                  required 
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>
              <FormField label="Category Name" required>
                <input 
                  type="text" 
                  placeholder="e.g. Legal Opinions" 
                  value={categoryForm.name} 
                  onChange={(e) => setCategoryForm(p => ({...p, name: e.target.value}))} 
                  required 
                />
              </FormField>
              <FormField label="Description">
                <textarea 
                  placeholder="Describe the types of documents in this category..." 
                  value={categoryForm.description} 
                  onChange={(e) => setCategoryForm(p => ({...p, description: e.target.value}))} 
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </FormField>
              <FormField label="Display Order">
                <input 
                  type="number" 
                  placeholder="0" 
                  value={categoryForm.displayOrder} 
                  onChange={(e) => setCategoryForm(p => ({...p, displayOrder: e.target.value}))} 
                />
              </FormField>
            </FormGrid>
          </div>

          <div className="modal-foot" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn ghost" onClick={() => setIsFormOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
