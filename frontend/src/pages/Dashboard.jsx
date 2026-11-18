import React, { useState } from 'react';
import { Play, LayoutDashboard, Trophy, Target, AlertTriangle, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import MetricCard from '../components/ui/MetricCard';
import ComparisonTable from '../components/ui/ComparisonTable';
import AccuracyChart from '../components/ui/AccuracyChart';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function Dashboard() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleSize, setSampleSize] = useState(100);

  const run = async () => {
    setLoading(true);
    try {
      const data = await api.compare(sampleSize, sampleSize / 2);
      if (data.status !== 'success') throw new Error(data.message);
      setResults(data);
      toast.success('Comparison complete');
    } catch (err) {
      toast.error(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="text-quantum-blue" />
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            High-level summary of hybrid quantum-classical threat detection
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Size</label>
          <select
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            disabled={loading}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
          >
            {[100, 200, 400, 800].map(n => (
              <option key={n} value={n}>{n} records</option>
            ))}
          </select>
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
              Running Pipeline...
            </>
          ) : (
            <>
              <Play size={16} /> Run Full Comparison
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {loading && (
        <Spinner label={`Training all 4 models on ${sampleSize} samples... (may take 2-10 min)`} />
      )}

      {!loading && !results && (
        <EmptyState
          icon={Activity}
          title="No comparison data yet"
          description="Click 'Run Full Comparison' to train all 4 models (Random Forest, SVM, QSVM, VQC) on the same data and see the results."
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

          {/* Charts + Insights */}
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
              <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
                <p>Run ID: <span className="font-mono">{results.run_id}</span></p>
                <p>Sample: {results.sample_used} · PCA Variance: {results.pca_variance_retained}%</p>
              </div>
            </div>
          </div>

          {/* Full Table */}
          <ComparisonTable
            comparisonTable={results.comparison_table}
            bestModel={results.best_model}
          />
        </>
      )}
    </div>
  );
}