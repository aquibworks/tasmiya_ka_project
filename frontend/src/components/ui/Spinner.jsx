import React from 'react';

export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-quantum-blue rounded-full animate-spin" />
      <p className="text-sm text-slate-500 mt-3">{label}</p>
    </div>
  );
}