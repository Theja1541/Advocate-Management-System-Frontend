import api from './api';

export const getAlerts = async (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);
  if (filters.priority) query.append('priority', filters.priority);
  if (filters.referenceType) query.append('referenceType', filters.referenceType);
  if (filters.message) query.append('message', filters.message);
  if (filters.isRead !== undefined && filters.isRead !== '') query.append('isRead', filters.isRead);
  
  const { data } = await api.get(`/alerts?${query.toString()}`);
  return data?.data?.alerts || [];
};

export const getAlertCount = async (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);
  if (filters.priority) query.append('priority', filters.priority);
  if (filters.referenceType) query.append('referenceType', filters.referenceType);
  if (filters.message) query.append('message', filters.message);
  if (filters.isRead !== undefined && filters.isRead !== '') query.append('isRead', filters.isRead);
  
  const { data } = await api.get(`/alerts/count?${query.toString()}`);
  return data?.data?.count || 0;
};

export const resolveAlertStatus = async (id, status) => {
  const { data } = await api.patch(`/alerts/${id}/resolve`, { status });
  return data?.data?.alert;
};

export const markAlertAsRead = async (id) => {
  const { data } = await api.patch(`/alerts/${id}/read`);
  return data?.data?.alert;
};

export const markAlertAsUnread = async (id) => {
  const { data } = await api.patch(`/alerts/${id}/unread`);
  return data?.data?.alert;
};

export default { getAlerts, getAlertCount, resolveAlertStatus, markAlertAsRead, markAlertAsUnread };
