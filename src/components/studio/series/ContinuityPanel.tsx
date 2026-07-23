import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { SeriesContinuityWarning } from '../../../lib/seriesRepository';

export const ContinuityPanel: React.FC<{ warnings: SeriesContinuityWarning[] }> = ({ warnings }) => (
  <section className="border border-[#d9dde0] bg-white">
    <header className="flex items-center gap-2 border-b border-[#d9dde0] p-4"><ShieldCheck className="h-5 w-5" /><h3 className="font-extrabold">Continuity Review</h3></header>
    {warnings.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#376b42]" /><p className="mt-2 text-sm font-bold">No automated continuity warnings</p><p className="text-xs text-[#777]">Human review remains required.</p></div> : (
      <div className="divide-y divide-[#e4e6e8]">{warnings.map((warning, index) => <div key={`${warning.code}-${warning.episodeId || index}`} className="flex gap-3 p-4"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${warning.severity === 'error' ? 'text-red-700' : 'text-amber-600'}`} /><div><p className="text-xs font-bold uppercase">{warning.code.replaceAll('-',' ')}</p><p className="text-sm text-[#555b60]">{warning.message}</p></div></div>)}</div>
    )}
    <p className="border-t border-[#e4e6e8] p-4 text-xs text-[#71777c]">Warnings never change manuscript or planning content automatically.</p>
  </section>
);
