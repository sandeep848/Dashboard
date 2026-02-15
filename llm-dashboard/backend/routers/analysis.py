from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from models.schemas import UseCaseRequest, ProcessingRecommendations, VisualizationRecommendations
from services.llm_service import llm_service
from services.data_processor import data_processor
from services.storage_service import storage_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/use-case")
async def submit_use_case(request: UseCaseRequest):
    """Submit user's analysis use case"""
    session = storage_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first to create a session.")
    
    # Save use case
    storage_service.save_use_case(request.session_id, request.use_case)
    
    # Load data for analysis
    df = storage_service.load_dataframe(request.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    # Get schema info
    schema_info = data_processor.analyze_schema(df)
    
    # Get LLM processing recommendations
    try:
        data_summary = {
            'columns': schema_info['columns'],
            'row_count': schema_info['row_count'],
            'column_count': schema_info['column_count'],
            'preview': data_processor.get_preview(df, 5)
        }
        
        recommendations = await llm_service.recommend_processing(request.use_case, data_summary)
        
        # Save recommendations
        storage_service.save_processing_recommendations(request.session_id, recommendations)
        
        return {
            "session_id": request.session_id,
            "use_case": request.use_case,
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/recommendations/{session_id}")
async def get_recommendations(session_id: str):
    """Get processing recommendations for a session"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first to create a session.")
    
    recommendations = session.get('processing_recommendations')
    if not recommendations:
        raise HTTPException(status_code=404, detail="No recommendations found")
    
    import json
    return json.loads(recommendations)

@router.post("/visualizations/{session_id}")
async def suggest_visualizations(session_id: str):
    """Get visualization suggestions for processed data"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first to create a session.")
    
    # Try to load processed data first, then original
    df = storage_service.load_dataframe(session_id, processed=True)
    if df is None:
        df = storage_service.load_dataframe(session_id)
    
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    use_case = session.get('use_case', '')
    
    try:
        # Prepare data summary
        schema_info = data_processor.analyze_schema(df)
        processed_data = {
            'columns': schema_info['columns'],
            'row_count': schema_info['row_count'],
            'preview': data_processor.get_preview(df, 5)
        }
        
        # Get LLM visualization suggestions
        suggestions = await llm_service.suggest_visualizations(processed_data, use_case)
        
        # Save recommendations
        storage_service.save_visualization_recommendations(session_id, suggestions)
        
        return suggestions
        
    except Exception as e:
        logger.error(f"Error generating visualizations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Visualization suggestions failed: {str(e)}")

@router.get("/insights/{session_id}")
async def get_data_insights(session_id: str):
    """Get statistical insights about the data"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first to create a session.")
    
    df = storage_service.load_dataframe(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    try:
        stats = data_processor.get_statistics(df)
        schema_info = data_processor.analyze_schema(df)
        
        return {
            "session_id": session_id,
            "statistics": stats,
            "schema": schema_info
        }
        
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

import json
