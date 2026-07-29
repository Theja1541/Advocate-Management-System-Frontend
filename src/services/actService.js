import api from './api';

export const getActs = async (params = {}) => {
  const { data } = await api.get('/acts', { params });
  return data?.data?.acts || [];
};

export const getActById = async (id) => {
  const { data } = await api.get(`/acts/${id}`);
  return data?.data?.act;
};

export const toggleActBookmark = async (payload) => {
  const { data } = await api.post('/acts/bookmark', payload);
  return data?.data?.act;
};

export const openActPdf = async (id, fallbackName = 'bare-act.pdf') => {
  // Open the blank tab synchronously in the click handler thread to bypass popup blocker
  const win = window.open('', '_blank');
  if (win) {
    win.document.write('<p style="font-family:system-ui,sans-serif;text-align:center;margin-top:20%;color:#6b7280;font-size:15px;">Loading Bare Act PDF...</p>');
  }

  try {
    const response = await api.get(`/acts/${id}/open`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    if (win) {
      win.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('download', fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch (error) {
    // Clean up: close the loading tab if the request failed
    if (win) {
      win.close();
    }

    if (error.originalError?.response?.data instanceof Blob) {
      try {
        const text = await error.originalError.response.data.text();
        const parsed = JSON.parse(text);
        throw Object.assign(new Error(parsed.message || 'Failed to open bare act'), {
          status: error.status,
          data: parsed,
        });
      } catch (inner) {
        if (inner.message && inner.message !== 'Failed to open bare act') throw inner;
      }
    }
    throw error;
  }
};

export const downloadActPdf = async (id, fallbackName = 'bare-act.pdf') => {
  try {
    const response = await api.get(`/acts/${id}/pdf`, {
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    const filename = match
      ? decodeURIComponent(match[1].replace(/['"]/g, ''))
      : fallbackName;

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
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

export const getAmendments = async (params = {}) => {
  const { data } = await api.get('/amendments', { params });
  if (params.limit !== undefined || params.offset !== undefined) {
    return data?.data || { amendments: [], totalCount: 0 };
  }
  return data?.data?.amendments || [];
};

export const createAct = async (formData) => {
  const { data } = await api.post('/acts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data?.act;
};

export const updateAct = async (id, payload) => {
  const { data } = await api.put(`/acts/${id}`, payload);
  return data?.data?.act;
};

export const replaceActPdf = async (id, formData) => {
  const { data } = await api.put(`/acts/${id}/replace`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data?.act;
};

export const deleteAct = async (id) => {
  const { data } = await api.delete(`/acts/${id}`);
  return data;
};

export const restoreAct = async (id) => {
  const { data } = await api.post(`/acts/${id}/restore`);
  return data?.data?.act;
};

export const createAmendment = async (payload) => {
  const { data } = await api.post('/amendments', payload);
  return data?.data?.amendment;
};

export const updateAmendment = async (id, payload) => {
  const { data } = await api.put(`/amendments/${id}`, payload);
  return data?.data?.amendment;
};

export const deleteAmendment = async (id) => {
  await api.delete(`/amendments/${id}`);
};

export const importAmendments = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/amendments/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data || { totalRows: 0, imported: 0, duplicates: 0, errors: [] };
};

export default {
  getActs,
  getActById,
  toggleActBookmark,
  openActPdf,
  downloadActPdf,
  getAmendments,
  createAmendment,
  updateAmendment,
  deleteAmendment,
  importAmendments,
  createAct,
  updateAct,
  replaceActPdf,
  deleteAct,
  restoreAct,
};
