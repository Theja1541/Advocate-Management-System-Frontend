import api from './api';

export const getReportTypes = async () => {
  const { data } = await api.get('/reports');
  return data?.data?.types || [];
};

export const getReport = async (reportType, params = {}) => {
  const { data } = await api.get(`/reports/${reportType}`, { params });
  return data?.data?.report;
};

export const exportReport = async (reportType, format = 'xlsx', params = {}) => {
  try {
    const response = await api.get(`/reports/${reportType}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    const filename = match
      ? decodeURIComponent(match[1].replace(/['"]/g, ''))
      : `${reportType}-report.${format}`;

    const contentType = format === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: contentType })
    );
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
        throw Object.assign(new Error(parsed.message || 'Export failed'), {
          status: error.status,
          data: parsed,
        });
      } catch (inner) {
        if (inner.message && inner.message !== 'Export failed') throw inner;
      }
    }
    throw error;
  }
};

export default { getReportTypes, getReport, exportReport };
