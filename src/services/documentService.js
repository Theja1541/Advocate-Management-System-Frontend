import api from './api';

export const getDocuments = async () => {
  const { data } = await api.get('/documents');
  return data?.data?.documents || [];
};

export const getDocumentById = async (id) => {
  const { data } = await api.get(`/documents/${id}`);
  return data?.data?.document;
};

export const uploadDocument = async ({ name, category, caseId, file }) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('caseId', String(caseId));
  formData.append('file', file);

  const { data } = await api.post('/documents', formData, {
    transformRequest: [
      (body, headers) => {
        if (body instanceof FormData) {
          delete headers['Content-Type'];
        }
        return body;
      },
    ],
  });
  return data?.data?.document;
};

export const downloadDocument = async (id, fallbackName = 'document') => {
  try {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    const filename = match
      ? decodeURIComponent(match[1].replace(/['"]/g, ''))
      : fallbackName;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (error.originalError?.response?.data instanceof Blob) {
      try {
        const text = await error.originalError.response.data.text();
        const parsed = JSON.parse(text);
        throw Object.assign(new Error(parsed.message || 'Download failed'), {
          status: error.status,
          data: parsed,
        });
      } catch (inner) {
        if (inner.message && inner.message !== 'Download failed') throw inner;
      }
    }
    throw error;
  }
};

export const deleteDocument = async (id) => {
  await api.delete(`/documents/${id}`);
};

export default {
  getDocuments,
  getDocumentById,
  uploadDocument,
  downloadDocument,
  deleteDocument,
};
