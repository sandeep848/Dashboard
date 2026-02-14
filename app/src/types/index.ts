export interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: any[];
  is_numeric: boolean;
  is_datetime: boolean;
  is_categorical: boolean;
}

export interface DataSchema {
  columns: ColumnInfo[];
  row_count: number;
  column_count: number;
  memory_usage_mb: number;
}

export interface DataUploadResponse {
  session_id: string;
  file_name: string;
  file_type: string;
  schema: DataSchema;
  preview: Record<string, any>[];
  llm_insights: string;
}

export interface LLMInsights {
  summary: string;
  key_observations: string[];
  potential_use_cases: string[];
  data_quality_issues: string[];
  recommended_columns: string[];
}

export interface ProcessingRecommendation {
  column_name: string;
  action: string;
  reason: string;
  parameters?: Record<string, any>;
}

export interface FeatureEngineering {
  new_column_name: string;
  operation: string;
  source_columns: string[];
  description: string;
}

export interface ProcessingRecommendations {
  columns_to_drop: string[];
  columns_to_keep: string[];
  cleaning_steps: ProcessingRecommendation[];
  feature_engineering: FeatureEngineering[];
  filtering_criteria: string[];
  explanation: string;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'scatter' 
  | 'pie' 
  | 'area' 
  | 'box' 
  | 'heatmap'
  | 'horizontal_bar'
  | 'stacked_bar'
  | 'grouped_bar'
  | 'donut'
  | 'bubble'
  | 'violin';

export interface ChartRecommendation {
  chart_type: ChartType;
  title: string;
  description: string;
  x_axis: string;
  y_axis: string[];
  compatible_types: ChartType[];
  incompatible_types: string[];
  reasoning: string;
}

export interface VisualizationRecommendations {
  charts: ChartRecommendation[];
  summary: string;
}

export interface ChartData {
  chart_id: string;
  chart_type: ChartType;
  title: string;
  description: string;
  data: Record<string, any>[];
  x_axis: string;
  y_axis: string[];
  compatible_types: ChartType[];
  configuration: Record<string, any>;
}

export interface ProcessedDataResponse {
  session_id: string;
  row_count: number;
  column_count: number;
  columns: string[];
  preview: Record<string, any>[];
  processing_log: string[];
}

export interface DashboardState {
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
  isLoading: boolean;
  error: string | null;
  currentStep: 'upload' | 'analysis' | 'processing' | 'visualization' | 'dashboard';
}

export interface ChartTypeInfo {
  type: ChartType;
  name: string;
  description: string;
  icon: string;
}
