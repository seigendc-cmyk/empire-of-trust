import React, { useState } from 'react';
import { Sigma, X, Check, Copy, Search, Sparkles, Plus, ArrowRight, Layers, HelpCircle, CheckCircle2 } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { ContentBlock } from '../../types';

interface QuickLatexModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks?: ContentBlock[];
  onInsertIntoBlock?: (blockId: string, latexToAppend: string) => void;
  onCreateNewMathBlock?: (latex: string, label?: string) => void;
  onPasteLatex?: (latex: string) => void; // General callback if used inside another modal
}

export interface LatexSymbol {
  name: string;
  latex: string;
  category: string;
  keywords: string;
  description?: string;
}

export const QUICK_LATEX_CATEGORIES = [
  'All',
  'Operators & Fractions',
  'Calculus & Integrals',
  'Greek Letters',
  'Relations & Logic',
  'Matrices & Vectors',
  'Physics & Constants',
  'Sets & Logic',
  'Accents & Brackets',
];

export const LATEX_SYMBOLS_DATABASE: LatexSymbol[] = [
  // Operators & Fractions
  { name: 'Fraction', latex: '\\frac{a}{b}', category: 'Operators & Fractions', keywords: 'fraction divide over ratio', description: 'Numerator over denominator' },
  { name: 'Square Root', latex: '\\sqrt{x}', category: 'Operators & Fractions', keywords: 'root radical square', description: 'Square root operator' },
  { name: 'N-th Root', latex: '\\sqrt[n]{x}', category: 'Operators & Fractions', keywords: 'nth root radical index', description: 'Radical with custom index n' },
  { name: 'Power / Superscript', latex: 'x^{n}', category: 'Operators & Fractions', keywords: 'power exponent square superscript', description: 'Base x raised to power n' },
  { name: 'Subscript', latex: 'x_{n}', category: 'Operators & Fractions', keywords: 'subscript index base', description: 'Base x with subscript index n' },
  { name: 'Plus-Minus', latex: '\\pm', category: 'Operators & Fractions', keywords: 'plus minus sign operator', description: 'Plus or minus symbol' },
  { name: 'Minus-Plus', latex: '\\mp', category: 'Operators & Fractions', keywords: 'minus plus sign operator', description: 'Minus or plus symbol' },
  { name: 'Multiplication Dot', latex: '\\cdot', category: 'Operators & Fractions', keywords: 'multiply dot scalar', description: 'Centered multiplication dot' },
  { name: 'Cross Multiply', latex: '\\times', category: 'Operators & Fractions', keywords: 'times multiply cross product', description: 'Vector cross or multiplication cross' },
  { name: 'Division', latex: '\\div', category: 'Operators & Fractions', keywords: 'divide division ratio', description: 'Standard division sign' },
  { name: 'Asterisk Operator', latex: '\\ast', category: 'Operators & Fractions', keywords: 'asterisk star operator', description: 'Centered asterisk operator' },
  { name: 'Circle Operator', latex: '\\circ', category: 'Operators & Fractions', keywords: 'circle compose degree', description: 'Composition or degree operator' },

  // Calculus & Integrals
  { name: 'Definite Integral', latex: '\\int_{a}^{b} f(x)\\,dx', category: 'Calculus & Integrals', keywords: 'integral calculus area integrate', description: 'Single integral from a to b' },
  { name: 'Indefinite Integral', latex: '\\int f(x)\\,dx', category: 'Calculus & Integrals', keywords: 'integral calculus integrate', description: 'Indefinite integral' },
  { name: 'Double Integral', latex: '\\iint_{D} f(x,y)\\,dA', category: 'Calculus & Integrals', keywords: 'double integral area surface', description: 'Double integral over domain D' },
  { name: 'Contour Integral', latex: '\\oint_{C} f(z)\\,dz', category: 'Calculus & Integrals', keywords: 'contour closed line integral', description: 'Closed line contour integral' },
  { name: 'Partial Derivative', latex: '\\frac{\\partial y}{\\partial x}', category: 'Calculus & Integrals', keywords: 'partial derivative calculus diff', description: 'Partial derivative ratio' },
  { name: 'Second Partial', latex: '\\frac{\\partial^2 f}{\\partial x^2}', category: 'Calculus & Integrals', keywords: 'second partial derivative curvature', description: 'Second-order partial derivative' },
  { name: 'Nabla / Gradient', latex: '\\nabla', category: 'Calculus & Integrals', keywords: 'nabla gradient del operator', description: 'Del gradient vector operator' },
  { name: 'Divergence', latex: '\\nabla \\cdot \\mathbf{E}', category: 'Calculus & Integrals', keywords: 'divergence del dot vector', description: 'Vector field divergence' },
  { name: 'Curl', latex: '\\nabla \\times \\mathbf{B}', category: 'Calculus & Integrals', keywords: 'curl del cross vector field', description: 'Vector field curl' },
  { name: 'Summation', latex: '\\sum_{i=1}^{n} x_i', category: 'Calculus & Integrals', keywords: 'sum summation sigma series', description: 'Summation from i=1 to n' },
  { name: 'Product', latex: '\\prod_{i=1}^{n} x_i', category: 'Calculus & Integrals', keywords: 'product pi multiply series', description: 'Product over index i' },
  { name: 'Limit', latex: '\\lim_{x \\to a} f(x)', category: 'Calculus & Integrals', keywords: 'limit calculus asymptote converges', description: 'Limit as x approaches a' },
  { name: 'Infinity', latex: '\\infty', category: 'Calculus & Integrals', keywords: 'infinity infinite loop bound', description: 'Infinity symbol' },

  // Greek Letters
  { name: 'Alpha (α)', latex: '\\alpha', category: 'Greek Letters', keywords: 'alpha greek letter angle', description: 'Lowercase alpha' },
  { name: 'Beta (β)', latex: '\\beta', category: 'Greek Letters', keywords: 'beta greek letter angle coefficient', description: 'Lowercase beta' },
  { name: 'Gamma (γ)', latex: '\\gamma', category: 'Greek Letters', keywords: 'gamma greek letter photon factor', description: 'Lowercase gamma' },
  { name: 'Delta (δ)', latex: '\\delta', category: 'Greek Letters', keywords: 'delta dirac change variation', description: 'Lowercase delta' },
  { name: 'Epsilon (ε)', latex: '\\varepsilon', category: 'Greek Letters', keywords: 'epsilon permittivity error tolerance', description: 'Lunate epsilon' },
  { name: 'Theta (θ)', latex: '\\theta', category: 'Greek Letters', keywords: 'theta angle polar coordinate', description: 'Lowercase theta' },
  { name: 'Lambda (λ)', latex: '\\lambda', category: 'Greek Letters', keywords: 'lambda wavelength eigenvalue', description: 'Lowercase lambda' },
  { name: 'Mu (μ)', latex: '\\mu', category: 'Greek Letters', keywords: 'mu mean micro friction permeability', description: 'Lowercase mu' },
  { name: 'Pi (π)', latex: '\\pi', category: 'Greek Letters', keywords: 'pi circle constant ratio', description: 'Mathematical constant pi' },
  { name: 'Sigma (σ)', latex: '\\sigma', category: 'Greek Letters', keywords: 'sigma standard deviation stress conductivity', description: 'Lowercase sigma' },
  { name: 'Phi (φ)', latex: '\\phi', category: 'Greek Letters', keywords: 'phi phase golden ratio potential', description: 'Lowercase phi' },
  { name: 'Omega (ω)', latex: '\\omega', category: 'Greek Letters', keywords: 'omega angular frequency resistance', description: 'Lowercase omega' },
  { name: 'Capital Delta (Δ)', latex: '\\Delta', category: 'Greek Letters', keywords: 'capital delta change difference laplacian', description: 'Uppercase Delta' },
  { name: 'Capital Gamma (Γ)', latex: '\\Gamma', category: 'Greek Letters', keywords: 'capital gamma function christoffel', description: 'Uppercase Gamma' },
  { name: 'Capital Theta (Θ)', latex: '\\Theta', category: 'Greek Letters', keywords: 'capital theta asymptote complexity', description: 'Uppercase Theta' },
  { name: 'Capital Lambda (Λ)', latex: '\\Lambda', category: 'Greek Letters', keywords: 'capital lambda cosmological matrix', description: 'Uppercase Lambda' },
  { name: 'Capital Sigma (Σ)', latex: '\\Sigma', category: 'Greek Letters', keywords: 'capital sigma sum matrix covariance', description: 'Uppercase Sigma' },
  { name: 'Capital Omega (Ω)', latex: '\\Omega', category: 'Greek Letters', keywords: 'capital omega ohm sample space', description: 'Uppercase Omega' },

  // Relations & Logic
  { name: 'Equals', latex: '=', category: 'Relations & Logic', keywords: 'equal identity', description: 'Equal sign' },
  { name: 'Not Equal', latex: '\\neq', category: 'Relations & Logic', keywords: 'not equal inequality unequal', description: 'Not equal sign' },
  { name: 'Approximately Equal', latex: '\\approx', category: 'Relations & Logic', keywords: 'approximate estimate asymptotic', description: 'Approximately equal to' },
  { name: 'Proportional To', latex: '\\propto', category: 'Relations & Logic', keywords: 'proportional scale directly', description: 'Proportional to' },
  { name: 'Less Than or Equal', latex: '\\leq', category: 'Relations & Logic', keywords: 'less equal inequality bound', description: 'Less than or equal to' },
  { name: 'Greater Than or Equal', latex: '\\geq', category: 'Relations & Logic', keywords: 'greater equal inequality bound', description: 'Greater than or equal to' },
  { name: 'Much Less Than', latex: '\\ll', category: 'Relations & Logic', keywords: 'much less order magnitude', description: 'Much smaller than' },
  { name: 'Much Greater Than', latex: '\\gg', category: 'Relations & Logic', keywords: 'much greater order magnitude', description: 'Much larger than' },
  { name: 'Implies', latex: '\\Rightarrow', category: 'Relations & Logic', keywords: 'implies arrow conditional then', description: 'Logical implication right arrow' },
  { name: 'If and Only If', latex: '\\iff', category: 'Relations & Logic', keywords: 'iff equivalent equivalence bidirectional', description: 'Logical double implication' },
  { name: 'For All', latex: '\\forall', category: 'Relations & Logic', keywords: 'forall universal quantifier every', description: 'Universal quantifier' },
  { name: 'There Exists', latex: '\\exists', category: 'Relations & Logic', keywords: 'exists existential quantifier some', description: 'Existential quantifier' },

  // Matrices & Vectors
  { name: '2x2 Matrix (Parentheses)', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'Matrices & Vectors', keywords: 'matrix 2x2 pmatrix array linear algebra', description: '2 by 2 matrix with round brackets' },
  { name: '2x2 Matrix (Brackets)', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', category: 'Matrices & Vectors', keywords: 'matrix 2x2 bmatrix square array', description: '2 by 2 matrix with square brackets' },
  { name: '3x3 Matrix', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', category: 'Matrices & Vectors', keywords: 'matrix 3x3 pmatrix array linear algebra', description: '3 by 3 matrix with round brackets' },
  { name: 'Vector Arrow', latex: '\\vec{v}', category: 'Matrices & Vectors', keywords: 'vector arrow spatial direction', description: 'Vector with overhead arrow' },
  { name: 'Bold Vector', latex: '\\mathbf{v}', category: 'Matrices & Vectors', keywords: 'bold vector matrix tensor', description: 'Boldface vector font' },
  { name: 'Unit Vector Hat', latex: '\\hat{i}', category: 'Matrices & Vectors', keywords: 'unit vector hat direction basis', description: 'Unit vector with caret hat' },
  { name: 'Norm / Magnitude', latex: '\\| \\mathbf{v} \\|', category: 'Matrices & Vectors', keywords: 'norm magnitude length distance', description: 'Double bar norm operator' },

  // Physics & Constants
  { name: 'Reduced Planck Constant', latex: '\\hbar', category: 'Physics & Constants', keywords: 'hbar planck quantum physics', description: 'Dirac reduced Planck constant h-bar' },
  { name: 'Vacuum Permittivity', latex: '\\varepsilon_0', category: 'Physics & Constants', keywords: 'permittivity epsilon zero vacuum electric', description: 'Electric constant epsilon_0' },
  { name: 'Vacuum Permeability', latex: '\\mu_0', category: 'Physics & Constants', keywords: 'permeability mu zero magnetic vacuum', description: 'Magnetic constant mu_0' },
  { name: 'Hamiltonian Operator', latex: '\\hat{H}', category: 'Physics & Constants', keywords: 'hamiltonian energy quantum operator', description: 'Quantum total energy operator' },
  { name: 'Wave Function', latex: '\\Psi(\\mathbf{r}, t)', category: 'Physics & Constants', keywords: 'psi wave function quantum state', description: 'Quantum wave function Psi' },
  { name: 'Speed of Light c', latex: 'c = 3 \\times 10^8 \\text{ m/s}', category: 'Physics & Constants', keywords: 'light speed constant relativity c', description: 'Speed of light constant' },
  { name: 'Euler Constant e', latex: 'e \\approx 2.71828', category: 'Physics & Constants', keywords: 'euler constant natural logarithm e', description: 'Base of natural logarithm' },

  // Sets & Logic
  { name: 'Element Of', latex: '\\in', category: 'Sets & Logic', keywords: 'in element belongs set', description: 'Belongs to set' },
  { name: 'Not Element Of', latex: '\\notin', category: 'Sets & Logic', keywords: 'notin not element set', description: 'Does not belong to set' },
  { name: 'Subset', latex: '\\subset', category: 'Sets & Logic', keywords: 'subset contained set', description: 'Proper subset of' },
  { name: 'Subset or Equal', latex: '\\subseteq', category: 'Sets & Logic', keywords: 'subseteq contained equal set', description: 'Subset or equal to' },
  { name: 'Union', latex: '\\cup', category: 'Sets & Logic', keywords: 'union cup join set', description: 'Set union operator' },
  { name: 'Intersection', latex: '\\cap', category: 'Sets & Logic', keywords: 'intersection cap meet set', description: 'Set intersection operator' },
  { name: 'Empty Set', latex: '\\emptyset', category: 'Sets & Logic', keywords: 'empty set null phi void', description: 'Empty set notation' },
  { name: 'Real Numbers Set', latex: '\\mathbb{R}', category: 'Sets & Logic', keywords: 'real numbers blackboard bold mathbb', description: 'Set of real numbers R' },
  { name: 'Complex Numbers Set', latex: '\\mathbb{C}', category: 'Sets & Logic', keywords: 'complex numbers blackboard bold mathbb', description: 'Set of complex numbers C' },
  { name: 'Integers Set', latex: '\\mathbb{Z}', category: 'Sets & Logic', keywords: 'integers blackboard bold mathbb Z', description: 'Set of integers Z' },

  // Accents & Brackets
  { name: 'Overbar', latex: '\\bar{x}', category: 'Accents & Brackets', keywords: 'bar mean average overbar', description: 'Mean value overbar' },
  { name: 'Time Derivative Dot', latex: '\\dot{x}', category: 'Accents & Brackets', keywords: 'dot derivative velocity newton', description: 'First time derivative dot' },
  { name: 'Second Time Derivative', latex: '\\ddot{x}', category: 'Accents & Brackets', keywords: 'ddot acceleration second derivative', description: 'Second time derivative double dot' },
  { name: 'Dynamic Size Parentheses', latex: '\\left( \\frac{a}{b} \\right)', category: 'Accents & Brackets', keywords: 'left right parentheses scalable brackets', description: 'Scalable matching round brackets' },
  { name: 'Dynamic Size Square Brackets', latex: '\\left[ \\frac{a}{b} \\right]', category: 'Accents & Brackets', keywords: 'left right square brackets scalable', description: 'Scalable matching square brackets' },
  { name: 'Dynamic Size Curly Braces', latex: '\\left\\{ x \\in \\mathbb{R} \\mid x > 0 \\right\\}', category: 'Accents & Brackets', keywords: 'left right curly braces set builder', description: 'Scalable set-builder curly braces' },
];

export const QuickLatexModal: React.FC<QuickLatexModalProps> = ({
  isOpen,
  onClose,
  blocks = [],
  onInsertIntoBlock,
  onCreateNewMathBlock,
  onPasteLatex,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expressionBuffer, setExpressionBuffer] = useState<string>('');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [selectedTargetBlockId, setSelectedTargetBlockId] = useState<string>(
    blocks.length > 0 ? blocks[0].id : ''
  );
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAppendSymbol = (latex: string) => {
    setExpressionBuffer((prev) => {
      if (!prev) return latex;
      return `${prev} ${latex}`;
    });
  };

  const handleCopyLatex = (latex: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedSymbol(latex);
    setTimeout(() => setCopiedSymbol(null), 1800);
  };

  const handlePasteToBlock = () => {
    if (!expressionBuffer.trim()) return;

    if (onPasteLatex) {
      onPasteLatex(expressionBuffer);
      setActionSuccessMsg('Pasted expression into active editor!');
      setTimeout(() => setActionSuccessMsg(null), 2000);
      return;
    }

    if (selectedTargetBlockId && onInsertIntoBlock) {
      onInsertIntoBlock(selectedTargetBlockId, expressionBuffer);
      setActionSuccessMsg('Appended expression into manuscript block!');
      setTimeout(() => setActionSuccessMsg(null), 2000);
    } else if (onCreateNewMathBlock) {
      onCreateNewMathBlock(expressionBuffer);
      setActionSuccessMsg('Created new LaTeX equation block!');
      setTimeout(() => setActionSuccessMsg(null), 2000);
    }
  };

  const handleCreateNewBlockFromBuffer = () => {
    if (!expressionBuffer.trim() || !onCreateNewMathBlock) return;
    onCreateNewMathBlock(expressionBuffer);
    setActionSuccessMsg('Created new equation block in manuscript!');
    setTimeout(() => setActionSuccessMsg(null), 2000);
  };

  // Filter symbols based on category & search
  const filteredSymbols = LATEX_SYMBOLS_DATABASE.filter((sym) => {
    const matchesCategory = activeCategory === 'All' || sym.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      sym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sym.latex.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sym.keywords.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#d8d8d8] rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl text-[#2c2c2c]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6321]/10 text-[#ff6321] border border-[#ff6321]/20">
              <Sigma className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#1f1f1f]">Quick LaTeX Operators & Symbols Palette</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff6321]/10 text-[#ff6321] font-mono font-bold text-[10px] uppercase border border-[#ff6321]/20">
                  Book Builder Studio
                </span>
              </div>
              <p className="text-xs text-[#666]">
                Click any symbol or operator to insert it into your manuscript blocks or formula buffer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666] hover:text-[#1f1f1f] hover:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expression Buffer & Action Control Bar */}
        <div className="p-4 rounded-xl bg-[#f9f9f9] border border-[#e2e2e2] space-y-3 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[#666]">
            <span className="flex items-center gap-1.5 text-[#ff6321]">
              <Sparkles className="w-3.5 h-3.5" /> Expression Construction Buffer & Live Preview
            </span>
            {expressionBuffer && (
              <button
                type="button"
                onClick={() => setExpressionBuffer('')}
                className="text-red-500 hover:underline cursor-pointer font-bold lowercase text-[10px]"
              >
                Clear Buffer
              </button>
            )}
          </div>

          {/* KaTeX Live Render of Buffer */}
          <div className="p-3 bg-white border border-[#e0e0e0] rounded-lg min-h-[50px] flex items-center justify-center overflow-x-auto text-center">
            {expressionBuffer ? (
              <KatexMath math={expressionBuffer} displayMode={true} className="text-lg" />
            ) : (
              <span className="text-xs text-[#999] italic font-sans">
                Click operators or symbols below to build your expression here...
              </span>
            )}
          </div>

          {/* Buffer Code Field & Insertion Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-7">
              <input
                type="text"
                value={expressionBuffer}
                onChange={(e) => setExpressionBuffer(e.target.value)}
                placeholder="LaTeX code string e.g. \int_0^1 x^2 dx = \frac{1}{3}"
                className="w-full bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 font-mono text-xs text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5 flex items-center gap-1.5 justify-end">
              <button
                type="button"
                disabled={!expressionBuffer.trim()}
                onClick={() => handleCopyLatex(expressionBuffer)}
                className="px-3 py-2 rounded-lg bg-white border border-[#e0e0e0] hover:bg-[#f0f0f0] text-[#2c2c2c] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="Copy LaTeX to Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-[#ff6321]" />
                {copiedSymbol === expressionBuffer ? 'Copied!' : 'Copy Code'}
              </button>

              <button
                type="button"
                disabled={!expressionBuffer.trim()}
                onClick={handlePasteToBlock}
                className="px-4 py-2 rounded-lg bg-[#ff6321] hover:opacity-90 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Insert to Book
              </button>
            </div>
          </div>

          {actionSuccessMsg && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {actionSuccessMsg}
            </div>
          )}

          {/* Target Block Selection if blocks are provided */}
          {blocks.length > 0 && onInsertIntoBlock && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <label className="font-bold text-[#666] text-[11px] whitespace-nowrap">Target Block:</label>
              <select
                value={selectedTargetBlockId}
                onChange={(e) => setSelectedTargetBlockId(e.target.value)}
                className="bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1 text-xs font-mono text-[#2c2c2c] focus:outline-none focus:border-[#ff6321] flex-1 max-w-md"
              >
                {blocks.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    [{b.type.toUpperCase()}] #{idx + 1}: {b.content ? b.content.slice(0, 35) + '...' : '(Empty block)'}
                  </option>
                ))}
              </select>

              {onCreateNewMathBlock && (
                <button
                  type="button"
                  disabled={!expressionBuffer.trim()}
                  onClick={handleCreateNewBlockFromBuffer}
                  className="px-2.5 py-1 text-[11px] bg-white border border-[#ff6321]/40 text-[#ff6321] hover:bg-[#ff6321]/10 font-bold rounded-lg cursor-pointer whitespace-nowrap"
                >
                  + New Math Block
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Input & Category Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#888]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbols (e.g., integral, alpha, matrix)..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-xs text-[#2c2c2c] focus:outline-none focus:border-[#ff6321]"
              />
            </div>

            <div className="text-[11px] font-mono text-[#777] font-bold">
              Showing {filteredSymbols.length} Operators
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {QUICK_LATEX_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#ff6321] text-white shadow-xs'
                    : 'bg-[#f2f2f2] text-[#555] hover:bg-[#e8e8e8] hover:text-[#1f1f1f]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Symbols Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredSymbols.map((sym, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white border border-[#e0e0e0] hover:border-[#ff6321] hover:shadow-md transition-all space-y-2 flex flex-col justify-between group relative"
            >
              {/* Symbol Header Name */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#2c2c2c] group-hover:text-[#ff6321] truncate pr-1">
                  {sym.name}
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#f0f0f0] px-1.5 py-0.5 rounded text-[#777]">
                  {sym.category.split(' ')[0]}
                </span>
              </div>

              {/* KaTeX Preview Display Box */}
              <div
                onClick={() => handleAppendSymbol(sym.latex)}
                className="p-2 rounded-lg bg-[#f9f9f9] group-hover:bg-[#ff6321]/5 border border-[#eaeaea] group-hover:border-[#ff6321]/30 min-h-[50px] flex items-center justify-center cursor-pointer transition-all overflow-hidden"
                title="Click to add to Expression Buffer"
              >
                <KatexMath math={sym.latex} displayMode={false} className="text-sm font-semibold" />
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#f2f2f2] text-[10px]">
                <button
                  type="button"
                  onClick={() => handleCopyLatex(sym.latex)}
                  className="px-2 py-1 rounded bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#555] font-mono flex items-center gap-1 cursor-pointer"
                  title="Copy LaTeX code"
                >
                  <Copy className="w-3 h-3 text-[#ff6321]" />
                  {copiedSymbol === sym.latex ? 'Copied' : 'Copy'}
                </button>

                <button
                  type="button"
                  onClick={() => handleAppendSymbol(sym.latex)}
                  className="px-2.5 py-1 rounded bg-[#ff6321]/10 hover:bg-[#ff6321] text-[#ff6321] hover:text-white font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                  title="Add symbol to buffer"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          ))}

          {filteredSymbols.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-[#777] font-mono bg-[#f9f9f9] rounded-xl border border-dashed border-[#d0d0d0]">
              No LaTeX symbols or operators matching "{searchQuery}" in category "{activeCategory}".
            </div>
          )}
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] text-xs">
          <div className="text-[11px] text-[#777] font-mono">
            Empire Of Trust Book Builder • KaTeX Engine Supported
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#2c2c2c] font-bold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
