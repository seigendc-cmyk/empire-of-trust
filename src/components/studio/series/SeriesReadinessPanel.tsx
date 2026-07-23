import React from 'react';
import { CheckCircle2, Circle, ShieldAlert } from 'lucide-react';
import { SeriesReadiness } from '../../../lib/seriesRepository';
import { EpisodeProductionChecklist } from '../../../types';

interface SeriesReadinessPanelProps {
  readiness?: SeriesReadiness;
  checklist?: EpisodeProductionChecklist;
  onChecklistChange?: (checklist: EpisodeProductionChecklist) => Promise<void>;
}

export const SeriesReadinessPanel: React.FC<SeriesReadinessPanelProps> = ({ readiness, checklist, onChecklistChange }) => {
  if (!readiness) return <section className="border border-[#d9dde0] bg-white p-6 text-sm text-[#777]">Select an episode to calculate publication readiness.</section>;
  const gates = [
    ['Content Ready', readiness.contentReady], ['Commercial Ready', readiness.commercialReady],
    ['Security Ready', readiness.securityReady], ['Published', readiness.published],
  ] as const;
  const checklistKeys: Array<[keyof EpisodeProductionChecklist, string]> = [
    ['outlineComplete','Outline'],['manuscriptComplete','Manuscript'],['continuityReviewed','Continuity'],
    ['referencesReviewed','References'],['legalReviewed','Legal/front matter'],['coverComplete','Cover'],
    ['pricingComplete','Pricing'],['marketingComplete','Marketing'],['signingReady','Signing review'],
    ['publicationReady','Publication approval'],
  ];
  return <section className="border border-[#d9dde0] bg-white"><header className="flex items-center gap-2 border-b border-[#d9dde0] p-4"><ShieldAlert className="h-5 w-5" /><h3 className="font-extrabold">Publication Readiness</h3></header><div className="grid grid-cols-2 gap-px bg-[#d9dde0]">{gates.map(([label, ready]) => <div key={label} className="flex items-center gap-2 bg-white p-4">{ready ? <CheckCircle2 className="h-5 w-5 text-[#376b42]" /> : <Circle className="h-5 w-5 text-[#999]" />}<span className="text-xs font-bold">{label}</span></div>)}</div>{checklist && <div className="grid grid-cols-2 gap-2 border-t border-[#e4e6e8] p-4">{checklistKeys.map(([key,label]) => <label key={key} className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={Boolean(checklist[key])} onChange={(event) => void onChecklistChange?.({ ...checklist, [key]: event.target.checked })} /> {label}</label>)}</div>}{readiness.missing.length > 0 && <div className="border-t border-[#e4e6e8] p-4"><p className="text-xs font-extrabold uppercase text-[#777]">Missing requirements</p><ul className="mt-2 space-y-1 text-sm">{readiness.missing.map((item) => <li key={item}>• {item}</li>)}</ul></div>}<p className="border-t border-[#e4e6e8] p-4 text-xs text-[#71777c]">Security Ready means issuance is available and reviewed. The browser does not claim to have signed a package.</p></section>;
};
