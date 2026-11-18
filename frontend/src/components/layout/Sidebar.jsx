import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, Upload, BarChart3,
  History, Target, Cpu
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/training', label: 'Training Lab', icon: FlaskConical },
  { to: '/upload', label: 'Upload & Pipeline', icon: Upload },
  { to: '/compare', label: 'Comparison', icon: BarChart3 },
  { to: '/history', label: 'Run History', icon: History },
  { to: '/predict', label: 'Live Prediction', icon: Target },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-quantum-dark text-white flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <p className="text-xs text-slate-400 uppercase tracking-wider">Navigation</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-quantum-blue text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Cpu size={14} />
          <span>v1.0.0 · NISQ Simulation</span>
        </div>
      </div>
    </aside>
  );
}