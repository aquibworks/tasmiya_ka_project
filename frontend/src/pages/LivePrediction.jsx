import React, { useState } from 'react';
import { Target, Shield, AlertTriangle, CheckCircle2, Cpu, Zap, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const MODELS = [
  { id: 'rf', name: 'Random Forest', type: 'classical', speed: 'instant' },
  { id: 'svm', name: 'Classical SVM', type: 'classical', speed: 'instant' },
  { id: 'vqc', name: 'VQC (4-Qubit)', type: 'quantum', speed: '~1 sec' },
  { id: 'qsvm', name: 'QSVM (4-Qubit)', type: 'quantum', speed: '~10 sec' },
];

const SAMPLE_RECORDS = {
  'Normal Traffic': {
    duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF',
    src_bytes: 232, dst_bytes: 8153, land: 0, wrong_fragment: 0, urgent: 0,
    hot: 0, num_failed_logins: 0, logged_in: 1, num_compromised: 0,
    root_shell: 0, su_attempted: 0, num_root: 0, num_file_creations: 0,
    num_shells: 0, num_access_files: 0, num_outbound_cmds: 0,
    is_host_login: 0, is_guest_login: 0, count: 1, srv_count: 1,
    serror_rate: 0, srv_serror_rate: 0, rerror_rate: 0, srv_rerror_rate: 0,
    same_srv_rate: 1, diff_srv_rate: 0, srv_diff_host_rate: 0,
    dst_host_count: 0, dst_host_srv_count: 0, dst_host_same_srv_rate: 0,
    dst_host_diff_srv_rate: 0, dst_host_same_src_port_rate: 0,
    dst_host_srv_diff_host_rate: 0, dst_host_serror_rate: 0,
    dst_host_srv_serror_rate: 0, dst_host_rerror_rate: 0, dst_host_srv_rerror_rate: 0,
  },
  'Suspicious (DoS-like)': {
    duration: 0, protocol_type: 'tcp', service: 'private', flag: 'REJ',
    src_bytes: 0, dst_bytes: 0, land: 0, wrong_fragment: 0, urgent: 0,
    hot: 0, num_failed_logins: 0, logged_in: 0, num_compromised: 0,
    root_shell: 0, su_attempted: 0, num_root: 0, num_file_creations: 0,
    num_shells: 0, num_access_files: 0, num_outbound_cmds: 0,
    is_host_login: 0, is_guest_login: 0, count: 511, srv_count: 511,
    serror_rate: 1, srv_serror_rate: 1, rerror_rate: 0, srv_rerror_rate: 0,
    same_srv_rate: 1, diff_srv_rate: 0, srv_diff_host_rate: 0,
    dst_host_count: 255, dst_host_srv_count: 255, dst_host_same_srv_rate: 1,
    dst_host_diff_srv_rate: 0, dst_host_same_src_port_rate: 0,
    dst_host_srv_diff_host_rate: 0, dst_host_serror_rate: 1,
    dst_host_srv_serror_rate: 1, dst_host_rerror_rate: 0, dst_host_srv_rerror_rate: 0,
  },
};

export default function LivePrediction() {
  const [model, setModel] = useState('rf');
  const [sample, setSample] = useState('Normal Traffic');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const predict = async () => {
    setLoading(true);
    setResult(null);
    try {
      const features = SAMPLE_RECORDS[sample];
      const data = await api.predictRaw(model, features);
      
      if (data.status === 'success') {
        setResult(data);
        setHistory(prev => [{ ...data, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
        toast.success(`Prediction: ${data.prediction}`);
      } else {
        toast.error(data.message || 'Prediction failed');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        toast.error('Timeout — QSVM kernel computation is slow. Try VQC or RF.');
      } else {
        toast.error(err.message || 'Prediction failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = MODELS.find(m => m.id === model);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="text-quantum-blue" /> Live Prediction
        </h1>
        <p className="text-slate-500 text-sm">
          Classify a single network record as Normal or Attack in real time
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Cpu className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">How this works</p>
          <p className="text-blue-800 text-xs mt-1">
            The record is passed through the <strong>same preprocessing pipeline</strong> (encoder → scaler → PCA to 4 features) used during training,
            then the selected model predicts. Models are <strong>loaded from saved .pkl files</strong> — no retraining.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100 w-full"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.type} ({m.speed})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Record</label>
            <select
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              disabled={loading}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100 w-full"
            >
              {Object.keys(SAMPLE_RECORDS).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={predict}
          disabled={loading}
          className="flex items-center gap-2 bg-quantum-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 transition w-full md:w-auto"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Play size={16} /> Run Prediction
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border-2 p-6 ${
          result.prediction === 'Attack'
            ? 'bg-red-50 border-red-300'
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              result.prediction === 'Attack' ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {result.prediction === 'Attack' ? (
                <AlertTriangle className="text-red-500" size={32} />
              ) : (
                <CheckCircle2 className="text-green-500" size={32} />
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-3xl font-bold ${
                result.prediction === 'Attack' ? 'text-red-700' : 'text-green-700'
              }`}>
                {result.prediction.toUpperCase()}
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {result.model} · Confidence: <strong>{result.confidence}%</strong>
              </p>
            </div>
          </div>

          {/* PCA features */}
          <div className="mt-5 pt-4 border-t border-slate-300">
            <p className="text-xs font-semibold text-slate-600 mb-2">4 PCA Features (after preprocessing):</p>
            <div className="grid grid-cols-4 gap-2">
              {result.pca_features.map((f, i) => (
                <div key={i} className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">PC{i+1}</p>
                  <p className="text-sm font-mono font-semibold">{f.toFixed(3)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold mb-3 text-sm">Recent Predictions (this session)</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${h.prediction === 'Attack' ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="font-medium">{h.model}</span>
                  <span className="text-slate-500 text-xs">{h.timestamp}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${h.prediction === 'Attack' ? 'text-red-700' : 'text-green-700'}`}>
                    {h.prediction}
                  </span>
                  <span className="text-slate-500 text-xs">{h.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo tip */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-purple-900 mb-1">💡 Demo tip</p>
        <p className="text-purple-800 text-xs">
          Try the same record across all 4 models. <strong>Random Forest and SVM</strong> load instantly. 
          <strong> VQC</strong> takes ~1 second. <strong>QSVM</strong> takes ~10 seconds — this is because it has to 
          evaluate the quantum kernel against the full training set, which is the O(N²) limitation the paper highlights.
        </p>
      </div>
    </div>
  );
}