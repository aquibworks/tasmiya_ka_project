import React, { useState } from 'react';
import { Play, LayoutDashboard, Trophy, Target, AlertTriangle, Activity, Database, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import MetricCard from '../components/ui/MetricCard';
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

export default function Dashboard() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleSize, setSampleSize] = useState(100);
  const [forceRerun, setForceRerun] = useState(false);
  const [runTime, setRunTime] = useState(null);

  const run = async () => {
    setLoading(true);
    setResults(null);
    const start = Date.now();
    try {
      const data = await api.compare(sampleSize, sampleSize / 2, forceRerun);
      if (data.status !== 'success') throw new Error(data.message);
      setResults(data);
      const seconds = ((Date.now() - start) / 1000).toFixed(2);
      setRunTime(seconds);
      toast.success(`Comparison completed in ${seconds}s`);
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

  const wasFast = runTime && parseFloat(runTime) < 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="text-quantum-blue" />
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            High-level summary of hybrid quantum-classical threat detection
          </p>
        </div>
        {runTime && (
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
            wasFast ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Zap size={12} />
            {wasFast ? `Cached · ${runTime}s` : `Fresh run · ${runTime}s`}
          </div>
        )}
      </div>

      {/* Data Split Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Database className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Data Split (NSL-KDD)</p>
          <p className="text-blue-800 text-xs mt-1">
            <strong>Train:</strong> {sampleSize} records ({formatSplit(sampleSize, 'train')}) — used to fit all 4 models
          </p>
          <p className="text-blue-800 text-xs">
            <strong>Test:</strong> {Math.round(sampleSize / 2)} records ({formatSplit(sampleSize, 'test')}) — used to evaluate metrics
          </p>
          <p className="text-blue-700 text-xs mt-1">
            All 4 models trained on identical 4-feature PCA data. Classical & quantum results are directly comparable.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              id="force-rerun"
              checked={forceRerun}
              onChange={(e) => setForceRerun(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="force-rerun" className="text-xs text-slate-700 flex items-center gap-1">
              <RefreshCw size={12} /> Force re-run (bypass cache)
            </label>
          </div>

          <div className="flex-1" />

          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 bg-quantum-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <><Play size={16} /> Run Full Comparison</>
            )}
          </button>
        </div>
      </div>

      {loading && (
        <Spinner label={`Running pipeline on ${sampleSize} samples (cached: ~2s, fresh: ~2min)...`} />
      )}

      {!loading && !results && (
        <EmptyState
          icon={Activity}
          title="No comparison data yet"
          description="Click 'Run Full Comparison' to train all 4 models on identical data and see the results."
        />
      )}

      {!loading && results && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Best Model"
              value={results.best_model.replace(' (4-Qubit)', '')}
              color="purple"
              icon={Trophy}
              subtitle="Highest accuracy + lowest FPR"
            />
            <MetricCard
              label="Best Accuracy"
              value={results.best_metrics.accuracy}
              unit="%"
              color="green"
              icon={Target}
              subtitle="On unseen test data"
            />
            <MetricCard
              label="Best F1 Score"
              value={results.best_metrics.f1_score}
              color="blue"
              subtitle="Balance of precision & recall"
            />
            <MetricCard
              label="Lowest FPR"
              value={results.best_metrics.fpr}
              unit="%"
              color={results.best_metrics.fpr <= 5 ? 'green' : 'red'}
              icon={AlertTriangle}
              subtitle="False-positive rate"
            />
          </div>

          {/* Chart + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AccuracyChart comparisonTable={results.comparison_table} />
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-4">Analysis Insights</h3>
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
                <p>Samples: {results.sample_used} · PCA variance: {results.pca_variance_retained}%</p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <ComparisonTable
            comparisonTable={results.comparison_table}
            bestModel={results.best_model}
          />
        </>
      )}
    </div>
  );
}