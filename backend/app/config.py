import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Kural AI Citizen Intelligence Platform"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://kural_user:kural_password@localhost:5432/kural_db"
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL",
        "postgresql+psycopg2://kural_user:kural_password@localhost:5432/kural_db"
    )
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_API_KEY_SID: str = os.getenv("TWILIO_API_KEY_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    TWILIO_VOICE_NUMBER: str = os.getenv("TWILIO_VOICE_NUMBER", "")
    
    MAPBOX_TOKEN: str = os.getenv("MAPBOX_TOKEN", "")
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
