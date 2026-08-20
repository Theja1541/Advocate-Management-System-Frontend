import api from './api';

export const getUsers = async () => {
  const { data } = await api.get('/users');
  return data?.data?.users || [];
};

export const resetUserPassword = async (id) => {
  const { data } = await api.post(`/users/${id}/reset-password`);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await api.put(`/users/${id}`, payload);
  return data?.data?.user;
};

export default { getUsers, resetUserPassword, updateUser };
