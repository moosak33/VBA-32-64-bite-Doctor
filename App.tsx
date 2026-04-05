import React, { useState, useEffect } from 'react';
import { Cpu, Zap, RotateCcw, ShieldCheck, Settings2, FileCode, MessageSquare, Bug, Hash, AlignLeft, Wrench, Activity, Languages, Globe, Sparkles } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import { AnalysisStatus, LogEntry, ProcessingOptions } from './types';
import { convertVBACode, analyzeCodeIssues } from './services/geminiService';

export default function App() {
  const [inputCode, setInputCode] = useState<string>('');
  const [outputCode, setOutputCode] = useState<string>('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [customInstruction, setCustomInstruction] = useState<string>('');
  
  // Global Usage Counter State
  const [usageCount, setUsageCount] = useState<number>(0);
  const [isCountLoaded, setIsCountLoaded] = useState<boolean>(false);
  
  // Options State - Updated Defaults
  const [options, setOptions] = useState<ProcessingOptions>({
    compatibility: false,
    formatting: false,
    commentsAr: false,
    commentsEn: false,
    errorHandling: false,
    lineNumbers: false,
    codeCorrection: true
  });

  // Fetch Global Count on Mount
  useEffect(() => {
    const fetchGlobalCount = async () => {
      try {
        const response = await fetch('https://api.countapi.xyz/get/gemini-vba-doctor-v2/conversions');
        if (response.ok) {
          const data = await response.json();
          setUsageCount(data.value || 0);
          setIsCountLoaded(true);
        } else {
          setUsageCount(0);
          setIsCountLoaded(true);
        }
      } catch (error) {
        useFallbackCount();
      }
    };

    const useFallbackCount = () => {
      const local = parseInt(localStorage.getItem('vba_doctor_usage') || '0', 10);
      setUsageCount(local); 
      setIsCountLoaded(true);
    };

    fetchGlobalCount();
  }, []);

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
    setCustomInstruction('');
    setLogs([]);
    setStatus(AnalysisStatus.IDLE);
    addLog('System reset.', 'info');
  };

  const toggleOption = (key: keyof ProcessingOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProcess = async () => {
    if (!inputCode.trim()) {
      addLog('Input is empty. Please provide VBA code.', 'warning');
      return;
    }

    // Phase 1: Analyze
    setStatus(AnalysisStatus.ANALYZING);
    addLog('Initializing code analysis module...', 'info');
    
    // Quick heuristic check before AI
    if (options.compatibility) {
        const hasPtrSafe = inputCode.toLowerCase().includes('ptrsafe');
        if (!hasPtrSafe) {
            addLog('Detected potential 32-bit legacy Declarations (Missing PtrSafe).', 'warning');
        }
    }

    try {
        const issues = await analyzeCodeIssues(inputCode);
        if (issues.length > 0) {
            issues.forEach(issue => addLog(`Issue identified: ${issue}`, 'warning'));
        } else {
             addLog('Initial structure analysis completed.', 'success');
        }

        // Phase 2: Convert
        setStatus(AnalysisStatus.CONVERTING);
        addLog('Applying selected processing rules...', 'info');
        if (customInstruction.trim()) {
            addLog(`Applying custom direction: "${customInstruction.substring(0, 30)}..."`, 'info');
        }
        
        const converted = await convertVBACode(inputCode, options, customInstruction);
        
        setOutputCode(converted);
        setStatus(AnalysisStatus.COMPLETED);
        addLog('Processing completed successfully.', 'success');
        
        // Increment Global Usage Counter
        try {
          const res = await fetch('https://api.countapi.xyz/hit/gemini-vba-doctor-v2/conversions');
          if (res.ok) {
            const data = await res.json();
            setUsageCount(data.value);
          } else {
             setUsageCount(prev => prev + 1);
          }
        } catch (e) {
             setUsageCount(prev => prev + 1);
        }

        const currentLocal = parseInt(localStorage.getItem('vba_doctor_usage') || '0', 10);
        localStorage.setItem('vba_doctor_usage', (currentLocal + 1).toString());

    } catch (error: any) {
        setStatus(AnalysisStatus.ERROR);
        addLog(error.message || 'An unknown error occurred.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">VBA Code Doctor</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">AI Powered Architecture Fixer</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
           
           <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-800/50 border-slate-700 text-slate-400" title="عدد مرات المعالجة الكلي لجميع المستخدمين">
             <Globe size={14} className="text-emerald-500" />
             <span>إجمالي المعالجات: <span className={`font-mono font-bold text-slate-200 transition-opacity ${isCountLoaded ? 'opacity-100' : 'opacity-0'}`}>{usageCount}</span></span>
           </div>

           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${options.compatibility ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-200' : 'bg-slate-800/50 border-slate-700'}`}>
             <ShieldCheck size={14} className={options.compatibility ? "text-indigo-400" : "text-slate-500"}/>
             <span>Engine: {options.compatibility ? 'Active' : 'Standard'}</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
        
        {/* Settings & Special Instructions Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-4 transition-all hover:border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             
             {/* Options Grid */}
             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold ml-2 border-l border-slate-700 pl-3">
                    <Settings2 size={16} />
                    <span>خيارات المعالجة:</span>
                </div>

                <button 
                  onClick={() => toggleOption('compatibility')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.compatibility ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <ShieldCheck size={14} />
                  <span>توافق 32/64</span>
                </button>

                <button 
                  onClick={() => toggleOption('codeCorrection')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.codeCorrection ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <Wrench size={14} />
                  <span>تصحيح برمجي</span>
                </button>

                <button 
                  onClick={() => toggleOption('formatting')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.formatting ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <AlignLeft size={14} />
                  <span>تنسيق</span>
                </button>

                <button 
                  onClick={() => toggleOption('commentsAr')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.commentsAr ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <MessageSquare size={14} />
                  <span>تعليق (عربي)</span>
                </button>

                <button 
                  onClick={() => toggleOption('commentsEn')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.commentsEn ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <Languages size={14} />
                  <span>تعليق (EN)</span>
                </button>

                <button 
                  onClick={() => toggleOption('errorHandling')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.errorHandling ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <Bug size={14} />
                  <span>صائد الأخطاء</span>
                </button>

                <button 
                  onClick={() => toggleOption('lineNumbers')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-all ${options.lineNumbers ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                >
                  <Hash size={14} />
                  <span>ترقيم الأسطر</span>
                </button>
             </div>

             {/* Action Buttons */}
             <div className="flex gap-2 w-full md:w-auto justify-end">
                <button 
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all flex items-center gap-2 border border-slate-700 font-medium text-xs md:text-sm"
                >
                    <RotateCcw size={14} />
                    <span>تفريغ</span>
                </button>
                <button 
                  onClick={handleProcess}
                  disabled={status === AnalysisStatus.ANALYZING || status === AnalysisStatus.CONVERTING}
                  className={`px-4 py-1.5 rounded-md transition-all flex items-center gap-2 font-bold text-xs md:text-sm shadow-lg whitespace-nowrap
                    ${status === AnalysisStatus.ANALYZING || status === AnalysisStatus.CONVERTING 
                      ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed border border-indigo-800' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 border border-indigo-500'}`}
                >
                    <Zap size={14} className={status === AnalysisStatus.CONVERTING ? "fill-current" : ""} />
                    <span>تشغيل المعالج</span>
                </button>
            </div>
          </div>

          {/* Custom Instruction Box */}
          <div className="relative group">
            <div className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Sparkles size={16} />
            </div>
            <textarea 
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="هل لديك طلب خاص؟ (مثال: اجعل أسماء المتغيرات بالعربية، أو استخدم مكتبة FSO حصرياً...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pr-4 pl-10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all resize-none h-12 hover:border-slate-700"
            />
          </div>
        </div>

        {/* Editors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
            <CodeEditor 
                title="الكود الأصلي (VBA)" 
                code={inputCode} 
                onChange={setInputCode}
                placeholder="ألصق كود VBA هنا... مثال: Private Declare Function..."
                borderColor={inputCode && options.compatibility && !inputCode.toLowerCase().includes('ptrsafe') ? 'border-amber-500/30' : 'border-slate-700'}
            />
            <CodeEditor 
                title="الكود الناتج" 
                code={outputCode} 
                readOnly
                placeholder="سيظهر الكود الناتج هنا بعد المعالجة..."
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
