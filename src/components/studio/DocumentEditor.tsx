import React, { useState, useMemo } from 'react';
import { 
  Heading1, Heading2, Heading3, Heading4, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Strikethrough, Image as ImageIcon, Quote, Bookmark, Plus, Trash2, ArrowUp, ArrowDown,
  Sparkles, FileText, Code, Check, Sigma, Table as TableIcon, List, ListOrdered, CheckSquare,
  AlertCircle, HelpCircle, Palette, Eye, Type, Minus, Divide, BookOpen, Layers, Calculator, UploadCloud, GripVertical, Smile, Wand2, Hash, Link as LinkIcon
} from 'lucide-react';
import { ContentBlock, HeadingLevel, ReferenceItem, TableData, SpreadsheetData, McqQuestion, McqQuizData } from '../../types';

const createDefaultMcqQuizData = (): McqQuizData => ({
  title: 'Revision & Past Examination Practice Quiz',
  instructions: 'Select the correct answer for each question. Check solutions to view step-by-step revision guidance.',
  passingScorePercentage: 70,
  questions: [
    {
      id: 'q_' + Math.random().toString(36).substring(2, 7),
      questionText: 'Which financial statement reports a firm’s assets, liabilities, and equity at a specific point in time?',
      options: [
        'Income Statement',
        'Statement of Cash Flows',
        'Balance Sheet (Statement of Financial Position)',
        'Statement of Retained Earnings',
      ],
      correctOptionIndex: 2,
      explanation: 'The Balance Sheet shows the financial position of an entity at a given date, detailing assets, liabilities, and owner equity.',
      marks: 2,
      topic: 'Financial Accounting Standards',
    },
    {
      id: 'q_' + Math.random().toString(36).substring(2, 7),
      questionText: 'In computer architecture, what is the primary role of the CPU instruction cache?',
      options: [
        'Store non-volatile operating system logs',
        'Provide high-speed low-latency memory buffer for frequently executed instruction cycles',
        'Manage network TCP/IP sockets',
        'Perform GPU floating-point matrix multiplication',
      ],
      correctOptionIndex: 1,
      explanation: 'Instruction caches store recent assembly instructions near the CPU execution core to eliminate main RAM latency bottlenecks.',
      marks: 3,
      topic: 'Computer Architecture & Systems',
    },
  ],
});
import { MathFormulaModal } from './MathFormulaModal';
import { QuickLatexModal } from './QuickLatexModal';
import { EmojiPickerModal } from './EmojiPickerModal';
import { CartoonGeneratorModal } from './CartoonGeneratorModal';
import { KatexMath } from '../common/KatexMath';
import { TableRenderer } from '../common/TableRenderer';
import { SpreadsheetRenderer } from '../common/SpreadsheetRenderer';
import { CodeBlockRenderer } from '../common/CodeBlockRenderer';
import { CalloutRenderer } from '../common/CalloutRenderer';
import { FootnoteRenderer } from '../common/FootnoteRenderer';

