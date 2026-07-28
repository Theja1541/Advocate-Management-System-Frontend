import api from './api';

export const getAlerts = async () => {
  const { data } = await api.get('/alerts');
  return data?.data?.alerts || [];
};

export const createAlert = async (payload) => {
  const { data } = await api.post('/alerts', payload);
  return data?.data?.alert;
};

export const updateAlert = async (id, payload) => {
  const { data } = await api.put(`/alerts/${id}`, payload);
  return data?.data?.alert;
};

export const deleteAlert = async (id) => {
  await api.delete(`/alerts/${id}`);
};

export default { getAlerts, createAlert, updateAlert, deleteAlert };
