import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import Spinner from '../components/ui/Spinner';

export default function ReportDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReport(runId)
      .then(setReport)
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  if (loading) return <Spinner label="Loading report..." />;
  if (!report) return <p className="text-center text-slate-500 py-12">Report not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-quantum-blue" /> Report Detail
            </h1>
            <p className="text-slate-500 text-xs font-mono">{runId}</p>
          </div>
        </div>
        <button
          onClick={exportJson}
          className="flex items-center gap-2 bg-quantum-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Download size={16} /> Export JSON
        </button>
      </div>

      {/* Dataset Info */}
      {report.dataset_info && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-3">Dataset Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">Train Rows</p><p className="font-bold">{report.dataset_info.total_train}</p></div>
            <div><p className="text-xs text-slate-500">Test Rows</p><p className="font-bold">{report.dataset_info.total_test}</p></div>
            <div><p className="text-xs text-slate-500">Normal</p><p className="font-bold">{report.dataset_info.normal_count}</p></div>
            <div><p className="text-xs text-slate-500">Attack</p><p className="font-bold">{report.dataset_info.attack_count}</p></div>
            <div><p className="text-xs text-slate-500">Features Before PCA</p><p className="font-bold">{report.dataset_info.features_before_pca}</p></div>
            <div><p className="text-xs text-slate-500">Features After PCA</p><p className="font-bold">{report.dataset_info.features_after_pca}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-500">Variance Retained</p><p className="font-bold">{report.dataset_info.pca_variance_retained}%</p></div>
          </div>
        </div>
      )}

      {/* Model Metrics */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="font-bold mb-3">Model Metrics</h2>
        <div className="space-y-4">
          {report.model_metrics?.map((m, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{m.model_name} <span className="text-xs text-slate-500">({m.model_type})</span></h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Accuracy</p><p className="font-bold">{m.accuracy}%</p></div>
                <div><p className="text-xs text-slate-500">Precision</p><p className="font-bold">{m.precision}%</p></div>
                <div><p className="text-xs text-slate-500">Recall</p><p className="font-bold">{m.recall}%</p></div>
                <div><p className="text-xs text-slate-500">F1</p><p className="font-bold">{m.f1_score}</p></div>
                <div><p className="text-xs text-slate-500">FPR</p><p className="font-bold">{m.fpr}%</p></div>
              </div>
              {m.quantum_metadata && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <span>Qubits: <strong>{m.quantum_metadata.qubits}</strong></span>
                  <span>Depth: <strong>{m.quantum_metadata.circuit_depth}</strong></span>
                  <span>Gates: <strong>{m.quantum_metadata.gates}</strong></span>
                  <span>Params: <strong>{m.quantum_metadata.params}</strong></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      {report.audit_trail?.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-bold mb-3">Audit Trail</h2>
          <ul className="space-y-2 text-xs">
            {report.audit_trail.map((a, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-slate-100 pb-2">
                <span className={`w-2 h-2 rounded-full ${a.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-mono text-slate-500">{new Date(a.timestamp).toLocaleString()}</span>
                <span className="font-semibold">{a.action}</span>
                <span className="text-slate-500">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}