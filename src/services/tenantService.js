import api from './api';

export const getTenants = async () => {
  const { data } = await api.get('/tenants');
  return data.data.tenants;
};

export const getTenantById = async (id) => {
  const { data } = await api.get(`/tenants/${id}`);
  return data.data.tenant;
};

export const createTenant = async (tenantData, adminData) => {
  const { data } = await api.post('/tenants', { tenantData, adminData });
  return data.data.tenant;
};

export const updateTenant = async (id, updateData) => {
  const { data } = await api.put(`/tenants/${id}`, updateData);
  return data.data.tenant;
};

export const resetTenantAdminPassword = async (id, newPassword) => {
  const { data } = await api.post(`/tenants/${id}/reset-password`, { newPassword });
  return data;
};

export const deleteTenant = async (id) => {
  await api.delete(`/tenants/${id}`);
};

export const getDashboardStats = async () => {
  const { data } = await api.get('/tenants/stats');
  return data.data.stats;
};

export const uploadTenantLogo = async (id, file) => {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.put(`/tenants/${id}/logo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data;
};
