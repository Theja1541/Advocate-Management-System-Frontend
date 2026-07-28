import api from './api';

export const getAdvocates = async () => {
  const { data } = await api.get('/advocates');
  return data?.data?.advocates || [];
};

export const getAdvocateById = async (id) => {
  const { data } = await api.get(`/advocates/${id}`);
  return data?.data?.advocate;
};

export const createAdvocate = async (payload) => {
  const { data } = await api.post('/advocates', payload);
  return data?.data?.advocate;
};

export const updateAdvocate = async (id, payload) => {
  const { data } = await api.put(`/advocates/${id}`, payload);
  return data?.data?.advocate;
};

export const deleteAdvocate = async (id) => {
  await api.delete(`/advocates/${id}`);
};

export default {
  getAdvocates,
  getAdvocateById,
  createAdvocate,
  updateAdvocate,
  deleteAdvocate,
};
