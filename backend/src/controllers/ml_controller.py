
from pydantic import BaseModel
from src.services.data_service import data_service
from src.services.classical_service import classical_service
from src.utils.logger import logger
from src.services.quantum_service import quantum_service
from src.services.analysis_service import analysis_service


# Create a Pydantic model for the request body
class QuantumTrainRequest(BaseModel):
    sample_size: int = 400  # Default to 400 for fast demo
    test_size: int = 100


# Request model for uploaded dataset training
class UploadTrainRequest(BaseModel):
    dataset_id: str
    sample_size: int = 200
    test_size: int = 100


def run_preprocessing():
    try:
        logger.info("API triggered: Data Preprocessing")
        X_train, y_train, X_test, y_test, variance = data_service.preprocess_data()
        return {
            "status": "success",
            "message": "Data preprocessed successfully",
            "train_shape": X_train.shape,
            "test_shape": X_test.shape,
            "pca_variance_retained_percent": round(variance, 2),
        }
    except Exception as e:
        logger.error(f"Error in preprocessing: {str(e)}")
        return {"status": "error", "message": str(e)}


# Train Classical Models
def train_classical_models():
    try:
        logger.info("API triggered: Classical Model Training")

        # Generate unique run ID
        run_id = analysis_service.generate_run_id()

        # 1. Get Data
        X_train, y_train, X_test, y_test, _ = data_service.preprocess_data()

        # 2. Train & Evaluate
        results = classical_service.train_and_evaluate(
            X_train,
            y_train,
            X_test,
            y_test,
            run_id=run_id
        )

        return {
            "status": "success",
            "run_id": run_id,
            "message": "Classical models trained successfully",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error in classical training: {str(e)}")
        return {"status": "error", "message": str(e)}


# Train Quantum Models
def train_quantum_models(request: QuantumTrainRequest):
    try:
        logger.info(
            f"API triggered: Quantum Model Training (Sample: {request.sample_size})"
        )

        # 1. Get Data with dynamic sizes
        X_train, y_train, X_test, y_test, _ = data_service.preprocess_data(
            sample_size=request.sample_size,
            test_size=request.test_size
        )

        # 2. Train QSVM
        qsvm_results = quantum_service.train_qsvm(
            X_train, y_train, X_test, y_test
        )

        # 3. Train VQC
        vqc_results = quantum_service.train_vqc(
            X_train, y_train, X_test, y_test
        )

        return {
            "status": "success",
            "message": f"Quantum models trained on {request.sample_size} samples successfully",
            "sample_used": request.sample_size,
            "results": {
                "QSVM": qsvm_results,
                "VQC": vqc_results
            }
        }
    except Exception as e:
        logger.error(f"Error in quantum training: {str(e)}")
        return {"status": "error", "message": str(e)}


# Run Full Classical vs Quantum Comparison with Full Reporting
def run_full_comparison(request: QuantumTrainRequest):
    run_id = analysis_service.generate_run_id()

    try:
        logger.info(
            f"[{run_id}] Full Comparison Started (Sample: {request.sample_size})"
        )

        # 1. Preprocess
        X_train, y_train, X_test, y_test, variance = data_service.preprocess_data(
            sample_size=request.sample_size,
            test_size=request.test_size
        )

        # Save dataset info
        analysis_service.log_audit(
            run_id,
            "PREPROCESS",
            "SUCCESS",
            {"variance": variance},
            request.sample_size,
            variance
        )

        # 2. Classical Models
        classical_results = classical_service.train_and_evaluate(
            X_train, y_train, X_test, y_test, run_id=run_id
        )

        # 3. Quantum Models
        qsvm_metrics, qsvm_meta = quantum_service.train_qsvm(
            X_train, y_train, X_test, y_test, run_id=run_id
        )

        vqc_metrics, vqc_meta = quantum_service.train_vqc(
            X_train, y_train, X_test, y_test, run_id=run_id
        )

        # 4. Build comparison
        comparison_table = {
            "Random Forest": classical_results["Random Forest"],
            "Classical SVM": classical_results["Classical SVM"],
            "QSVM (4-Qubit)": qsvm_metrics,
            "VQC (4-Qubit)": vqc_metrics
        }

        # 5. Save detailed metrics (with confusion matrices)
        analysis_service.log_audit(
            run_id,
            "COMPARE_COMPLETE",
            "SUCCESS",
            {"models": list(comparison_table.keys())}
        )

        # 6. Generate narrative analysis
        dataset_info = {
            "features_before_pca": 41,
            "features_after_pca": 4,
            "pca_variance_retained": round(variance, 2)
        }

        narrative = analysis_service.generate_analysis_narrative(
            comparison_table,
            dataset_info
        )

        # 7. Determine best model
        best_model = max(
            comparison_table.items(),
            key=lambda x: (x[1]["accuracy"], -x[1]["fpr"])
        )

        return {
            "status": "success",
            "run_id": run_id,
            "sample_used": request.sample_size,
            "pca_variance_retained": round(variance, 2),
            "comparison_table": comparison_table,
            "best_model": best_model[0],
            "best_metrics": best_model[1],
            "analysis_narrative": narrative,
            "quantum_metadata": {
                "QSVM": qsvm_meta,
                "VQC": vqc_meta
            }
        }

    except Exception as e:
        import traceback

        logger.error(
            f"[{run_id}] Comparison failed: {traceback.format_exc()}"
        )

        analysis_service.log_audit(
            run_id,
            "COMPARE",
            "FAILED",
            {"error": str(e)}
        )

        return {
            "status": "error",
            "run_id": run_id,
            "message": str(e)
        }


# Train from Uploaded Dataset
def run_pipeline_on_upload(request: UploadTrainRequest):
    from src.services.upload_service import upload_service
    from src.services.analysis_service import analysis_service

    run_id = analysis_service.generate_run_id()

    try:
        logger.info(
            f"[{run_id}] Pipeline on uploaded dataset: {request.dataset_id}"
        )

        dataset = upload_service.get_upload(request.dataset_id)

        if not dataset:
            return {
                "status": "error",
                "message": "Dataset not found"
            }

        X, y, variance, features_before = data_service.preprocess_uploaded(
            dataset["stored_path"],
            sample_size=request.sample_size,
            test_size=request.test_size
        )

        # Split
        from sklearn.model_selection import train_test_split

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=request.test_size / len(y),
            random_state=42,
            stratify=y
        )

        # Train
        classical = classical_service.train_and_evaluate(
            X_train, y_train, X_test, y_test
        )

        qsvm_metrics, qsvm_meta = quantum_service.train_qsvm(
            X_train, y_train, X_test, y_test
        )

        vqc_metrics, vqc_meta = quantum_service.train_vqc(
            X_train, y_train, X_test, y_test
        )

        comparison = {
            "Random Forest": classical["Random Forest"],
            "Classical SVM": classical["Classical SVM"],
            "QSVM (4-Qubit)": qsvm_metrics,
            "VQC (4-Qubit)": vqc_metrics
        }

        best = max(
            comparison.items(),
            key=lambda x: (x[1]["accuracy"], -x[1]["fpr"])
        )

        narrative = analysis_service.generate_analysis_narrative(
            comparison,
            {
                "features_before_pca": features_before,
                "features_after_pca": 4,
                "pca_variance_retained": round(variance, 2)
            }
        )

        return {
            "status": "success",
            "run_id": run_id,
            "dataset_id": request.dataset_id,
            "comparison_table": comparison,
            "best_model": best[0],
            "best_metrics": best[1],
            "analysis_narrative": narrative,
            "quantum_metadata": {
                "QSVM": qsvm_meta,
                "VQC": vqc_meta
            }
        }

    except Exception as e:
        import traceback

        logger.error(
            f"[{run_id}] Upload pipeline failed: {traceback.format_exc()}"
        )

        return {
            "status": "error",
            "run_id": run_id,
            "message": str(e)
        }


