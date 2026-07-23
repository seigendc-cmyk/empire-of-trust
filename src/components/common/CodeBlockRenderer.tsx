import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

interface CodeBlockRendererProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({
  code,
  language = 'typescript',
  showLineNumbers = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code ? code.split('\n') : [''];

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-[#2c2c2c] bg-[#1a1a1a] text-gray-200 font-mono text-xs shadow-md">
      {/* Code Header Bar */}
      <div className="bg-[#2c2c2c] px-4 py-2 flex items-center justify-between border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-[#ff6321]" />
          <span className="text-[10px] uppercase font-bold text-[#ff6321] tracking-wider font-mono">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white bg-[#3c3c3c] hover:bg-[#4c4c4c] px-2 py-0.5 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-300" /> Copy Code
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto flex leading-relaxed">
        {showLineNumbers && (
          <div className="select-none text-gray-600 pr-4 text-right font-mono border-r border-[#3c3c3c] mr-4">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <pre className="flex-1 font-mono text-xs text-gray-100 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
