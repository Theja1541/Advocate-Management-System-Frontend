import api from './api';

export const getPayments = async (tenantId) => {
  const url = tenantId ? `/payments?tenantId=${tenantId}` : '/payments';
  const { data } = await api.get(url);
  return data?.data?.payments || [];
};

export const getPaymentById = async (id) => {
  const { data } = await api.get(`/payments/${id}`);
  return data?.data?.payment;
};

export const createPayment = async (payload) => {
  const { data } = await api.post('/payments', payload);
  return data?.data?.payment;
};

export const updatePayment = async (id, payload) => {
  const { data } = await api.put(`/payments/${id}`, payload);
  return data?.data?.payment;
};

export const deletePayment = async (id) => {
  await api.delete(`/payments/${id}`);
};

export default {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
