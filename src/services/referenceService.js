import api from './api';

export const getReferences = async () => {
  const { data } = await api.get('/references');
  return data?.data?.references || [];
};

export const createReference = async (payload) => {
  const { data } = await api.post('/references', payload);
  return data?.data?.reference;
};

export const updateReference = async (id, payload) => {
  const { data } = await api.put(`/references/${id}`, payload);
  return data?.data?.reference;
};

export const deleteReference = async (id) => {
  await api.delete(`/references/${id}`);
};

export default { getReferences, createReference, updateReference, deleteReference };
