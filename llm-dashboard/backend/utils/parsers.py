import pandas as pd
import io
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

def parse_csv(content: bytes, **kwargs) -> pd.DataFrame:
    """Parse CSV content into DataFrame"""
    try:
        return pd.read_csv(io.BytesIO(content), **kwargs)
    except Exception as e:
        logger.error(f"Error parsing CSV: {str(e)}")
        raise

def parse_excel(content: bytes, **kwargs) -> pd.DataFrame:
    """Parse Excel content into DataFrame"""
    try:
        return pd.read_excel(io.BytesIO(content), **kwargs)
    except Exception as e:
        logger.error(f"Error parsing Excel: {str(e)}")
        raise

def parse_json(content: bytes, **kwargs) -> pd.DataFrame:
    """Parse JSON content into DataFrame"""
    try:
        return pd.read_json(io.BytesIO(content), **kwargs)
    except Exception as e:
        logger.error(f"Error parsing JSON: {str(e)}")
        raise

def infer_file_type(filename: str) -> Optional[str]:
    """Infer file type from filename"""
    extension = filename.split('.')[-1].lower()
    
    if extension == 'csv':
        return 'csv'
    elif extension in ['xlsx', 'xls']:
        return 'excel'
    elif extension == 'json':
        return 'json'
    
    return None

def get_file_parser(file_type: str):
    """Get appropriate parser for file type"""
    parsers = {
        'csv': parse_csv,
        'excel': parse_excel,
        'json': parse_json
    }
    return parsers.get(file_type)

def safe_convert_to_numeric(series: pd.Series, errors: str = 'coerce') -> pd.Series:
    """Safely convert series to numeric"""
    return pd.to_numeric(series, errors=errors)

def safe_convert_to_datetime(series: pd.Series, format: Optional[str] = None) -> pd.Series:
    """Safely convert series to datetime"""
    try:
        if format:
            return pd.to_datetime(series, format=format, errors='coerce')
        return pd.to_datetime(series, errors='coerce')
    except Exception as e:
        logger.error(f"Error converting to datetime: {str(e)}")
        return series

def detect_datetime_columns(df: pd.DataFrame, sample_size: int = 100) -> list:
    """Detect columns that might be datetime"""
    datetime_cols = []
    
    for col in df.columns:
        if df[col].dtype == 'object':
            # Sample non-null values
            sample = df[col].dropna().head(sample_size)
            
            # Try to parse as datetime
            try:
                parsed = pd.to_datetime(sample, errors='coerce')
                # If most values parse successfully, consider it datetime
                if parsed.notna().sum() / len(sample) > 0.8:
                    datetime_cols.append(col)
            except:
                pass
    
    return datetime_cols
