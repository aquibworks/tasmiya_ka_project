import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Quantum IDS Backend")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./quantum_ids.db")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()