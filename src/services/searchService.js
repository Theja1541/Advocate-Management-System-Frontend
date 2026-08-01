import api from './api';

export const searchNotesAndDocuments = async ({ keyword, limit = 20 }) => {
  const { data } = await api.get('/search', {
    params: {
      q: keyword,
      limit,
    },
  });

  return data?.data || { results: [], notes: [], documents: [], total: 0 };
};

export default {
  searchNotesAndDocuments,
};
