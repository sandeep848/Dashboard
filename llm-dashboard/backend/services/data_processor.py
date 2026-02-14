import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.processing_log = []
    
    def analyze_schema(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze DataFrame schema and return detailed information"""
        columns = []
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            null_count = df[col].isnull().sum()
            null_percentage = (null_count / len(df)) * 100 if len(df) > 0 else 0
            unique_count = df[col].nunique()
            
            # Get sample values (non-null)
            sample_values = df[col].dropna().head(5).tolist()
            
            # Determine column characteristics
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            is_datetime = pd.api.types.is_datetime64_any_dtype(df[col])
            is_categorical = df[col].dtype == 'object' or unique_count < min(50, len(df) * 0.1)
            
            columns.append({
                "name": col,
                "dtype": dtype,
                "null_count": int(null_count),
                "null_percentage": round(null_percentage, 2),
                "unique_count": int(unique_count),
                "sample_values": sample_values,
                "is_numeric": is_numeric,
                "is_datetime": is_datetime,
                "is_categorical": is_categorical
            })
        
        return {
            "columns": columns,
            "row_count": len(df),
            "column_count": len(df.columns),
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)
        }
    
    def get_preview(self, df: pd.DataFrame, n: int = 10) -> List[Dict[str, Any]]:
        """Get first n rows as list of dicts for JSON serialization"""
        preview_df = df.head(n).copy()
        
        # Convert to JSON-serializable format
        for col in preview_df.columns:
            if preview_df[col].dtype == 'datetime64[ns]':
                preview_df[col] = preview_df[col].astype(str)
            elif preview_df[col].dtype == 'object':
                # Handle mixed types
                preview_df[col] = preview_df[col].astype(str)
        
        return preview_df.to_dict('records')
    
    def apply_cleaning(self, df: pd.DataFrame, cleaning_steps: List[Dict[str, Any]]) -> pd.DataFrame:
        """Apply cleaning steps to DataFrame"""
        df = df.copy()
        
        for step in cleaning_steps:
            action = step.get('action')
            column = step.get('column_name')
            params = step.get('parameters', {})
            
            try:
                if action == 'fill_nulls':
                    method = params.get('method', 'mean')
                    if method == 'mean' and pd.api.types.is_numeric_dtype(df[column]):
                        df[column].fillna(df[column].mean(), inplace=True)
                    elif method == 'median' and pd.api.types.is_numeric_dtype(df[column]):
                        df[column].fillna(df[column].median(), inplace=True)
                    elif method == 'mode':
                        df[column].fillna(df[column].mode()[0], inplace=True)
                    elif method == 'forward_fill':
                        df[column].fillna(method='ffill', inplace=True)
                    else:
                        df[column].fillna(params.get('value', 'Unknown'), inplace=True)
                    
                    self.processing_log.append(f"Filled nulls in '{column}' using {method}")
                
                elif action == 'remove_outliers':
                    method = params.get('method', 'iqr')
                    if method == 'iqr' and pd.api.types.is_numeric_dtype(df[column]):
                        Q1 = df[column].quantile(0.25)
                        Q3 = df[column].quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
                        self.processing_log.append(f"Removed outliers from '{column}' using IQR method")
                    
                    elif method == 'zscore' and pd.api.types.is_numeric_dtype(df[column]):
                        z_scores = np.abs((df[column] - df[column].mean()) / df[column].std())
                        df = df[z_scores < params.get('threshold', 3)]
                        self.processing_log.append(f"Removed outliers from '{column}' using Z-score method")
                
                elif action == 'convert_type':
                    target_type = params.get('target_type')
                    if target_type == 'datetime':
                        df[column] = pd.to_datetime(df[column], errors='coerce')
                        self.processing_log.append(f"Converted '{column}' to datetime")
                    elif target_type == 'numeric':
                        df[column] = pd.to_numeric(df[column], errors='coerce')
                        self.processing_log.append(f"Converted '{column}' to numeric")
                    elif target_type == 'string':
                        df[column] = df[column].astype(str)
                        self.processing_log.append(f"Converted '{column}' to string")
                
                elif action == 'drop_column':
                    if column in df.columns:
                        df.drop(columns=[column], inplace=True)
                        self.processing_log.append(f"Dropped column '{column}'")
                
                elif action == 'drop_nulls':
                    df.dropna(subset=[column], inplace=True)
                    self.processing_log.append(f"Dropped rows with nulls in '{column}'")
                
            except Exception as e:
                logger.error(f"Error applying cleaning step {action} on {column}: {str(e)}")
                self.processing_log.append(f"Error in {action} on '{column}': {str(e)}")
        
        return df
    
    def apply_feature_engineering(self, df: pd.DataFrame, features: List[Dict[str, Any]]) -> pd.DataFrame:
        """Create new features based on specifications"""
        df = df.copy()
        
        for feature in features:
            try:
                new_col = feature.get('new_column_name')
                operation = feature.get('operation')
                source_cols = feature.get('source_columns', [])
                
                if operation == 'extract_year' and source_cols:
                    df[new_col] = pd.to_datetime(df[source_cols[0]], errors='coerce').dt.year
                    self.processing_log.append(f"Created '{new_col}' by extracting year from '{source_cols[0]}'")
                
                elif operation == 'extract_month' and source_cols:
                    df[new_col] = pd.to_datetime(df[source_cols[0]], errors='coerce').dt.month
                    self.processing_log.append(f"Created '{new_col}' by extracting month from '{source_cols[0]}'")
                
                elif operation == 'extract_day' and source_cols:
                    df[new_col] = pd.to_datetime(df[source_cols[0]], errors='coerce').dt.day
                    self.processing_log.append(f"Created '{new_col}' by extracting day from '{source_cols[0]}'")
                
                elif operation == 'concatenate' and len(source_cols) >= 2:
                    df[new_col] = df[source_cols].astype(str).agg(' '.join, axis=1)
                    self.processing_log.append(f"Created '{new_col}' by concatenating {source_cols}")
                
                elif operation == 'sum' and source_cols:
                    df[new_col] = df[source_cols].sum(axis=1)
                    self.processing_log.append(f"Created '{new_col}' as sum of {source_cols}")
                
                elif operation == 'average' and source_cols:
                    df[new_col] = df[source_cols].mean(axis=1)
                    self.processing_log.append(f"Created '{new_col}' as average of {source_cols}")
                
                elif operation == 'bin_numeric' and source_cols:
                    bins = feature.get('parameters', {}).get('bins', 5)
                    labels = feature.get('parameters', {}).get('labels', None)
                    df[new_col] = pd.cut(df[source_cols[0]], bins=bins, labels=labels)
                    self.processing_log.append(f"Created '{new_col}' by binning '{source_cols[0]}' into {bins} bins")
                
                elif operation == 'categorize' and source_cols:
                    bins = feature.get('parameters', {}).get('bins', [])
                    labels = feature.get('parameters', {}).get('labels', [])
                    df[new_col] = pd.cut(df[source_cols[0]], bins=bins, labels=labels)
                    self.processing_log.append(f"Created '{new_col}' by categorizing '{source_cols[0]}'")
                
            except Exception as e:
                logger.error(f"Error creating feature {new_col}: {str(e)}")
                self.processing_log.append(f"Error creating '{new_col}': {str(e)}")
        
        return df
    
    def apply_filtering(self, df: pd.DataFrame, criteria: List[str]) -> pd.DataFrame:
        """Apply filtering criteria"""
        df = df.copy()
        
        for criterion in criteria:
            try:
                # Simple filtering - can be enhanced with more complex parsing
                if '>' in criterion and '<' not in criterion:
                    parts = criterion.split('>')
                    col = parts[0].strip()
                    value = float(parts[1].strip())
                    df = df[df[col] > value]
                    self.processing_log.append(f"Applied filter: {criterion}")
                
                elif '<' in criterion and '>' not in criterion:
                    parts = criterion.split('<')
                    col = parts[0].strip()
                    value = float(parts[1].strip())
                    df = df[df[col] < value]
                    self.processing_log.append(f"Applied filter: {criterion}")
                
                elif '==' in criterion:
                    parts = criterion.split('==')
                    col = parts[0].strip()
                    value = parts[1].strip().strip('"\'')
                    df = df[df[col] == value]
                    self.processing_log.append(f"Applied filter: {criterion}")
                
                elif '!=' in criterion:
                    parts = criterion.split('!=')
                    col = parts[0].strip()
                    value = parts[1].strip().strip('"\'')
                    df = df[df[col] != value]
                    self.processing_log.append(f"Applied filter: {criterion}")
                
            except Exception as e:
                logger.error(f"Error applying filter {criterion}: {str(e)}")
                self.processing_log.append(f"Error applying filter '{criterion}': {str(e)}")
        
        return df
    
    def process_data(self, df: pd.DataFrame, recommendations: Dict[str, Any]) -> pd.DataFrame:
        """Execute full processing pipeline"""
        self.processing_log = []
        
        # Drop columns first
        columns_to_drop = recommendations.get('columns_to_drop', [])
        if columns_to_drop:
            df = df.drop(columns=[c for c in columns_to_drop if c in df.columns], errors='ignore')
            self.processing_log.append(f"Dropped columns: {columns_to_drop}")
        
        # Apply cleaning steps
        cleaning_steps = recommendations.get('cleaning_steps', [])
        if cleaning_steps:
            df = self.apply_cleaning(df, cleaning_steps)
        
        # Apply feature engineering
        features = recommendations.get('feature_engineering', [])
        if features:
            df = self.apply_feature_engineering(df, features)
        
        # Apply filtering
        criteria = recommendations.get('filtering_criteria', [])
        if criteria:
            df = self.apply_filtering(df, criteria)
        
        logger.info(f"Processing complete. Final shape: {df.shape}")
        self.processing_log.append(f"Final dataset: {df.shape[0]} rows, {df.shape[1]} columns")
        
        return df
    
    def get_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get statistical summary of DataFrame"""
        stats = {}
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_cols:
            stats['numeric'] = df[numeric_cols].describe().to_dict()
        
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        if categorical_cols:
            stats['categorical'] = {}
            for col in categorical_cols:
                stats['categorical'][col] = df[col].value_counts().head(10).to_dict()
        
        return stats

data_processor = DataProcessor()
