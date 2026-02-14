from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
import logging

from models.schemas import (
    ChartType, CreateChartRequest, ChartDataResponse, 
    ChartValidationRequest, ChartValidationResponse
)
from services.visualization_service import visualization_service
from services.storage_service import storage_service
from services.data_processor import data_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/visualization", tags=["visualization"])

@router.post("/create")
async def create_chart(request: CreateChartRequest):
    """Create a new chart"""
    session = storage_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Load processed data if available, otherwise original
    df = storage_service.load_dataframe(request.session_id, processed=True)
    if df is None:
        df = storage_service.load_dataframe(request.session_id)
    
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    try:
        # Validate columns exist
        if request.x_axis not in df.columns:
            raise HTTPException(status_code=400, detail=f"X-axis column '{request.x_axis}' not found")
        
        for y_col in request.y_axis:
            if y_col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Y-axis column '{y_col}' not found")
        
        # Get schema info for compatibility
        schema_info = data_processor.analyze_schema(df)
        
        # Validate chart compatibility
        data_info = {
            'x_axis': request.x_axis,
            'y_axis': request.y_axis,
            'columns': schema_info['columns']
        }
        
        validation = visualization_service.validate_chart_compatibility(request.chart_type, data_info)
        
        if not validation['is_compatible']:
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "Chart type not compatible with selected data",
                    "reason": validation['reason'],
                    "suggested_alternatives": validation['suggested_alternatives']
                }
            )
        
        # Prepare chart data
        chart_data = visualization_service.prepare_chart_data(
            df, request.chart_type, request.x_axis, request.y_axis, request.filters
        )
        
        # Get compatible types
        compatible_types = visualization_service.get_compatible_chart_types(request.chart_type)
        
        # Save chart configuration
        chart_config = {
            'chart_type': request.chart_type,
            'title': request.title,
            'x_axis': request.x_axis,
            'y_axis': request.y_axis,
            'filters': request.filters,
            'data': chart_data
        }
        
        chart_id = storage_service.save_chart_configuration(request.session_id, chart_config)
        
        return ChartDataResponse(
            chart_id=chart_id,
            chart_type=request.chart_type,
            title=request.title,
            description=f"{request.title} - {request.chart_type.value} chart",
            data=chart_data,
            x_axis=request.x_axis,
            y_axis=request.y_axis,
            compatible_types=compatible_types,
            configuration={
                'filters': request.filters,
                'created_at': chart_config.get('created_at')
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chart creation failed: {str(e)}")

@router.post("/convert/{chart_id}")
async def convert_chart(chart_id: str, target_type: ChartType):
    """Convert chart to a different type"""
    chart_config = storage_service.get_chart_configuration(chart_id)
    if not chart_config:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    session_id = chart_config.get('session_id')
    current_type = chart_config.get('chart_type')
    
    # Load data
    df = storage_service.load_dataframe(session_id, processed=True)
    if df is None:
        df = storage_service.load_dataframe(session_id)
    
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    try:
        # Get schema info
        schema_info = data_processor.analyze_schema(df)
        
        # Validate conversion
        data_info = {
            'x_axis': chart_config.get('x_axis'),
            'y_axis': chart_config.get('y_axis'),
            'columns': schema_info['columns']
        }
        
        validation = visualization_service.validate_chart_compatibility(target_type, data_info)
        
        if not validation['is_compatible']:
            return {
                "success": False,
                "reason": validation['reason'],
                "suggested_alternatives": validation['suggested_alternatives']
            }
        
        # Prepare new chart data
        chart_data = visualization_service.prepare_chart_data(
            df, target_type, chart_config.get('x_axis'), chart_config.get('y_axis'), 
            chart_config.get('filters')
        )
        
        # Get compatible types for new chart
        compatible_types = visualization_service.get_compatible_chart_types(target_type)
        
        # Update chart configuration
        updated_config = {
            'chart_type': target_type,
            'title': chart_config.get('title'),
            'x_axis': chart_config.get('x_axis'),
            'y_axis': chart_config.get('y_axis'),
            'filters': chart_config.get('filters'),
            'data': chart_data
        }
        
        new_chart_id = storage_service.save_chart_configuration(session_id, updated_config)
        
        return {
            "success": True,
            "chart": ChartDataResponse(
                chart_id=new_chart_id,
                chart_type=target_type,
                title=chart_config.get('title'),
                description=f"{chart_config.get('title')} - {target_type.value} chart",
                data=chart_data,
                x_axis=chart_config.get('x_axis'),
                y_axis=chart_config.get('y_axis'),
                compatible_types=compatible_types,
                configuration={'filters': chart_config.get('filters')}
            )
        }
        
    except Exception as e:
        logger.error(f"Error converting chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chart conversion failed: {str(e)}")

@router.post("/validate")
async def validate_chart_conversion(request: ChartValidationRequest):
    """Validate if chart conversion is possible"""
    validation = visualization_service.validate_chart_compatibility(
        request.target_type, request.data_info
    )
    
    return ChartValidationResponse(**validation)

@router.get("/charts/{session_id}")
async def get_session_charts(session_id: str):
    """Get all charts for a session"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    charts = storage_service.get_session_charts(session_id)
    return {"session_id": session_id, "charts": charts}

@router.get("/chart/{chart_id}")
async def get_chart(chart_id: str):
    """Get a specific chart"""
    chart = storage_service.get_chart_configuration(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    return chart

@router.delete("/chart/{chart_id}")
async def delete_chart(chart_id: str):
    """Delete a chart"""
    success = storage_service.delete_chart(chart_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    return {"message": "Chart deleted successfully"}

@router.get("/chart-types")
async def get_chart_types():
    """Get available chart types and their descriptions"""
    return {
        "chart_types": [
            {"type": "line", "name": "Line Chart", "description": "Best for time series and trends", "icon": "TrendingUp"},
            {"type": "bar", "name": "Bar Chart", "description": "Compare values across categories", "icon": "BarChart"},
            {"type": "horizontal_bar", "name": "Horizontal Bar", "description": "Bar chart with horizontal orientation", "icon": "BarChartHorizontal"},
            {"type": "stacked_bar", "name": "Stacked Bar", "description": "Compare parts of a whole", "icon": "Layers"},
            {"type": "grouped_bar", "name": "Grouped Bar", "description": "Compare multiple series", "icon": "BarChart2"},
            {"type": "area", "name": "Area Chart", "description": "Show cumulative totals over time", "icon": "AreaChart"},
            {"type": "scatter", "name": "Scatter Plot", "description": "Show relationships between variables", "icon": "Dot"},
            {"type": "bubble", "name": "Bubble Chart", "description": "Scatter plot with size dimension", "icon": "Circle"},
            {"type": "pie", "name": "Pie Chart", "description": "Show proportions of a whole", "icon": "PieChart"},
            {"type": "donut", "name": "Donut Chart", "description": "Pie chart with hollow center", "icon": "Donut"},
            {"type": "box", "name": "Box Plot", "description": "Show distribution and outliers", "icon": "Box"},
            {"type": "violin", "name": "Violin Plot", "description": "Show distribution density", "icon": "Activity"},
            {"type": "heatmap", "name": "Heatmap", "description": "Show patterns in matrix data", "icon": "Grid"}
        ]
    }
