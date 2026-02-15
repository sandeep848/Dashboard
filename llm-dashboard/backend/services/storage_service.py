import pandas as pd
import json
import uuid
import os
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for MVP
# In production, use PostgreSQL with SQLAlchemy
_data_store: Dict[str, Dict[str, Any]] = {}
_chart_store: Dict[str, Dict[str, Any]] = {}

class StorageService:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        os.makedirs(f"{data_dir}/uploads", exist_ok=True)
        os.makedirs(f"{data_dir}/processed", exist_ok=True)
    
    def save_uploaded_file(self, file_content: bytes, filename: str, file_type: str) -> str:
        """Save uploaded file and return session ID"""
        session_id = str(uuid.uuid4())
        file_path = f"{self.data_dir}/uploads/{session_id}_{filename}"
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Store metadata
        _data_store[session_id] = {
            'id': session_id,
            'file_name': filename,
            'file_type': file_type,
            'original_data_path': file_path,
            'processed_data_path': None,
            'created_at': datetime.utcnow().isoformat(),
            'use_case': None,
            'schema_info': None,
            'processing_recommendations': None,
            'visualization_recommendations': None
        }
        
        logger.info(f"Saved uploaded file: {file_path}, session_id: {session_id}")
        return session_id
    
    def load_dataframe(self, session_id: str, processed: bool = False) -> Optional[pd.DataFrame]:
        """Load DataFrame from storage"""
        metadata = _data_store.get(session_id)
        if not metadata:
            return None

        if processed and metadata.get('processed_data_path'):
            file_path = metadata['processed_data_path']
        else:
            file_path = metadata['original_data_path']

        if not file_path or not os.path.exists(file_path):
            return None

        try:
            # Processed files are loaded by extension (may differ from original upload type)
            if file_path.endswith('.csv'):
                return pd.read_csv(file_path)
            if file_path.endswith('.json'):
                return pd.read_json(file_path)
            if file_path.endswith('.parquet'):
                return pd.read_parquet(file_path)
            if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
                return pd.read_excel(file_path)

            file_type = metadata['file_type']
            if file_type == 'csv':
                return pd.read_csv(file_path)
            if file_type in ['xlsx', 'xls']:
                return pd.read_excel(file_path)
            if file_type == 'json':
                return pd.read_json(file_path)

            logger.warning(f"Unknown file type for session {session_id}, trying CSV fallback")
            return pd.read_csv(file_path)
        except Exception as e:
            logger.error(f"Error loading DataFrame: {str(e)}")
            return None
    
    def save_processed_dataframe(self, session_id: str, df: pd.DataFrame) -> str:
        """Save processed DataFrame"""
        parquet_path = f"{self.data_dir}/processed/{session_id}_processed.parquet"
        csv_path = f"{self.data_dir}/processed/{session_id}_processed.csv"

        # Prefer parquet when engine exists; otherwise fallback to CSV
        try:
            df.to_parquet(parquet_path, index=False)
            file_path = parquet_path
        except Exception as e:
            logger.warning(f"Parquet unavailable, falling back to CSV: {str(e)}")
            df.to_csv(csv_path, index=False)
            file_path = csv_path

        if session_id in _data_store:
            _data_store[session_id]['processed_data_path'] = file_path
            _data_store[session_id]['row_count'] = len(df)
            _data_store[session_id]['column_count'] = len(df.columns)

        logger.info(f"Saved processed DataFrame: {file_path}")
        return file_path
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session metadata"""
        return _data_store.get(session_id)
    
    def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Update session metadata"""
        if session_id not in _data_store:
            return False
        
        _data_store[session_id].update(updates)
        return True
    
    def save_use_case(self, session_id: str, use_case: str) -> bool:
        """Save user's use case"""
        return self.update_session(session_id, {'use_case': use_case})
    
    def save_schema_info(self, session_id: str, schema_info: Dict[str, Any]) -> bool:
        """Save schema analysis"""
        return self.update_session(session_id, {'schema_info': json.dumps(schema_info)})
    
    def save_processing_recommendations(self, session_id: str, recommendations: Dict[str, Any]) -> bool:
        """Save processing recommendations"""
        return self.update_session(session_id, {'processing_recommendations': json.dumps(recommendations)})
    
    def save_visualization_recommendations(self, session_id: str, recommendations: Dict[str, Any]) -> bool:
        """Save visualization recommendations"""
        return self.update_session(session_id, {'visualization_recommendations': json.dumps(recommendations)})
    
    def save_chart_configuration(self, session_id: str, chart_config: Dict[str, Any]) -> str:
        """Save chart configuration"""
        chart_id = str(uuid.uuid4())
        chart_config['id'] = chart_id
        chart_config['session_id'] = session_id
        chart_config['created_at'] = datetime.utcnow().isoformat()
        
        _chart_store[chart_id] = chart_config
        logger.info(f"Saved chart configuration: {chart_id}")
        return chart_id
    
    def get_chart_configuration(self, chart_id: str) -> Optional[Dict[str, Any]]:
        """Get chart configuration"""
        return _chart_store.get(chart_id)
    
    def get_session_charts(self, session_id: str) -> list:
        """Get all charts for a session"""
        return [chart for chart in _chart_store.values() if chart.get('session_id') == session_id]
    
    def delete_chart(self, chart_id: str) -> bool:
        """Delete chart configuration"""
        if chart_id in _chart_store:
            del _chart_store[chart_id]
            return True
        return False
    
    def list_sessions(self) -> list:
        """List all sessions"""
        return list(_data_store.values())
    
    def delete_session(self, session_id: str) -> bool:
        """Delete session and associated data"""
        if session_id not in _data_store:
            return False
        
        metadata = _data_store[session_id]
        
        # Delete files
        for key in ['original_data_path', 'processed_data_path']:
            path = metadata.get(key)
            if path and os.path.exists(path):
                os.remove(path)
        
        # Delete associated charts
        charts_to_delete = [cid for cid, c in _chart_store.items() if c.get('session_id') == session_id]
        for cid in charts_to_delete:
            del _chart_store[cid]
        
        # Delete session
        del _data_store[session_id]
        
        return True

storage_service = StorageService()
