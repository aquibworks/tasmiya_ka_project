from fastapi import APIRouter, UploadFile, File, HTTPException
from src.services.status_service import status_service
from src.services.upload_service import upload_service
from src.services.analysis_service import analysis_service
from src.controllers.ml_controller import (
    UploadTrainRequest, 
    run_pipeline_on_upload, 
    run_preprocessing, 
    train_classical_models, 
    train_quantum_models, 
    run_full_comparison,
    list_all_reports,
    predict_record,
    PredictRequest, 
    QuantumTrainRequest
)

router = APIRouter()

# --- Preprocessing ---
@router.post("/preprocess")
def preprocess_endpoint():
    return run_preprocessing()

# --- Training ---
@router.post("/train/classical")
def train_classical_endpoint():
    return train_classical_models()

@router.post("/train/quantum")
def train_quantum_endpoint(request: QuantumTrainRequest):
    return train_quantum_models(request)

@router.post("/compare")
def compare_endpoint(request: QuantumTrainRequest):
    return run_full_comparison(request)

# --- Reports & History ---
@router.get("/reports")
def reports_endpoint():
    return list_all_reports()

@router.get("/report/{run_id}")
def get_report_endpoint(run_id: str):
    return analysis_service.get_full_report(run_id)

# --- Uploads ---
@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only .csv or .txt allowed")
    
    dataset_id, filepath = upload_service.save_uploaded_file(file)
    info = upload_service.inspect_dataset(filepath, dataset_id, file.filename)
    return {"status": "success", "dataset": info}

@router.get("/uploads")
def list_uploads():
    return {"datasets": upload_service.list_uploads()}

@router.get("/uploads/{dataset_id}")
def get_upload(dataset_id: str):
    data = upload_service.get_upload(dataset_id)
    if not data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return data

@router.post("/pipeline/upload")
def pipeline_upload_endpoint(request: UploadTrainRequest):
    return run_pipeline_on_upload(request)

# --- Status & Prediction ---
@router.get("/status/{run_id}")
def status_endpoint(run_id: str):
    return status_service.get(run_id)

@router.post("/predict")
def predict_endpoint(request: PredictRequest):
    return predict_record(request)