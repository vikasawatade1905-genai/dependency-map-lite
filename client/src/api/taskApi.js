import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/$/, '')}/tasks`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Standardize error responses from backend
 */
const extractApiError = (error) => {
  if (error.response && error.response.data) {
    const data = error.response.data;
    return {
      message: data.message || 'An unexpected error occurred.',
      cyclePath: data.cyclePath || null,
      blockers: data.blockers || [],
      errors: data.errors || [],
      status: error.response.status,
    };
  }
  return {
    message: error.message || 'Network connection failed.',
    cyclePath: null,
    blockers: [],
    errors: [],
    status: 500,
  };
};

export const taskApi = {
  /**
   * Fetch tasks with optional filters
   */
  async getTasks(params = {}) {
    try {
      const response = await api.get('/', { params });
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Fetch single task with full blocker chain
   */
  async getTaskById(id) {
    try {
      const response = await api.get(`/${id}`);
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Fetch dependency graph payload
   */
  async getGraph() {
    try {
      const response = await api.get('/graph');
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Create task
   */
  async createTask(taskData) {
    try {
      const response = await api.post('/', taskData);
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Update task
   */
  async updateTask(id, updateData) {
    try {
      const response = await api.put(`/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Delete task
   */
  async deleteTask(id) {
    try {
      const response = await api.delete(`/${id}`);
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  /**
   * Reset database to initial DAG demo seed
   */
  async resetDemoData() {
    try {
      const response = await api.post('/reset');
      return response.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },
};

export default taskApi;
