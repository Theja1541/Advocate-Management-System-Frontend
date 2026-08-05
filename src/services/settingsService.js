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
