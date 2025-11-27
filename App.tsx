import React, { useState } from 'react';
import { Cpu, Zap, RotateCcw, ShieldCheck } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import { AnalysisStatus, LogEntry } from './types';
import { convertVBACode, analyzeCodeIssues } from './services/geminiService';

export default function App() {
  const [inputCode, setInputCode] = useState<string>('');
  const [outputCode, setOutputCode] = useState<string>('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    }]);
  };

  const handleReset = () => {
    setInputCode('');
    setOutputCode('');
    setLogs([]);
    setStatus(AnalysisStatus.IDLE);
    addLog('System reset.', 'info');
  };

  const handleProcess = async () => {
    if (!inputCode.trim()) {
      addLog('Input is empty. Please provide VBV/VBA code.', 'warning');
      return;
    }

    // Phase 1: Analyze
    setStatus(AnalysisStatus.ANALYZING);
    addLog('Initializing code analysis module...', 'info');
    
    // Quick heuristic check before AI
    const hasPtrSafe = inputCode.toLowerCase().includes('ptrsafe');
    const hasLongPtr = inputCode.toLowerCase().includes('longptr');
    
    if (!hasPtrSafe) {
        addLog('Detected potential 32-bit legacy Declarations (Missing PtrSafe).', 'warning');
    } else {
        addLog('Found "PtrSafe" keywords, checking deep compatibility...', 'info');
    }

    try {
        // AI Analysis
        const issues = await analyzeCodeIssues(inputCode);
        if (issues.length > 0) {
            issues.forEach(issue => addLog(`Issue identified: ${issue}`, 'warning'));
        } else {
             addLog('Code structure looks mostly compatible, but will optimize.', 'success');
        }

        // Phase 2: Convert
        setStatus(AnalysisStatus.CONVERTING);
        addLog('Starting Generative AI conversion engine...', 'info');
        
        const converted = await convertVBACode(inputCode);
        
        setOutputCode(converted);
        setStatus(AnalysisStatus.COMPLETED);
        addLog('Conversion completed successfully.', 'success');
        addLog('Code is now compatible with 32-bit and 64-bit systems.', 'success');

    } catch (error: any) {
        setStatus(AnalysisStatus.ERROR);
        addLog(error.message || 'An unknown error occurred.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">VBV Code Doctor</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">AI Powered Architecture Fixer</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
             <ShieldCheck size={14} className="text-emerald-400"/>
             <span>x64 Support</span>
           </div>
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
             <ShieldCheck size={14} className="text-blue-400"/>
             <span>x86 Support</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
        
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <h2 className="text-slate-300 font-medium">مساحة العمل</h2>
            <div className="flex gap-2">
                <button 
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all flex items-center gap-2 border border-slate-700 font-medium text-sm"
                >
                    <RotateCcw size={16} />
                    <span>تفريغ</span>
                </button>
                <button 
                  onClick={handleProcess}
                  disabled={status === AnalysisStatus.ANALYZING || status === AnalysisStatus.CONVERTING}
                  className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 font-bold text-sm shadow-lg
                    ${status === AnalysisStatus.ANALYZING || status === AnalysisStatus.CONVERTING 
                      ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed border border-indigo-800' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 border border-indigo-500'}`}
                >
                    <Zap size={16} className={status === AnalysisStatus.CONVERTING ? "fill-current" : ""} />
                    <span>فحص ومعالجة الكود</span>
                </button>
            </div>
        </div>

        {/* Editors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
            <CodeEditor 
                title="الكود الأصلي (VBV/VBA)" 
                code={inputCode} 
                onChange={setInputCode}
                placeholder="ألصق كود VBV أو VBA هنا... مثال: Private Declare Function..."
                borderColor={inputCode && !inputCode.toLowerCase().includes('ptrsafe') ? 'border-amber-500/30' : 'border-slate-700'}
            />
            <CodeEditor 
                title="الكود المعالج (x86 & x64)" 
                code={outputCode} 
                readOnly
                placeholder="سيظهر الكود المصحح هنا..."
                borderColor={outputCode ? 'border-emerald-500/30' : 'border-slate-700'}
            />
        </div>
      </main>

      {/* Terminal/Footer */}
      <footer className="shrink-0 z-10">
        <Terminal logs={logs} status={status} />
      </footer>
    </div>
  );
}