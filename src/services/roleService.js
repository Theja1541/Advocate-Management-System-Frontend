import api from './api';

export const getRoles = async (targetTenantId) => {
  const params = targetTenantId ? { targetTenantId } : {};
  const { data } = await api.get('/roles/roles', { params });
  return data?.data?.roles || [];
};

export const getRoleById = async (id, targetTenantId) => {
  const params = targetTenantId ? { targetTenantId } : {};
  const { data } = await api.get(`/roles/roles/${id}`, { params });
  return data?.data?.role;
};

export const getModules = async () => {
  const { data } = await api.get('/roles/modules');
  return data?.data?.modules || [];
};

export const updatePermission = async ({ roleId, moduleId, accessLevel, targetTenantId }) => {
  const { data } = await api.put('/roles/permissions', {
    roleId,
    moduleId,
    accessLevel,
    targetTenantId,
  });
  return data?.data?.permission;
};

export const updatePermissionsMatrix = async (permissions, targetTenantId) => {
  const { data } = await api.put('/roles/permissions', { permissions, targetTenantId });
  return data?.data?.permissions || [];
};

export default {
  getRoles,
  getRoleById,
  getModules,
  updatePermission,
  updatePermissionsMatrix,
};
