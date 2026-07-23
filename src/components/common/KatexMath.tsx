import React, { useMemo } from 'react';
import katex from 'katex';

interface KatexMathProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const KatexMath: React.FC<KatexMathProps> = ({ math, displayMode = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math || !math.trim()) {
      return '<span class="text-gray-400 italic text-xs">[Empty Math Formula]</span>';
    }
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (err: any) {
      console.warn('KaTeX render error:', err);
      return `<span class="text-red-500 font-mono text-xs">LaTeX Error: ${err?.message || 'Invalid formula'}</span>`;
    }
  }, [math, displayMode]);

  return (
    <span
      className={`katex-container ${displayMode ? 'block my-3 text-center overflow-x-auto py-2' : 'inline-block px-1'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
