import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Chip from '../components/ui/Chip';
import { useAuth } from '../context/AuthContext';
import { useLegalData } from '../context/DataContext';
import {
  getRoles,
  getRoleById,
  getModules,
} from '../services/roleService';

const ACCESS_LEVELS = ['—', 'V', 'VE', 'VA', 'VEA'];

const getAccessLevel = (mod) =>
  mod?.Permission?.accessLevel ||
  mod?.permission?.accessLevel ||
  '—';

export default function Roles() {
  const { id: targetTenantId } = useParams();
  const navigate = useNavigate();
  const { user, refreshPermissions } = useAuth();
  const { updatePermission } = useLegalData();
  const canEdit = user?.role === 'Super Admin';

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roleList, moduleList] = await Promise.all([getRoles(targetTenantId), getModules()]);
      const detailed = await Promise.all(roleList.map((r) => getRoleById(r.id, targetTenantId)));
      const filteredRoles = user?.role === 'Super Admin' ? detailed : detailed.filter((r) => r.name !== 'Super Admin');

      const nextMatrix = {};
      filteredRoles.forEach((role) => {
        nextMatrix[role.id] = {};
        (role.modules || []).forEach((mod) => {
          nextMatrix[role.id][mod.id] = getAccessLevel(mod);
        });
      });

      setRoles(filteredRoles);
      setModules(moduleList);
      setMatrix(nextMatrix);
    } catch (err) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = async (roleId, moduleId, accessLevel) => {
    if (!canEdit) return;
    const key = `${roleId}-${moduleId}`;
    const previous = matrix[roleId]?.[moduleId] ?? '—';
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
      });
      if (typeof refreshPermissions === 'function') {
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
          <div className="empty">Loading roles…</div>
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
                      const v = matrix[r.id]?.[m.id] ?? '—';
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
                              color: v === '—' ? 'var(--text-secondary)' : 'var(--success)',
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
                const level = matrix[r.id]?.[m.id] ?? '—';
                return level !== '—';
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
