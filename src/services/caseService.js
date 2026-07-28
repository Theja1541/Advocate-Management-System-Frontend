import api from './api';

export const getCases = async () => {
  const { data } = await api.get('/cases');
  return data?.data?.cases || [];
};

export const getCaseById = async (id) => {
  const { data } = await api.get(`/cases/${id}`);
  return data?.data?.case;
};

export const createCase = async (payload) => {
  const { data } = await api.post('/cases', payload);
  return data?.data?.case;
};

export const updateCase = async (id, payload) => {
  const { data } = await api.put(`/cases/${id}`, payload);
  return data?.data?.case;
};

export const deleteCase = async (id) => {
  await api.delete(`/cases/${id}`);
};

export default {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
};
