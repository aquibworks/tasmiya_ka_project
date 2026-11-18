
import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ResultCard({
  title,
  metrics,
  type = 'classical',
}) {
  // Support both direct and nested metric objects.
  const data = metrics?.metrics || metrics;

  // Handle missing or empty metrics.
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    Object.keys(data).length === 0
  ) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <p className="text-slate-400 text-sm">
          Waiting for {title}...
        </p>
      </div>
    );
  }

  // Safely convert values into finite numbers.
  const getNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  // Extract metrics with fallback key support.
  const accuracy = getNumber(data.accuracy);
  const f1 = getNumber(data.f1_score ?? data.f1);
  const precision = getNumber(data.precision);
  const recall = getNumber(data.recall);
  const fpr = getNumber(
    data.fpr ?? data.false_positive_rate
  );

  // Format metric values.
  const format = (value, suffix = '') => {
    return value === null ? '—' : `${value}${suffix}`;
  };

  // Choose card accent based on model type.
  const accent =
    type === 'quantum'
      ? 'from-purple-500 to-indigo-600'
      : 'from-blue-500 to-cyan-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className={`bg-gradient-to-r ${accent} px-4 py-3`}>
        <h3 className="text-white font-semibold">
          {title}
        </h3>
      </div>

      {/* Metrics */}
      <div className="p-4 grid grid-cols-2 gap-3 text-sm">

        {/* Accuracy */}
        <div>
          <p className="text-slate-500 text-xs">
            Accuracy
          </p>

          <p className="font-bold text-lg text-slate-800">
            {format(accuracy, '%')}
          </p>
        </div>

        {/* F1 Score */}
        <div>
          <p className="text-slate-500 text-xs">
            F1 Score
          </p>

          <p className="font-bold text-lg text-slate-800">
            {format(f1)}
          </p>
        </div>

        {/* Precision */}
        <div>
          <p className="text-slate-500 text-xs">
            Precision
          </p>

          <p className="font-semibold text-slate-700">
            {format(precision, '%')}
          </p>
        </div>

        {/* Recall */}
        <div>
          <p className="text-slate-500 text-xs">
            Recall
          </p>

          <p className="font-semibold text-slate-700">
            {format(recall, '%')}
          </p>
        </div>

        {/* False Positive Rate */}
        <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-slate-100">

          {fpr !== null && fpr <= 5 ? (
            <CheckCircle2
              size={14}
              className="text-green-500"
            />
          ) : (
            <AlertTriangle
              size={14}
              className="text-amber-500"
            />
          )}

          <span className="text-xs text-slate-600">
            False-Positive Rate:{' '}
            <strong>
              {format(fpr, '%')}
            </strong>
          </span>

        </div>
      </div>
    </div>
  );
}
