import time
import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from src.utils.logger import logger
from src.database.db_connection import SessionLocal
from src.models.db_models import ModelMetrics

MODELS_DIR = "src/data/saved_models"

class ClassicalService:
    def __init__(self):
        # Ensure the directory exists
        os.makedirs(MODELS_DIR, exist_ok=True)

    def _calculate_metrics(self, y_true, y_pred):
        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        return {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1, 3),
            "fpr": round(fpr * 100, 2)
        }

    def _save_to_db(self, model_name, metrics, train_time, run_id=None, y_true=None, y_pred=None):
        db = SessionLocal()
        try:
            tp = tn = fp = fn = 0
            if y_true is not None and y_pred is not None:
                cm = confusion_matrix(y_true, y_pred)
                tn, fp, fn, tp = cm.ravel()
            record = ModelMetrics(
                run_id=run_id,
                model_name=model_name,
                model_type="Classical",
                accuracy=metrics["accuracy"],
                precision=metrics["precision"],
                recall=metrics["recall"],
                f1_score=metrics["f1_score"],
                fpr=metrics["fpr"],
                training_time_sec=round(train_time, 2),
                sample_size=0,
                true_positives=int(tp),
                true_negatives=int(tn),
                false_positives=int(fp),
                false_negatives=int(fn),
            )
            db.add(record)
            db.commit()
            logger.info(f"Saved {model_name} metrics to database (run_id={run_id}).")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save metrics: {str(e)}")
        finally:
            db.close()

    def train_and_evaluate(self, X_train, y_train, X_test, y_test, run_id=None):
        results = {}

        # ===== Random Forest =====
        logger.info("Training Random Forest (100 trees, max_depth=10)...")
        start = time.time()
        rf_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        rf_model.fit(X_train, y_train)
        rf_time = time.time() - start

        #  SAVE MODEL TO DISK
        rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
        try:
            joblib.dump(rf_model, rf_path)
            logger.info(f"Saved Random Forest model to {rf_path}")
        except Exception as e:
            logger.error(f"Failed to save Random Forest model: {e}")

        rf_preds = rf_model.predict(X_test)
        rf_metrics = self._calculate_metrics(y_test, rf_preds)
        self._save_to_db("Random Forest", rf_metrics, rf_time, run_id=run_id, y_true=y_test, y_pred=rf_preds)
        results["Random Forest"] = rf_metrics
        logger.info(f"Random Forest Done: {rf_metrics}")

        # ===== Classical SVM =====
        logger.info("Training Classical SVM (RBF Kernel, C=1.0)...")
        start = time.time()
        svm_model = SVC(kernel='rbf', C=1.0, random_state=42, probability=True)
        svm_model.fit(X_train, y_train)
        svm_time = time.time() - start

        #  SAVE MODEL TO DISK
        svm_path = os.path.join(MODELS_DIR, "classical_svm.pkl")
        try:
            joblib.dump(svm_model, svm_path)
            logger.info(f" Saved Classical SVM model to {svm_path}")
        except Exception as e:
            logger.error(f"Failed to save Classical SVM model: {e}")

        svm_preds = svm_model.predict(X_test)
        svm_metrics = self._calculate_metrics(y_test, svm_preds)
        self._save_to_db("Classical SVM", svm_metrics, svm_time, run_id=run_id, y_true=y_test, y_pred=svm_preds)
        results["Classical SVM"] = svm_metrics
        logger.info(f"Classical SVM Done: {svm_metrics}")

        return results


classical_service = ClassicalService()