# ============================================================
# REPORT HISTORY
# ============================================================

from src.database.db_connection import SessionLocal
from src.models.db_models import ModelMetrics


def list_all_reports():
    from src.database.db_connection import SessionLocal
    from src.models.db_models import ModelMetrics
    from sqlalchemy import distinct, func
    db = SessionLocal()
    try:
        runs = db.query(
            ModelMetrics.run_id,
            func.min(ModelMetrics.timestamp).label("started_at"),
            func.count(distinct(ModelMetrics.model_name)).label("model_count")
        ).filter(
            ModelMetrics.run_id.isnot(None)
        ).group_by(ModelMetrics.run_id).order_by(func.min(ModelMetrics.timestamp).desc()).all()

        return {
            "runs": [
                {
                    "run_id": r.run_id,
                    "started_at": r.started_at.isoformat() if r.started_at else None,
                    "model_count": r.model_count
                } for r in runs
            ]
        }
    finally:
        db.close()

# ============================================================
# SINGLE RECORD PREDICTION
# ============================================================

class PredictRequest(BaseModel):
    model_name: str = "Random Forest"
    features: list  # Raw feature values (must match uploaded schema)


def predict_record(request: PredictRequest):
    """
    Predict on a single record using an already trained model.

    For demo simplicity: this re-runs preprocessing + training on a tiny batch
    with the record appended, then predicts.

    In production, persist trained models and load them. This endpoint is
    currently a scaffold and does not perform actual prediction.
    """
    try:
        logger.info(f"Predict request for model={request.model_name}")

        return {
            "status": "success",
            "prediction": "pending_implementation",
            "message": "Endpoint scaffolded — full implementation in next step",
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
