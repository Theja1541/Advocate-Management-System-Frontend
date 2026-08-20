import api from './api';

export const getDaybookEntries = async (tenantId) => {
  const url = tenantId ? `/daybook?tenantId=${tenantId}` : '/daybook';
  const { data } = await api.get(url);
  return data?.data?.entries || [];
};

export const getDaybookEntryById = async (id) => {
  const { data } = await api.get(`/daybook/${id}`);
  return data?.data?.entry;
};

export const createDaybookEntry = async (payload) => {
  const { data } = await api.post('/daybook', payload);
  return data?.data?.entry;
};

export const updateDaybookEntry = async (id, payload) => {
  const { data } = await api.put(`/daybook/${id}`, payload);
  return data?.data?.entry;
};

export const deleteDaybookEntry = async (id) => {
  await api.delete(`/daybook/${id}`);
};

export default {
  getDaybookEntries,
  getDaybookEntryById,
  createDaybookEntry,
  updateDaybookEntry,
  deleteDaybookEntry,
};
