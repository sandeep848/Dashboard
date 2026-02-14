import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    HUGGINGFACE_API_TOKEN: str = ""
    HUGGINGFACE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    DATABASE_URL: str = "sqlite:///./dashboard.db"
    SECRET_KEY: str = "your-secret-key-min-32-characters-long"
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: str = "csv,xlsx,xls,json"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_FILE_TYPES.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
