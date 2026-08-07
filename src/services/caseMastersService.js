import api from './api';

export const getCaseTypes = async (activeOnly = false) => {
  const { data } = await api.get(`/masters/case-types?activeOnly=${activeOnly}`);
  return data?.data?.caseTypes || [];
};

export const getCaseTypeById = async (id) => {
  const { data } = await api.get(`/masters/case-types/${id}`);
  return data?.data?.caseType;
};

export const createCaseType = async (payload) => {
  const { data } = await api.post('/masters/case-types', payload);
  return data?.data?.caseType;
};

export const updateCaseType = async (id, payload) => {
  const { data } = await api.put(`/masters/case-types/${id}`, payload);
  return data?.data?.caseType;
};

export const activateCaseType = async (id) => {
  const { data } = await api.patch(`/masters/case-types/${id}/activate`);
  return data?.data?.caseType;
};

export const deactivateCaseType = async (id) => {
  const { data } = await api.patch(`/masters/case-types/${id}/deactivate`);
  return data?.data?.caseType;
};

// Case Stages API
export const getCaseStages = async (activeOnly = false) => {
  const { data } = await api.get(`/masters/case-stages?activeOnly=${activeOnly}`);
  return data?.data?.caseStages || [];
};

export const getCaseStageById = async (id) => {
  const { data } = await api.get(`/masters/case-stages/${id}`);
  return data?.data?.caseStage;
};

export const createCaseStage = async (payload) => {
  const { data } = await api.post('/masters/case-stages', payload);
  return data?.data?.caseStage;
};

export const updateCaseStage = async (id, payload) => {
  const { data } = await api.put(`/masters/case-stages/${id}`, payload);
  return data?.data?.caseStage;
};

export const activateCaseStage = async (id) => {
  const { data } = await api.patch(`/masters/case-stages/${id}/activate`);
  return data?.data?.caseStage;
};

export const deactivateCaseStage = async (id) => {
  const { data } = await api.patch(`/masters/case-stages/${id}/deactivate`);
  return data?.data?.caseStage;
};

// Courts API
export const getCourts = async (activeOnly = false) => {
  const { data } = await api.get(`/masters/courts?activeOnly=${activeOnly}`);
  return data?.data?.courts || [];
};

export const getCourtById = async (id) => {
  const { data } = await api.get(`/masters/courts/${id}`);
  return data?.data?.court;
};

export const createCourt = async (payload) => {
  const { data } = await api.post('/masters/courts', payload);
  return data?.data?.court;
};

export const updateCourt = async (id, payload) => {
  const { data } = await api.put(`/masters/courts/${id}`, payload);
  return data?.data?.court;
};

export const activateCourt = async (id) => {
  const { data } = await api.patch(`/masters/courts/${id}/activate`);
  return data?.data?.court;
};

export const deactivateCourt = async (id) => {
  const { data } = await api.patch(`/masters/courts/${id}/deactivate`);
  return data?.data?.court;
};

// Document Categories API
export const getDocumentCategories = async (activeOnly = false) => {
  const { data } = await api.get(`/masters/document-categories?activeOnly=${activeOnly}`);
  return data?.data?.documentCategories || [];
};

export const getDocumentCategoryById = async (id) => {
  const { data } = await api.get(`/masters/document-categories/${id}`);
  return data?.data?.documentCategory;
};

export const createDocumentCategory = async (payload) => {
  const { data } = await api.post('/masters/document-categories', payload);
  return data?.data?.documentCategory;
};

export const updateDocumentCategory = async (id, payload) => {
  const { data } = await api.put(`/masters/document-categories/${id}`, payload);
  return data?.data?.documentCategory;
};

export const activateDocumentCategory = async (id) => {
  const { data } = await api.patch(`/masters/document-categories/${id}/activate`);
  return data?.data?.documentCategory;
};

export const deactivateDocumentCategory = async (id) => {
  const { data } = await api.patch(`/masters/document-categories/${id}/deactivate`);
  return data?.data?.documentCategory;
};


export default {
  getCaseTypes,
  getCaseTypeById,
  createCaseType,
  updateCaseType,
  activateCaseType,
  deactivateCaseType,
  getCaseStages,
  getCaseStageById,
  createCaseStage,
  updateCaseStage,
  activateCaseStage,
  deactivateCaseStage,
  getCourts,
  getCourtById,
  createCourt,
  updateCourt,
  activateCourt,
  deactivateCourt,
  getDocumentCategories,
  getDocumentCategoryById,
  createDocumentCategory,
  updateDocumentCategory,
  activateDocumentCategory,
  deactivateDocumentCategory,

};
