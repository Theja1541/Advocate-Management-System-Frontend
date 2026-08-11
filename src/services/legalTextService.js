import api from './api';

export const getLegalTexts = async (params = {}) => {
  const response = await api.get('/legal-texts', { params });
  return response.data;
};

export const getLegalTextSuggestions = async (params = {}) => {
  const response = await api.get('/legal-texts/suggestions', { params });
  return response.data;
};

export const getLegalTextById = async (id) => {
  const response = await api.get(`/legal-texts/${id}`);
  return response.data;
};

export const createLegalText = async (data) => {
  const response = await api.post('/legal-texts', data);
  return response.data;
};

export const updateLegalText = async (id, data) => {
  const response = await api.put(`/legal-texts/${id}`, data);
  return response.data;
};

export const deleteLegalText = async (id) => {
  const response = await api.delete(`/legal-texts/${id}`);
  return response.data;
};
