from typing import Dict, Any, List, Optional
import pandas as pd
import logging

logger = logging.getLogger(__name__)

def validate_column_exists(df: pd.DataFrame, column: str) -> bool:
    """Check if column exists in DataFrame"""
    return column in df.columns

def validate_columns_exist(df: pd.DataFrame, columns: List[str]) -> Dict[str, bool]:
    """Check if multiple columns exist in DataFrame"""
    return {col: col in df.columns for col in columns}

def validate_data_types(df: pd.DataFrame, column: str, expected_type: str) -> bool:
    """Validate column data type"""
    if column not in df.columns:
        return False
    
    actual_type = str(df[column].dtype)
    
    type_mapping = {
        'numeric': ['int64', 'float64', 'int32', 'float32'],
        'string': ['object', 'string'],
        'datetime': ['datetime64[ns]', 'datetime64'],
        'boolean': ['bool', 'boolean']
    }
    
    allowed_types = type_mapping.get(expected_type, [expected_type])
    return any(t in actual_type for t in allowed_types)

def validate_not_null(df: pd.DataFrame, column: str, threshold: float = 0.0) -> bool:
    """Validate that column has acceptable null percentage"""
    if column not in df.columns:
        return False
    
    null_percentage = df[column].isnull().sum() / len(df)
    return null_percentage <= threshold

def validate_unique_values(df: pd.DataFrame, column: str, max_unique: Optional[int] = None, 
                          min_unique: Optional[int] = None) -> bool:
    """Validate number of unique values in column"""
    if column not in df.columns:
        return False
    
    unique_count = df[column].nunique()
    
    if max_unique is not None and unique_count > max_unique:
        return False
    
    if min_unique is not None and unique_count < min_unique:
        return False
    
    return True

def validate_value_range(df: pd.DataFrame, column: str, min_val: Optional[float] = None,
                        max_val: Optional[float] = None) -> bool:
    """Validate that column values are within range"""
    if column not in df.columns:
        return False
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        return False
    
    if min_val is not None and df[column].min() < min_val:
        return False
    
    if max_val is not None and df[column].max() > max_val:
        return False
    
    return True

def validate_chart_data(df: pd.DataFrame, x_column: str, y_columns: List[str]) -> Dict[str, Any]:
    """Validate data for chart creation"""
    errors = []
    warnings = []
    
    # Check x column
    if x_column not in df.columns:
        errors.append(f"X-axis column '{x_column}' not found")
    else:
        # Check for nulls in x column
        null_count = df[x_column].isnull().sum()
        if null_count > 0:
            warnings.append(f"X-axis column '{x_column}' has {null_count} null values")
    
    # Check y columns
    for y_col in y_columns:
        if y_col not in df.columns:
            errors.append(f"Y-axis column '{y_col}' not found")
        else:
            # Check for nulls
            null_count = df[y_col].isnull().sum()
            if null_count > 0:
                warnings.append(f"Y-axis column '{y_col}' has {null_count} null values")
            
            # Check if numeric (for most chart types)
            if not pd.api.types.is_numeric_dtype(df[y_col]):
                warnings.append(f"Y-axis column '{y_col}' is not numeric")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }

def validate_file_size(size_bytes: int, max_size_mb: int = 50) -> bool:
    """Validate file size"""
    max_size_bytes = max_size_mb * 1024 * 1024
    return size_bytes <= max_size_bytes

def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """Validate file extension"""
    extension = filename.split('.')[-1].lower()
    return extension in allowed_extensions
