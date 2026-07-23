import React from 'react';
import { FileText } from 'lucide-react';

interface FootnoteRendererProps {
  number?: number;
  label?: string;
  content: string;
}

export const FootnoteRenderer: React.FC<FootnoteRendererProps> = ({
  number = 1,
  label,
  content,
}) => {
  return (
    <div className="my-2 p-3 rounded-md bg-[#f9f9f9] border border-[#e0e0e0] text-xs text-[#2c2c2c] flex items-start gap-2.5">
      <span className="font-mono font-bold text-[#ff6321] bg-[#ff6321]/10 px-2 py-0.5 rounded border border-[#ff6321]/20 shrink-0">
        [{label || number}]
      </span>
      <div className="flex-1 space-y-0.5">
        <p className="leading-relaxed">{content}</p>
      </div>
    </div>
  );
};
