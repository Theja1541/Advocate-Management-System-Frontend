import api from './api';

export const getDashboard = async (params = {}) => {
  const { data } = await api.get('/dashboard', { params });
  return data?.data?.dashboard || null;
};

export default { getDashboard };
