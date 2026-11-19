from tqdm import tqdm
import time
import os
import json
import joblib
import numpy as np
import warnings
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.svm import SVC
from src.utils.logger import logger
from src.database.db_connection import SessionLocal
from src.models.db_models import ModelMetrics

from qiskit.circuit.library import ZZFeatureMap
from qiskit_aer import AerSimulator
from qiskit_machine_learning.kernels import FidelityQuantumKernel

import pennylane as qml
from pennylane import numpy as pnp
from scipy.optimize import minimize

warnings.filterwarnings("ignore")

MODELS_DIR = "src/data/saved_models"


class QuantumService:
    def __init__(self):
        os.makedirs(MODELS_DIR, exist_ok=True)

    def _shift_to_angles(self, X):
        X_min = X.min(axis=0)
        X_max = X.max(axis=0)
        range_vals = X_max - X_min
        range_vals[range_vals == 0] = 1
        return (X - X_min) / range_vals * np.pi

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
                model_type="Quantum",
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

    # =========================================================
    # QSVM TRAINING
    # =========================================================
    def train_qsvm(self, X_train, y_train, X_test, y_test, run_id=None):
        logger.info("Starting QSVM Training (4-Qubit ZZFeatureMap)...")
        start_time = time.time()

        X_train_q = self._shift_to_angles(X_train)
        X_test_q = self._shift_to_angles(X_test)

        feature_map = ZZFeatureMap(feature_dimension=4, reps=2, entanglement='linear')
        backend = AerSimulator()
        qkernel = FidelityQuantumKernel(feature_map=feature_map)

        logger.info("Computing Quantum Kernel Matrix manually for progress tracking...")
        n_train = len(X_train_q)
        n_test = len(X_test_q)

        train_kernel_matrix = np.zeros((n_train, n_train))
        test_kernel_matrix = np.zeros((n_test, n_train))

        print("\n--- Computing Train Kernel Matrix ---")
        for i in tqdm(range(n_train), desc="Train Kernel Rows"):
            for j in range(i, n_train):
                val = qkernel.evaluate(np.array([X_train_q[i]]), np.array([X_train_q[j]]))[0][0]
                train_kernel_matrix[i, j] = val
                train_kernel_matrix[j, i] = val

        print("\n--- Computing Test Kernel Matrix ---")
        for i in tqdm(range(n_test), desc="Test Kernel Rows"):
            for j in range(n_train):
                val = qkernel.evaluate(np.array([X_test_q[i]]), np.array([X_train_q[j]]))[0][0]
                test_kernel_matrix[i, j] = val

        logger.info("Training SVM with Quantum Kernel...")
        qsvm = SVC(kernel='precomputed', C=1.0, probability=True)
        qsvm.fit(train_kernel_matrix, y_train)
        y_pred = qsvm.predict(test_kernel_matrix)

        train_time = time.time() - start_time
        metrics = self._calculate_metrics(y_test, y_pred)

        circuit_meta = {
            "qubits": 4,
            "depth": feature_map.depth(),
            "gates": sum(feature_map.count_ops().values()),
            "params": 0,
            "backend": "Qiskit AerSimulator",
            "shots": 1024
        }

        try:
            qsvm_path = os.path.join(MODELS_DIR, "qsvm_model.pkl")
            joblib.dump({
                "svc_model": qsvm,
                "X_train_shifted": X_train_q,
                "train_kernel_matrix": train_kernel_matrix,
            }, qsvm_path)
            logger.info(f"[SAVED] QSVM model -> {qsvm_path}")

            meta_path = os.path.join(MODELS_DIR, "qsvm_metadata.json")
            with open(meta_path, "w") as f:
                json.dump({
                    "feature_map": {
                        "type": "ZZFeatureMap",
                        "feature_dimension": 4,
                        "reps": 2,
                        "entanglement": "linear"
                    },
                    "circuit_meta": circuit_meta,
                    "metrics": metrics
                }, f, indent=2)
            logger.info(f"[SAVED] QSVM metadata -> {meta_path}")

            np.save(os.path.join(MODELS_DIR, "qsvm_shift_min.npy"), X_train.min(axis=0))
            np.save(os.path.join(MODELS_DIR, "qsvm_shift_max.npy"), X_train.max(axis=0))
            logger.info("[SAVED] QSVM angle-shift bounds")

        except Exception as e:
            logger.error(f"Failed to save QSVM model: {e}")

        self._save_to_db(
            "QSVM (4-Qubit)", metrics, train_time,
            run_id=run_id, y_true=y_test, y_pred=y_pred
        )

        logger.info(f"QSVM Done: {metrics}")
        logger.info(f"QSVM Circuit Metadata: {circuit_meta}")
        return metrics, circuit_meta

    # =========================================================
    # VQC TRAINING
    # =========================================================
    def train_vqc(self, X_train, y_train, X_test, y_test, run_id=None):
        logger.info("Starting VQC Training (PennyLane 3-Layer RealAmplitudes)...")
        start_time = time.time()

        X_train_q = pnp.array(self._shift_to_angles(X_train), requires_grad=False)
        X_test_q = pnp.array(self._shift_to_angles(X_test), requires_grad=False)

        n_qubits = 4
        n_layers = 3
        dev = qml.device("default.qubit", wires=n_qubits)

        @qml.qnode(dev)
        def circuit(weights, features):
            weights = weights.reshape((n_layers, n_qubits))
            qml.AngleEmbedding(features, wires=range(n_qubits), rotation='Y')
            for w in weights:
                for i in range(n_qubits):
                    qml.RY(w[i], wires=i)
                for i in range(n_qubits - 1):
                    qml.CNOT(wires=[i, i + 1])
                qml.CNOT(wires=[n_qubits - 1, 0])
            return qml.expval(qml.PauliZ(0))

        def cost(weights_flat, X_batch, y_batch):
            predictions = [circuit(weights_flat, x) for x in X_batch]
            loss = 0
            for pred, y_true in zip(predictions, y_batch):
                target = 1 if y_true == 1 else -1
                loss += (pred - target) ** 2
            return loss / len(y_batch)

        logger.info("Training VQC with COBYLA (150 steps)...")
        weights_flat = pnp.random.randn(n_layers * n_qubits, requires_grad=True)

        train_subset_size = min(200, len(X_train_q))
        X_train_sub = X_train_q[:train_subset_size]
        y_train_sub = y_train[:train_subset_size]

        optimizer = minimize(
            lambda w: cost(w, X_train_sub, y_train_sub),
            weights_flat,
            method='COBYLA',
            options={'maxiter': 150}
        )
        trained_weights_flat = optimizer.x

        logger.info("Evaluating VQC...")
        raw_preds = [circuit(trained_weights_flat, x) for x in X_test_q]
        y_pred = [1 if p > 0 else 0 for p in raw_preds]

        train_time = time.time() - start_time
        metrics = self._calculate_metrics(y_test, y_pred)

        circuit_meta = {
            "qubits": 4,
            "depth": 3,
            "gates": 12 + 3 * 3,
            "params": n_layers * n_qubits,
            "backend": "PennyLane default.qubit",
            "shots": None
        }

        # =========================================================
        # SAVE VQC MODEL — FIXED (convert to plain numpy first)
        # =========================================================
        try:
            weights_path = os.path.join(MODELS_DIR, "vqc_weights.npy")
            
            # ⚠️ Convert PennyLane tensor to plain numpy array
            weights_to_save = np.array(trained_weights_flat, dtype=np.float64)
            
            np.save(weights_path, weights_to_save)
            logger.info(f"[SAVED] VQC weights -> {weights_path}")

            meta_path = os.path.join(MODELS_DIR, "vqc_metadata.json")
            with open(meta_path, "w") as f:
                json.dump({
                    "n_qubits": n_qubits,
                    "n_layers": n_layers,
                    "circuit_meta": circuit_meta,
                    "metrics": metrics,
                    "shift_min": X_train.min(axis=0).tolist(),
                    "shift_max": X_train.max(axis=0).tolist()
                }, f, indent=2)
            logger.info(f"[SAVED] VQC metadata -> {meta_path}")

        except Exception as e:
            logger.error(f"Failed to save VQC model: {e}")

        self._save_to_db(
            "VQC (4-Qubit)", metrics, train_time,
            run_id=run_id, y_true=y_test, y_pred=y_pred
        )

        logger.info(f"VQC Done: {metrics}")
        logger.info(f"VQC Circuit Metadata: {circuit_meta}")
        return metrics, circuit_meta


quantum_service = QuantumService()