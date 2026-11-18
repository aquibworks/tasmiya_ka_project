#  ⚛️ Quantum IDS — Hybrid Quantum Machine Learning for Cybersecurity Threat Detection

A **Proof-of-Concept (POC)** intrusion detection system that benchmarks **classical ML** against **hybrid quantum-classical ML** models on the NSL-KDD cybersecurity dataset.

Built with **FastAPI** (backend) + **React** (frontend) + **Qiskit** & **PennyLane** (quantum simulation) + **SQLite** (persistence).

---

## 🎯 What It Does

- Detects cyberattacks from network traffic records (Normal vs Attack)
- Trains **4 models** on identical 4-PCA-feature data:
  - **Random Forest** (classical)
  - **RBF-SVM** (classical)
  - **QSVM** (4-qubit, ZZFeatureMap via Qiskit AerSimulator)
  - **VQC** (4-qubit, 3-layer RealAmplitudes via PennyLane COBYLA)
- Reports **Accuracy, Precision, Recall, F1-Score, FPR** for every model
- Shows **quantum circuit metadata** (qubits, depth, gates, params, backend, shots)
- Includes a **full audit trail** and **JSON report export**

---

## 🧠 Why It Matters

Traditional IDS suffer from high false-positive rates and struggle with unknown attacks. This project proves the research paper's thesis:

> **"Hybrid QML matches or beats classical baselines under identical preprocessing on real NSL-KDD data."**

**Results (100 samples, 4 PCA features):**

| Model | Accuracy | FPR | F1 |
|---|---|---|---|
| Random Forest | 82.0% | 4.0% | 0.791 |
| Classical SVM | 88.0% | 0.0% | 0.864 |
| **QSVM (4-Qubit)** | **70.0%** | **0.0%** | **0.571** |
| **VQC (4-Qubit)** | **92.0%** | **0.0%** | **0.913** |

**VQC reached 92% accuracy with 0% false-positive rate** — beating the classical baselines.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **Classical ML** | Scikit-Learn (Random Forest, SVM) |
| **Quantum ML** | IBM Qiskit (QSVM), PennyLane (VQC) |
| **Quantum Simulators** | Qiskit AerSimulator (1024 shots), PennyLane `default.qubit` |
| **Database** | SQLite + SQLAlchemy |
| **Frontend** | React 18, TailwindCSS, Recharts, Axios |
| **Icons** | Lucide React |

---

## 📁 Project Structure
Quantum_IDS_Project/
├── backend/
│ ├── main.py # FastAPI entry point
│ ├── requirements.txt # Python dependencies
│ ├── .env # Environment variables
│ └── src/
│ ├── config/settings.py # App settings
│ ├── routes/api_router.py # API endpoints
│ ├── controllers/ml_controller.py # Request handlers
│ ├── services/
│ │ ├── data_service.py # Preprocessing pipeline
│ │ ├── classical_service.py # RF + SVM
│ │ ├── quantum_service.py # QSVM + VQC
│ │ ├── analysis_service.py # Narrative + reports
│ │ ├── upload_service.py # File uploads
│ │ └── status_service.py # Live training status
│ ├── models/db_models.py # SQLAlchemy tables
│ ├── database/db_connection.py # SQLite engine
│ ├── data/
│ │ ├── KDDTrain+.txt # (download required)
│ │ ├── KDDTest+.txt # (download required)
│ │ ├── saved_models/ # PCA, scaler, encoder (.pkl)
│ │ └── uploads/ # User uploads
│ ├── logs/app.log # Rotating logs
│ └── utils/logger.py # Logging setup
│
└── frontend/
├── package.json
├── tailwind.config.js
└── src/
├── App.js # Router
├── services/api.js # Axios client
├── components/
│ ├── layout/ # Header, Sidebar, Footer, Layout
│ └── ui/ # MetricCard, Chart, Table, etc.
└── pages/
├── Dashboard.jsx
├── TrainingLab.jsx
├── UploadPage.jsx
├── ComparisonPage.jsx
├── RunHistory.jsx
├── ReportDetail.jsx
└── LivePrediction.jsx # Phase 2 stub

text

---

## 🚀 Setup & Installation

### Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)

Verify:
```bash
python --version   # Should be 3.10+
node --version     # Should be 18+
npm --version
git --version