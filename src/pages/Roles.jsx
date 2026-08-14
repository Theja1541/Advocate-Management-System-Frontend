import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NAV } from '../data/mockData';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import { useAuth } from '../context/AuthContext';
import { useLegalData } from '../context/DataContext';
import {
  getRoles,
  getRoleById,
  getModules,
  updatePermissionsMatrix
} from '../services/roleService';

const ACCESS_LEVELS = ['---', 'V', 'VE', 'VA', 'VEA'];

const getAccessLevel = (mod) =>
  mod?.Permission?.accessLevel ||
  mod?.permission?.accessLevel ||
  '---';

export default function Roles() {
  const { id: targetTenantId } = useParams();
  const navigate = useNavigate();
  const { user, refreshPermissions } = useAuth();
  const { updatePermission } = useLegalData();
  const isSuperAdminManagingTenant = user?.role === 'Super Admin' && !!targetTenantId;
  const canEdit = user?.role === 'Super Admin' || user?.role?.includes('Admin');

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [activeGroup, setActiveGroup] = useState('Matters');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roleList, moduleList] = await Promise.all([getRoles(targetTenantId), getModules()]);
      const detailed = await Promise.all(roleList.map((r) => getRoleById(r.id, targetTenantId)));
      const filteredRoles = detailed.filter((r) => {
        if (r.name === 'Group Admin') return false;
        if (r.name === 'Super Admin') return user?.role === 'Super Admin';
        if (r.name === 'Tenant Admin') return user?.role === 'Super Admin';
        return true;
      });

      const nextMatrix = {};
      detailed.forEach((role) => {
        nextMatrix[role.id] = {};
        (role.modules || []).forEach((mod) => {
          nextMatrix[role.id][mod.id] = getAccessLevel(mod);
        });
      });

      setRoles(filteredRoles);
      // We will keep 'detailed' in state if needed, but we can just find Tenant Admin directly
      const tenantAdminRole = detailed.find((r) => r.name === 'Tenant Admin');
      setModules(
        user?.role === 'Super Admin'
          ? moduleList
          : moduleList.filter((m) => tenantAdminRole && nextMatrix[tenantAdminRole.id]?.[m.id] && nextMatrix[tenantAdminRole.id]?.[m.id] !== '---')
      );
      setMatrix(nextMatrix);
    } catch (err) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [targetTenantId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = async (roleId, moduleId, accessLevel) => {
    if (!canEdit) return;
    const key = `${roleId}-${moduleId}`;
    const previous = matrix[roleId]?.[moduleId] ?? '---';
    const roleName = roles.find((r) => Number(r.id) === Number(roleId))?.name;
    const moduleIndex = modules.findIndex((m) => Number(m.id) === Number(moduleId));

    setMatrix((prev) => ({
      ...prev,
      [roleId]: { ...(prev[roleId] || {}), [moduleId]: accessLevel },
    }));
    setSavingKey(key);
    setError('');

    try {
      await updatePermission({
        roleId,
        moduleId,
        accessLevel,
        roleName,
        moduleIndex,
        targetTenantId
      });
      if (typeof refreshPermissions === 'function' && !targetTenantId) {
        await refreshPermissions();
      }
    } catch (err) {
      setMatrix((prev) => ({
        ...prev,
        [roleId]: { ...(prev[roleId] || {}), [moduleId]: previous },
      }));
      setError(err.message || 'Failed to update permission');
    } finally {
      setSavingKey('');
    }
  };

  const handleToggleTenantModule = async (moduleId, enabled) => {
    if (!canEdit) return;
    const tenantAdminRole = roles.find(r => r.name.toLowerCase().includes('tenant admin'));
    if (!tenantAdminRole) {
      setError("Cannot find Tenant Admin role to modify permissions.");
      return;
    }

    setSavingKey(`toggle-${moduleId}`);
    setError('');

    try {
      let permissionsArray = [];
      if (enabled) {
        // Enable for Tenant Admin only
        permissionsArray.push({
          roleId: tenantAdminRole.id,
          moduleId: moduleId,
          accessLevel: 'VEA'
        });
      } else {
        // Revoke for ALL roles in this tenant
        permissionsArray = roles.map(r => ({
          roleId: r.id,
          moduleId: moduleId,
          accessLevel: '---'
        }));
      }

      await updatePermissionsMatrix(permissionsArray, targetTenantId);

      // Optimistically update the local matrix
      setMatrix((prev) => {
        const next = { ...prev };
        if (enabled) {
          if (!next[tenantAdminRole.id]) next[tenantAdminRole.id] = {};
          next[tenantAdminRole.id][moduleId] = 'VEA';
        } else {
          roles.forEach(r => {
            if (!next[r.id]) next[r.id] = {};
            next[r.id][moduleId] = '---';
          });
        }
        return next;
      });
    } catch (err) {
      setError(err.message || 'Failed to toggle module access');
      await loadData(); // Reload to revert changes if failed
    } finally {
      setSavingKey('');
    }
  };

  if (isSuperAdminManagingTenant) {
    const tenantAdminRole = roles.find(r => r.name.toLowerCase().includes('tenant admin'));

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <button className="btn secondary btn-sm" onClick={() => navigate('/tenants')}>
            ← Back to Tenants
          </button>
        </div>

        <PageHeader
          title="Tenant Modules Access"
          description="Enable or disable specific modules for this tenant. Enabled modules grant 'VEA' access to their Tenant Admin, who can then delegate access to their firm."
        />

        {error && (
          <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="card">
            <div className="empty">Loading tenant modules...</div>
          </div>
        ) : (
          
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: 'var(--space-4)', color: 'var(--text-primary)', fontFamily: "'Spectral', serif" }}>Modules & Pages Access</h3>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflowX: 'auto', paddingBottom: '4px' }}>
              {NAV.filter(g => g.g !== 'Today').map((group) => {
                const isActive = activeGroup === group.g;
                return (
                  <button
                    key={group.g}
                    onClick={() => setActiveGroup(group.g)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: isActive ? 'var(--primary)' : 'var(--card)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      fontWeight: isActive ? '600' : '500',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {group.g}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
              {modules
                .filter(m => {
                  const currentGroup = NAV.find(g => g.g === activeGroup);
                  return currentGroup ? currentGroup.items.some(item => item.k === m.keyCode) : false;
                })
                .map((m) => {
                const isEnabled = tenantAdminRole ? (matrix[tenantAdminRole.id]?.[m.id] !== '---' && matrix[tenantAdminRole.id]?.[m.id] !== undefined) : false;
                const isSaving = savingKey === `toggle-${m.id}`;
                return (
                  <div 
                    key={m.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: 'var(--space-4)', 
                      background: 'var(--card)',
                      border: '1px solid',
                      borderColor: isEnabled ? 'rgba(37, 99, 235, 0.2)' : 'var(--border-color)', 
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  >
                    {isEnabled && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: 'var(--text-base)', color: isEnabled ? 'var(--primary)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{m.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.keyCode}</div>
                    </div>
                    <div>
                      <div 
                        onClick={() => !isSaving && handleToggleTenantModule(m.id, !isEnabled)}
                        style={{
                          width: '46px',
                          height: '26px',
                          borderRadius: '13px',
                          background: isEnabled ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                          position: 'relative',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          transition: 'background 0.3s ease',
                          opacity: isSaving ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: '2px',
                          left: isEnabled ? '22px' : '2px',
                          transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles & Access"
        description="Who can see and do what. V = view, E = edit, A = approve. (Tip: Modify permissions live via dropdowns below)"
      />

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="empty">Loading roles...</div>
        </div>
      ) : (
        <>
          <div className="tbl-card" style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Module</th>
                  {roles.map((r) => (
                    <th key={r.id} className="c">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="nm" style={{ fontSize: 'var(--text-sm)' }}>
                        {m.name}
                      </span>
                    </td>
                    {roles.map((r) => {
                      const v = matrix[r.id]?.[m.id] ?? '---';
                      const key = `${r.id}-${m.id}`;
                      return (
                        <td key={r.id} className="c">
                          <select
                            value={v}
                            disabled={!canEdit || savingKey === key}
                            onChange={(e) => handleChange(r.id, m.id, e.target.value)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: v === '---' ? 'var(--text-secondary)' : 'var(--success)',
                              fontWeight: 600,
                              fontFamily: "'IBM Plex Mono', monospace",
                              outline: 'none',
                              cursor: canEdit ? 'pointer' : 'default',
                              textAlign: 'center',
                              fontSize: 'var(--text-xs)',
                            }}
                          >
                            {ACCESS_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid3" style={{ marginTop: 'var(--space-4)' }}>
            {roles.map((r) => {
              const granted = modules.filter((m) => {
                const level = matrix[r.id]?.[m.id] ?? '---';
                return level !== '---';
              }).length;
              return (
                <div className="card" style={{ margin: 0 }} key={r.id}>
                  <div className="card-t" style={{ fontSize: 'var(--text-base)' }}>
                    {r.name}
                  </div>
                  <div className="mut" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.6, marginTop: 'var(--space-2)' }}>
                    {r.description || 'Role permissions controlled from the matrix above.'}
                  </div>
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <Chip type="primary" label={`${granted} of ${modules.length} modules`} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
