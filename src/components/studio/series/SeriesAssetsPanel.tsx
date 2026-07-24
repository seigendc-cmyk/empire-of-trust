import React, { useState } from 'react';
import { Image, Save } from 'lucide-react';
import { SeriesProject } from '../../../types';

export const SeriesAssetsPanel: React.FC<{ project: SeriesProject; onSave: (update: Partial<SeriesProject>) => Promise<void> }> = ({ project, onSave }) => {
  const [coverAssetId, setCoverAssetId] = useState(project.coverAssetId || '');
  const [bannerAssetId, setBannerAssetId] = useState(project.bannerAssetId || '');
  return <section className="border border-[#d9dde0] bg-white"><header className="flex items-center gap-2 border-b border-[#d9dde0] p-4"><Image className="h-5 w-5" /><h3 className="font-extrabold">Series Assets</h3></header><div className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-xs font-bold">Cover asset ID<input value={coverAssetId} onChange={(event) => setCoverAssetId(event.target.value)} className="mt-1 w-full border border-[#cfd3d7] px-3 py-2 text-sm" /></label><label className="text-xs font-bold">Banner asset ID<input value={bannerAssetId} onChange={(event) => setBannerAssetId(event.target.value)} className="mt-1 w-full border border-[#cfd3d7] px-3 py-2 text-sm" /></label><button onClick={() => void onSave({ coverAssetId, bannerAssetId })} className="inline-flex w-fit items-center gap-2 rounded-md bg-[#24282c] px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> Save asset links</button></div><p className="border-t border-[#e4e6e8] p-4 text-xs text-[#71777c]">Assets remain in the existing Book Studio asset system; this page stores references only.</p></section>;
};
