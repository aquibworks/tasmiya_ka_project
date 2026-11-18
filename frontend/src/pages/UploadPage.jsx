import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function UploadPage() {
  const [uploaded, setUploaded] = useState(null); // Dataset metadata
  const [loading, setLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [runningPipeline, setRunningPipeline] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setUploaded(null);
    setPipelineResult(null);
    try {
      const data = await api.upload(file);
      if (data.status === 'success') {
        setUploaded(data.dataset);
        toast.success('File uploaded and parsed successfully');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'text/csv': ['.csv'] },
    multiple: false,
  });

  const runPipeline = async () => {
    if (!uploaded) return;
    setRunningPipeline(true);
    setPipelineResult(null);
    try {
      const data = await api.pipelineUpload({
        dataset_id: uploaded.dataset_id,
        sample_size: 100,
        test_size: 50,
      });
      if (data.status === 'success') {
        setPipelineResult(data);
        toast.success('Pipeline completed successfully');
      } else {
        toast.error(data.message || 'Pipeline failed');
      }
    } catch (err) {
      toast.error(err.message || 'Request failed');
    } finally {
      setRunningPipeline(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="text-quantum-blue" /> Upload & Pipeline
        </h1>
        <p className="text-slate-500 text-sm">
          Upload your own NSL-KDD dataset and run all 4 models on it
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          isDragActive ? 'border-quantum-blue bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto text-slate-400 mb-2" size={40} />
        <p className="font-medium">Drag & drop your .txt or .csv file here</p>
        <p className="text-xs text-slate-500 mt-1">or click to browse</p>
        {loading && <p className="text-sm text-quantum-blue mt-2">Uploading & parsing...</p>}
      </div>

      {/* Uploaded File Info */}
      {uploaded && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <FileText className="text-quantum-blue mt-1" />
              <div>
                <p className="font-semibold">{uploaded.filename}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Dataset ID: <span className="font-mono">{uploaded.dataset_id}</span>
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span>Format: <strong>{uploaded.detected_format}</strong></span>
                  <span>Rows: <strong>{uploaded.total_rows.toLocaleString()}</strong></span>
                  <span>Columns: <strong>{uploaded.total_columns}</strong></span>
                </div>
              </div>
            </div>
            <CheckCircle2 className="text-green-500" />
          </div>

          {/* Preview Table */}
          {uploaded.preview && uploaded.preview.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <p className="text-xs font-semibold text-slate-500 mb-2">Data Preview (first 5 rows)</p>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {Object.keys(uploaded.preview[0]).slice(0, 6).map(k => (
                      <th key={k} className="border px-2 py-1 text-left">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploaded.preview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.keys(row).slice(0, 6).map(k => (
                        <td key={k} className="border px-2 py-1">{String(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={runPipeline}
            disabled={runningPipeline}
            className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:bg-slate-300 transition"
          >
            {runningPipeline ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Play size={16} /> Run Full Pipeline (4 models)
              </>
            )}
          </button>
        </div>
      )}

      {/* Pipeline Result */}
      {pipelineResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-3">
            <CheckCircle2 className="text-green-500" /> Pipeline Complete
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            Best model: <strong>{pipelineResult.best_model}</strong> with{' '}
            <strong>{pipelineResult.best_metrics.accuracy}%</strong> accuracy and{' '}
            <strong>{pipelineResult.best_metrics.fpr}%</strong> FPR.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(pipelineResult.comparison_table).map(([name, m]) => (
              <div key={name} className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold">{name}</p>
                <p className="text-lg font-bold">{m.accuracy}%</p>
                <p className="text-xs text-slate-500">FPR: {m.fpr}% · F1: {m.f1_score}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Run ID: <span className="font-mono">{pipelineResult.run_id}</span>
          </p>
        </div>
      )}
    </div>
  );
}