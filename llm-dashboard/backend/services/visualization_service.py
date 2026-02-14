import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from models.schemas import ChartType
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisualizationService:
    def __init__(self):
        # Define compatibility matrix
        self.compatibility_matrix = {
            ChartType.LINE: [ChartType.AREA, ChartType.SCATTER, ChartType.BAR],
            ChartType.AREA: [ChartType.LINE, ChartType.SCATTER],
            ChartType.BAR: [ChartType.HORIZONTAL_BAR, ChartType.STACKED_BAR, ChartType.GROUPED_BAR, ChartType.LINE],
            ChartType.HORIZONTAL_BAR: [ChartType.BAR, ChartType.STACKED_BAR],
            ChartType.STACKED_BAR: [ChartType.BAR, ChartType.GROUPED_BAR, ChartType.HORIZONTAL_BAR],
            ChartType.GROUPED_BAR: [ChartType.BAR, ChartType.STACKED_BAR],
            ChartType.SCATTER: [ChartType.LINE, ChartType.BUBBLE, ChartType.AREA],
            ChartType.BUBBLE: [ChartType.SCATTER],
            ChartType.PIE: [ChartType.DONUT, ChartType.BAR],
            ChartType.DONUT: [ChartType.PIE, ChartType.BAR],
            ChartType.BOX: [ChartType.VIOLIN],
            ChartType.VIOLIN: [ChartType.BOX],
            ChartType.HEATMAP: []
        }
        
        # Define chart requirements
        self.chart_requirements = {
            ChartType.LINE: {
                "min_dimensions": 2,
                "max_dimensions": 3,
                "x_type": ["temporal", "sequential", "numeric"],
                "y_type": ["numeric"],
                "requires_ordered_x": True
            },
            ChartType.AREA: {
                "min_dimensions": 2,
                "max_dimensions": 3,
                "x_type": ["temporal", "sequential", "numeric"],
                "y_type": ["numeric"],
                "requires_ordered_x": True
            },
            ChartType.BAR: {
                "min_dimensions": 2,
                "max_dimensions": 3,
                "x_type": ["categorical", "string"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.HORIZONTAL_BAR: {
                "min_dimensions": 2,
                "max_dimensions": 3,
                "x_type": ["numeric"],
                "y_type": ["categorical", "string"],
                "requires_ordered_x": False
            },
            ChartType.STACKED_BAR: {
                "min_dimensions": 3,
                "max_dimensions": 3,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.GROUPED_BAR: {
                "min_dimensions": 3,
                "max_dimensions": 3,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.SCATTER: {
                "min_dimensions": 2,
                "max_dimensions": 4,
                "x_type": ["numeric"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.BUBBLE: {
                "min_dimensions": 3,
                "max_dimensions": 4,
                "x_type": ["numeric"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.PIE: {
                "min_dimensions": 2,
                "max_dimensions": 2,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.DONUT: {
                "min_dimensions": 2,
                "max_dimensions": 2,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.BOX: {
                "min_dimensions": 2,
                "max_dimensions": 2,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.VIOLIN: {
                "min_dimensions": 2,
                "max_dimensions": 2,
                "x_type": ["categorical"],
                "y_type": ["numeric"],
                "requires_ordered_x": False
            },
            ChartType.HEATMAP: {
                "min_dimensions": 3,
                "max_dimensions": 3,
                "x_type": ["categorical"],
                "y_type": ["categorical"],
                "value_type": ["numeric"],
                "requires_ordered_x": False
            }
        }
    
    def validate_chart_compatibility(self, chart_type: ChartType, data_info: Dict[str, Any]) -> Dict[str, Any]:
        """Validate if a chart type is compatible with the data"""
        requirements = self.chart_requirements.get(chart_type, {})
        
        if not requirements:
            return {
                "is_compatible": True,
                "reason": "No specific requirements for this chart type",
                "suggested_alternatives": []
            }
        
        x_column = data_info.get('x_axis')
        y_columns = data_info.get('y_axis', [])
        columns_info = data_info.get('columns', [])
        
        # Find column info
        x_col_info = next((c for c in columns_info if c['name'] == x_column), None)
        y_col_infos = [c for c in columns_info if c['name'] in y_columns]
        
        issues = []
        
        # Check dimension count
        num_dimensions = 1 + len(y_columns)
        min_dims = requirements.get('min_dimensions', 2)
        max_dims = requirements.get('max_dimensions', 2)
        
        if num_dimensions < min_dims:
            issues.append(f"Chart requires at least {min_dims} dimensions, but only {num_dimensions} provided")
        if num_dimensions > max_dims:
            issues.append(f"Chart supports at most {max_dims} dimensions, but {num_dimensions} provided")
        
        # Check x-axis type
        x_type_req = requirements.get('x_type', [])
        if x_col_info and x_type_req:
            x_is_valid = False
            if 'numeric' in x_type_req and x_col_info.get('is_numeric'):
                x_is_valid = True
            if 'categorical' in x_type_req and x_col_info.get('is_categorical'):
                x_is_valid = True
            if 'temporal' in x_type_req and x_col_info.get('is_datetime'):
                x_is_valid = True
            if 'string' in x_type_req and not x_col_info.get('is_numeric'):
                x_is_valid = True
            
            if not x_is_valid:
                issues.append(f"X-axis '{x_column}' type doesn't match requirements: {x_type_req}")
        
        # Check y-axis type
        y_type_req = requirements.get('y_type', [])
        if y_col_infos and y_type_req:
            for y_col in y_col_infos:
                y_is_valid = False
                if 'numeric' in y_type_req and y_col.get('is_numeric'):
                    y_is_valid = True
                if 'categorical' in y_type_req and y_col.get('is_categorical'):
                    y_is_valid = True
                
                if not y_is_valid:
                    issues.append(f"Y-axis '{y_col['name']}' type doesn't match requirements: {y_type_req}")
        
        # Get compatible alternatives
        alternatives = self.compatibility_matrix.get(chart_type, [])
        
        if issues:
            return {
                "is_compatible": False,
                "reason": "; ".join(issues),
                "suggested_alternatives": alternatives[:3]
            }
        
        return {
            "is_compatible": True,
            "reason": f"Chart type '{chart_type}' is compatible with the selected data",
            "suggested_alternatives": alternatives[:3]
        }
    
    def get_compatible_chart_types(self, current_type: ChartType) -> List[ChartType]:
        """Get list of compatible chart types for conversion"""
        return self.compatibility_matrix.get(current_type, [])
    
    def prepare_chart_data(self, df: pd.DataFrame, chart_type: ChartType, x_axis: str, y_axis: List[str], 
                          filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Prepare data for chart rendering"""
        df = df.copy()
        
        # Apply filters if provided
        if filters:
            for col, value in filters.items():
                if col in df.columns:
                    if isinstance(value, list):
                        df = df[df[col].isin(value)]
                    else:
                        df = df[df[col] == value]
        
        # Prepare data based on chart type
        if chart_type in [ChartType.PIE, ChartType.DONUT]:
            # Aggregate data for pie charts
            if y_axis:
                grouped = df.groupby(x_axis)[y_axis[0]].sum().reset_index()
                return grouped.to_dict('records')
        
        elif chart_type in [ChartType.BAR, ChartType.LINE, ChartType.AREA, ChartType.SCATTER]:
            # Select relevant columns
            cols = [x_axis] + y_axis
            cols = [c for c in cols if c in df.columns]
            
            # For line/area charts, sort by x-axis if it's temporal
            if chart_type in [ChartType.LINE, ChartType.AREA]:
                if pd.api.types.is_datetime64_any_dtype(df[x_axis]):
                    df = df.sort_values(by=x_axis)
            
            return df[cols].to_dict('records')
        
        elif chart_type == ChartType.HEATMAP:
            # Pivot data for heatmap
            if len(y_axis) >= 2:
                pivoted = df.pivot_table(values=y_axis[1], index=y_axis[0], columns=x_axis, aggfunc='mean')
                # Convert to list of dicts
                result = []
                for idx, row in pivoted.iterrows():
                    row_dict = {x_axis: idx}
                    row_dict.update(row.to_dict())
                    result.append(row_dict)
                return result
        
        elif chart_type == ChartType.BOX:
            # Prepare data for box plot
            result = []
            for y_col in y_axis:
                if y_col in df.columns:
                    for category, group in df.groupby(x_axis):
                        values = group[y_col].dropna().tolist()
                        result.append({
                            'category': category,
                            'variable': y_col,
                            'values': values,
                            'q1': np.percentile(values, 25) if values else 0,
                            'median': np.median(values) if values else 0,
                            'q3': np.percentile(values, 75) if values else 0,
                            'min': min(values) if values else 0,
                            'max': max(values) if values else 0
                        })
            return result
        
        # Default: return all relevant columns
        cols = [x_axis] + y_axis
        cols = [c for c in cols if c in df.columns]
        return df[cols].to_dict('records')
    
    def suggest_optimal_chart(self, df: pd.DataFrame, x_col: str, y_cols: List[str]) -> ChartType:
        """Suggest the optimal chart type based on data characteristics"""
        x_is_datetime = pd.api.types.is_datetime64_any_dtype(df[x_col])
        x_is_numeric = pd.api.types.is_numeric_dtype(df[x_col])
        x_is_categorical = df[x_col].dtype == 'object' or df[x_col].nunique() < min(50, len(df) * 0.1)
        
        y_is_numeric = all(pd.api.types.is_numeric_dtype(df[y]) for y in y_cols if y in df.columns)
        
        if x_is_datetime and y_is_numeric and len(y_cols) == 1:
            return ChartType.LINE
        elif x_is_categorical and y_is_numeric:
            if len(y_cols) == 1:
                return ChartType.BAR
            else:
                return ChartType.GROUPED_BAR
        elif x_is_numeric and y_is_numeric and len(y_cols) >= 1:
            return ChartType.SCATTER
        elif x_is_categorical and len(y_cols) == 1 and y_is_numeric:
            if df[x_col].nunique() <= 8:
                return ChartType.PIE
        
        return ChartType.BAR

visualization_service = VisualizationService()
