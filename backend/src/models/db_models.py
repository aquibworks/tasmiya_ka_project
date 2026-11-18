from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from src.database.db_connection import Base

class ModelMetrics(Base):
    __tablename__ = "model_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, index=True)  # Groups a single comparison run
    model_name = Column(String, index=True)
    model_type = Column(String)  # "Classical" or "Quantum"
    
    # Core metrics
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    fpr = Column(Float)
    
    # Confusion matrix
    true_positives = Column(Integer)
    true_negatives = Column(Integer)
    false_positives = Column(Integer)
    false_negatives = Column(Integer)
    
    # Training info
    training_time_sec = Column(Float)
    sample_size = Column(Integer)
    
    # Quantum-specific (nullable for classical)
    qubits_used = Column(Integer, nullable=True)
    circuit_depth = Column(Integer, nullable=True)
    circuit_gates = Column(Integer, nullable=True)
    trainable_params = Column(Integer, nullable=True)
    simulator_backend = Column(String, nullable=True)
    shots = Column(Integer, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)


class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    model_used = Column(String)
    prediction_result = Column(String)
    confidence_score = Column(Float)
    input_features = Column(Text)  # JSON string
    timestamp = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, index=True)
    action = Column(String)  # "PREPROCESS", "TRAIN_QSVM", "COMPARE", etc.
    status = Column(String)  # "SUCCESS" or "FAILED"
    details = Column(Text)  # JSON with extra info
    sample_size = Column(Integer)
    pca_variance = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class DatasetInfo(Base):
    __tablename__ = "dataset_info"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, index=True)
    total_train_records = Column(Integer)
    total_test_records = Column(Integer)
    normal_count = Column(Integer)
    attack_count = Column(Integer)
    attack_breakdown = Column(Text)  # JSON string
    features_before_pca = Column(Integer)
    features_after_pca = Column(Integer)
    pca_variance_retained = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class UploadedDataset(Base):
    __tablename__ = "uploaded_datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String, index=True)   # e.g., "ds_20261118_xxx"
    original_filename = Column(String)
    stored_path = Column(String)               # path on disk
    total_rows = Column(Integer)
    total_columns = Column(Integer)
    detected_format = Column(String)           # "NSL-KDD", "generic"
    columns_json = Column(Text)                # JSON list of column names
    preview_json = Column(Text)                # JSON of first 10 rows
    timestamp = Column(DateTime, default=datetime.utcnow)