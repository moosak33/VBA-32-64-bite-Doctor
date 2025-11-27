import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Activity, AlertTriangle, Check, Info, Loader2 } from 'lucide-react';
import { LogEntry, AnalysisStatus } from '../types';

interface TerminalProps {
  logs: LogEntry[];
  status: AnalysisStatus;
}

const Terminal: React.FC<TerminalProps> = ({ logs, status }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStatusColor = () => {
    switch(status) {
        case AnalysisStatus.ANALYZING: return "text-blue-400";
        case AnalysisStatus.CONVERTING: return "text-purple-400";
        case AnalysisStatus.COMPLETED: return "text-green-400";
        case AnalysisStatus.ERROR: return "text-red-400";
        default: return "text-slate-400";
    }
  };

  const getStatusText = () => {
      switch(status) {
          case AnalysisStatus.ANALYZING: return "جاري تحليل التوافق...";
          case AnalysisStatus.CONVERTING: return "جاري التحويل الذكي...";
          case AnalysisStatus.COMPLETED: return "جاهز";
          case AnalysisStatus.ERROR: return "حدث خطأ";
          default: return "خامل";
      }
  };

  return (
    <div className="flex flex-col h-48 bg-black/40 border-t border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
            <TerminalIcon size={14} />
            <span className="text-xs font-mono font-bold tracking-wider">SYSTEM_OUTPUT</span>
        </div>
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
            {status === AnalysisStatus.ANALYZING || status === AnalysisStatus.CONVERTING ? (
                <Loader2 size={14} className="animate-spin" />
            ) : <Activity size={14} />}
            <span className="text-xs font-mono">{getStatusText()}</span>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5" 
        dir="ltr"
      >
        {logs.length === 0 && (
            <div className="text-slate-600 italic opacity-50 text-center mt-4">Waiting for input...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 animate-fadeIn">
            <span className="text-slate-600 shrink-0">[{log.timestamp.toLocaleTimeString('en-US', {hour12: false})}]</span>
            {log.type === 'info' && <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />}
            {log.type === 'success' && <Check size={14} className="text-green-500 mt-0.5 shrink-0" />}
            {log.type === 'warning' && <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />}
            {log.type === 'error' && <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />}
            <span className={`break-all ${
                log.type === 'error' ? 'text-red-300' : 
                log.type === 'success' ? 'text-green-300' :
                log.type === 'warning' ? 'text-yellow-300' : 'text-slate-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;