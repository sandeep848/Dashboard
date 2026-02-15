import os
from dataclasses import dataclass
from typing import List


@dataclass
class Settings:
    HUGGINGFACE_API_TOKEN: str = os.getenv("HUGGINGFACE_API_TOKEN", "")
    HUGGINGFACE_MODEL: str = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dashboard.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-min-32-characters-long")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    ALLOWED_FILE_TYPES: str = os.getenv("ALLOWED_FILE_TYPES", "csv,xlsx,xls,json")

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_FILE_TYPES.split(",")]


settings = Settings()
