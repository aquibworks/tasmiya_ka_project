import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AccuracyChart({ comparisonTable }) {
  const data = Object.entries(comparisonTable).map(([name, m]) => ({
    name: name.replace(' (4-Qubit)', ''),
    Accuracy: m.accuracy,
    FPR: m.fpr,
    'F1 Score': m.f1_score * 100,
  }));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="font-bold mb-4">Model Performance Comparison</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Accuracy" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          <Bar dataKey="FPR" fill="#ef4444" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}