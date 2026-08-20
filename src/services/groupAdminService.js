import api from './api';

export const getGroupAdmins = async (tenantId) => {
  const url = tenantId ? `/group-admins?tenantId=${tenantId}` : '/group-admins';
  const { data } = await api.get(url);
  return data?.data?.groupAdmins || [];
};

export const getGroupAdminById = async (id) => {
  const { data } = await api.get(`/group-admins/${id}`);
  return data?.data?.groupAdmin;
};

export const createGroupAdmin = async (payload) => {
  const { data } = await api.post('/group-admins', payload);
  return data?.data?.groupAdmin;
};

export const updateGroupAdmin = async (id, payload) => {
  const { data } = await api.put(`/group-admins/${id}`, payload);
  return data?.data?.groupAdmin;
};

export const getAssignedAdvocates = async (id) => {
  const { data } = await api.get(`/group-admins/${id}/advocates`);
  return data?.data?.advocates || [];
};

export const assignAdvocateToGroupAdmin = async (id, advocateId) => {
  const { data } = await api.post(`/group-admins/${id}/advocates/${advocateId}`);
  return data?.data;
};

export const removeAdvocateFromGroupAdmin = async (id, advocateId) => {
  const { data } = await api.delete(`/group-admins/${id}/advocates/${advocateId}`);
  return data?.data;
};

export default {
  getGroupAdmins,
  getGroupAdminById,
  createGroupAdmin,
  updateGroupAdmin,
  getAssignedAdvocates,
  assignAdvocateToGroupAdmin,
  removeAdvocateFromGroupAdmin,
};
