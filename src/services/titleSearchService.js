import api from './api';

export const getTitleSearches = async () => {
  const { data } = await api.get('/title-searches');
  return data?.data?.titleSearches || [];
};

export const createTitleSearch = async (payload) => {
  const { data } = await api.post('/title-searches', payload);
  return data?.data?.titleSearch;
};

export const updateTitleSearch = async (id, payload) => {
  const { data } = await api.put(`/title-searches/${id}`, payload);
  return data?.data?.titleSearch;
};

export const deleteTitleSearch = async (id) => {
  await api.delete(`/title-searches/${id}`);
};

export default { getTitleSearches, createTitleSearch, updateTitleSearch, deleteTitleSearch };
