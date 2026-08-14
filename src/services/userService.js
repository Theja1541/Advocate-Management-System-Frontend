import api from './api';

export const getUsers = async () => {
  const { data } = await api.get('/users');
  return data?.data?.users || [];
};

export const resetUserPassword = async (id) => {
  const { data } = await api.post(`/users/${id}/reset-password`);
  return data;
};

export default { getUsers, resetUserPassword };
