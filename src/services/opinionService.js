import api from './api';

export const getOpinions = async () => {
  const { data } = await api.get('/opinions');
  return data?.data?.opinions || [];
};

export const createOpinion = async (payload) => {
  const { data } = await api.post('/opinions', payload);
  return data?.data?.opinion;
};

export const updateOpinion = async (id, payload) => {
  const { data } = await api.put(`/opinions/${id}`, payload);
  return data?.data?.opinion;
};

export const deleteOpinion = async (id) => {
  await api.delete(`/opinions/${id}`);
};

export const submitOpinionForReview = async (id) => {
  const { data } = await api.post(`/opinions/${id}/submit`);
  return data?.data?.opinion;
};

export const approveOpinion = async (id) => {
  const { data } = await api.post(`/opinions/${id}/approve`);
  return data?.data?.opinion;
};

export const rejectOpinion = async (id, rejectReason) => {
  const { data } = await api.post(`/opinions/${id}/reject`, { rejectReason });
  return data?.data?.opinion;
};

export const issueOpinion = async (id) => {
  const { data } = await api.post(`/opinions/${id}/issue`);
  return data?.data?.opinion;
};

export default {
  getOpinions,
  createOpinion,
  updateOpinion,
  deleteOpinion,
  submitOpinionForReview,
  approveOpinion,
  rejectOpinion,
  issueOpinion,
};
