import React from 'react';
import { Info, AlertTriangle, Lightbulb, Quote, BookmarkCheck } from 'lucide-react';

interface CalloutRendererProps {
  type?: 'info' | 'note' | 'warning' | 'tip' | 'quote';
  content: string;
  caption?: string;
  className?: string;
}

export const CalloutRenderer: React.FC<CalloutRendererProps> = ({
  type = 'info',
  content,
  caption,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      label: 'INFO',
    },
    note: {
      bg: 'bg-[#ff6321]/5 border-[#ff6321]/30 text-[#2c2c2c]',
      icon: <BookmarkCheck className="w-5 h-5 text-[#ff6321] shrink-0 mt-0.5" />,
      label: 'NOTE',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-300 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      label: 'WARNING',
    },
    tip: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      label: 'PRO TIP',
    },
    quote: {
      bg: 'bg-[#f9f9f9] border-[#e0e0e0] text-[#2c2c2c] italic',
      icon: <Quote className="w-5 h-5 text-[#ff6321] shrink-0 mt-0.5" />,
      label: 'EXCERPT',
    },
  }[type] || {
    bg: 'bg-gray-50 border-gray-200 text-gray-900',
    icon: <Info className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />,
    label: 'NOTE',
  };

  return (
    <div className={`p-4 rounded-lg border my-3 flex items-start gap-3 shadow-xs ${styles.bg} ${className}`}>
      {styles.icon}
      <div className="space-y-1 flex-1">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff6321]">
          {styles.label}
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
        {caption && (
          <p className="text-xs font-semibold text-[#666] not-italic mt-1 border-t border-black/10 pt-1">
            — {caption}
          </p>
        )}
      </div>
    </div>
  );
};
