import api from './api';

export const calculateCourtFeeClient = async (stateCode, caseType, suitValue) => {
  if (!stateCode || suitValue === undefined || suitValue === null) {
    return null;
  }

  const response = await api.post('/court-fees/calculate', {
    stateCode: stateCode,
    suitValue: Number(suitValue),
  });

  return response.data;
};

export default {
  calculateCourtFeeClient,
};
