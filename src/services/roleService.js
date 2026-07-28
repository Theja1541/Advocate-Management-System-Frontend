import api from './api';

export const getRoles = async () => {
  const { data } = await api.get('/roles/roles');
  return data?.data?.roles || [];
};

export const getRoleById = async (id) => {
  const { data } = await api.get(`/roles/roles/${id}`);
  return data?.data?.role;
};

export const getModules = async () => {
  const { data } = await api.get('/roles/modules');
  return data?.data?.modules || [];
};

export const updatePermission = async ({ roleId, moduleId, accessLevel }) => {
  const { data } = await api.put('/roles/permissions', {
    roleId,
    moduleId,
    accessLevel,
  });
  return data?.data?.permission;
};

export const updatePermissionsMatrix = async (permissions) => {
  const { data } = await api.put('/roles/permissions', { permissions });
  return data?.data?.permissions || [];
};

export default {
  getRoles,
  getRoleById,
  getModules,
  updatePermission,
  updatePermissionsMatrix,
};
