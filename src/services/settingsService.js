import api from './api';

export const getPublicSettings = async () => {
  const { data } = await api.get('/settings/public');
  return data.data;
};

export const uploadSuperAdminLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  
  const { data } = await api.put('/settings/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data;
};

export const getSmtpSettings = async () => {
  const { data } = await api.get('/settings/smtp');
  return data.data;
};

export const updateSmtpSettings = async (payload) => {
  const { data } = await api.put('/settings/smtp', payload);
  return data;
};

export const testSmtpSettings = async (testEmail) => {
  const { data } = await api.post('/settings/smtp/test', { test_email: testEmail });
  return data;
};
