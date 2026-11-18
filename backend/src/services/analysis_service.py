import json
import uuid
from datetime import datetime
import numpy as np
from sklearn.metrics import confusion_matrix
from src.utils.logger import logger
from src.database.db_connection import SessionLocal
from src.models.db_models import ModelMetrics, AuditLog, DatasetInfo

class AnalysisService:
    
    def generate_run_id(self):
        return f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:6]}"
    
    def save_detailed_metrics(self, run_id, model_name, model_type, metrics, 
                              y_true, y_pred, train_time, sample_size, 
                              quantum_metadata=None):
        """Save comprehensive metrics including confusion matrix."""
        db = SessionLocal()
        try:
            cm = confusion_matrix(y_true, y_pred)
            tn, fp, fn, tp = cm.ravel()
            
            record = ModelMetrics(
                run_id=run_id,
                model_name=model_name,
                model_type=model_type,
                accuracy=metrics["accuracy"],
                precision=metrics["precision"],
                recall=metrics["recall"],
                f1_score=metrics["f1_score"],
                fpr=metrics["fpr"],
                true_positives=int(tp),
                true_negatives=int(tn),
                false_positives=int(fp),
                false_negatives=int(fn),
                training_time_sec=round(train_time, 2),
                sample_size=sample_size
            )
            
            if quantum_metadata:
                record.qubits_used = quantum_metadata.get("qubits")
                record.circuit_depth = quantum_metadata.get("depth")
                record.circuit_gates = quantum_metadata.get("gates")
                record.trainable_params = quantum_metadata.get("params")
                record.simulator_backend = quantum_metadata.get("backend")
                record.shots = quantum_metadata.get("shots")
            
            db.add(record)
            db.commit()
            logger.info(f"Saved detailed metrics for {model_name} under run_id={run_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save detailed metrics: {str(e)}")
        finally:
            db.close()
    
    def log_audit(self, run_id, action, status, details=None, sample_size=None, pca_variance=None):
        """Record every action for full audit trail."""
        db = SessionLocal()
        try:
            log = AuditLog(
                run_id=run_id,
                action=action,
                status=status,
                details=json.dumps(details or {}),
                sample_size=sample_size,
                pca_variance=pca_variance
            )
            db.add(log)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Audit log failed: {str(e)}")
        finally:
            db.close()
    
    def save_dataset_info(self, run_id, train_df, test_df, features_before, features_after, variance):
        """Store dataset statistics for transparency."""
        db = SessionLocal()
        try:
            # Breakdown of attack types
            attack_types = train_df[train_df['label'] == 1]['label'].value_counts().to_dict()
            
            info = DatasetInfo(
                run_id=run_id,
                total_train_records=len(train_df),
                total_test_records=len(test_df),
                normal_count=int((train_df['label'] == 0).sum()),
                attack_count=int((train_df['label'] == 1).sum()),
                attack_breakdown=json.dumps({str(k): int(v) for k, v in attack_types.items()}),
                features_before_pca=features_before,
                features_after_pca=features_after,
                pca_variance_retained=round(variance, 2)
            )
            db.add(info)
            db.commit()
            logger.info(f"Dataset info saved for run_id={run_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Dataset info save failed: {str(e)}")
        finally:
            db.close()
    
    def get_full_report(self, run_id):
        """Retrieve complete report for a given run."""
        db = SessionLocal()
        try:
            metrics = db.query(ModelMetrics).filter(ModelMetrics.run_id == run_id).all()
            dataset = db.query(DatasetInfo).filter(DatasetInfo.run_id == run_id).first()
            audits = db.query(AuditLog).filter(AuditLog.run_id == run_id).all()
            
            report = {
                "run_id": run_id,
                "dataset_info": {
                    "total_train": dataset.total_train_records if dataset else 0,
                    "total_test": dataset.total_test_records if dataset else 0,
                    "normal_count": dataset.normal_count if dataset else 0,
                    "attack_count": dataset.attack_count if dataset else 0,
                    "features_before_pca": dataset.features_before_pca if dataset else 0,
                    "features_after_pca": dataset.features_after_pca if dataset else 0,
                    "pca_variance_retained": dataset.pca_variance_retained if dataset else 0
                } if dataset else None,
                "model_metrics": [
                    {
                        "model_name": m.model_name,
                        "model_type": m.model_type,
                        "accuracy": m.accuracy,
                        "precision": m.precision,
                        "recall": m.recall,
                        "f1_score": m.f1_score,
                        "fpr": m.fpr,
                        "confusion_matrix": {
                            "tp": m.true_positives, "tn": m.true_negatives,
                            "fp": m.false_positives, "fn": m.false_negatives
                        },
                        "training_time_sec": m.training_time_sec,
                        "quantum_metadata": {
                            "qubits": m.qubits_used,
                            "circuit_depth": m.circuit_depth,
                            "gates": m.circuit_gates,
                            "params": m.trainable_params,
                            "backend": m.simulator_backend,
                            "shots": m.shots
                        } if m.model_type == "Quantum" else None
                    } for m in metrics
                ],
                "audit_trail": [
                    {
                        "action": a.action,
                        "status": a.status,
                        "timestamp": a.timestamp.isoformat(),
                        "details": json.loads(a.details) if a.details else {}
                    } for a in audits
                ]
            }
            return report
        finally:
            db.close()
    
    def generate_analysis_narrative(self, comparison_table, dataset_info):
        """Create a human-readable analysis of results."""
        analysis = []
        
        # Best model
        best = max(comparison_table.items(), key=lambda x: (x[1]["accuracy"], -x[1]["fpr"]))
        analysis.append({
            "type": "BEST_MODEL",
            "title": "Top Performing Model",
            "message": f"{best[0]} achieved the highest accuracy ({best[1]['accuracy']}%) "
                       f"with FPR of {best[1]['fpr']}%."
        })
        
        # Lowest FPR
        lowest_fpr = min(comparison_table.items(), key=lambda x: x[1]["fpr"])
        analysis.append({
            "type": "FPR_CHAMPION",
            "title": "Lowest False-Positive Rate",
            "message": f"{lowest_fpr[0]} produced the least false alarms ({lowest_fpr[1]['fpr']}% FPR), "
                       f"reducing analyst fatigue."
        })
        
        # Quantum vs Classical
        quantum = {k: v for k, v in comparison_table.items() if "Q" in k or "VQC" in k}
        classical = {k: v for k, v in comparison_table.items() if k not in quantum}
        
        if quantum and classical:
            best_q = max(quantum.items(), key=lambda x: x[1]["accuracy"])
            best_c = max(classical.items(), key=lambda x: x[1]["accuracy"])
            diff = round(best_q[1]["accuracy"] - best_c[1]["accuracy"], 2)
            analysis.append({
                "type": "QUANTUM_VS_CLASSICAL",
                "title": "Quantum vs Classical",
                "message": f"Best quantum model ({best_q[0]}) scored {best_q[1]['accuracy']}%, "
                           f"best classical ({best_c[0]}) scored {best_c[1]['accuracy']}%. "
                           f"Difference: {diff:+.2f}%."
            })
        
        # PCA transparency
        if dataset_info:
            analysis.append({
                "type": "PCA_INFO",
                "title": "Dimensionality Reduction",
                "message": f"{dataset_info['features_before_pca']} features compressed to "
                           f"{dataset_info['features_after_pca']} PCA components, "
                           f"retaining {dataset_info['pca_variance_retained']}% variance."
            })
        
        return analysis

analysis_service = AnalysisService()