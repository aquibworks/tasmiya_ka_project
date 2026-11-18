from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config.settings import settings
from src.database.db_connection import engine
from src.models.db_models import Base
from src.utils.logger import logger
from src.routes.api_router import router as api_router # <-- ADD THIS

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api") # <-- ADD THIS

@app.get("/")
def health_check():
    return {"status": "Active", "project": settings.PROJECT_NAME}