import os
import json
import joblib
import numpy as np
import pandas as pd
import pennylane as qml
from src.utils.logger import logger

MODELS_DIR = "src/data/saved_models"
COLUMNS = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes', 'land',
    'wrong_fragment', 'urgent', 'hot', 'num_failed_logins', 'logged_in', 'num_compromised',
    'root_shell', 'su_attempted', 'num_root', 'num_file_creations', 'num_shells',
    'num_access_files', 'num_outbound_cmds', 'is_host_login', 'is_guest_login', 'count',
    'srv_count', 'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate',
    'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count',
    'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
    'dst_host_srv_serror_rate', 'dst_host_rerror_rate', 'dst_host_srv_rerror_rate',
]


class PredictionService:
    def __init__(self):
        self.encoder = None
        self.scaler = None
        self.pca = None
        self._load_preprocessors()

    def _load_preprocessors(self):
        """Load encoder + scaler + PCA once at startup."""
        try:
            self.encoder = joblib.load(os.path.join(MODELS_DIR, "encoder.pkl"))
            self.scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
            self.pca = joblib.load(os.path.join(MODELS_DIR, "pca.pkl"))
            logger.info("[Prediction] Preprocessors loaded.")
        except Exception as e:
            logger.warning(f"[Prediction] Preprocessors not ready: {e}")

    def _prepare_record(self, raw_record: dict) -> np.ndarray:
        """
        Convert a raw NSL-KDD record dict -> 4 PCA features.
        raw_record must contain 41 feature keys (protocol_type, service, flag as strings).
        """
        # Build a single-row DataFrame with the 41 features
        row = {col: raw_record.get(col, 0) for col in COLUMNS}
        df = pd.DataFrame([row])

        # Categorical columns (must match training)
        categorical_cols = ['protocol_type', 'service', 'flag']

        # One-hot encode
        cat_encoded = self.encoder.transform(df[categorical_cols])
        num = df.drop(categorical_cols, axis=1).reset_index(drop=True)
        encoded = pd.concat([num, pd.DataFrame(cat_encoded)], axis=1)
        encoded.columns = encoded.columns.astype(str)
        encoded = encoded.apply(pd.to_numeric, errors="coerce").fillna(0)

        # Scale to [0, pi]
        scaled = self.scaler.transform(encoded)

        # PCA to 4 components
        pca_features = self.pca.transform(scaled)
        return pca_features  # shape (1, 4)

    # =========================================================
    # PREDICTIONS
    # =========================================================
    def predict_classical(self, raw_record: dict, model: str = "rf"):
        """Predict using saved Random Forest or SVM."""
        try:
            features = self._prepare_record(raw_record)

            if model == "rf":
                path = os.path.join(MODELS_DIR, "random_forest.pkl")
                label = "Random Forest"
            elif model == "svm":
                path = os.path.join(MODELS_DIR, "classical_svm.pkl")
                label = "Classical SVM"
            else:
                return {"status": "error", "message": f"Unknown model: {model}"}

            if not os.path.exists(path):
                return {"status": "error", "message": f"{label} not trained yet. Run training first."}

            clf = joblib.load(path)
            pred = int(clf.predict(features)[0])
            confidence = float(max(clf.predict_proba(features)[0])) * 100

            return {
                "status": "success",
                "model": label,
                "prediction": "Attack" if pred == 1 else "Normal",
                "confidence": round(confidence, 2),
                "pca_features": features[0].tolist()
            }
        except Exception as e:
            logger.error(f"[Prediction] Classical error: {e}")
            return {"status": "error", "message": str(e)}

    def predict_qsvm(self, raw_record: dict):
        """Predict using saved QSVM."""
        try:
            features = self._prepare_record(raw_record)  # (1, 4) PCA

            model_path = os.path.join(MODELS_DIR, "qsvm_model.pkl")
            if not os.path.exists(model_path):
                return {"status": "error", "message": "QSVM not trained yet."}

            saved = joblib.load(model_path)
            svc = saved["svc_model"]
            X_train_shifted = saved["X_train_shifted"]

            # Apply the SAME angle shift used at training time
            shift_min = np.load(os.path.join(MODELS_DIR, "qsvm_shift_min.npy"))
            shift_max = np.load(os.path.join(MODELS_DIR, "qsvm_shift_max.npy"))
            range_vals = shift_max - shift_min
            range_vals[range_vals == 0] = 1
            new_shifted = (features - shift_min) / range_vals * np.pi

            # Rebuild the quantum kernel and compute similarity to training set
            from qiskit.circuit.library import ZZFeatureMap
            from qiskit_machine_learning.kernels import FidelityQuantumKernel

            feature_map = ZZFeatureMap(feature_dimension=4, reps=2, entanglement='linear')
            qkernel = FidelityQuantumKernel(feature_map=feature_map)

            # Kernel row: similarity of new record to every training record
            kernel_row = np.zeros((1, len(X_train_shifted)))
            for j in range(len(X_train_shifted)):
                kernel_row[0, j] = qkernel.evaluate(
                    np.array([new_shifted[0]]),
                    np.array([X_train_shifted[j]])
                )[0][0]

            pred = int(svc.predict(kernel_row)[0])
            confidence = float(max(svc.predict_proba(kernel_row)[0])) * 100

            return {
                "status": "success",
                "model": "QSVM (4-Qubit)",
                "prediction": "Attack" if pred == 1 else "Normal",
                "confidence": round(confidence, 2),
                "pca_features": features[0].tolist()
            }
        except Exception as e:
            logger.error(f"[Prediction] QSVM error: {e}")
            return {"status": "error", "message": str(e)}

    def predict_vqc(self, raw_record: dict):
        """Predict using saved VQC weights."""
        try:
            features = self._prepare_record(raw_record)

            weights_path = os.path.join(MODELS_DIR, "vqc_weights.npy")
            meta_path = os.path.join(MODELS_DIR, "vqc_metadata.json")

            if not os.path.exists(weights_path) or not os.path.exists(meta_path):
                return {"status": "error", "message": "VQC not trained yet."}

            weights = np.load(weights_path)
            with open(meta_path) as f:
                meta = json.load(f)

            n_qubits = meta["n_qubits"]
            n_layers = meta["n_layers"]
            shift_min = np.array(meta["shift_min"])
            shift_max = np.array(meta["shift_max"])

            # Apply same angle shift
            range_vals = shift_max - shift_min
            range_vals[range_vals == 0] = 1
            shifted = (features - shift_min) / range_vals * np.pi

            # Rebuild the same circuit
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

            raw_pred = circuit(weights, shifted[0])
            pred = 1 if raw_pred > 0 else 0
            # expval of Z is in [-1, 1], map to confidence
            confidence = abs(float(raw_pred)) * 100

            return {
                "status": "success",
                "model": "VQC (4-Qubit)",
                "prediction": "Attack" if pred == 1 else "Normal",
                "confidence": round(confidence, 2),
                "pca_features": features[0].tolist()
            }
        except Exception as e:
            logger.error(f"[Prediction] VQC error: {e}")
            return {"status": "error", "message": str(e)}


prediction_service = PredictionService()