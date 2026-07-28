import api from './api';

export const getLands = async () => {
  const { data } = await api.get('/lands');
  return data?.data?.lands || [];
};

export const createLand = async (payload) => {
  const { data } = await api.post('/lands', payload);
  return data?.data?.land;
};

export const updateLand = async (id, payload) => {
  const { data } = await api.put(`/lands/${id}`, payload);
  return data?.data?.land;
};

export const deleteLand = async (id) => {
  await api.delete(`/lands/${id}`);
};

export default { getLands, createLand, updateLand, deleteLand };
