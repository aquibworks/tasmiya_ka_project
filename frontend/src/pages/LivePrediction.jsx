import React from 'react';
import { Target, Clock, CheckCircle2, Layers, Database } from 'lucide-react';

export default function LivePrediction() {
  const features = [
    {
      icon: Database,
      title: 'Model Persistence',
      description: 'Trained models will be serialized to disk (joblib for classical, parameter vectors for VQC) so they can be loaded for instant inference.',
      status: 'Scaffolded',
    },
    {
      icon: Layers,
      title: 'Single-Record Preprocessing',
      description: 'A 41-field NSL-KDD input form that runs through the saved encoder → scaler → PCA pipeline for real-world record classification.',
      status: 'Designed',
    },
    {
      icon: CheckCircle2,
      title: 'Real-Time Inference',
      description: 'Instant Normal/Attack prediction with per-model confidence scores and audit logging for SOC (Security Operations Center) integration.',
      status: 'Planned — Phase 2',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="text-quantum-blue" /> Live Prediction
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Phase 2
          </span>
        </h1>
        <p className="text-slate-500 text-sm">
          Real-time classification of individual network records
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Clock className="text-quantum-blue flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h2 className="font-bold text-slate-800">Scoped for Phase 2</h2>
            <p className="text-sm text-slate-600 mt-1">
              Live prediction on individual records requires model persistence and per-record preprocessing,
              both of which are architecturally scaffolded but not yet wired. The current system already
              trains, evaluates, and benchmarks all 4 models — this page will extend it to real-time
              inference for production SOC (Security Operations Center) deployment.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {features.map(({ icon: Icon, title, description, status }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="text-slate-600" size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{title}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 mb-2">Current capabilities you can demo today:</h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li><strong>Training Lab:</strong> Live comparison of 4 models with real quantum simulation</li>
          <li><strong>Dashboard:</strong> Full metrics, charts, and auto-generated analysis</li>
          <li><strong>Upload Pipeline:</strong> Run the entire pipeline on any uploaded NSL-KDD dataset</li>
          <li><strong>Run History & Reports:</strong> Full audit trail with JSON export</li>
        </ul>
      </div>
    </div>
  );
}