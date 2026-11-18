import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { api } from '../../services/api';

export default function Header() {
  const [healthy, setHealthy] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    const check = () => {
      api.health()
        .then(() => { setHealthy(true); setLastCheck(new Date()); })
        .catch(() => setHealthy(false));
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-quantum-blue to-quantum-purple rounded-lg flex items-center justify-center">
          <Shield className="text-white" size={22} />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Quantum IDS</h1>
          <p className="text-xs text-slate-500 leading-tight">Hybrid Quantum ML · Cybersecurity Threat Detection</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
          <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">
            {healthy === null ? 'Checking...' : healthy ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Last health check</p>
          <p className="text-xs font-semibold">
            {lastCheck ? lastCheck.toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>
    </header>
  );
}