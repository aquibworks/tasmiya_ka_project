import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

const levelColor = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

export default function LogViewer({ logs = [], title = 'Training Logs', running = false }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-mono">
          <Terminal size={14} /> {title}
        </div>
        {running && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> LIVE
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 && (
          <p className="text-slate-500">Waiting for training to start...</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-500">[{log.time}]</span>
            <span className={levelColor[log.level] || 'text-slate-300'}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}