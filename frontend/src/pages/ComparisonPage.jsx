import React, { useState } from 'react';
import { BarChart3, Play, Zap, Cpu, Layers, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import ComparisonTable from '../components/ui/ComparisonTable';
import AccuracyChart from '../components/ui/AccuracyChart';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const SAMPLE_OPTIONS = [50, 100, 200, 400, 800, 4000];

const formatSampleLabel = (n) =>
  n === 4000 ? 'Full Dataset (4000)' : `${n} records`;

const formatSplit = (n, which) => {
  if (n === 4000) {
    return which === 'train' ? '~2000 normal + ~2000 attack' : '~400 normal + ~400 attack';
  }
  if (which === 'train') return `${n / 2} normal + ${n / 2} attack`;
  return `${Math.round(n / 4)} normal + ${Math.round(n / 4)} attack`;
};

function QuantumCircuitCard({ modelName, meta }) {
  if (!meta) return null;
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2 text-sm">
        <Zap size={14} /> {modelName} Circuit
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5"><Cpu size={12} /> Qubits: <strong>{meta.qubits}</strong></div>
        <div className="flex items-center gap-1.5"><Layers size={12} /> Depth: <strong>{meta.depth}</strong></div>
        <div className="flex items-center gap-1.5"><Settings size={12} /> Gates: <strong>{meta.gates}</strong></div>
        <div className="flex items-center gap-1.5">Params: <strong>{meta.params}</strong></div>
        <div className="col-span-2 text-[11px] text-slate-500 mt-1">
          {meta.backend} {meta.shots ? `· ${meta.shots} shots` : '· statevector'}
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleSize, setSampleSize] = useState(100);

  const run = async () => {
    setLoading(true);
    setResults(null);
    try {
      const data = await api.compare(sampleSize, sampleSize / 2);
      if (data.status !== 'success') throw new Error(data.message);
      setResults(data);
      toast.success('Comparison completed');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        toast.error('Timeout — try a smaller sample size');
      } else {
        toast.error(err.message || 'Comparison failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="text-quantum-blue" /> Model Comparison
        </h1>
        <p className="text-slate-500 text-sm">
          Full benchmark of classical vs quantum models on identical data
        </p>
      </div>

      {/* Data Split Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <div className="text-blue-600 mt-0.5">📊</div>
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Data Split (NSL-KDD)</p>
          <p className="text-blue-800 text-xs mt-1">
            <strong>Train:</strong> {sampleSize} records ({formatSplit(sampleSize, 'train')}) — used to fit models
          </p>
          <p className="text-blue-800 text-xs">
            <strong>Test:</strong> {Math.round(sampleSize / 2)} records ({formatSplit(sampleSize, 'test')}) — used to evaluate metrics
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Size</label>
          <select
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            disabled={loading}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
          >
            {SAMPLE_OPTIONS.map((n) => (
              <option key={n} value={n}>{formatSampleLabel(n)}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 bg-quantum-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 transition"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <><Play size={16} /> Run Comparison</>
          )}
        </button>
      </div>

      {loading && <Spinner label={`Training all 4 models on ${sampleSize} samples...`} />}

      {!loading && !results && (
        <EmptyState
          icon={BarChart3}
          title="No comparison yet"
          description="Click 'Run Comparison' to train Random Forest, SVM, QSVM, and VQC on identical data."
        />
      )}

      {!loading && results && (
        <>
          {results.quantum_metadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuantumCircuitCard modelName="QSVM" meta={results.quantum_metadata.QSVM} />
              <QuantumCircuitCard modelName="VQC" meta={results.quantum_metadata.VQC} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AccuracyChart comparisonTable={results.comparison_table} />
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-4">Key Findings</h3>
              <ul className="space-y-3">
                {results.analysis_narrative?.map((n, i) => (
                  <li key={i} className="border-l-4 border-quantum-blue pl-3">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <p>Run ID: <span className="font-mono">{results.run_id}</span></p>
                <p>Sample: {results.sample_used} · PCA Variance: {results.pca_variance_retained}%</p>
              </div>
            </div>
          </div>

          <ComparisonTable
            comparisonTable={results.comparison_table}
            bestModel={results.best_model}
          />
        </>
      )}
    </div>
  );
}