import api from './api';

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const logout = async () => {
  const { data } = await api.post('/auth/logout');
  return data;
};

export const refresh = async () => {
  const { data } = await api.post('/auth/refresh');
  return data;
};

export const getMe = async (token) => {
  const { data } = await api.get('/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
};

export default { login, logout, refresh, getMe };
