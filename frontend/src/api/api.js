import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // Production API path 
  : ''; // In development, proxy will route to backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getThermalTunneling = async (params) => {
  try {
    const response = await api.post('/simulate/thermal', params);
    return response.data;
  } catch (error) {
    console.error('Error calculating thermal tunneling:', error);
    throw error;
  }
};

export const getImpactTunneling = async (params) => {
  try {
    const response = await api.post('/simulate/impact', params);
    return response.data;
  } catch (error) {
    console.error('Error calculating impact tunneling:', error);
    throw error;
  }
};

export const getHeatmap = async (params) => {
  try {
    const response = await api.post('/simulate/heatmap', params);
    return response.data;
  } catch (error) {
    console.error('Error generating heatmap:', error);
    throw error;
  }
};

export const getClusterVisualization = async (params) => {
  try {
    const response = await api.post('/simulate/cluster', params);
    return response.data;
  } catch (error) {
    console.error('Error generating cluster visualization:', error);
    throw error;
  }
};

export const fitExperimental = async (data) => {
  try {
    const response = await api.post('/fit/experimental', data);
    return response.data;
  } catch (error) {
    console.error('Error fitting experimental data:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking API health:', error);
    throw error;
  }
};

export default {
  getThermalTunneling,
  getImpactTunneling,
  getHeatmap,
  getClusterVisualization,
  fitExperimental,
  checkHealth,
}; 