import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DataSchema,
  LLMInsights,
  ProcessingRecommendations,
  VisualizationRecommendations,
  ChartData,
  ProcessedDataResponse,
} from '@/types';

interface DashboardState {
  // Session data
  sessionId: string | null;
  fileName: string | null;
  schema: DataSchema | null;
  preview: Record<string, any>[];
  llmInsights: LLMInsights | null;
  useCase: string;
  processingRecommendations: ProcessingRecommendations | null;
  visualizationRecommendations: VisualizationRecommendations | null;
  processedData: ProcessedDataResponse | null;
  charts: ChartData[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  currentStep: 'upload' | 'analysis' | 'processing' | 'visualization' | 'dashboard';
  
  // Actions
  setSessionId: (id: string | null) => void;
  setFileName: (name: string | null) => void;
  setSchema: (schema: DataSchema | null) => void;
  setPreview: (preview: Record<string, any>[]) => void;
  setLLMInsights: (insights: LLMInsights | null) => void;
  setUseCase: (useCase: string) => void;
  setProcessingRecommendations: (recs: ProcessingRecommendations | null) => void;
  setVisualizationRecommendations: (recs: VisualizationRecommendations | null) => void;
  setProcessedData: (data: ProcessedDataResponse | null) => void;
  setCharts: (charts: ChartData[]) => void;
  addChart: (chart: ChartData) => void;
  removeChart: (chartId: string) => void;
  updateChart: (chartId: string, updates: Partial<ChartData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentStep: (step: 'upload' | 'analysis' | 'processing' | 'visualization' | 'dashboard') => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  fileName: null,
  schema: null,
  preview: [],
  llmInsights: null,
  useCase: '',
  processingRecommendations: null,
  visualizationRecommendations: null,
  processedData: null,
  charts: [],
  isLoading: false,
  error: null,
  currentStep: 'upload' as const,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setSessionId: (id) => set({ sessionId: id }),
      setFileName: (name) => set({ fileName: name }),
      setSchema: (schema) => set({ schema }),
      setPreview: (preview) => set({ preview }),
      setLLMInsights: (insights) => set({ llmInsights: insights }),
      setUseCase: (useCase) => set({ useCase }),
      setProcessingRecommendations: (recs) => set({ processingRecommendations: recs }),
      setVisualizationRecommendations: (recs) => set({ visualizationRecommendations: recs }),
      setProcessedData: (data) => set({ processedData: data }),
      setCharts: (charts) => set({ charts }),
      addChart: (chart) => set((state) => ({ charts: [...state.charts, chart] })),
      removeChart: (chartId) => set((state) => ({ 
        charts: state.charts.filter((c) => c.chart_id !== chartId) 
      })),
      updateChart: (chartId, updates) => set((state) => ({
        charts: state.charts.map((c) => 
          c.chart_id === chartId ? { ...c, ...updates } : c
        ),
      })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setCurrentStep: (step) => set({ currentStep: step }),
      reset: () => set(initialState),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        fileName: state.fileName,
        useCase: state.useCase,
        currentStep: state.currentStep,
      }),
    }
  )
);

export default useDashboardStore;
