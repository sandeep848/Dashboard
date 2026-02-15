from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import pandas as pd
import io
from typing import Optional
import logging

from models.schemas import DataUploadResponse, DataSchema, ColumnInfo
from services.data_processor import data_processor
from services.llm_service import llm_service
from services.storage_service import storage_service
from config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("/", response_model=DataUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a data file (CSV, Excel, or JSON)"""
    try:
        # Validate file type
        filename = file.filename
        file_extension = filename.split('.')[-1].lower()
        
        if file_extension not in settings.allowed_file_types_list:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {settings.allowed_file_types_list}"
            )
        
        # Read file content
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB"
            )
        
        # Parse file into DataFrame
        try:
            if file_extension == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(content))
            elif file_extension == 'json':
                df = pd.read_json(io.BytesIO(content))
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        except Exception as e:
            logger.error(f"Error parsing file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
        
        # Analyze schema
        schema_info = data_processor.analyze_schema(df)
        
        # Save file to storage
        session_id = storage_service.save_uploaded_file(content, filename, file_extension)
        
        # Save schema info
        storage_service.save_schema_info(session_id, schema_info)
        
        # Get LLM insights
        df_info = {
            'columns': schema_info['columns'],
            'row_count': schema_info['row_count'],
            'column_count': schema_info['column_count'],
            'sample_data': data_processor.get_preview(df, 5)
        }
        
        try:
            llm_insights = await llm_service.analyze_data_structure(df_info)
            llm_insights_text = json.dumps(llm_insights)
        except Exception as e:
            logger.error(f"LLM analysis failed: {str(e)}")
            llm_insights_text = json.dumps({
                "summary": f"Dataset with {schema_info['row_count']} rows and {schema_info['column_count']} columns",
                "key_observations": ["Data successfully loaded"],
                "potential_use_cases": ["Explore the data to discover insights"]
            })
        
        # Get preview
        preview = data_processor.get_preview(df, 10)
        
        # Build response
        response = DataUploadResponse(
            session_id=session_id,
            file_name=filename,
            file_type=file_extension,
            data_schema=DataSchema(**schema_info),
            preview=preview,
            llm_insights=llm_insights_text
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/session/{session_id}")
async def get_session_data(session_id: str):
    """Get session data and preview"""
    session = storage_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    df = storage_service.load_dataframe(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Data not found")
    
    schema_info = data_processor.analyze_schema(df)
    preview = data_processor.get_preview(df, 10)
    
    return {
        "session_id": session_id,
        "file_name": session['file_name'],
        "schema": schema_info,
        "preview": preview,
        "use_case": session.get('use_case')
    }

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its data"""
    success = storage_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session deleted successfully"}

import json
