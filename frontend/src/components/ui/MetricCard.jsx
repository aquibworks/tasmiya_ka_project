import React from 'react';

const colorMap = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
};

export default function MetricCard({ label, value, unit = '', color = 'blue', subtitle, icon: Icon }) {
  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold opacity-70 tracking-wide">{label}</p>
        {Icon && <Icon size={16} className="opacity-60" />}
      </div>
      <p className="text-2xl font-bold mt-1">
        {value}<span className="text-sm font-medium ml-1 opacity-70">{unit}</span>
      </p>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
}