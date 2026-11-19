import React, { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, FlaskConical, Zap, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import LogViewer from '../components/ui/LogViewer';
import ResultCard from '../components/ui/ResultCard';

const SAMPLE_OPTIONS = [50, 100, 200, 400, 800, 4000];
const STORAGE_KEY = 'quantum_ids_training_state';

// --- GLOBAL CACHE TO SURVIVE TAB SWITCHES ---
let globalTimer = null;
let globalStartTime = null;
let globalRunning = false;
let globalStage = null;

const extractMetrics = (entry) => {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry[0];
  return entry;
};

const formatSampleLabel = (n) => {
  if (n === 4000) return 'Full Dataset (4000)';
  return `${n} records`;
};

const formatSplit = (n, which) => {
  if (n === 4000) {
    return which === 'train'
      ? '~2000 normal + ~2000 attack'
      : '~400 normal + ~400 attack';
  }
  if (which === 'train') {
    return `${n / 2} normal + ${n / 2} attack`;
  }
  return `${Math.round(n / 4)} normal + ${Math.round(n / 4)} attack`;
};

export default function TrainingLab() {
  const [sampleSize, setSampleSize] = useState(100);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(globalRunning);
  const [stage, setStage] = useState(globalStage);
  const [classicalResults, setClassicalResults] = useState(null);
  const [quantumResults, setQuantumResults] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [recovered, setRecovered] = useState(false);
  const [lastFailedAction, setLastFailedAction] = useState(null);
  const timerRef = useRef(null);

  // Restore from localStorage on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      if (state.logs) setLogs(state.logs);
      if (state.classicalResults) setClassicalResults(state.classicalResults);
      if (state.quantumResults) setQuantumResults(state.quantumResults);
      if (state.sampleSize) setSampleSize(state.sampleSize);
      setRecovered(true);

      if (globalRunning && globalStartTime) {
        setRunning(true);
        setStage(globalStage);
        startTimerFromGlobal();
      } else if (state.wasRunning) {
        setLogs((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString('en-GB'),
            message: '⚠️ Page was refreshed mid-training. The previous job was interrupted. Please re-run.',
            level: 'warning',
          },
        ]);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }, []);

  // Save state on change
  useEffect(() => {
    if (logs.length > 0 || classicalResults || quantumResults) {
      const state = {
        logs,
        classicalResults,
        quantumResults,
        sampleSize,
        stage,
        wasRunning: running,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [logs, classicalResults, quantumResults, stage, running, sampleSize]);

  const startTimer = () => {
    stopTimer();
    globalStartTime = Date.now();
    setElapsed(0);
    globalTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - globalStartTime) / 1000));
    }, 1000);
    timerRef.current = globalTimer;
  };

  const startTimerFromGlobal = () => {
    stopTimer();
    globalTimer = setInterval(() => {
      if (globalStartTime) {
        setElapsed(Math.floor((Date.now() - globalStartTime) / 1000));
      }
    }, 1000);
    timerRef.current = globalTimer;
  };

  const stopTimer = () => {
    if (globalTimer) { clearInterval(globalTimer); globalTimer = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const addLog = (message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB');
    setLogs((prev) => [...prev, { time, message, level }]);
  };

  const reset = () => {
    setLogs([]);
    setClassicalResults(null);
    setQuantumResults(null);
    setElapsed(0);
    setStage(null);
    setRunning(false);
    setRecovered(false);
    setLastFailedAction(null);
    stopTimer();
    globalRunning = false;
    globalStage = null;
    globalStartTime = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  const runClassical = async () => {
    reset();
    setRunning(true);
    setStage('classical');
    globalRunning = true;
    globalStage = 'classical';
    startTimer();

    addLog(`Starting classical pipeline`);
    addLog(`📊 TRAIN: ${sampleSize} records (${formatSplit(sampleSize, 'train')})`, 'info');
    addLog(`📊 TEST:  ${Math.round(sampleSize / 2)} records (${formatSplit(sampleSize, 'test')})`, 'info');
    addLog('Step 1: Preprocessing NSL-KDD data...');
    addLog('Step 2: Training Random Forest...');
    addLog('Step 3: Training SVM (RBF)...');

    try {
      const data = await api.trainClassical();
      if (data?.status === 'success' && data.results) {
        setClassicalResults(data.results);
        addLog(`✓ Random Forest — Accuracy: ${data.results['Random Forest']?.accuracy}%`, 'success');
        addLog(`✓ Classical SVM — Accuracy: ${data.results['Classical SVM']?.accuracy}%`, 'success');
        toast.success('Classical training completed');
      } else {
        addLog(`✗ ${data?.message || 'Failed'}`, 'error');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        addLog('✗ Timeout — try a smaller sample size.', 'error');
        addLog('💡 Suggested: 100 or 200 samples', 'warning');
        setLastFailedAction({ type: 'classical', sampleSize });
        toast.error('Timeout — try smaller sample');
      } else {
        addLog(`✗ ${err.message}`, 'error');
        setLastFailedAction({ type: 'classical', sampleSize });
      }
    } finally {
      setRunning(false);
      setStage(null);
      globalRunning = false;
      globalStage = null;
      stopTimer();
    }
  };

  const runQuantum = async () => {
    reset();
    setRunning(true);
    setStage('quantum');
    globalRunning = true;
    globalStage = 'quantum';
    startTimer();

    addLog(`Starting quantum pipeline`);
    addLog(`📊 TRAIN: ${sampleSize} records (${formatSplit(sampleSize, 'train')})`, 'info');
    addLog(`📊 TEST:  ${Math.round(sampleSize / 2)} records (${formatSplit(sampleSize, 'test')})`, 'info');
    addLog('Step 1: Preprocessing + PCA to 4 features...');
    addLog('Step 2: Computing QSVM quantum kernel matrix...', 'warning');
    addLog('Step 3: Training VQC with COBYLA...', 'warning');
    addLog('⏱️ 1–10 minutes. You can switch tabs — training continues in the backend.', 'info');

    try {
      const data = await api.trainQuantum(sampleSize, sampleSize / 2);
      if (data?.status === 'success') {
        const qsvm = extractMetrics(data.results.QSVM);
        const vqc = extractMetrics(data.results.VQC);
        setQuantumResults({ QSVM: qsvm, VQC: vqc });
        addLog(`✓ QSVM — Accuracy: ${qsvm?.accuracy}%`, 'success');
        addLog(`✓ VQC — Accuracy: ${vqc?.accuracy}%`, 'success');
        toast.success('Quantum training completed');
      } else {
        addLog(`✗ ${data?.message || 'Failed'}`, 'error');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        addLog('✗ Timeout — quantum simulation took too long.', 'error');
        addLog('💡 Suggested: 100 or 200 samples', 'warning');
        setLastFailedAction({ type: 'quantum', sampleSize });
        toast.error('Timeout — try smaller sample');
      } else {
        addLog(`✗ ${err.message}`, 'error');
        setLastFailedAction({ type: 'quantum', sampleSize });
      }
    } finally {
      setRunning(false);
      setStage(null);
      globalRunning = false;
      globalStage = null;
      stopTimer();
    }
  };

  const retryLastAction = () => {
    if (!lastFailedAction) return;
    const { type, sampleSize: savedSize } = lastFailedAction;
    setSampleSize(savedSize);
    setLastFailedAction(null);
    setTimeout(() => {
      if (type === 'quantum') runQuantum();
      else runClassical();
    }, 50);
  };

  const switchToSmaller = () => {
    setSampleSize(100);
    setLastFailedAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="text-quantum-blue" /> Training Lab
          </h1>
          <p className="text-slate-500 text-sm">Run classical & quantum pipelines live on real NSL-KDD data</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Elapsed</p>
          <p className="text-xl font-mono font-bold text-slate-800">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </p>
        </div>
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
          <p className="text-blue-700 text-xs mt-1">PCA compresses 41+ features → 4 components (~74% variance retained).</p>
        </div>
      </div>

      {/* Recovered banner */}
      {recovered && !running && logs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm">
          <Clock className="text-amber-600" size={16} />
          <span className="text-amber-800">
            Showing results from a previous session. Click <strong>Reset</strong> to start fresh.
          </span>
        </div>
      )}

      {/* Retry banner */}
      {lastFailedAction && !running && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={18} />
            <span className="text-red-800 text-sm">
              Last <strong>{lastFailedAction.type}</strong> run failed at <strong>{lastFailedAction.sampleSize}</strong> samples.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={retryLastAction}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Retry Same
            </button>
            <button
              onClick={switchToSmaller}
              className="text-sm bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-50"
            >
              Switch to 100
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Size</label>
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              disabled={running}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
            >
              {SAMPLE_OPTIONS.map((n) => (
                <option key={n} value={n}>{formatSampleLabel(n)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={runClassical}
            disabled={running}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 transition"
          >
            {stage === 'classical' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Training...
              </>
            ) : (
              <><Play size={16} /> Run Classical</>
            )}
          </button>
          <button
            onClick={runQuantum}
            disabled={running}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 transition"
          >
            {stage === 'quantum' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              <><Zap size={16} /> Run Quantum</>
            )}
          </button>
          <button
            onClick={reset}
            disabled={running}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

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

      {(classicalResults || quantumResults) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classicalResults && (
            <>
              <ResultCard title="🌲 Random Forest" metrics={classicalResults['Random Forest']} type="classical" />
              <ResultCard title="📐 Classical SVM" metrics={classicalResults['Classical SVM']} type="classical" />
            </>
          )}
          {quantumResults && (
            <>
              <ResultCard title="⚛️ QSVM (4-Qubit)" metrics={quantumResults.QSVM} type="quantum" />
              <ResultCard title="⚛️ VQC (4-Qubit)" metrics={quantumResults.VQC} type="quantum" />
            </>
          )}
        </div>
      )}
    </div>
  );
}