interface DocumentEditorProps {
  blocks: ContentBlock[];
  onChangeBlocks: (blocks: ContentBlock[]) => void;
  references: ReferenceItem[];
  onAddReference: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  blocks,
  onChangeBlocks,
  references,
  onAddReference,
}) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isQuickLatexModalOpen, setIsQuickLatexModalOpen] = useState(false);
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);
  const [emojiTargetBlockId, setEmojiTargetBlockId] = useState<string | null>(null);
  const [isCartoonModalOpen, setIsCartoonModalOpen] = useState(false);
  const [cartoonTargetBlockId, setCartoonTargetBlockId] = useState<string | null>(null);
  const [editingMathBlockId, setEditingMathBlockId] = useState<string | null>(null);

  // Auto-Number all Image blocks sequentially (e.g., Illustration 1, Illustration 2...)
  const autoNumberAllImages = () => {
    let imgCounter = 1;
    const updated = blocks.map((b) => {
      if (b.type === 'image') {
        const prefix = b.meta?.imageNumberPrefix || 'Illustration';
        const num = imgCounter++;
        const figLabel = `${prefix} ${num}`;
        return {
          ...b,
          meta: {
            ...b.meta,
            imageNumber: num,
            imageNumberPrefix: prefix,
            figureLabel: figLabel,
          }
        };
      }
      return b;
    });
    onChangeBlocks(updated);
  };

  // Block Drag-and-Drop State
  const [draggedBlockIdx, setDraggedBlockIdx] = useState<number | null>(null);
  const [dragOverBlockIdx, setDragOverBlockIdx] = useState<number | null>(null);

  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBlockIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBlockIdx !== index) {
      setDragOverBlockIdx(index);
    }
  };

  const handleBlockDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedBlockIdx === null || draggedBlockIdx === targetIndex) {
      setDraggedBlockIdx(null);
      setDragOverBlockIdx(null);
      return;
    }

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedBlockIdx, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);

    const reindexed = newBlocks.map((b, idx) => ({ ...b, orderIndex: idx }));
    onChangeBlocks(reindexed);

    setDraggedBlockIdx(null);
    setDragOverBlockIdx(null);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockIdx(null);
    setDragOverBlockIdx(null);
  };

  // Document Metrics Calculation
  const analytics = useMemo(() => {
    let totalWords = 0;
    let totalChars = 0;
    let mathCount = 0;
    let tableCount = 0;
    let footnoteCount = 0;

    blocks.forEach((b) => {
      if (b.type === 'latex') mathCount++;
      if (b.type === 'table') tableCount++;
      if (b.type === 'footnote') footnoteCount++;

      if (b.content) {
        totalChars += b.content.length;
        const words = b.content.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;
      }
    });

    const readTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

    return { totalWords, totalChars, mathCount, tableCount, footnoteCount, readTimeMinutes };
  }, [blocks]);

  // Add block helper
  const addBlock = (type: ContentBlock['type'], initialContent = '', meta: any = {}) => {
    const newBlock: ContentBlock = {
      id: 'blk_' + Math.random().toString(36).substring(2, 9),
      chapterId: blocks[0]?.chapterId || 'chap_default',
      type,
      content: initialContent,
      meta: {
        headingLevel: type === 'heading' ? 'h2' : undefined,
        alignment: 'left',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        dropCap: false,
        fontSize: 'medium',
        ...meta,
      },
      orderIndex: blocks.length,
    };

    const updated = [...blocks, newBlock];
    onChangeBlocks(updated);
    setActiveBlockId(newBlock.id);
  };

  const updateBlockContent = (id: string, content: string) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, content } : b));
    onChangeBlocks(updated);
  };

  const updateBlockMeta = (id: string, metaUpdates: Partial<ContentBlock['meta']>) => {
    const updated = blocks.map((b) =>
      b.id === id ? { ...b, meta: { ...b.meta, ...metaUpdates } } : b
    );
    onChangeBlocks(updated);
  };

  const removeBlock = (id: string) => {
    const updated = blocks.filter((b) => b.id !== id).map((b, idx) => ({ ...b, orderIndex: idx }));
    onChangeBlocks(updated);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    const reindexed = newBlocks.map((b, idx) => ({ ...b, orderIndex: idx }));
    onChangeBlocks(reindexed);
  };

  // Helper for Math Equation Insert / Update
  const handleSaveMathFormula = (latex: string, label?: string) => {
    if (editingMathBlockId) {
      updateBlockContent(editingMathBlockId, latex);
      updateBlockMeta(editingMathBlockId, { mathLabel: label });
      setEditingMathBlockId(null);
    } else {
      addBlock('latex', latex, { mathLabel: label || `Eq. ${analytics.mathCount + 1}.1`, latexMode: 'display' });
    }
  };

  const handleInsertQuickLatexToBlock = (blockId: string, latexToAppend: string) => {
    const target = blocks.find((b) => b.id === blockId);
    if (!target) return;
    const updated = target.content ? `${target.content} ${latexToAppend}` : latexToAppend;
    updateBlockContent(blockId, updated);
  };

  // Table & Spreadsheet Helpers
  const createDefaultTableData = (): TableData => ({
    headers: ['Item / Variable', 'Description', 'Value / Formula'],
    rows: [
      ['α (Alpha)', 'Thermal diffusivity coefficient', '1.24 × 10⁻⁴ m²/s'],
      ['β (Beta)', 'Volumetric expansion coefficient', '0.00367 / K'],
    ],
    hasHeaderRow: true,
    striped: true,
    bordered: true,
  });

  const createDefaultSpreadsheetData = (): SpreadsheetData => ({
    title: 'Financial & Accounting Ledger',
    columns: [
      { id: 'item', name: 'Line Item', type: 'text' },
      { id: 'q1', name: 'Q1 Revenue ($)', type: 'currency', formula: 'sum' },
      { id: 'q2', name: 'Q2 Revenue ($)', type: 'currency', formula: 'sum' },
      { id: 'net', name: 'Annual Projected ($)', type: 'currency', formula: 'sum' },
    ],
    rows: [
      { item: 'SaaS Subscription Sales', q1: 12500, q2: 18400, net: 30900 },
      { item: 'Enterprise Consultations', q1: 8200, q2: 9500, net: 17700 },
      { item: 'Server & Infra Overhead', q1: -2400, q2: -2800, net: -5200 },
    ],
    showTotalRow: true,
    currencySymbol: '$',
  });

  return (
    <div className="space-y-4">
      
      {/* Primary Publishing Formatting Toolbar */}
      <div className="sticky top-16 z-30 bg-white border border-[#e0e0e0] rounded-xl p-3 shadow-md space-y-3">
        
        {/* Row 1: Document Structure & Formatting Tools */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] pb-2.5">
          
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            
            {/* Headings */}
            <div className="flex items-center bg-[#f9f9f9] rounded-md p-1 border border-[#e0e0e0]">
              <button
                type="button"
                onClick={() => addBlock('heading', 'Chapter Main Title', { headingLevel: 'h1' })}
                title="Heading 1"
                className="p-1.5 text-[#2c2c2c] hover:text-[#ff6321] hover:bg-white rounded transition-colors flex items-center gap-1 font-bold"
              >
                <Heading1 className="w-4 h-4 text-[#ff6321]" /> H1
              </button>
              <button
                type="button"
                onClick={() => addBlock('heading', 'Section Title', { headingLevel: 'h2' })}
                title="Heading 2"
                className="p-1.5 text-[#2c2c2c] hover:text-[#ff6321] hover:bg-white rounded transition-colors flex items-center gap-1 font-bold"
              >
                <Heading2 className="w-4 h-4 text-[#ff6321]" /> H2
              </button>
              <button
                type="button"
                onClick={() => addBlock('heading', 'Subsection Title', { headingLevel: 'h3' })}
                title="Heading 3"
                className="p-1.5 text-[#2c2c2c] hover:text-[#ff6321] hover:bg-white rounded transition-colors flex items-center gap-1 font-bold"
              >
                <Heading3 className="w-4 h-4 text-[#ff6321]" /> H3
              </button>
            </div>

            <div className="h-5 w-[1px] bg-[#e0e0e0] mx-0.5" />

            {/* Scientific & Academic Tools */}
            <button
              type="button"
              onClick={() => {
                setEditingMathBlockId(null);
                setIsMathModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ff6321]/10 text-[#ff6321] hover:bg-[#ff6321] hover:text-white font-bold border border-[#ff6321]/30 transition-all shadow-xs"
            >
              <Sigma className="w-4 h-4" /> LaTeX Formula
            </button>

            <button
              type="button"
              onClick={() => setIsQuickLatexModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white font-bold border border-purple-200 transition-all shadow-xs"
              title="Open Quick LaTeX Operators & Symbols Palette"
            >
              <Layers className="w-4 h-4 text-purple-600 group-hover:text-white" /> Quick LaTeX Symbols
            </button>

            <button
              type="button"
              onClick={() => {
                setEmojiTargetBlockId(activeBlockId || (blocks.length > 0 ? blocks[0].id : null));
                setIsEmojiModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-500 hover:text-white font-bold border border-amber-300 transition-all shadow-xs"
              title="Insert Emojis into Book Content"
            >
              <Smile className="w-4 h-4 text-amber-600 group-hover:text-white" /> Insert Emojis
            </button>

            <button
              type="button"
              onClick={() => {
                setCartoonTargetBlockId(activeBlockId || (blocks.length > 0 ? blocks[0].id : null));
                setIsCartoonModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 font-extrabold border border-orange-400 transition-all shadow-xs cursor-pointer"
              title="Generate & Number Children Cartoon Illustrations"
            >
              <Wand2 className="w-4 h-4" /> 🎨 Cartoon Studio
            </button>

            <button
              type="button"
              onClick={autoNumberAllImages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold border border-blue-200 transition-all shadow-xs cursor-pointer"
              title="Auto-Number All Images Sequentially in Chapter"
            >
              <Hash className="w-4 h-4" /> Auto-Number Images
            </button>

            <button
              type="button"
              onClick={() => addBlock('table', '', { tableData: createDefaultTableData() })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <TableIcon className="w-3.5 h-3.5 text-[#ff6321]" /> Table
            </button>

            <button
              type="button"
              onClick={() => addBlock('spreadsheet', '', { spreadsheetData: createDefaultSpreadsheetData() })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <Calculator className="w-3.5 h-3.5 text-[#ff6321]" /> Spreadsheet
            </button>

            <button
              type="button"
              onClick={() => addBlock('code', 'function computeQuantumState() {\n  return Math.PI * 42;\n}', { codeLanguage: 'typescript', showLineNumbers: true })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <Code className="w-3.5 h-3.5 text-[#ff6321]" /> Code Block
            </button>

            <button
              type="button"
              onClick={() => addBlock('mcq', '', { mcqData: createDefaultMcqQuizData() })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-300 transition-all shadow-xs"
              title="Add Practice Examination & MCQ Quiz Module"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Revision Quiz (MCQ)
            </button>

            <div className="h-5 w-[1px] bg-[#e0e0e0] mx-0.5" />

            {/* Standard Formatting Blocks */}
            <button
              type="button"
              onClick={() => addBlock('paragraph', 'Write manuscript content...')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-[#ff6321]" /> Paragraph
            </button>

            <button
              type="button"
              onClick={() => addBlock('callout', 'Important editorial notice or highlighted takeaway.', { calloutType: 'note' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <Quote className="w-3.5 h-3.5 text-[#ff6321]" /> Callout Box
            </button>

            <button
              type="button"
              onClick={() => addBlock('list', '', { listType: 'bullet', listItems: [{ id: '1', text: 'First key point' }, { id: '2', text: 'Second key point' }] })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <List className="w-3.5 h-3.5 text-[#ff6321]" /> List
            </button>

            <button
              type="button"
              onClick={() => addBlock('footnote', 'Footnote citation note explaining source context.', { footnoteNumber: analytics.footnoteCount + 1 })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#ff6321]" /> Footnote
            </button>

            <button
              type="button"
              onClick={() => addBlock('divider', '', { dividerStyle: 'solid' })}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
              title="Insert Divider Rule"
            >
              <Minus className="w-3.5 h-3.5 text-[#ff6321]" /> Divider
            </button>

            <button
              type="button"
              onClick={() => addBlock('image', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1000&q=80', { caption: 'Figure 1: Illustration' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#2c2c2c] font-semibold border border-[#e0e0e0] transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#ff6321]" /> Figure / Image
            </button>

          </div>

          <button
            type="button"
            onClick={() => {
              if (references.length === 0) {
                onAddReference();
              } else {
                addBlock('reference', references[0].citationKey, { referenceId: references[0].id });
              }
            }}
            className="px-3 py-1.5 rounded-md bg-[#2c2c2c] hover:bg-[#1a1a1a] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#ff6321]" /> Bibliography Link
          </button>

        </div>

        {/* Row 2: Live Document Analytics Header */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#666] pt-1">
          <div className="flex flex-wrap items-center gap-3 font-mono font-bold text-[11px]">
            <span className="flex items-center gap-1 text-[#2c2c2c]">
              <FileText className="w-3.5 h-3.5 text-[#ff6321]" /> {analytics.totalWords} Words
            </span>
            <span className="text-[#d0d0d0]">|</span>
            <span>{analytics.totalChars} Chars</span>
            <span className="text-[#d0d0d0]">|</span>
            <span className="text-[#ff6321]">{analytics.mathCount} Equations</span>
            <span className="text-[#d0d0d0]">|</span>
            <span>{analytics.tableCount} Tables</span>
            <span className="text-[#d0d0d0]">|</span>
            <span>{analytics.footnoteCount} Footnotes</span>
          </div>

          <div className="text-[11px] font-mono text-[#666]">
            Est. Reading Time: <strong className="text-[#2c2c2c]">{analytics.readTimeMinutes} min</strong>
          </div>
        </div>

      </div>

      {/* Content Blocks Canvas */}
      <div className="bg-[#f0f0f0] border border-[#d0d0d0] rounded-xl p-6 min-h-[550px] shadow-inner space-y-4">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-lg border border-[#e0e0e0] p-8 shadow-sm">
            <div className="w-16 h-16 rounded-xl bg-[#f9f9f9] flex items-center justify-center text-[#ff6321] mb-4 border border-[#e0e0e0]">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#2c2c2c]">Empty Chapter Canvas</h3>
            <p className="text-sm text-[#666] max-w-md mt-1 mb-6">
              Start building your industrial-standard book manuscript with rich headings, paragraphs, LaTeX math equations, code blocks, tables, and citations.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => addBlock('heading', 'Chapter 1: Mathematical Foundations', { headingLevel: 'h1' })}
                className="px-4 py-2 rounded-md bg-[#ff6321] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              >
                + Add Title Heading
              </button>
              <button
                onClick={() => {
                  setEditingMathBlockId(null);
                  setIsMathModalOpen(true);
                }}
                className="px-4 py-2 rounded-md bg-[#2c2c2c] text-white text-xs font-bold hover:bg-[#1a1a1a] transition-colors shadow-xs"
              >
                + Add LaTeX Formula
              </button>
            </div>
          </div>
        ) : (
          blocks.map((block, idx) => (
            <div
              key={block.id}
              onClick={() => setActiveBlockId(block.id)}
              draggable
              onDragStart={(e) => handleBlockDragStart(e, idx)}
              onDragOver={(e) => handleBlockDragOver(e, idx)}
              onDrop={(e) => handleBlockDrop(e, idx)}
              onDragEnd={handleBlockDragEnd}
              className={`group relative rounded-lg border p-4 transition-all bg-white ${
                draggedBlockIdx === idx
                  ? 'opacity-40 scale-[0.99] border-2 border-dashed border-[#ff6321] bg-orange-50/50'
                  : ''
              } ${
                dragOverBlockIdx === idx && draggedBlockIdx !== idx
                  ? 'border-2 border-[#ff6321] bg-[#ff6321]/5 ring-2 ring-[#ff6321]/30'
                  : ''
              } ${
                activeBlockId === block.id && draggedBlockIdx !== idx && dragOverBlockIdx !== idx
                  ? 'border-[#ff6321] shadow-md ring-1 ring-[#ff6321]/30'
                  : draggedBlockIdx !== idx && dragOverBlockIdx !== idx
                  ? 'border-[#e0e0e0] hover:border-gray-400'
                  : ''
              }`}
            >
              
              {/* Block Controls Bar */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="p-1 rounded text-gray-400 hover:text-[#ff6321] hover:bg-orange-50 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                    title="Drag to reorder section block"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#ff6321]/10 text-[#ff6321] font-mono text-[10px] uppercase font-bold border border-[#ff6321]/20">
                    {block.type === 'heading' ? block.meta?.headingLevel?.toUpperCase() : block.type}
                  </span>
                  <span className="text-[#999] text-[11px] font-mono">Section #{idx + 1}</span>
                </div>

                {/* Toolbar options for block styling */}
                <div className="flex flex-wrap items-center gap-1.5">
                  
                  {/* Inline formatting toggles for text blocks */}
                  {(block.type === 'paragraph' || block.type === 'heading' || block.type === 'callout') && (
                    <div className="flex items-center bg-[#f9f9f9] rounded p-0.5 border border-[#e0e0e0] mr-1">
                      <button
                        type="button"
                        onClick={() => updateBlockMeta(block.id, { bold: !block.meta?.bold })}
                        className={`p-1 rounded ${block.meta?.bold ? 'text-[#ff6321] bg-white font-bold shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBlockMeta(block.id, { italic: !block.meta?.italic })}
                        className={`p-1 rounded ${block.meta?.italic ? 'text-[#ff6321] bg-white font-bold shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBlockMeta(block.id, { underline: !block.meta?.underline })}
                        className={`p-1 rounded ${block.meta?.underline ? 'text-[#ff6321] bg-white font-bold shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBlockMeta(block.id, { dropCap: !block.meta?.dropCap })}
                        className={`p-1 rounded text-[11px] font-bold ${block.meta?.dropCap ? 'text-[#ff6321] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Toggle Drop Cap First Letter"
                      >
                        DropCap
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmojiTargetBlockId(block.id);
                          setIsEmojiModalOpen(true);
                        }}
                        className="p-1 rounded text-amber-500 hover:text-amber-600 hover:bg-white"
                        title="Insert Emoji into this block"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Alignment Controls */}
                  <div className="flex items-center bg-[#f9f9f9] rounded p-0.5 border border-[#e0e0e0] mr-1">
                    <button
                      type="button"
                      onClick={() => updateBlockMeta(block.id, { alignment: 'left' })}
                      className={`p-1 rounded ${block.meta?.alignment === 'left' ? 'text-[#ff6321] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBlockMeta(block.id, { alignment: 'center' })}
                      className={`p-1 rounded ${block.meta?.alignment === 'center' ? 'text-[#ff6321] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBlockMeta(block.id, { alignment: 'right' })}
                      className={`p-1 rounded ${block.meta?.alignment === 'right' ? 'text-[#ff6321] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Move up / down */}
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-[#2c2c2c] disabled:opacity-30 rounded hover:bg-[#f0f0f0]"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="p-1 text-gray-400 hover:text-[#2c2c2c] disabled:opacity-30 rounded hover:bg-[#f0f0f0]"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#e0e0e0] mx-1" />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>

              {/* Block Content Renderers / Editors */}

              {/* 1. Heading */}
              {block.type === 'heading' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="Heading title..."
                  style={{ textAlign: block.meta?.alignment || 'left' }}
                  className={`w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[#ff6321] rounded px-2 py-1 font-serif text-[#1a1a1a] ${
                    block.meta?.bold ? 'font-bold' : ''
                  } ${block.meta?.italic ? 'italic' : ''} ${block.meta?.underline ? 'underline' : ''} ${
                    block.meta?.headingLevel === 'h1'
                      ? 'text-3xl font-bold text-[#1a1a1a]'
                      : block.meta?.headingLevel === 'h2'
                      ? 'text-2xl text-[#2c2c2c]'
                      : 'text-xl text-[#333]'
                  }`}
                />
              )}

              {/* 2. Paragraph */}
              {block.type === 'paragraph' && (
                <div className="space-y-2">
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Write chapter narrative..."
                    rows={4}
                    style={{ textAlign: block.meta?.alignment || 'left' }}
                    className={`w-full bg-[#f9f9f9] text-[#2c2c2c] border border-[#e0e0e0] focus:border-[#ff6321] focus:outline-none rounded-md p-3 text-sm leading-relaxed ${
                      block.meta?.bold ? 'font-bold' : ''
                    } ${block.meta?.italic ? 'italic' : ''} ${block.meta?.underline ? 'underline' : ''}`}
                  />
                  {block.meta?.dropCap && (
                    <div className="text-[11px] text-[#ff6321] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Drop Cap First Letter Enabled
                    </div>
                  )}
                </div>
              )}

              {/* 3. LaTeX Math Formula Block */}
              {block.type === 'latex' && (
                <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2">
                    <span className="font-mono text-xs font-bold text-[#ff6321] flex items-center gap-1">
                      <Sigma className="w-4 h-4" /> LaTeX Equation Block ({block.meta?.mathLabel || 'Unlabeled'})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMathBlockId(block.id);
                        setIsMathModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-[#ff6321] hover:opacity-90 text-white font-bold text-xs"
                    >
                      Edit Formula
                    </button>
                  </div>

                  {/* Rendered KaTeX Formula */}
                  <div className="bg-white p-4 rounded border border-[#e0e0e0] text-center overflow-x-auto">
                    <KatexMath math={block.content} displayMode={true} className="text-lg" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666]">LaTeX Code</label>
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        className="w-full bg-white border border-[#e0e0e0] rounded p-1.5 font-mono text-xs text-[#2c2c2c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#666]">Equation Label</label>
                      <input
                        type="text"
                        value={block.meta?.mathLabel || ''}
                        onChange={(e) => updateBlockMeta(block.id, { mathLabel: e.target.value })}
                        placeholder="e.g. Eq. (1.1)"
                        className="w-full bg-white border border-[#e0e0e0] rounded p-1.5 font-mono font-bold text-xs text-[#2c2c2c]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Table Block Editor */}
              {block.type === 'table' && (
                <div className="bg-[#f9f9f9] border border-[#e0e0e0] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2 text-xs">
                    <span className="font-bold text-[#2c2c2c] flex items-center gap-1">
                      <TableIcon className="w-4 h-4 text-[#ff6321]" /> Interactive Table Editor
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const tData = block.meta?.tableData || createDefaultTableData();
                          const newHeaders = [...tData.headers, `Col ${tData.headers.length + 1}`];
                          const newRows = tData.rows.map((r) => [...r, '']);
                          updateBlockMeta(block.id, {
                            tableData: { ...tData, headers: newHeaders, rows: newRows },
                          });
                        }}
                        className="px-2 py-1 rounded bg-white border border-[#e0e0e0] text-[#2c2c2c] font-bold text-[11px] hover:bg-[#f0f0f0]"
                      >
                        + Add Column
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tData = block.meta?.tableData || createDefaultTableData();
                          const newRow = new Array(tData.headers.length).fill('');
                          updateBlockMeta(block.id, {
                            tableData: { ...tData, rows: [...tData.rows, newRow] },
                          });
                        }}
                        className="px-2 py-1 rounded bg-[#ff6321] text-white font-bold text-[11px] hover:opacity-90"
                      >
                        + Add Row
                      </button>
                    </div>
                  </div>

                  {/* Render Table Preview */}
                  <TableRenderer data={block.meta?.tableData} />
                </div>
              )}

              {/* 4b. Spreadsheet Block Editor */}
              {block.type === 'spreadsheet' && (
                <div className="space-y-2">
                  <SpreadsheetRenderer
                    data={block.meta?.spreadsheetData || createDefaultSpreadsheetData()}
                    isEditing={true}
                    onChangeData={(updated) => updateBlockMeta(block.id, { spreadsheetData: updated })}
                  />
                </div>
              )}

              {/* 5. Code Block Editor */}
              {block.type === 'code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-[#f0f0f0] p-2 rounded-t-md border border-[#e0e0e0]">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-[#ff6321]" />
                      <span className="font-bold text-[#2c2c2c]">Language:</span>
                      <select
                        value={block.meta?.codeLanguage || 'typescript'}
                        onChange={(e) => updateBlockMeta(block.id, { codeLanguage: e.target.value })}
                        className="bg-white border border-[#e0e0e0] rounded px-2 py-0.5 font-mono font-bold text-xs focus:outline-none"
                      >
                        <option value="typescript">TypeScript / JS</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++ / C</option>
                        <option value="latex">LaTeX Source</option>
                        <option value="html">HTML / CSS</option>
                        <option value="sql">SQL Query</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1 font-mono text-[11px] text-[#666] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={block.meta?.showLineNumbers ?? true}
                        onChange={(e) => updateBlockMeta(block.id, { showLineNumbers: e.target.checked })}
                      />
                      Line Numbers
                    </label>
                  </div>

                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Paste or type code snippet..."
                    rows={5}
                    className="w-full bg-[#1a1a1a] text-emerald-400 font-mono text-xs p-3 rounded-b-md border border-[#2c2c2c] focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* 6. Callout Box */}
              {block.type === 'callout' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-[#f9f9f9] p-2 rounded-md border border-[#e0e0e0]">
                    <span className="font-bold text-[#2c2c2c] flex items-center gap-1">
                      <Quote className="w-4 h-4 text-[#ff6321]" /> Callout Type:
                    </span>
                    <select
                      value={block.meta?.calloutType || 'note'}
                      onChange={(e) => updateBlockMeta(block.id, { calloutType: e.target.value as any })}
                      className="bg-white border border-[#e0e0e0] rounded px-2 py-0.5 text-xs font-bold text-[#2c2c2c]"
                    >
                      <option value="info">Info Callout</option>
                      <option value="note">Note Callout</option>
                      <option value="warning">Warning Callout</option>
                      <option value="tip">Pro Tip Callout</option>
                      <option value="quote">Pull Quote</option>
                    </select>
                  </div>

                  <CalloutRenderer
                    type={block.meta?.calloutType || 'note'}
                    content={block.content}
                    caption={block.meta?.caption}
                  />

                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Callout text content..."
                    rows={2}
                    className="w-full bg-white border border-[#e0e0e0] rounded-md p-2 text-xs text-[#2c2c2c]"
                  />
                </div>
              )}

              {/* 7. Footnote */}
              {block.type === 'footnote' && (
                <div className="bg-[#f9f9f9] border border-[#e0e0e0] p-3 rounded-md space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#ff6321]">
                      Footnote Entry #{block.meta?.footnoteNumber || 1}
                    </span>
                  </div>
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Footnote source description..."
                    rows={2}
                    className="w-full bg-white border border-[#e0e0e0] rounded p-2 text-xs text-[#2c2c2c]"
                  />
                </div>
              )}

              {/* 8. Divider Rule */}
              {block.type === 'divider' && (
                <div className="py-4 text-center">
                  <hr className="border-t-2 border-[#e0e0e0] my-2" />
                  <span className="text-[10px] text-[#999] font-mono uppercase">Horizontal Section Separator</span>
                </div>
              )}

              {/* 9. Image / Cartoon Figure with Numbering & Hyperlink Tool */}
              {block.type === 'image' && (
                <div className="space-y-3 bg.white p-4 rounded-xl border border-slate-300 shadow-xs">
                  
                  {/* Top Bar: URL, Upload & Cartoon Studio Button */}
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      placeholder="Image URL (e.g. https://... or paste image link)"
                      className="flex-1 w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-xs text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none font-mono"
                    />

                    <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors shrink-0">
                      <UploadCloud className="w-3.5 h-3.5 text-[#ff6321]" />
                      <span>Upload Local</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                updateBlockContent(block.id, evt.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setCartoonTargetBlockId(block.id);
                        setIsCartoonModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>🎨 Cartoon Studio</span>
                    </button>
                  </div>

                  {/* Figure Numbering & Hyperlink Control Bar */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-orange-600">
                        <Hash className="w-3.5 h-3.5" /> Image Numbering & Captioning
                      </span>
                      {block.meta?.figureLabel && (
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-mono font-extrabold text-[10px]">
                          {block.meta.figureLabel}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                      {/* Number Prefix Selector */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Prefix
                        </label>
                        <select
                          value={block.meta?.imageNumberPrefix || 'Illustration'}
                          onChange={(e) => {
                            const prefix = e.target.value;
                            const num = block.meta?.imageNumber || 1;
                            updateBlockMeta(block.id, {
                              imageNumberPrefix: prefix,
                              figureLabel: `${prefix} ${num}`,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#ff6321]"
                        >
                          <option value="Illustration">Illustration</option>
                          <option value="Figure">Figure</option>
                          <option value="Cartoon">Cartoon</option>
                          <option value="Scene">Scene</option>
                          <option value="Plate">Plate</option>
                        </select>
                      </div>

                      {/* Number Input */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Image No.
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={block.meta?.imageNumber || 1}
                          onChange={(e) => {
                            const num = parseInt(e.target.value) || 1;
                            const prefix = block.meta?.imageNumberPrefix || 'Illustration';
                            updateBlockMeta(block.id, {
                              imageNumber: num,
                              figureLabel: `${prefix} ${num}`,
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono font-bold text-slate-800 text-xs focus:outline-none focus:border-[#ff6321]"
                        />
                      </div>

                      {/* Manual Figure Label Override */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Label Tag Override
                        </label>
                        <input
                          type="text"
                          value={block.meta?.figureLabel || ''}
                          onChange={(e) => updateBlockMeta(block.id, { figureLabel: e.target.value })}
                          placeholder="e.g. Illustration 1"
                          className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#ff6321]"
                        />
                      </div>
                    </div>

                    {/* Caption & Hyperlink Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Caption Description
                        </label>
                        <input
                          type="text"
                          value={block.meta?.caption || ''}
                          onChange={(e) => updateBlockMeta(block.id, { caption: e.target.value })}
                          placeholder="e.g. Max discovers the glowing key"
                          className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-[#ff6321]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-blue-600" /> Interactive Image Link (URL)
                        </label>
                        <input
                          type="text"
                          value={block.meta?.linkUrl || ''}
                          onChange={(e) => updateBlockMeta(block.id, { linkUrl: e.target.value })}
                          placeholder="e.g. https://... or #chapter-2"
                          className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-xs text-blue-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Width & Accessibility Options */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Display Width:</span>
                      <div className="flex items-center bg-white rounded border border-slate-300 p-0.5">
                        {[50, 75, 100].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateBlockMeta(block.id, { imageWidthPercentage: w })}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (block.meta?.imageWidthPercentage || 100) === w
                                ? 'bg-[#ff6321] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {w}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs">
                      <input
                        type="text"
                        value={block.meta?.altText || ''}
                        onChange={(e) => updateBlockMeta(block.id, { altText: e.target.value })}
                        placeholder="Alt Text (for screen readers)"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Figure Preview Frame */}
                  {block.content ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-50 p-3 flex flex-col items-center justify-center group">
                      <img
                        src={block.content}
                        alt={block.meta?.altText || block.meta?.caption || 'Figure'}
                        style={{ width: `${block.meta?.imageWidthPercentage || 100}%` }}
                        className="max-h-72 object-contain rounded transition-all shadow-xs"
                      />

                      {/* Badges on image */}
                      {block.meta?.figureLabel && (
                        <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white font-mono font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-white/20">
                          {block.meta.figureLabel}
                        </div>
                      )}

                      {block.meta?.linkUrl && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <LinkIcon className="w-3 h-3" /> Linked
                        </div>
                      )}

                      {(block.meta?.figureLabel || block.meta?.caption) && (
                        <div className="mt-2.5 text-center px-4 py-1.5 bg-white border border-slate-200 rounded-md max-w-xl text-xs">
                          <span className="font-mono font-extrabold text-[#ff6321] mr-1.5">
                            {block.meta?.figureLabel || 'Illustration'}:
                          </span>
                          <span className="italic text-slate-800">{block.meta?.caption || ''}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-300 rounded-lg text-center bg-white text-slate-400 text-xs font-medium space-y-2">
                      <p>Paste an image URL above, upload a file, or click 🎨 Cartoon Studio to generate children illustrations.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCartoonTargetBlockId(block.id);
                          setIsCartoonModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Open Cartoon Studio Generator
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* 10. Reference Bibliography Link */}
              {block.type === 'reference' && (
                <div className="flex items-center justify-between bg-[#ff6321]/5 border border-[#ff6321]/20 p-3 rounded-md text-xs text-[#2c2c2c]">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#ff6321]" />
                    <div>
                      <span className="font-bold text-[#ff6321] font-mono mr-2">
                        {block.content || '[Citation Key]'}
                      </span>
                      <span className="font-medium">
                        {references.find((r) => r.citationKey === block.content)?.title || 'Bibliographic reference entry'}
                      </span>
                    </div>
                  </div>
                  <select
                    value={block.content}
                    onChange={(e) => {
                      const refObj = references.find((r) => r.citationKey === e.target.value);
                      updateBlockContent(block.id, e.target.value);
                      if (refObj) {
                        updateBlockMeta(block.id, { referenceId: refObj.id });
                      }
                    }}
                    className="bg-white border border-[#e0e0e0] rounded px-2 py-1 text-xs text-[#2c2c2c] font-semibold focus:outline-none"
                  >
                    <option value="">Select Reference Citation</option>
                    {references.map((r) => (
                      <option key={r.id} value={r.citationKey}>
                        {r.citationKey} - {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 11. Practice Examination MCQ Quiz Block */}
              {block.type === 'mcq' && (() => {
                const quizData: McqQuizData = block.meta?.mcqData || createDefaultMcqQuizData();

                const updateQuiz = (updatedQuiz: McqQuizData) => {
                  updateBlockMeta(block.id, { mcqData: updatedQuiz });
                };

                return (
                  <div className="bg-emerald-50/70 border border-emerald-300 rounded-lg p-4 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Interactive Examination & Revision MCQ Quiz</h4>
                          <p className="text-[10px] text-slate-500">Readers will answer these questions in the reader shell and receive real-time scores and solution notes.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] border border-emerald-300">
                        {quizData.questions.length} Question{quizData.questions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Quiz Settings Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Quiz Title</label>
                        <input
                          type="text"
                          value={quizData.title || ''}
                          onChange={(e) => updateQuiz({ ...quizData, title: e.target.value })}
                          placeholder="e.g. Past Exam Question Paper - Nov 2025"
                          className="w-full bg-white border border-emerald-200 rounded-md p-2 font-bold text-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Passing Score (%)</label>
                        <input
                          type="number"
                          value={quizData.passingScorePercentage ?? 70}
                          onChange={(e) => updateQuiz({ ...quizData, passingScorePercentage: Number(e.target.value) || 70 })}
                          className="w-full bg-white border border-emerald-200 rounded-md p-2 font-bold text-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Instructions</label>
                        <input
                          type="text"
                          value={quizData.instructions || ''}
                          onChange={(e) => updateQuiz({ ...quizData, instructions: e.target.value })}
                          placeholder="e.g. Select the correct answer for each question."
                          className="w-full bg-white border border-emerald-200 rounded-md p-2 text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-3 pt-2">
                      <h5 className="font-bold text-slate-700 text-xs flex items-center justify-between">
                        <span>Questions & Revision Answers</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQ: McqQuestion = {
                              id: 'q_' + Math.random().toString(36).substring(2, 7),
                              questionText: 'New examination question text...',
                              options: ['Option A', 'Option B', 'Option C', 'Option D'],
                              correctOptionIndex: 0,
                              explanation: 'Step-by-step revision solution explanation...',
                              marks: 1,
                              topic: 'General Topic',
                            };
                            updateQuiz({ ...quizData, questions: [...quizData.questions, newQ] });
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Question
                        </button>
                      </h5>

                      {quizData.questions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="bg-white border border-emerald-200 rounded-md p-3.5 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                              Q{qIdx + 1}
                            </span>
                            <div className="flex items-center gap-2 flex-1 max-w-sm">
                              <input
                                type="text"
                                value={q.topic || ''}
                                onChange={(e) => {
                                  const updated = [...quizData.questions];
                                  updated[qIdx] = { ...updated[qIdx], topic: e.target.value };
                                  updateQuiz({ ...quizData, questions: updated });
                                }}
                                placeholder="Topic (e.g., Algebra, Audit)"
                                className="w-1/2 bg-slate-50 border border-slate-200 rounded p-1 text-[11px]"
                              />
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                                <span>Marks:</span>
                                <input
                                  type="number"
                                  value={q.marks || 1}
                                  onChange={(e) => {
                                    const updated = [...quizData.questions];
                                    updated[qIdx] = { ...updated[qIdx], marks: Math.max(1, Number(e.target.value) || 1) };
                                    updateQuiz({ ...quizData, questions: updated });
                                  }}
                                  className="w-12 bg-slate-50 border border-slate-200 rounded p-1 text-center font-mono text-[11px]"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = quizData.questions.filter((_, idx) => idx !== qIdx);
                                updateQuiz({ ...quizData, questions: updated });
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Question Prompt / Past Exam Statement</label>
                            <textarea
                              value={q.questionText}
                              onChange={(e) => {
                                const updated = [...quizData.questions];
                                updated[qIdx] = { ...updated[qIdx], questionText: e.target.value };
                                updateQuiz({ ...quizData, questions: updated });
                              }}
                              rows={2}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Options */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                              <span>Multiple Choice Options (Select Radio for Correct Option)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...quizData.questions];
                                  const opts = [...updated[qIdx].options, `Option ${updated[qIdx].options.length + 1}`];
                                  updated[qIdx] = { ...updated[qIdx], options: opts };
                                  updateQuiz({ ...quizData, questions: updated });
                                }}
                                className="text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                              >
                                + Add Option
                              </button>
                            </div>

                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct_${q.id}_${block.id}`}
                                  checked={q.correctOptionIndex === optIdx}
                                  onChange={() => {
                                    const updated = [...quizData.questions];
                                    updated[qIdx] = { ...updated[qIdx], correctOptionIndex: optIdx };
                                    updateQuiz({ ...quizData, questions: updated });
                                  }}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="font-mono text-[10px] font-bold text-slate-400 w-5">
                                  {String.fromCharCode(65 + optIdx)})
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...quizData.questions];
                                    const opts = [...updated[qIdx].options];
                                    opts[optIdx] = e.target.value;
                                    updated[qIdx] = { ...updated[qIdx], options: opts };
                                    updateQuiz({ ...quizData, questions: updated });
                                  }}
                                  className={`flex-1 bg-slate-50 border rounded p-1.5 text-xs text-slate-800 ${
                                    q.correctOptionIndex === optIdx ? 'border-emerald-500 bg-emerald-50/50 font-semibold' : 'border-slate-200'
                                  }`}
                                />
                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...quizData.questions];
                                      const opts = updated[qIdx].options.filter((_, idx) => idx !== optIdx);
                                      let correctIdx = updated[qIdx].correctOptionIndex;
                                      if (correctIdx === optIdx) correctIdx = 0;
                                      else if (correctIdx > optIdx) correctIdx -= 1;
                                      updated[qIdx] = { ...updated[qIdx], options: opts, correctOptionIndex: correctIdx };
                                      updateQuiz({ ...quizData, questions: updated });
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Revision Explanation */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-0.5">
                              Revision Solution & Explanation Notes (Shown after reader submits)
                            </label>
                            <textarea
                              value={q.explanation || ''}
                              onChange={(e) => {
                                const updated = [...quizData.questions];
                                updated[qIdx] = { ...updated[qIdx], explanation: e.target.value };
                                updateQuiz({ ...quizData, questions: updated });
                              }}
                              placeholder="Detail step-by-step working, formulas, or academic notes..."
                              rows={2}
                              className="w-full bg-emerald-50/30 border border-emerald-200 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>
                );
              })()}

            </div>
          ))
        )}
      </div>

      {/* Math Formula Builder Modal */}
      <MathFormulaModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
        onInsertFormula={handleSaveMathFormula}
        initialLatex={editingMathBlockId ? blocks.find((b) => b.id === editingMathBlockId)?.content : ''}
        initialLabel={editingMathBlockId ? blocks.find((b) => b.id === editingMathBlockId)?.meta?.mathLabel : ''}
      />

      {/* Quick LaTeX Operators & Symbols Popup Palette Modal */}
      <QuickLatexModal
        isOpen={isQuickLatexModalOpen}
        onClose={() => setIsQuickLatexModalOpen(false)}
        blocks={blocks}
        onInsertIntoBlock={handleInsertQuickLatexToBlock}
        onCreateNewMathBlock={(latex, label) => {
          addBlock('latex', latex, { mathLabel: label || `Eq. ${analytics.mathCount + 1}.1`, latexMode: 'display' });
        }}
      />

      {/* Book Content Emoji Palette Modal */}
      <EmojiPickerModal
        isOpen={isEmojiModalOpen}
        onClose={() => setIsEmojiModalOpen(false)}
        blocks={blocks}
        initialTargetBlockId={emojiTargetBlockId}
        onInsertEmojiToBlock={(blockId, emojiStr) => {
          const target = blocks.find((b) => b.id === blockId);
          if (!target) return;
          const updated = target.content ? `${target.content} ${emojiStr}` : emojiStr;
          updateBlockContent(blockId, updated);
        }}
        onCreateNewBlockWithEmoji={(emojiStr) => {
          addBlock('paragraph', emojiStr);
        }}
      />

      {/* Children's Cartoon Illustration Studio & Generator Modal */}
      <CartoonGeneratorModal
        isOpen={isCartoonModalOpen}
        onClose={() => setIsCartoonModalOpen(false)}
        blocks={blocks}
        initialTargetBlockId={cartoonTargetBlockId}
        onInsertCartoonBlock={({
          imageUrl,
          caption,
          figureLabel,
          imageNumberPrefix,
          imageNumber,
          linkUrl,
          cartoonStyle,
          cartoonPrompt,
          targetBlockId,
        }) => {
          if (targetBlockId) {
            // Update existing target block
            const updated = blocks.map((b) => {
              if (b.id === targetBlockId) {
                return {
                  ...b,
                  type: 'image' as const,
                  content: imageUrl,
                  meta: {
                    ...b.meta,
                    caption,
                    figureLabel,
                    imageNumberPrefix,
                    imageNumber,
                    linkUrl,
                    cartoonStyle,
                    cartoonPrompt,
                  },
                };
              }
              return b;
            });
            onChangeBlocks(updated);
          } else {
            // Add a new image block
            addBlock('image', imageUrl, {
              caption,
              figureLabel,
              imageNumberPrefix,
              imageNumber,
              linkUrl,
              cartoonStyle,
              cartoonPrompt,
            });
          }
        }}
      />

    </div>
  );
};
