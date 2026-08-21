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

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const { data } = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return data;
};

export default { login, logout, refresh, getMe, changePassword };

export const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

export const verifyMfa = async (userId, otp) => {
  const { data } = await api.post('/auth/verify-mfa', { userId, otp });
  return data;
};

export const resendMfa = async (userId) => {
  const { data } = await api.post('/auth/resend-mfa', { userId });
  return data;
};

