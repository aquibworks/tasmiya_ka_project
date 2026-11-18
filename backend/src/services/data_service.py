
import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
from sklearn.decomposition import PCA
from src.utils.logger import logger

# Define the column names for NSL-KDD (since the .txt files don't have headers)
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
    'label', 'difficulty'
]


class DataService:
    def __init__(self):
        self.train_path = "src/data/KDDTrain+.txt"
        self.test_path = "src/data/KDDTest+.txt"
        self.models_dir = "src/data/saved_models"

        # Ensure the directory for saving scalers/PCA exists
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)

    def _load_and_clean(self, filepath):
        logger.info(f"Loading data from {filepath}")
        df = pd.read_csv(filepath, names=COLUMNS)

        # Drop the 'difficulty' column as it's not a feature
        df = df.drop('difficulty', axis=1)

        # Convert multi-class labels to Binary (Normal = 0, Attack = 1)
        # In NSL-KDD, 'normal' is the only normal traffic. Everything else is an attack.
        df['label'] = df['label'].apply(
            lambda x: 0 if str(x).strip().lower() == 'normal' else 1
        )

        return df

    # Safety check: sample only the number of records available
    def _safe_sample(self, df, sample_count, category):
        available_count = len(df)

        if available_count == 0:
            raise ValueError(
                f"No records available for {category}. Cannot continue preprocessing."
            )

        actual_count = min(sample_count, available_count)

        if actual_count < sample_count:
            logger.warning(
                f"Requested {sample_count} {category} records, "
                f"but only {available_count} are available. "
                f"Sampling {actual_count} records instead."
            )

        return df.sample(n=actual_count, random_state=42)

    def preprocess_data(self, sample_size=4000, test_size=800):
        logger.info("Starting Data Preprocessing Pipeline...")

        # 1. Load Data
        train_df = self._load_and_clean(self.train_path)
        test_df = self._load_and_clean(self.test_path)

        # 2. Take a balanced sample
        train_per_class = sample_size // 2
        test_per_class = test_size // 2

        logger.info(
            f"Sampling {sample_size} training records "
            f"({train_per_class} normal, {train_per_class} attack)"
        )

        normal_df = self._safe_sample(
            train_df[train_df['label'] == 0],
            train_per_class,
            "training normal"
        )

        attack_df = self._safe_sample(
            train_df[train_df['label'] == 1],
            train_per_class,
            "training attack"
        )

        sampled_df = pd.concat(
            [normal_df, attack_df]
        ).sample(frac=1, random_state=42).reset_index(drop=True)

        # Safety check for test dataset
        logger.info(
            f"Sampling {test_size} test records "
            f"({test_per_class} normal, {test_per_class} attack)"
        )

        test_normal = self._safe_sample(
            test_df[test_df['label'] == 0],
            test_per_class,
            "test normal"
        )

        test_attack = self._safe_sample(
            test_df[test_df['label'] == 1],
            test_per_class,
            "test attack"
        )

        test_sampled_df = pd.concat(
            [test_normal, test_attack]
        ).sample(frac=1, random_state=42).reset_index(drop=True)

        # 3. Separate Features and Labels
        X_train_raw = sampled_df.drop('label', axis=1)
        y_train = sampled_df['label']

        X_test_raw = test_sampled_df.drop('label', axis=1)
        y_test = test_sampled_df['label']

        # 4. Encoding Categorical Features
        logger.info("Applying One-Hot Encoding to categorical features...")

        categorical_cols = ['protocol_type', 'service', 'flag']

        encoder = OneHotEncoder(
            sparse_output=False,
            handle_unknown='ignore'
        )

        X_train_cat = encoder.fit_transform(X_train_raw[categorical_cols])
        X_test_cat = encoder.transform(X_test_raw[categorical_cols])

        X_train_num = X_train_raw.drop(
            categorical_cols, axis=1
        ).reset_index(drop=True)

        X_test_num = X_test_raw.drop(
            categorical_cols, axis=1
        ).reset_index(drop=True)

        X_train_encoded = pd.concat(
            [X_train_num, pd.DataFrame(X_train_cat)],
            axis=1
        )

        X_test_encoded = pd.concat(
            [X_test_num, pd.DataFrame(X_test_cat)],
            axis=1
        )

        # Convert ALL column names to strings
        X_train_encoded.columns = X_train_encoded.columns.astype(str)
        X_test_encoded.columns = X_test_encoded.columns.astype(str)

        # 5. MinMax Scaling to [0, pi]
        logger.info("Scaling features to [0, pi] for Quantum Encoding...")

        scaler = MinMaxScaler(feature_range=(0, np.pi))

        X_train_scaled = scaler.fit_transform(X_train_encoded)
        X_test_scaled = scaler.transform(X_test_encoded)

        # 6. PCA Compression to exactly 4 Features
        logger.info("Applying PCA to compress features down to 4 components...")

        pca = PCA(n_components=4, random_state=42)

        X_train_pca = pca.fit_transform(X_train_scaled)
        X_test_pca = pca.transform(X_test_scaled)

        variance_retained = sum(pca.explained_variance_ratio_) * 100

        logger.info(
            f"PCA retained {variance_retained:.2f}% of the variance."
        )

        # 7. Save the Preprocessors
        joblib.dump(encoder, f"{self.models_dir}/encoder.pkl")
        joblib.dump(scaler, f"{self.models_dir}/scaler.pkl")
        joblib.dump(pca, f"{self.models_dir}/pca.pkl")

        logger.info("Preprocessors (Encoder, Scaler, PCA) saved to disk.")

        logger.info(
            f"Final dataset sizes - Train: {len(y_train)}, Test: {len(y_test)}"
        )

        return (
            X_train_pca,
            y_train.values,
            X_test_pca,
            y_test.values,
            variance_retained
        )

    # Preprocess Uploaded Dataset
    def preprocess_uploaded(self, stored_path, sample_size=200, test_size=100, label_column=None):
        logger.info(f"Preprocessing uploaded file: {stored_path}")
        
        # 1. Try reading with header first
        try:
            df = pd.read_csv(stored_path)
        except Exception:
            df = None
        
        # 2. If it looks like NSL-KDD (43 or 42 cols, no proper header), reload without header
        if df is None or df.shape[1] in (42, 43):
            df_no_header = pd.read_csv(stored_path, header=None)
            # Check if first row looks like numeric/string data (not column names)
            if df_no_header.shape[1] in (42, 43):
                df = df_no_header
        
        # 3. Assign proper column names
        if df.shape[1] == 43:
            df.columns = COLUMNS  # 41 features + label + difficulty
            df = df.drop("difficulty", axis=1)
        elif df.shape[1] == 42:
            df.columns = COLUMNS[:-1]  # 41 features + label
        else:
            # Generic CSV: assume last column is label
            df.columns = [f"feat_{i}" for i in range(df.shape[1] - 1)] + ["label"]
        
        logger.info(f"Uploaded dataset shape after parsing: {df.shape}")
        logger.info(f"Label column unique values (first 10): {df['label'].unique()[:10]}")
        
        # 4. Convert label to binary
        df["label"] = df["label"].astype(str).str.strip().str.lower()
        normal_values = ["normal", "0", "0.0", "benign", "false"]
        df["label"] = df["label"].apply(lambda x: 0 if x in normal_values else 1)
        
        logger.info(f"Label distribution: {df['label'].value_counts().to_dict()}")
        
        # 5. Verify both classes exist
        n_normal_available = int((df["label"] == 0).sum())
        n_attack_available = int((df["label"] == 1).sum())
        
        if n_normal_available == 0 or n_attack_available == 0:
            raise ValueError(
                f"Dataset must contain both normal and attack samples. "
                f"Found: {n_normal_available} normal, {n_attack_available} attack."
            )
        
        # 6. Sample balanced
        n_normal = min(sample_size // 2, n_normal_available)
        n_attack = min(sample_size // 2, n_attack_available)
        
        normal_df = df[df["label"] == 0].sample(n=n_normal, random_state=42)
        attack_df = df[df["label"] == 1].sample(n=n_attack, random_state=42)
        sampled = pd.concat([normal_df, attack_df]).sample(frac=1, random_state=42).reset_index(drop=True)
        
        # 7. Feature pipeline
        X_raw = sampled.drop("label", axis=1)
        y = sampled["label"]
        
        categorical_cols = [c for c in ["protocol_type", "service", "flag"] if c in X_raw.columns]
        
        if categorical_cols:
            encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
            X_cat = encoder.fit_transform(X_raw[categorical_cols])
            X_num = X_raw.drop(categorical_cols, axis=1).reset_index(drop=True)
            X_enc = pd.concat([X_num, pd.DataFrame(X_cat)], axis=1)
        else:
            X_enc = X_raw.reset_index(drop=True)
        
        # Convert numeric strings to floats
        X_enc = X_enc.apply(pd.to_numeric, errors="coerce").fillna(0)
        X_enc.columns = X_enc.columns.astype(str)
        
        scaler = MinMaxScaler(feature_range=(0, np.pi))
        X_scaled = scaler.fit_transform(X_enc)
        
        n_components = min(4, X_scaled.shape[1])
        pca = PCA(n_components=n_components, random_state=42)
        X_pca = pca.fit_transform(X_scaled)
        
        if X_pca.shape[1] < 4:
            padding = np.zeros((X_pca.shape[0], 4 - X_pca.shape[1]))
            X_pca = np.hstack([X_pca, padding])
        
        variance = sum(pca.explained_variance_ratio_) * 100
        features_before = X_enc.shape[1]
        
        logger.info(f"Preprocessing complete. Features: {features_before} -> 4, Variance: {variance:.2f}%")
        return X_pca, y.values, variance, features_before
    
# Create a singleton instance
data_service = DataService()
