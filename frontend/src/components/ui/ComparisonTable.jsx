import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function ComparisonTable({ comparisonTable, bestModel }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="font-bold">Full Model Comparison</h3>
        <p className="text-xs text-slate-500">Click any row to see interpretation</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-4 py-3"></th>
            <th className="text-left px-4 py-3">Model</th>
            <th className="px-4 py-3">Accuracy</th>
            <th className="px-4 py-3">Precision</th>
            <th className="px-4 py-3">Recall</th>
            <th className="px-4 py-3">F1</th>
            <th className="px-4 py-3">FPR</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(comparisonTable).map(([name, m]) => (
            <React.Fragment key={name}>
              <tr
                onClick={() => setExpanded(expanded === name ? null : name)}
                className={`border-t cursor-pointer hover:bg-slate-50 ${
                  name === bestModel ? 'bg-yellow-50 font-semibold' : ''
                }`}
              >
                <td className="px-4 py-3 text-slate-400">
                  {expanded === name ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </td>
                <td className="text-left px-4 py-3">
                  {name === bestModel && '🏆 '}{name}
                </td>
                <td className="text-center px-4 py-3">{m.accuracy}%</td>
                <td className="text-center px-4 py-3">{m.precision}%</td>
                <td className="text-center px-4 py-3">{m.recall}%</td>
                <td className="text-center px-4 py-3">{m.f1_score}</td>
                <td className="text-center px-4 py-3">{m.fpr}%</td>
              </tr>
              {expanded === name && (
                <tr className="bg-slate-50">
                  <td></td>
                  <td colSpan={6} className="px-4 py-3 text-xs text-slate-600">
                    <p>
                      <strong>Interpretation:</strong> {name} correctly caught <strong>{m.recall}%</strong> of actual attacks (Recall), 
                      flagged <strong>{m.fpr}%</strong> of normal traffic as attacks (FPR), and achieved an F1 balance of <strong>{m.f1_score}</strong>.
                    </p>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}