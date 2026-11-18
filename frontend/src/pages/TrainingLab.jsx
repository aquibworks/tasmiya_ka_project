import React, { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, FlaskConical, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import LogViewer from '../components/ui/LogViewer';
import ResultCard from '../components/ui/ResultCard';

const SAMPLE_OPTIONS = [100, 200, 400, 800];

// Match model names regardless of capitalization or formatting.
const findModelResult = (results, modelName) => {
  if (!results || typeof results !== 'object') return null;

  const target = modelName.toLowerCase();

  const entry = Object.entries(results).find(([key]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized === target || normalized.startsWith(target);
  });

  return entry ? entry[1] : null;
};

// Helper to extract metrics if the backend returns an array [metrics, metadata]
const extractMetrics = (entry) => {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry[0]; // Returns the first item (metrics)
  return entry;
};

export default function TrainingLab() {
  const [sampleSize, setSampleSize] = useState(100);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(null);
  const [classicalResults, setClassicalResults] = useState(null);
  const [quantumResults, setQuantumResults] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);

  const addLog = (message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB');
    setLogs(prev => [...prev, { time, message, level }]);
  };

  const startTimer = () => {
    stopTimer();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(previous => previous + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const reset = () => {
    setLogs([]);
    setClassicalResults(null);
    setQuantumResults(null);
    setElapsed(0);
  };

  const runClassical = async () => {
    reset();
    setRunning(true);
    setStage('classical');
    startTimer();

    addLog(`Starting classical pipeline (sample_size=${sampleSize})...`);
    addLog('Step 1/3: Preprocessing NSL-KDD data...');
    addLog('Step 2/3: Training Random Forest (100 trees, depth 10)...');
    addLog('Step 3/3: Training SVM (RBF kernel, C=1.0)...');
    addLog('Calling /api/train/classical ...');

    try {
      const data = await api.trainClassical();
      console.log('CLASSICAL API RESPONSE:', data);

      if (data?.status !== 'success' || !data.results) {
        throw new Error(data?.message || 'Invalid classical API response');
      }

      const results = data.results;
      const randomForest = extractMetrics(findModelResult(results, 'randomforest'));
      const classicalSVM = extractMetrics(findModelResult(results, 'classicalsvm'));

      setClassicalResults({
        'Random Forest': randomForest,
        'Classical SVM': classicalSVM,
      });

      addLog(`✓ Random Forest — Accuracy: ${randomForest?.accuracy ?? 'N/A'}%`, 'success');
      addLog(`✓ Classical SVM — Accuracy: ${classicalSVM?.accuracy ?? 'N/A'}%`, 'success');
      addLog('Classical training complete.', 'success');
      toast.success('Classical training completed');
    } catch (err) {
      console.error('CLASSICAL TRAINING ERROR:', err);
      addLog(`✗ Error: ${err.message}`, 'error');
      toast.error(err.message || 'Classical training failed');
    } finally {
      setRunning(false);
      setStage(null);
      stopTimer();
    }
  };

  const runQuantum = async () => {
    reset();
    setRunning(true);
    setStage('quantum');
    startTimer();
    addLog(`Starting quantum pipeline (sample_size=${sampleSize})...`);
    addLog('Computing quantum kernel matrix (this is slow)...');
    addLog('This will take 1–10 minutes.', 'warning');

    try {
      const data = await api.trainQuantum(sampleSize, sampleSize / 2);
      console.log('%c[QUANTUM RESPONSE]', 'color: purple; font-weight:bold', data);

      if (!data || data.status !== 'success') {
        addLog(`✗ Error: ${data?.message || 'Unknown'}`, 'error');
        return;
      }

      const results = data.results || {};
      
      // Explicitly extract the metrics (index 0) from the arrays
      const qsvm = extractMetrics(results.QSVM);
      const vqc = extractMetrics(results.VQC);

      console.log('Extracted QSVM:', qsvm);
      console.log('Extracted VQC:', vqc);

      if (!qsvm || !vqc) {
        addLog('✗ Could not map QSVM/VQC data properly', 'error');
        return;
      }

      setQuantumResults({ QSVM: qsvm, VQC: vqc });
      addLog(`✓ QSVM done — Accuracy ${qsvm.accuracy}%`, 'success');
      addLog(`✓ VQC done — Accuracy ${vqc.accuracy}%`, 'success');
      toast.success('Quantum models trained successfully');
    } catch (err) {
      console.error(err);
      addLog(`✗ Network error: ${err.message}`, 'error');
    } finally {
      setRunning(false);
      setStage(null);
      stopTimer();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="text-quantum-blue" />
            Training Lab
          </h1>
          <p className="text-slate-500 text-sm">
            Run classical & quantum pipelines live on real NSL-KDD data
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Elapsed</p>
          <p className="text-xl font-mono font-bold text-slate-800">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
            {String(elapsed % 60).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sample Size
            </label>
            <select
              value={sampleSize}
              onChange={e => setSampleSize(Number(e.target.value))}
              disabled={running}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
            >
              {SAMPLE_OPTIONS.map(n => (
                <option key={n} value={n}>
                  {n} records
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <button
            onClick={runClassical}
            disabled={running}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {stage === 'classical' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Classical
              </>
            )}
          </button>

          <button
            onClick={runQuantum}
            disabled={running}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {stage === 'quantum' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Zap size={16} />
                Run Quantum
              </>
            )}
          </button>

          <button
            onClick={reset}
            disabled={running}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Live Logs */}
      <LogViewer
        logs={logs}
        running={running}
        title={
          stage === 'classical'
            ? 'Classical Training Logs'
            : stage === 'quantum'
              ? 'Quantum Training Logs'
              : 'Training Logs'
        }
      />

      {/* Results */}
      {(classicalResults || quantumResults) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classicalResults && (
            <>
              <ResultCard
                title="🌲 Random Forest"
                metrics={classicalResults['Random Forest']}
                type="classical"
              />
              <ResultCard
                title="📐 Classical SVM"
                metrics={classicalResults['Classical SVM']}
                type="classical"
              />
            </>
          )}

          {quantumResults && (
            <>
              <ResultCard
                title="⚛️ QSVM (4-Qubit)"
                metrics={quantumResults.QSVM}
                type="quantum"
              />
              <ResultCard
                title="⚛️ VQC (4-Qubit)"
                metrics={quantumResults.VQC}
                type="quantum"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}