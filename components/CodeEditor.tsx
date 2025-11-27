import React, { useRef, useState } from 'react';
import { Copy, Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  title: string;
  code: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  borderColor?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  title, 
  code, 
  onChange, 
  readOnly = false, 
  placeholder,
  borderColor = "border-slate-700"
}) => {
  const [copied, setCopied] = useState(false);
  const [pasteError, setPasteError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePaste = async () => {
    try {
      setPasteError(false);
      
      // Ensure the element is focused; some browsers require focus for clipboard access
      if (textareaRef.current) {
        textareaRef.current.focus();
      }

      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error("Clipboard API unavailable");
      }

      const text = await navigator.clipboard.readText();
      if (onChange) onChange(text);
    } catch (err) {
      // Permissions policy or user denial blocked the action.
      // We switch to manual mode gracefully.
      setPasteError(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setTimeout(() => setPasteError(false), 4000);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border rounded-lg overflow-hidden shadow-xl ${borderColor} transition-colors duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5" dir="ltr">
             <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
             <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
           </div>
           <span className="mr-3 text-sm font-semibold text-slate-300">{title}</span>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <button 
              onClick={handlePaste}
              className={`p-1.5 text-xs rounded transition-all flex items-center gap-1 ${
                pasteError 
                  ? 'bg-red-900/40 text-red-200 ring-1 ring-red-500/50' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              title={pasteError ? "المتصفح يمنع اللصق المباشر. يرجى استخدام Ctrl+V" : "لصق من الحافظة"}
            >
              {pasteError ? <AlertCircle size={14} /> : <Clipboard size={14} />}
              <span>{pasteError ? 'استخدم Ctrl+V' : 'لصق'}</span>
            </button>
          )}
          <button 
            onClick={handleCopy}
            className={`p-1.5 text-xs rounded transition flex items-center gap-1 ${copied ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 group">
        <textarea
          ref={textareaRef}
          dir="ltr"
          value={code}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full h-full p-4 bg-[#0f172a] text-slate-300 code-font text-sm resize-none focus:outline-none leading-relaxed selection:bg-indigo-500/30"
        />
      </div>
    </div>
  );
};

export default CodeEditor;