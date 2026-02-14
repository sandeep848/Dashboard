import axios from 'axios';
import type { 
  DataUploadResponse, 
  ProcessingRecommendations, 
  VisualizationRecommendations,
  ChartData,
  ProcessedDataResponse,
  ChartType
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Upload API
export const uploadApi = {
  uploadFile: async (file: File): Promise<DataUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getSessionData: async (sessionId: string) => {
    const response = await apiClient.get(`/api/upload/session/${sessionId}`);
    return response.data;
  },
  
  deleteSession: async (sessionId: string) => {
    const response = await apiClient.delete(`/api/upload/session/${sessionId}`);
    return response.data;
  },
};

// Analysis API
export const analysisApi = {
  submitUseCase: async (sessionId: string, useCase: string) => {
    const response = await apiClient.post('/api/analysis/use-case', {
      session_id: sessionId,
      use_case: useCase,
    });
    return response.data;
  },
  
  getRecommendations: async (sessionId: string): Promise<ProcessingRecommendations> => {
    const response = await apiClient.get(`/api/analysis/recommendations/${sessionId}`);
    return response.data;
  },
  
  getVisualizationSuggestions: async (sessionId: string): Promise<VisualizationRecommendations> => {
    const response = await apiClient.post(`/api/analysis/visualizations/${sessionId}`);
    return response.data;
  },
  
  getInsights: async (sessionId: string) => {
    const response = await apiClient.get(`/api/analysis/insights/${sessionId}`);
    return response.data;
  },
};

// Processing API
export const processingApi = {
  applyProcessing: async (sessionId: string, recommendations: ProcessingRecommendations): Promise<ProcessedDataResponse> => {
    const response = await apiClient.post('/api/processing/apply', {
      session_id: sessionId,
      approved_recommendations: recommendations,
    });
    return response.data;
  },
  
  applyCustomProcessing: async (sessionId: string, operations: any[]) => {
    const response = await apiClient.post('/api/processing/custom', {
      session_id: sessionId,
      operations,
    });
    return response.data;
  },
  
  getProcessingLog: async (sessionId: string) => {
    const response = await apiClient.get(`/api/processing/log/${sessionId}`);
    return response.data;
  },
  
  resetProcessing: async (sessionId: string) => {
    const response = await apiClient.post(`/api/processing/reset/${sessionId}`);
    return response.data;
  },
};

// Visualization API
export const visualizationApi = {
  createChart: async (
    sessionId: string, 
    chartType: ChartType, 
    title: string, 
    xAxis: string, 
    yAxis: string[],
    filters?: Record<string, any>
  ): Promise<ChartData> => {
    const response = await apiClient.post('/api/visualization/create', {
      session_id: sessionId,
      chart_type: chartType,
      title,
      x_axis: xAxis,
      y_axis: yAxis,
      filters,
    });
    return response.data;
  },
  
  convertChart: async (chartId: string, targetType: ChartType) => {
    const response = await apiClient.post(`/api/visualization/convert/${chartId}?target_type=${targetType}`);
    return response.data;
  },
  
  validateConversion: async (currentType: ChartType, targetType: ChartType, dataInfo: any) => {
    const response = await apiClient.post('/api/visualization/validate', {
      current_type: currentType,
      target_type: targetType,
      data_info: dataInfo,
    });
    return response.data;
  },
  
  getSessionCharts: async (sessionId: string) => {
    const response = await apiClient.get(`/api/visualization/charts/${sessionId}`);
    return response.data;
  },
  
  getChart: async (chartId: string) => {
    const response = await apiClient.get(`/api/visualization/chart/${chartId}`);
    return response.data;
  },
  
  deleteChart: async (chartId: string) => {
    const response = await apiClient.delete(`/api/visualization/chart/${chartId}`);
    return response.data;
  },
  
  getChartTypes: async () => {
    const response = await apiClient.get('/api/visualization/chart-types');
    return response.data;
  },
};

export default apiClient;
