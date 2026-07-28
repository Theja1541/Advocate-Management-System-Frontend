import api from './api';

const makeFormData = (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, val]) => {
    if (key === 'files') {
      if (Array.isArray(val)) {
        val.forEach((file) => {
          formData.append('files', file);
        });
      }
    } else if (key === 'retainedAttachmentIds') {
      formData.append('retainedAttachmentIds', JSON.stringify(val));
    } else if (val !== undefined && val !== null) {
      formData.append(key, val);
    }
  });
  return formData;
};

export const getDiaries = async () => {
  const { data } = await api.get('/diary');
  return data?.data?.diaries || [];
};

export const getDiaryById = async (id) => {
  const { data } = await api.get(`/diary/${id}`);
  return data?.data?.diary;
};

export const createDiary = async (payload) => {
  const formData = makeFormData(payload);
  const { data } = await api.post('/diary', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data?.diary;
};

export const updateDiary = async (id, payload) => {
  const formData = makeFormData(payload);
  const { data } = await api.put(`/diary/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data?.diary;
};

export const deleteDiary = async (id) => {
  await api.delete(`/diary/${id}`);
};

export default {
  getDiaries,
  getDiaryById,
  createDiary,
  updateDiary,
  deleteDiary,
};
