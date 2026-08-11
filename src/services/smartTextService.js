import api from './api';

export const searchSmartText = async (query) => {
  const response = await api.get('/smart-text/search', { params: { q: query } });
  return response.data;
};

export const groupSmartText = async (phrase, sourceType, sourceId, selectedExisting) => {
  const response = await api.post('/smart-text/group', {
    phrase,
    sourceType,
    sourceId,
    selectedExisting
  });
  return response.data;
};

export const appendSmartText = async (payload) => {
  const response = await api.post('/smart-text/append', payload);
  return response.data;
};
