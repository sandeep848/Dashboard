from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging

from models.schemas import ProcessDataRequest, ProcessedDataResponse
from services.data_processor import data_processor
from services.storage_service import storage_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/processing", tags=["processing"])

@router.post("/apply")
async def apply_processing(request: ProcessDataRequest):
    """Apply processing recommendations to the data"""
    session = storage_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Load original data
    df = storage_service.load_dataframe(request.session_id, processed=False)
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    try:
        # Apply processing
        processed_df = data_processor.process_data(df, request.approved_recommendations.dict())
        
        # Save processed data
        storage_service.save_processed_dataframe(request.session_id, processed_df)
        
        # Get preview and schema
        schema_info = data_processor.analyze_schema(processed_df)
        preview = data_processor.get_preview(processed_df, 10)
        
        return ProcessedDataResponse(
            session_id=request.session_id,
            row_count=len(processed_df),
            column_count=len(processed_df.columns),
            columns=list(processed_df.columns),
            preview=preview,
            processing_log=data_processor.processing_log
        )
        
    except Exception as e:
        logger.error(f"Error processing data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.post("/custom")
async def apply_custom_processing(session_id: str, operations: List[Dict[str, Any]]):
    """Apply custom processing operations"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    df = storage_service.load_dataframe(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    try:
        # Apply each operation
        for op in operations:
            operation_type = op.get('type')
            
            if operation_type == 'drop_column':
                col = op.get('column')
                if col in df.columns:
                    df = df.drop(columns=[col])
            
            elif operation_type == 'fill_nulls':
                col = op.get('column')
                method = op.get('method', 'mean')
                if col in df.columns:
                    if method == 'mean':
                        df[col].fillna(df[col].mean(), inplace=True)
                    elif method == 'median':
                        df[col].fillna(df[col].median(), inplace=True)
                    elif method == 'mode':
                        df[col].fillna(df[col].mode()[0], inplace=True)
                    else:
                        df[col].fillna(op.get('value', ''), inplace=True)
            
            elif operation_type == 'filter':
                col = op.get('column')
                condition = op.get('condition')
                value = op.get('value')
                
                if col in df.columns:
                    if condition == 'gt':
                        df = df[df[col] > value]
                    elif condition == 'lt':
                        df = df[df[col] < value]
                    elif condition == 'eq':
                        df = df[df[col] == value]
                    elif condition == 'ne':
                        df = df[df[col] != value]
                    elif condition == 'in':
                        df = df[df[col].isin(value)]
            
            elif operation_type == 'sort':
                col = op.get('column')
                ascending = op.get('ascending', True)
                if col in df.columns:
                    df = df.sort_values(by=col, ascending=ascending)
        
        # Save processed data
        storage_service.save_processed_dataframe(session_id, df)
        
        return {
            "session_id": session_id,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "preview": data_processor.get_preview(df, 10)
        }
        
    except Exception as e:
        logger.error(f"Error in custom processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Custom processing failed: {str(e)}")

@router.get("/log/{session_id}")
async def get_processing_log(session_id: str):
    """Get processing log for a session"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "processing_log": data_processor.processing_log
    }

@router.post("/reset/{session_id}")
async def reset_processing(session_id: str):
    """Reset to original data (remove processing)"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Clear processed data path
    storage_service.update_session(session_id, {'processed_data_path': None})
    
    # Load original data
    df = storage_service.load_dataframe(session_id, processed=False)
    if df is None:
        raise HTTPException(status_code=404, detail="Original data not found")
    
    schema_info = data_processor.analyze_schema(df)
    preview = data_processor.get_preview(df, 10)
    
    return {
        "session_id": session_id,
        "message": "Processing reset to original data",
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": list(df.columns),
        "preview": preview
    }
