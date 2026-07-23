import React, { useState } from 'react';
import { 
  X, FileText, ShieldAlert, Copyright, Award, Heart, HelpCircle, Sparkles, Check, BookOpen, Scale
} from 'lucide-react';
import { BookFrontMatter } from '../../types';

interface FrontMatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  frontMatter: BookFrontMatter;
  bookTitle: string;
  authorName: string;
  onChangeFrontMatter: (updated: BookFrontMatter) => void;
}

export const FrontMatterModal: React.FC<FrontMatterModalProps> = ({
  isOpen,
  onClose,
  frontMatter,
  bookTitle,
  authorName,
  onChangeFrontMatter,
}) => {
  if (!isOpen) return null;

  const current: BookFrontMatter = frontMatter || {};

  const updateField = (field: keyof BookFrontMatter, value: string) => {
    onChangeFrontMatter({
      ...current,
      [field]: value,
    });
  };

  const handleGenerateDefaultLegalTemplate = () => {
    const year = new Date().getFullYear();
    const copyright = `Copyright © ${year} JE Trust Fund (${authorName || 'Author'}). All rights reserved.\n\nNo part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.`;
    
    const disclaimer = `The information provided in "${bookTitle || 'this book'}" is for educational and informational purposes only. While every effort has been made to ensure accuracy, the author and publisher assume no responsibility or liability for errors, omissions, or financial / technical outcomes resulting from the use of the material contained herein.`;

    const legal = `Published by JE Trust Fund\nRegistered Identifier: ISBN ${current.isbnNumber || '978-0-000000-00-0'}\nEdition: ${current.edition || 'First Edition, ' + year}`;

    onChangeFrontMatter({
      ...current,
      copyrightNotice: current.copyrightNotice || copyright,
      disclaimer: current.disclaimer || disclaimer,
      legalNotes: current.legalNotes || legal,
    });
  };

  const handleGenerateExecutiveSummaryTemplate = () => {
    const summary = `Executive Summary & Preamble\n----------------------------\nThis manuscript presents a structured, comprehensive exploration of key principles, methodologies, and quantitative frameworks.\n\nKey Objectives:\n1. Provide actionable insights and analytical clarity for practitioners.\n2. Document formulas, ledger accounts, and software architectures.\n3. Serve as an authoritative reference manual for advanced readers.`;

    updateField('executiveSummary', current.executiveSummary || summary);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff6321] rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Executive Summary, Preamble & Legal Notes</h2>
              <p className="text-xs text-slate-300">Manage preambles, copyright notices, legal disclaimers, and ISBN metadata</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Quick AI & Legal Template Generators */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <Sparkles className="w-4 h-4 text-[#ff6321] shrink-0" />
              <div>
                <span className="font-bold block">Publisher Starter Templates</span>
                <span className="text-slate-600 text-[11px]">Auto-populate standard copyright boilerplate, disclaimers, or summary outline</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateExecutiveSummaryTemplate}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#ff6321] text-slate-800 font-bold text-xs rounded-lg transition-colors"
              >
                Preamble Template
              </button>
              <button
                type="button"
                onClick={handleGenerateDefaultLegalTemplate}
                className="px-3 py-1.5 bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                Auto-Fill Copyright & Legal
              </button>
            </div>
          </div>

          {/* Section 1: Executive Summary / Preamble */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#ff6321]" /> Executive Summary or Preamble
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Appears before Chapter 1 in Reader & PDF Export</span>
            </label>
            <textarea
              value={current.executiveSummary || ''}
              onChange={(e) => updateField('executiveSummary', e.target.value)}
              placeholder="Provide a high-level summary of the book, core objectives, methodology, or preamble for stakeholders and readers..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] leading-relaxed font-serif"
            />
          </div>

          {/* Section 2: ISBN & Edition Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ISBN / Cataloging Identifier
              </label>
              <input
                type="text"
                value={current.isbnNumber || ''}
                onChange={(e) => updateField('isbnNumber', e.target.value)}
                placeholder="e.g. 978-3-16-148410-0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Edition & Publication Year
              </label>
              <input
                type="text"
                value={current.edition || ''}
                onChange={(e) => updateField('edition', e.target.value)}
                placeholder="e.g. First Edition, 2026 / Revised Accounting Release"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ff6321]"
              />
            </div>
          </div>

          {/* Section 3: Copyright Notice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Copyright className="w-4 h-4 text-[#ff6321]" /> Copyright Notice
            </label>
            <textarea
              value={current.copyrightNotice || ''}
              onChange={(e) => updateField('copyrightNotice', e.target.value)}
              placeholder="e.g. Copyright © 2026 Author Name. All rights reserved. No part of this publication..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] leading-relaxed font-mono"
            />
          </div>

          {/* Section 4: Legal Disclaimers & Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#ff6321]" /> Disclaimers & Terms of Use
            </label>
            <textarea
              value={current.disclaimer || ''}
              onChange={(e) => updateField('disclaimer', e.target.value)}
              placeholder="Add financial, legal, medical, or software implementation disclaimers..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] leading-relaxed"
            />
          </div>

          {/* Section 5: Dedication & Acknowledgements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Dedication
              </label>
              <textarea
                value={current.dedication || ''}
                onChange={(e) => updateField('dedication', e.target.value)}
                placeholder="To my family, mentors, and fellow researchers..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321] font-serif italic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Acknowledgements
              </label>
              <textarea
                value={current.acknowledgements || ''}
                onChange={(e) => updateField('acknowledgements', e.target.value)}
                placeholder="Special thanks to contributors, reviewers, and institutions..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321]"
              />
            </div>
          </div>

          {/* Section 6: Additional Legal Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#ff6321]" /> Additional Publisher Legal Notes
            </label>
            <textarea
              value={current.legalNotes || ''}
              onChange={(e) => updateField('legalNotes', e.target.value)}
              placeholder="e.g. Registered in Delaware, USA. Trademark registrations, software licenses..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#ff6321]"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#ff6321] hover:opacity-90 text-white rounded-lg font-bold text-xs transition-opacity shadow-xs"
          >
            Save Front Matter & Legal Notes
          </button>
        </div>

      </div>
    </div>
  );
};
