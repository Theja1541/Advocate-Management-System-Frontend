import api from './api';

export const getMemberships = async () => {
  const { data } = await api.get('/memberships');
  return data?.data?.memberships || [];
};

export const getMembershipById = async (id) => {
  const { data } = await api.get(`/memberships/${id}`);
  return data?.data?.membership;
};

export const createMembership = async (payload) => {
  const { data } = await api.post('/memberships', payload);
  return data?.data?.membership;
};

export const updateMembership = async (id, payload) => {
  const { data } = await api.put(`/memberships/${id}`, payload);
  return data?.data?.membership;
};

export const renewMembership = async (id) => {
  const { data } = await api.post(`/memberships/${id}/renew`);
  return data?.data?.membership;
};

export const deleteMembership = async (id) => {
  await api.delete(`/memberships/${id}`);
};

export default {
  getMemberships,
  getMembershipById,
  createMembership,
  updateMembership,
  renewMembership,
  deleteMembership,
};
