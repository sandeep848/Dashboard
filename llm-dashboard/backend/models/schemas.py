from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from enum import Enum

class DataType(str, Enum):
    CSV = "csv"
    EXCEL = "xlsx"
    JSON = "json"

class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    SCATTER = "scatter"
    PIE = "pie"
    AREA = "area"
    BOX = "box"
    HEATMAP = "heatmap"
    HORIZONTAL_BAR = "horizontal_bar"
    STACKED_BAR = "stacked_bar"
    GROUPED_BAR = "grouped_bar"
    DONUT = "donut"
    BUBBLE = "bubble"
    VIOLIN = "violin"

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: List[Any]
    is_numeric: bool
    is_datetime: bool
    is_categorical: bool

class DataSchema(BaseModel):
    columns: List[ColumnInfo]
    row_count: int
    column_count: int
    memory_usage_mb: float

class DataUploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_id: str
    file_name: str
    file_type: str
    data_schema: DataSchema = Field(alias="schema", serialization_alias="schema")
    preview: List[Dict[str, Any]]
    llm_insights: str

class UseCaseRequest(BaseModel):
    session_id: str
    use_case: str = Field(..., min_length=10, max_length=1000)

class ProcessingRecommendation(BaseModel):
    column_name: str
    action: str
    reason: str
    parameters: Optional[Dict[str, Any]] = None

class FeatureEngineering(BaseModel):
    new_column_name: str
    operation: str
    source_columns: List[str]
    description: str

class ProcessingRecommendations(BaseModel):
    columns_to_drop: List[str]
    columns_to_keep: List[str]
    cleaning_steps: List[ProcessingRecommendation]
    feature_engineering: List[FeatureEngineering]
    filtering_criteria: List[str]
    explanation: str

class ChartRecommendation(BaseModel):
    chart_type: ChartType
    title: str
    description: str
    x_axis: str
    y_axis: List[str]
    compatible_types: List[ChartType]
    incompatible_types: List[str]
    reasoning: str

class VisualizationRecommendations(BaseModel):
    charts: List[ChartRecommendation]
    summary: str

class ChartValidationRequest(BaseModel):
    current_type: ChartType
    target_type: ChartType
    data_info: Dict[str, Any]

class ChartValidationResponse(BaseModel):
    is_compatible: bool
    reason: str
    suggested_alternatives: List[ChartType]

class ProcessDataRequest(BaseModel):
    session_id: str
    approved_recommendations: ProcessingRecommendations

class ProcessedDataResponse(BaseModel):
    session_id: str
    row_count: int
    column_count: int
    columns: List[str]
    preview: List[Dict[str, Any]]
    processing_log: List[str]

class CreateChartRequest(BaseModel):
    session_id: str
    chart_type: ChartType
    title: str
    x_axis: str
    y_axis: List[str]
    filters: Optional[Dict[str, Any]] = None

class ChartDataResponse(BaseModel):
    chart_id: str
    chart_type: ChartType
    title: str
    description: str
    data: List[Dict[str, Any]]
    x_axis: str
    y_axis: List[str]
    compatible_types: List[ChartType]
    configuration: Dict[str, Any]

class DashboardConfig(BaseModel):
    session_id: str
    charts: List[ChartDataResponse]
    filters: Dict[str, Any]
    created_at: str

class ExportRequest(BaseModel):
    session_id: str
    format: str = Field(..., pattern="^(pdf|png|json)$")
    chart_ids: Optional[List[str]] = None
