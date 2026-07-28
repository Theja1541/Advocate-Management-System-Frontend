import api from './api';

export const getOpinions = async () => {
  const { data } = await api.get('/opinions');
  return data?.data?.opinions || [];
};

export const createOpinion = async (payload) => {
  const { data } = await api.post('/opinions', payload);
  return data?.data?.opinion;
};

export const updateOpinion = async (id, payload) => {
  const { data } = await api.put(`/opinions/${id}`, payload);
  return data?.data?.opinion;
};

export const deleteOpinion = async (id) => {
  await api.delete(`/opinions/${id}`);
};

export default { getOpinions, createOpinion, updateOpinion, deleteOpinion };
