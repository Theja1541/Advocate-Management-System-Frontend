import api from './api';

export const getTasks = async (params = {}) => {
  const { data } = await api.get('/tasks', { params });
  return data?.data?.tasks || [];
};

export const getTaskById = async (id) => {
  const { data } = await api.get(`/tasks/${id}`);
  return data?.data?.task;
};

export const createTask = async (payload) => {
  const { data } = await api.post('/tasks', payload);
  return data?.data?.task;
};

export const updateTask = async (id, payload) => {
  const { data } = await api.put(`/tasks/${id}`, payload);
  return data?.data?.task;
};

export const deleteTask = async (id) => {
  await api.delete(`/tasks/${id}`);
};

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
