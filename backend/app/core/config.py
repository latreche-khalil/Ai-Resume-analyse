from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI Resume Analyzer"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    # ChromaDB
    CHROMADB_HOST: str = "chromadb"
    CHROMADB_PORT: int = 8001
    
    # ClamAV
    CLAMAV_HOST: str = "clamav"
    CLAMAV_PORT: int = 3310
    
    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    
    # JWT
    SECRET_KEY: str  # Main secret key for JWT signing
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24  # 24-hour token expiry (Requirements 1.10)
    
    # Privacy Salts
    PII_ENCRYPTION_SALT: str = "default_pii_encryption_salt"
    BLIND_INDEX_SALT: str = "default_blind_index_salt"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Sentry
    SENTRY_DSN: str = ""
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".png", ".jpg", ".jpeg"]
    UPLOAD_DIR: str = "/app/uploads"

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "ResumeAI"
    
    class Config:
        env_file = (".env", ".env.local")  # .env.local overrides .env (last wins)
        case_sensitive = True
        extra = "ignore"


settings = Settings()
