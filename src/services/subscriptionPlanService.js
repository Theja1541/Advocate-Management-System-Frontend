import api from './api';

const planService = {
  // Get all subscription plans with pagination and filtering
  getAllPlans: async (params = {}) => {
    const { data } = await api.get('/plans', { params });
    return data;
  },

  // Get a single plan by ID
  getPlanById: async (id) => {
    const { data } = await api.get(`/plans/${id}`);
    return data;
  },

  // Create a new subscription plan
  createPlan: async (planData) => {
    const { data } = await api.post('/plans', planData);
    return data;
  },

  // Update an existing subscription plan
  updatePlan: async (id, planData) => {
    const { data } = await api.put(`/plans/${id}`, planData);
    return data;
  },

  // Delete a subscription plan
  deletePlan: async (id) => {
    const { data } = await api.delete(`/plans/${id}`);
    return data;
  },
};

export default planService;
