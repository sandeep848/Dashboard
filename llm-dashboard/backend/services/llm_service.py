import json
import httpx
import re
from typing import Dict, Any, List, Optional
from config.settings import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_token = settings.HUGGINGFACE_API_TOKEN
        self.model = settings.HUGGINGFACE_MODEL
        self.base_url = f"https://api-inference.huggingface.co/models/{self.model}"
        self.headers = {"Content-Type": "application/json"}
        if self.api_token:
            self.headers["Authorization"] = f"Bearer {self.api_token}"
        else:
            logger.warning("HUGGINGFACE_API_TOKEN is not set. Using fallback recommendations without LLM API calls.")
    
    def _format_prompt(self, system_message: str, user_prompt: str) -> str:
        """Format prompt for Mistral instruction format"""
        return f"<s>[INST] {system_message}\n\n{user_prompt} [/INST]"
    
    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from LLM response, handling markdown code blocks"""
        # Try to find JSON in code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON directly
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        
        return None
    
    async def _call_llm(self, prompt: str, max_retries: int = 3) -> str:
        """Call Hugging Face Inference API with retry logic"""
        if not self.api_token:
            return ""

        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 2048,
                "temperature": 0.7,
                "top_p": 0.95,
                "return_full_text": False
            }
        }
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if isinstance(result, list) and len(result) > 0:
                            return result[0].get("generated_text", "")
                        return str(result)
                    
                    elif response.status_code == 503:
                        logger.warning(f"Model loading, attempt {attempt + 1}/{max_retries}")
                        import asyncio
                        await asyncio.sleep(5 * (attempt + 1))
                    
                    else:
                        logger.error(f"API error: {response.status_code} - {response.text}")
                        if attempt == max_retries - 1:
                            raise Exception(f"LLM API error: {response.status_code}")
                            
            except httpx.TimeoutException:
                logger.warning(f"Timeout, attempt {attempt + 1}/{max_retries}")
                if attempt == max_retries - 1:
                    raise
            except Exception as e:
                logger.error(f"Error calling LLM: {str(e)}")
                if attempt == max_retries - 1:
                    raise
        
        return ""
    
    async def analyze_data_structure(self, df_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze data structure using LLM"""
        system_message = """You are a data analysis expert. Analyze the provided dataset structure and provide insights.
Respond ONLY with valid JSON in this exact format:
{
    "summary": "Brief description of what this data appears to be",
    "key_observations": ["observation 1", "observation 2", ...],
    "potential_use_cases": ["use case 1", "use case 2", ...],
    "data_quality_issues": ["issue 1", "issue 2", ...],
    "recommended_columns": ["col1", "col2", ...]
}"""
        
        user_prompt = f"""Analyze this dataset:

Columns: {json.dumps(df_info['columns'], indent=2)}
Row Count: {df_info['row_count']}
Column Count: {df_info['column_count']}
Sample Data (first 5 rows):
{json.dumps(df_info['sample_data'], indent=2)}

Provide your analysis in the specified JSON format."""
        
        prompt = self._format_prompt(system_message, user_prompt)
        response = await self._call_llm(prompt)
        
        result = self._extract_json(response)
        if result:
            return result
        
        # Fallback response
        return {
            "summary": "Dataset analysis completed",
            "key_observations": ["Data contains " + str(df_info['column_count']) + " columns"],
            "potential_use_cases": ["Explore relationships between variables"],
            "data_quality_issues": [],
            "recommended_columns": [c['name'] for c in df_info['columns'][:5]]
        }
    

    def _score_column_relevance(self, column: Dict[str, Any], use_case: str) -> int:
        name = column.get('name', '').lower()
        goal = use_case.lower()
        score = 0

        keyword_groups = {
            'time': ['trend', 'time', 'monthly', 'daily', 'year', 'season'],
            'geo': ['region', 'location', 'country', 'city', 'state'],
            'customer': ['customer', 'user', 'segment', 'cohort'],
            'sales': ['sale', 'revenue', 'price', 'amount', 'profit', 'cost'],
            'category': ['category', 'type', 'group', 'status'],
            'marketing': ['campaign', 'channel', 'spend', 'conversion'],
        }

        for group, terms in keyword_groups.items():
            if any(term in goal for term in terms):
                if group == 'time' and (column.get('is_datetime') or any(t in name for t in ['date', 'time', 'month', 'year'])):
                    score += 3
                if group == 'geo' and any(t in name for t in ['region', 'country', 'city', 'state', 'location']):
                    score += 3
                if group == 'customer' and any(t in name for t in ['customer', 'user', 'client', 'segment']):
                    score += 3
                if group == 'sales' and any(t in name for t in ['sales', 'revenue', 'price', 'amount', 'profit', 'cost']):
                    score += 3
                if group == 'category' and (column.get('is_categorical') or any(t in name for t in ['category', 'type', 'group', 'status'])):
                    score += 2
                if group == 'marketing' and any(t in name for t in ['campaign', 'channel', 'spend', 'conversion', 'ad']):
                    score += 3

        if column.get('is_numeric'):
            score += 1
        if column.get('is_datetime'):
            score += 1
        if column.get('null_percentage', 100) > 70:
            score -= 2

        return score

    def _smart_fallback_recommendations(self, use_case: str, data_summary: Dict[str, Any]) -> Dict[str, Any]:
        columns = data_summary.get('columns', [])
        scored = sorted(columns, key=lambda c: self._score_column_relevance(c, use_case), reverse=True)

        selected = [c['name'] for c in scored if self._score_column_relevance(c, use_case) > 1][:8]
        if not selected:
            selected = [c['name'] for c in scored[: min(5, len(scored))]]

        dropped = [c['name'] for c in columns if c['name'] not in selected]

        return {
            "columns_to_drop": dropped,
            "columns_to_keep": selected,
            "cleaning_steps": [],
            "feature_engineering": [],
            "filtering_criteria": [],
            "explanation": "Fallback recommendation selected context-relevant columns using data types and use-case keywords.",
        }

    async def recommend_processing(self, use_case: str, data_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend data processing steps based on use case"""
        system_message = """You are a data preprocessing expert. Based on the user's analysis goal and data structure, recommend specific data processing steps.
Respond ONLY with valid JSON in this exact format:
{
    "columns_to_drop": ["col1", "col2"],
    "columns_to_keep": ["col3", "col4", "col5"],
    "cleaning_steps": [
        {"column_name": "col3", "action": "fill_nulls", "reason": "reason", "parameters": {"method": "mean"}}
    ],
    "feature_engineering": [
        {"new_column_name": "new_col", "operation": "extract_year", "source_columns": ["date_col"], "description": "Extract year from date"}
    ],
    "filtering_criteria": ["criteria 1", "criteria 2"],
    "explanation": "Detailed explanation of recommendations"
}"""
        
        user_prompt = f"""User's Analysis Goal: {use_case}

Data Structure:
{json.dumps(data_summary, indent=2)}

Recommend processing steps in the specified JSON format."""
        
        prompt = self._format_prompt(system_message, user_prompt)
        response = await self._call_llm(prompt)
        
        result = self._extract_json(response)
        if result:
            return result
        
        # Fallback response
        return self._smart_fallback_recommendations(use_case, data_summary)
    
    async def suggest_visualizations(self, processed_data: Dict[str, Any], use_case: str) -> Dict[str, Any]:
        """Suggest appropriate visualizations"""
        system_message = """You are a data visualization expert. Based on the processed data and user's analysis goal, suggest appropriate chart types.
Respond ONLY with valid JSON in this exact format:
{
    "charts": [
        {
            "chart_type": "line",
            "title": "Chart Title",
            "description": "What this chart shows",
            "x_axis": "column_name",
            "y_axis": ["column_name"],
            "compatible_types": ["area", "scatter"],
            "incompatible_types": ["pie: reason", "bar: reason"],
            "reasoning": "Why this chart is recommended"
        }
    ],
    "summary": "Overall visualization strategy"
}"""
        
        user_prompt = f"""User's Analysis Goal: {use_case}

Processed Data Info:
Columns: {json.dumps(processed_data.get('columns', []), indent=2)}
Row Count: {processed_data.get('row_count', 0)}
Sample Data:
{json.dumps(processed_data.get('preview', [])[:3], indent=2)}

Suggest 3-5 visualizations in the specified JSON format."""
        
        prompt = self._format_prompt(system_message, user_prompt)
        response = await self._call_llm(prompt)
        
        result = self._extract_json(response)
        if result:
            return result
        
        # Fallback response with basic charts
        columns = processed_data.get('columns', [])
        numeric_cols = [c for c in columns if c.get('is_numeric', False)]
        categorical_cols = [c for c in columns if c.get('is_categorical', False)]
        
        charts = []
        if len(numeric_cols) >= 2:
            charts.append({
                "chart_type": "scatter",
                "title": f"{numeric_cols[0]['name']} vs {numeric_cols[1]['name']}",
                "description": "Relationship between two numeric variables",
                "x_axis": numeric_cols[0]['name'],
                "y_axis": [numeric_cols[1]['name']],
                "compatible_types": ["line", "bubble"],
                "incompatible_types": ["pie: requires single categorical variable"],
                "reasoning": "Scatter plots show relationships between continuous variables"
            })
        
        if categorical_cols and numeric_cols:
            charts.append({
                "chart_type": "bar",
                "title": f"{categorical_cols[0]['name']} Distribution",
                "description": "Distribution across categories",
                "x_axis": categorical_cols[0]['name'],
                "y_axis": [numeric_cols[0]['name']],
                "compatible_types": ["horizontal_bar", "stacked_bar"],
                "incompatible_types": ["line: requires ordered x-axis"],
                "reasoning": "Bar charts effectively show categorical comparisons"
            })
        
        return {
            "charts": charts,
            "summary": "Basic visualization suggestions based on data types"
        }
    
    async def validate_chart_conversion(self, current_type: str, target_type: str, data_info: Dict[str, Any]) -> Dict[str, Any]:
        """Validate if chart conversion is compatible"""
        system_message = """You are a data visualization compatibility expert. Determine if converting from one chart type to another is valid.
Respond ONLY with valid JSON in this exact format:
{
    "is_compatible": true/false,
    "reason": "Detailed explanation",
    "suggested_alternatives": ["alternative1", "alternative2"]
}"""
        
        user_prompt = f"""Current Chart Type: {current_type}
Target Chart Type: {target_type}
Data Information:
{json.dumps(data_info, indent=2)}

Determine compatibility in the specified JSON format."""
        
        prompt = self._format_prompt(system_message, user_prompt)
        response = await self._call_llm(prompt)
        
        result = self._extract_json(response)
        if result:
            return result
        
        # Simple fallback logic
        return {
            "is_compatible": True,
            "reason": "Conversion allowed by default",
            "suggested_alternatives": ["bar", "line", "scatter"]
        }

llm_service = LLMService()
