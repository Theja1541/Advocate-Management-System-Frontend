import api from './api';

export const getClients = async (tenantId) => {
  const url = tenantId ? `/clients?tenantId=${tenantId}` : '/clients';
  const { data } = await api.get(url);
  return data?.data?.clients || [];
};

export const getClientById = async (id) => {
  const { data } = await api.get(`/clients/${id}`);
  return data?.data?.client;
};

export const createClient = async (payload) => {
  const { data } = await api.post('/clients', payload);
  return data?.data?.client;
};

export const updateClient = async (id, payload) => {
  const { data } = await api.put(`/clients/${id}`, payload);
  return data?.data?.client;
};

export const deleteClient = async (id) => {
  await api.delete(`/clients/${id}`);
};

export default {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
