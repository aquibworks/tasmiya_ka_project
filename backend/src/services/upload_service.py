
import os
import json
import uuid
import pandas as pd
from datetime import datetime
from fastapi import UploadFile
from src.utils.logger import logger
from src.database.db_connection import SessionLocal
from src.models.db_models import UploadedDataset

class UploadService:
    def __init__(self):
        self.upload_dir = "src/data/uploads"
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def save_uploaded_file(self, file: UploadFile):
        """Save the uploaded file and return its path + metadata."""
        dataset_id = f"ds_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        safe_filename = f"{dataset_id}_{file.filename}"
        filepath = os.path.join(self.upload_dir, safe_filename)
        
        # Save file
        with open(filepath, "wb") as f:
            content = file.file.read()
            f.write(content)
        
        logger.info(f"Uploaded file saved to {filepath}")
        return dataset_id, filepath
    
    def inspect_dataset(self, filepath, dataset_id, original_filename):
        """Read file, detect format, store preview and columns."""
        # Detect format: does it have headers?
        try:
            df = pd.read_csv(filepath)
            # If it's NSL-KDD, there are no headers and 43 columns
            if len(df.columns) == 43 or len(df.columns) == 42:
                # Reload without header
                df = pd.read_csv(filepath, header=None)
                detected_format = "NSL-KDD"
            else:
                detected_format = "generic"
        except Exception as e:
            logger.error(f"Failed to read CSV: {e}")
            df = pd.read_csv(filepath, header=None)
            detected_format = "unknown"
        
        total_rows = len(df)
        total_columns = len(df.columns)
        columns = [str(c) for c in df.columns.tolist()]
        preview = df.head(10).fillna("").astype(str).to_dict(orient="records")
        
        # Save to DB
        db = SessionLocal()
        try:
            record = UploadedDataset(
                dataset_id=dataset_id,
                original_filename=original_filename,
                stored_path=filepath,
                total_rows=total_rows,
                total_columns=total_columns,
                detected_format=detected_format,
                columns_json=json.dumps(columns),
                preview_json=json.dumps(preview)
            )
            db.add(record)
            db.commit()
            logger.info(f"Dataset metadata saved: {dataset_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save dataset metadata: {e}")
        finally:
            db.close()
        
        return {
            "dataset_id": dataset_id,
            "filename": original_filename,
            "detected_format": detected_format,
            "total_rows": total_rows,
            "total_columns": total_columns,
            "columns": columns[:20],   # return first 20
            "preview": preview,
            "stored_path": filepath
        }
    
    def list_uploads(self):
        """Return all uploaded datasets."""
        db = SessionLocal()
        try:
            records = db.query(UploadedDataset).order_by(UploadedDataset.timestamp.desc()).all()
            return [{
                "dataset_id": r.dataset_id,
                "filename": r.original_filename,
                "rows": r.total_rows,
                "columns": r.total_columns,
                "format": r.detected_format,
                "timestamp": r.timestamp.isoformat()
            } for r in records]
        finally:
            db.close()
    
    def get_upload(self, dataset_id):
        """Fetch one upload's details."""
        db = SessionLocal()
        try:
            r = db.query(UploadedDataset).filter(UploadedDataset.dataset_id == dataset_id).first()
            if not r:
                return None
            return {
                "dataset_id": r.dataset_id,
                "filename": r.original_filename,
                "rows": r.total_rows,
                "columns": r.total_columns,
                "format": r.detected_format,
                "columns_list": json.loads(r.columns_json),
                "preview": json.loads(r.preview_json),
                "stored_path": r.stored_path
            }
        finally:
            db.close()

upload_service = UploadService()