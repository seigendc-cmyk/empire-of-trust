import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, BookOpen, Menu, Bookmark, Highlighter, Type, Sun, Moon, Coffee, 
  ChevronLeft, ChevronRight, Check, Plus, MessageSquare, List, Sparkles, Share2, Database, FileText, Tv, FastForward, RotateCcw, Film,
  Tag, Globe, Users, User, Twitter, Linkedin, Github, MoreVertical, X, Clock, MapPin, CheckSquare, Award, CheckCircle2, XCircle, Printer, RefreshCw, Lock, ShieldAlert, Trash2
} from 'lucide-react';
import { Book, Chapter, Bookmark as BookmarkType, HighlightNote, QuizAttempt, McqQuizData } from '../../types';
import { addBookmarkSQLite, getBookmarksSQLite, addHighlightSQLite, getHighlightsSQLite, deleteHighlightSQLite, saveQuizAttemptSQLite, getQuizAttemptsSQLite, deleteQuizAttemptsSQLite } from '../../lib/sqlite';
import { formatChapterNumber } from '../../lib/numbering';
import { KatexMath } from '../common/KatexMath';
import { TableRenderer } from '../common/TableRenderer';
import { SpreadsheetRenderer } from '../common/SpreadsheetRenderer';
import { CodeBlockRenderer } from '../common/CodeBlockRenderer';
import { CalloutRenderer } from '../common/CalloutRenderer';
import { FootnoteRenderer } from '../common/FootnoteRenderer';
import { SceneCastViewer } from './SceneCastViewer';

interface ReaderViewProps {
  book: Book;
  onBackToLibrary: () => void;
  availableSeriesBooks?: Book[];
  onOpenSeriesBook?: (book: Book) => void;
}

/* -------------------------------------------------------------------------- */
/* Interactive MCQ Block Component for Offline Reader Shell                     */
/* -------------------------------------------------------------------------- */
interface ReaderMcqBlockProps {
  blockId: string;
  chapterId: string;
  bookId: string;
  quizData: McqQuizData;
  onAttemptSaved?: () => void;
}

const ReaderMcqBlock: React.FC<ReaderMcqBlockProps> = ({
  blockId,
  chapterId,
  bookId,
  quizData,
  onAttemptSaved,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    let isMounted = true;
    getQuizAttemptsSQLite(bookId).then((attempts) => {
      if (!isMounted) return;
      const existing = attempts.find((a) => a.blockId === blockId);
      if (existing) {
        setSavedAttempt(existing);
        setSelectedAnswers(existing.answers || {});
        setIsSubmitted(true);
      }
    });
    return () => { isMounted = false; };
  }, [bookId, blockId]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmit = async () => {
    let score = 0;
    let totalMarks = 0;

    quizData.questions.forEach((q) => {
      const qMarks = q.marks || 1;
      totalMarks += qMarks;
      const selected = selectedAnswers[q.id];
      if (selected === q.correctOptionIndex) {
        score += qMarks;
      }
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const attempt: QuizAttempt = {
      id: `${bookId}_${chapterId}_${blockId}`,
      bookId,
      chapterId,
      blockId,
      quizTitle: quizData.title || 'Revision & Practice Quiz',
      score,
      totalMarks,
      percentage,
      answers: selectedAnswers,
      attemptedAt: new Date().toISOString(),
    };

    await saveQuizAttemptSQLite(attempt);
    setSavedAttempt(attempt);
    setIsSubmitted(true);
    if (onAttemptSaved) onAttemptSaved();
  };

  const handleRetake = () => {
    setIsSubmitted(false);
  };

  const isPassed = savedAttempt ? savedAttempt.percentage >= (quizData.passingScorePercentage ?? 70) : false;

  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-black/40 border border-emerald-500/30 shadow-xl space-y-6 text-gray-200">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30">
              Examination Revision Module
            </span>
            <span className="text-xs font-mono opacity-60">
              Target Pass: {quizData.passingScorePercentage ?? 70}%
            </span>
          </div>
          <h3 className="text-lg font-bold text-white font-serif">{quizData.title || 'Practice Examination Quiz'}</h3>
          {quizData.instructions && (
            <p className="text-xs opacity-75">{quizData.instructions}</p>
          )}
        </div>

        {isSubmitted && savedAttempt && (
          <div className={`px-4 py-2 rounded-xl text-center border font-mono font-bold ${
            isPassed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'
          }`}>
            <div className="text-sm">{savedAttempt.score} / {savedAttempt.totalMarks} Marks ({savedAttempt.percentage}%)</div>
            <div className="text-[10px] tracking-wider uppercase mt-0.5">
              {isPassed ? 'Passed' : 'Needs Revision'}
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quizData.questions.map((q, qIdx) => {
          const selected = selectedAnswers[q.id];
          const isCorrect = selected === q.correctOptionIndex;

          return (
            <div key={q.id || qIdx} className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">Q{qIdx + 1}.</span>
                    {q.topic && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                        {q.topic}
                      </span>
                    )}
                    <span className="text-[10px] font-mono opacity-60 ml-auto">{q.marks || 1} Mark{(q.marks || 1) !== 1 ? 's' : ''}</span>
                  </div>
                  <h4 className="font-semibold text-sm leading-relaxed text-gray-100">{q.questionText}</h4>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = selected === optIdx;
                  const isThisCorrect = optIdx === q.correctOptionIndex;

                  let optStyle = "bg-white/5 border-white/10 hover:bg-white/10 text-gray-200";
                  if (isSubmitted) {
                    if (isThisCorrect) {
                      optStyle = "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold";
                    } else if (isThisSelected && !isThisCorrect) {
                      optStyle = "bg-red-500/20 border-red-500/60 text-red-300 line-through opacity-80";
                    } else {
                      optStyle = "bg-white/5 border-white/5 opacity-50";
                    }
                  } else if (isThisSelected) {
                    optStyle = "bg-emerald-500/20 border-emerald-400 text-white font-semibold";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${optStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold opacity-60">
                          {String.fromCharCode(65 + optIdx)})
                        </span>
                        <span>{opt}</span>
                      </div>

                      {isSubmitted && (
                        <div>
                          {isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {isThisSelected && !isThisCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Revision Solution Notes */}
              {isSubmitted && q.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Revision Solution & Explanation:
                  </div>
                  <p className="opacity-90 leading-relaxed text-gray-200">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quiz Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
        {!isSubmitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length === 0}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" /> Grade & Submit Answers
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetake}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake Revision Quiz
          </button>
        )}

        <span className="text-[11px] font-mono opacity-60">
          {Object.keys(selectedAnswers).length} of {quizData.questions.length} Answered
        </span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Coaching & Examination Progress Report Modal                                */
/* -------------------------------------------------------------------------- */
interface CoachingProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

const CoachingProgressReportModal: React.FC<CoachingProgressReportModalProps> = ({ isOpen, onClose, book }) => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttempts = async () => {
    setLoading(true);
    const data = await getQuizAttemptsSQLite(book.id);
    setAttempts(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadAttempts();
    }
  }, [isOpen, book.id]);

  if (!isOpen) return null;

  let totalScore = 0;
  let totalPossible = 0;

  const allMcqBlocks: Array<{ chapterTitle: string; chapterId: string; block: any }> = [];
  book.chapters.forEach((chap) => {
    chap.blocks.forEach((blk) => {
      if (blk.type === 'mcq' && blk.meta?.mcqData) {
        allMcqBlocks.push({ chapterTitle: chap.title, chapterId: chap.id, block: blk });
      }
    });
  });

  attempts.forEach((att) => {
    totalScore += att.score || 0;
    totalPossible += att.totalMarks || 0;
  });

  const overallPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  let gradeBadge = 'Not Attempted';
  let gradeColor = 'text-gray-400 border-gray-400/40 bg-gray-500/10';
  if (attempts.length > 0) {
    if (overallPercentage >= 85) {
      gradeBadge = 'Distinction / Mastery';
      gradeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20';
    } else if (overallPercentage >= 70) {
      gradeBadge = 'Merit / Passed';
      gradeColor = 'text-blue-400 border-blue-500/40 bg-blue-500/20';
    } else if (overallPercentage >= 50) {
      gradeBadge = 'Satisfactory / Pass';
      gradeColor = 'text-amber-400 border-amber-500/40 bg-amber-500/20';
    } else {
      gradeBadge = 'Needs Revision';
      gradeColor = 'text-red-400 border-red-500/40 bg-red-500/20';
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleResetProgress = async () => {
    if (window.confirm('Are you sure you want to reset all quiz attempts for this book?')) {
      await deleteQuizAttemptsSQLite(book.id);
      loadAttempts();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e2023] border border-white/20 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl text-gray-100 max-h-[90vh] overflow-y-auto print:bg-white print:text-black print:p-0 print:border-none print:shadow-none print:max-h-none print:static">
        
        {/* Printable Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6321]/20 border border-[#ff6321]/40 flex items-center justify-center text-[#ff6321] print:bg-orange-100 print:text-orange-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif">{book.title}</h2>
              <p className="text-xs text-gray-400 print:text-gray-600 font-mono">
                Official Academic Coaching & Examination Progress Report • Author: {book.author}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#ff6321]" /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/30 print:bg-gray-100 p-3.5 rounded-xl border border-white/10 print:border-gray-300 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-gray-400 print:text-gray-600 font-bold">Quizzes Attempted</div>
            <div className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-700">
              {attempts.length} / {allMcqBlocks.length}
            </div>
          </div>

          <div className="bg-black/30 print:bg-gray-100 p-3.5 rounded-xl border border-white/10 print:border-gray-300 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-gray-400 print:text-gray-600 font-bold">Total Score</div>
            <div className="text-xl font-bold font-mono text-white print:text-black">
              {totalScore} / {totalPossible}
            </div>
          </div>

          <div className="bg-black/30 print:bg-gray-100 p-3.5 rounded-xl border border-white/10 print:border-gray-300 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-gray-400 print:text-gray-600 font-bold">Overall Accuracy</div>
            <div className="text-xl font-bold font-mono text-amber-400 print:text-amber-700">
              {overallPercentage}%
            </div>
          </div>

          <div className="bg-black/30 print:bg-gray-100 p-3.5 rounded-xl border border-white/10 print:border-gray-300 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-gray-400 print:text-gray-600 font-bold">Assessment Status</div>
            <div className={`text-xs font-bold font-mono px-2 py-1 rounded border inline-block ${gradeColor}`}>
              {gradeBadge}
            </div>
          </div>
        </div>

        {/* Chapter Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold font-mono uppercase text-[#ff6321] tracking-wider">
            Detailed Examination Chapter Assessment Breakdown
          </h3>

          {allMcqBlocks.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 font-mono bg-black/20 rounded-xl border border-white/10">
              No practice examination modules configured in this academic book yet.
            </div>
          ) : (
            <div className="space-y-3">
              {allMcqBlocks.map(({ chapterTitle, block }, idx) => {
                const quizData: McqQuizData = block.meta?.mcqData || {};
                const att = attempts.find((a) => a.blockId === block.id);
                const isPassed = att ? att.percentage >= (quizData.passingScorePercentage ?? 70) : false;

                return (
                  <div key={block.id || idx} className="p-4 rounded-xl bg-black/20 print:bg-gray-50 border border-white/10 print:border-gray-300 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono text-[#ff6321] font-bold uppercase">{chapterTitle}</div>
                        <h4 className="font-bold text-sm text-gray-200 print:text-black">{quizData.title || 'Practice Examination Quiz'}</h4>
                      </div>

                      {att ? (
                        <div className={`px-3 py-1 rounded-lg border font-mono font-bold text-xs ${
                          isPassed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 print:text-emerald-700' : 'bg-red-500/20 text-red-400 border-red-500/40 print:text-red-700'
                        }`}>
                          {att.score} / {att.totalMarks} Marks ({att.percentage}%) - {isPassed ? 'Passed' : 'Needs Review'}
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-gray-500 italic">Unattempted</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 print:bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isPassed ? 'bg-emerald-500' : att ? 'bg-amber-500' : 'bg-gray-600'
                        }`}
                        style={{ width: `${att ? att.percentage : 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 print:text-gray-600 pt-1">
                      <span>Questions: {quizData.questions?.length || 0}</span>
                      {att?.attemptedAt && (
                        <span>Last Attempt: {new Date(att.attemptedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Official Publisher Signature */}
        <div className="pt-4 border-t border-white/10 print:border-black/20 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 print:text-gray-600 gap-3">
          <div className="text-center sm:text-left">
            <span className="font-serif font-bold text-[#ff6321]">Published by JE Trust Fund</span>
            <p className="text-[10px] font-mono">Academic Coaching & Examination Verification Engine</p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            {attempts.length > 0 && (
              <button
                onClick={handleResetProgress}
                className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Quiz Progress
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 font-bold rounded-xl text-white text-xs cursor-pointer"
            >
              Close Report
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  onBackToLibrary,
  availableSeriesBooks = [],
  onOpenSeriesBook,
}) => {
  const seriesBooks = availableSeriesBooks
    .filter((candidate) =>
      candidate.id === book.id ||
      (
        candidate.seriesConfig?.isSeries &&
        (
          candidate.seriesConfig.seriesProjectId === book.seriesConfig?.seriesProjectId ||
          (!book.seriesConfig?.seriesProjectId && candidate.seriesConfig.seriesName === book.seriesConfig?.seriesName)
        )
      )
    )
    .sort((left, right) =>
      (left.seriesConfig?.seasonNumber || 0) - (right.seriesConfig?.seasonNumber || 0) ||
      (left.seriesConfig?.episodeNumber || 0) - (right.seriesConfig?.episodeNumber || 0)
    );
  const seriesIndex = seriesBooks.findIndex((candidate) => candidate.id === book.id);
  const previousSeriesBook = seriesIndex > 0 ? seriesBooks[seriesIndex - 1] : undefined;
  const nextSeriesBook = seriesIndex >= 0 ? seriesBooks[seriesIndex + 1] : undefined;
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isCastDrawerOpen, setIsCastDrawerOpen] = useState(false);
  const [isCoachingReportOpen, setIsCoachingReportOpen] = useState(false);

  // Resume Reading Position Popup Card State
  const [resumePoint, setResumePoint] = useState<{
    chapterIdx: number;
    chapterTitle: string;
    snippet?: string;
    timestamp?: string;
    isBookmark?: boolean;
  } | null>(null);
  const [showResumeCard, setShowResumeCard] = useState(false);

  // Mobile 3-dot controls menu
  const [isMobileReaderMenuOpen, setIsMobileReaderMenuOpen] = useState(false);
  const readerMenuRef = useRef<HTMLDivElement>(null);

  // SQLite persisted items
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [highlights, setHighlights] = useState<HighlightNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightNote['color']>('yellow');

  // Capture user text selections for highlighting
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (text.length >= 2) {
        setSelectedText(text);
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
    };
  }, []);

  // Copy Protection Banner Toast
  const [copyBlockedToast, setCopyBlockedToast] = useState<string | null>(null);

  const showCopyBlockedNotice = (msg?: string) => {
    setCopyBlockedToast(msg || '🛡️ Content Copy Protection Active: Book text & manuscript blocks are copy-protected.');
    setTimeout(() => {
      setCopyBlockedToast(null);
    }, 3200);
  };

  useEffect(() => {
    const handleCopyCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      showCopyBlockedNotice('🛡️ Content Copy Protection Active: Copying manuscript text is disabled.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      showCopyBlockedNotice('🛡️ Context Menu Restricted: Right-click copy is disabled in reader view.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A' || e.key === 'x' || e.key === 'X' || e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        const target = e.target as HTMLElement;
        if ((e.key === 'a' || e.key === 'A' || e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return; // Allow edit actions inside inputs
        }
        e.preventDefault();
        showCopyBlockedNotice('🛡️ Shortcut Restricted: Text copying & printing are protected.');
      }
    };

    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeChapter = book.chapters[currentChapterIdx] || book.chapters[0];

  useEffect(() => {
    loadReaderData();
  }, [book.id]);

  // Persist current reading position whenever user changes chapters
  useEffect(() => {
    if (!activeChapter) return;
    const progressData = {
      chapterIdx: currentChapterIdx,
      chapterId: activeChapter.id,
      chapterTitle: activeChapter.title,
      snippet: activeChapter.blocks[0]?.content?.slice(0, 80) + '...',
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`reader_progress_${book.id}`, JSON.stringify(progressData));
    } catch (e) {}
  }, [currentChapterIdx, book.id, activeChapter]);

  // Click outside listener for mobile 3-dot menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (readerMenuRef.current && !readerMenuRef.current.contains(event.target as Node)) {
        setIsMobileReaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReaderData = async () => {
    try {
      const bMarks = await getBookmarksSQLite(book.id);
      const hLights = await getHighlightsSQLite(book.id);
      setBookmarks(bMarks);
      setHighlights(hLights);

      // Check for saved reading position in localStorage
      let savedIdx = -1;
      let savedTitle = '';
      let savedTime = '';
      let isBm = false;
      let snippetStr = '';

      const progressStr = localStorage.getItem(`reader_progress_${book.id}`);
      if (progressStr) {
        try {
          const parsed = JSON.parse(progressStr);
          if (typeof parsed.chapterIdx === 'number' && parsed.chapterIdx >= 0 && parsed.chapterIdx < book.chapters.length) {
            savedIdx = parsed.chapterIdx;
            savedTitle = parsed.chapterTitle || book.chapters[parsed.chapterIdx]?.title || `Chapter ${parsed.chapterIdx + 1}`;
            savedTime = parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            snippetStr = parsed.snippet || '';
          }
        } catch (e) {}
      }

      // Check if latest bookmark is newer or provides a specific spot
      if (bMarks.length > 0) {
        const latestBm = bMarks[0];
        const bmIdx = book.chapters.findIndex(c => c.id === latestBm.chapterId);
        if (bmIdx !== -1) {
          if (savedIdx === -1 || bmIdx > savedIdx) {
            savedIdx = bmIdx;
            savedTitle = latestBm.chapterTitle;
            snippetStr = latestBm.snippet;
            isBm = true;
            savedTime = new Date(latestBm.createdAt).toLocaleDateString();
          }
        }
      }

      // Show floating popup card if saved reading point is valid and not at current chapter
      if (savedIdx >= 0 && savedIdx < book.chapters.length) {
        setResumePoint({
          chapterIdx: savedIdx,
          chapterTitle: savedTitle,
          snippet: snippetStr,
          timestamp: savedTime,
          isBookmark: isBm,
        });
        if (savedIdx > 0 || isBm) {
          setShowResumeCard(true);
        }
      }
    } catch (err) {
      console.warn('Reader data load warning:', err);
    }
  };

  const handleJumpToResumePoint = () => {
    if (resumePoint) {
      setCurrentChapterIdx(resumePoint.chapterIdx);
      setShowResumeCard(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddBookmark = async () => {
    const newB: BookmarkType = {
      id: 'bm_' + Date.now().toString(36),
      bookId: book.id,
      chapterId: activeChapter.id,
      chapterTitle: activeChapter.title,
      blockId: activeChapter.blocks[0]?.id || '',
      snippet: activeChapter.blocks[0]?.content?.slice(0, 60) + '...',
      createdAt: new Date().toISOString(),
    };

    await addBookmarkSQLite(newB);
    setBookmarks([newB, ...bookmarks]);
  };

  const handleAddHighlight = async (color: HighlightNote['color'] = selectedColor) => {
    const textToHighlight = selectedText.trim() || 'Highlighted section from ' + activeChapter.title;
    if (!textToHighlight) return;

    const newH: HighlightNote = {
      id: 'hl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      bookId: book.id,
      chapterId: activeChapter.id,
      text: textToHighlight,
      note: newNoteText.trim(),
      color,
      createdAt: new Date().toISOString(),
    };

    await addHighlightSQLite(newH);
    setHighlights([newH, ...highlights]);
    setSelectedText('');
    setNewNoteText('');
    setCopyBlockedToast('✨ Highlight & note saved persistently to local SQLite database!');
    setTimeout(() => setCopyBlockedToast(null), 3000);

    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    await deleteHighlightSQLite(id);
    setHighlights(highlights.filter((h) => h.id !== id));
    setCopyBlockedToast('🗑️ Highlight removed from SQLite database');
    setTimeout(() => setCopyBlockedToast(null), 2500);
  };

  const chapterHighlights = highlights.filter((h) => h.chapterId === activeChapter?.id);

  const renderTextWithHighlights = (
    text: string,
    chHighlights: HighlightNote[]
  ) => {
    if (!chHighlights || chHighlights.length === 0 || !text) {
      return text;
    }

    const relevant = chHighlights.filter((h) => h.text && text.includes(h.text));
    if (relevant.length === 0) return text;

    const sorted = [...relevant].sort((a, b) => b.text.length - a.text.length);
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      let earliest: { hl: HighlightNote; index: number } | null = null;

      for (const hl of sorted) {
        const idx = remaining.indexOf(hl.text);
        if (idx !== -1) {
          if (!earliest || idx < earliest.index) {
            earliest = { hl, index: idx };
          }
        }
      }

      if (!earliest) {
        parts.push(remaining);
        break;
      }

      const { hl, index } = earliest;
      if (index > 0) {
        parts.push(remaining.substring(0, index));
      }

      const colorClasses: Record<HighlightNote['color'], string> = {
        yellow: 'bg-amber-300/80 text-amber-950 dark:bg-amber-400/40 dark:text-amber-100 border-b-2 border-amber-500 font-medium',
        orange: 'bg-orange-300/80 text-orange-950 dark:bg-orange-400/40 dark:text-orange-100 border-b-2 border-orange-500 font-medium',
        green: 'bg-emerald-300/80 text-emerald-950 dark:bg-emerald-400/40 dark:text-emerald-100 border-b-2 border-emerald-500 font-medium',
        blue: 'bg-sky-300/80 text-sky-950 dark:bg-sky-400/40 dark:text-sky-100 border-b-2 border-sky-500 font-medium',
        purple: 'bg-purple-300/80 text-purple-950 dark:bg-purple-400/40 dark:text-purple-100 border-b-2 border-purple-500 font-medium',
      };

      parts.push(
        <mark
          key={`hl_${keyIdx++}_${hl.id}`}
          title={hl.note ? `SQLite Note: ${hl.note}` : 'Saved Highlight'}
          className={`px-1 py-0.5 rounded cursor-pointer transition-all hover:brightness-110 ${colorClasses[hl.color] || colorClasses.yellow}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsBookmarksOpen(true);
          }}
        >
          {hl.text}
        </mark>
      );

      remaining = remaining.substring(index + hl.text.length);
    }

    return parts;
  };

  // Theme styling helpers
  const themeClasses = {
    dark: 'bg-[#181a1d] text-gray-200 border-gray-800',
    light: 'bg-[#fcfbf9] text-gray-900 border-gray-200',
    sepia: 'bg-[#f4ecd8] text-[#433422] border-[#e2d5b5]',
  };

  const fontClasses = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  };

  return (
    <div className={`min-h-screen max-w-full overflow-x-hidden transition-colors duration-300 copy-protected-shell select-text relative ${themeClasses[theme]}`}>
      
      {/* Toast Overlay for Copy/Context-Menu Block Notification */}
      {copyBlockedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] text-white text-xs font-bold px-4 py-3 rounded-xl border border-amber-500/50 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{copyBlockedToast}</span>
        </div>
      )}

      {/* Sticky Reader Header Controls */}
      <header className={`sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between shadow-sm ${
        theme === 'dark' ? 'bg-[#2c2c2c] border-[#1a1a1a] text-white' : theme === 'sepia' ? 'bg-[#ebe1c9] border-[#d8c8a3] text-[#433422]' : 'bg-white border-[#e0e0e0] text-[#2c2c2c]'
      }`}>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onBackToLibrary}
            className="p-1.5 rounded-md hover:bg-black/10 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline">Library</span>
          </button>
          <div className="h-4 w-[1px] bg-gray-500/30" />
          <div className="flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-xs">
            <h2 className="text-xs font-bold truncate">{book.title}</h2>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold shrink-0">
              <Lock className="w-3 h-3" /> Protected
            </span>
          </div>
        </div>

        {/* Reader Customizations Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* TOC Drawer Toggle */}
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="p-1.5 rounded-md hover:bg-black/10 text-xs font-bold flex items-center gap-1"
            title="Table of Contents"
          >
            <List className="w-4 h-4 text-[#ff6321]" />
            <span className="hidden sm:inline">TOC</span>
          </button>

          {/* Bookmarks Toggle */}
          <button
            onClick={() => setIsBookmarksOpen(!isBookmarksOpen)}
            className="p-1.5 rounded-md hover:bg-black/10 text-xs font-bold flex items-center gap-1 relative"
            title="Bookmarks & Notes"
          >
            <Bookmark className="w-4 h-4 text-[#ff6321]" />
            {bookmarks.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#ff6321] absolute top-1 right-1" />
            )}
          </button>

          {/* Academic Coaching & Practice Report Button */}
          <button
            onClick={() => setIsCoachingReportOpen(true)}
            className="p-1.5 rounded-md hover:bg-black/10 text-xs font-bold flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            title="View Academic Coaching Progress Report"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Progress Report</span>
          </button>

          {/* Series Cast & Gear Toggle (Desktop) */}
          {((book.characters && book.characters.length > 0) || (book.assets && book.assets.length > 0)) && (
            <button
              onClick={() => setIsCastDrawerOpen(!isCastDrawerOpen)}
              className="hidden sm:flex p-1.5 rounded-md hover:bg-black/10 text-xs font-bold items-center gap-1 text-indigo-400"
              title="Series Cast & Owned Gear"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Cast & Gear ({book.characters?.length || 0})</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-gray-500/30 hidden sm:block" />

          {/* Font Sizing Controls (Desktop) */}
          <div className="hidden md:flex items-center bg-black/10 rounded-md p-0.5">
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="p-1 px-2 text-xs font-mono font-bold hover:bg-black/10 rounded"
            >
              A-
            </button>
            <span className="text-[11px] font-mono font-bold px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(28, fontSize + 2))}
              className="p-1 px-2 text-xs font-mono font-bold hover:bg-black/10 rounded"
            >
              A+
            </button>
          </div>

          {/* Reading Themes Switcher (Desktop) */}
          <div className="hidden sm:flex items-center bg-black/10 rounded-md p-0.5">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1 rounded ${theme === 'dark' ? 'bg-[#ff6321] text-white' : 'opacity-70'}`}
              title="Dark Matt"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1 rounded ${theme === 'sepia' ? 'bg-[#ff6321] text-white' : 'opacity-70'}`}
              title="Sepia Vintage"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-1 rounded ${theme === 'light' ? 'bg-[#ff6321] text-white' : 'opacity-70'}`}
              title="Clean Light"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile 3-Dot Menu Dropdown */}
          <div className="relative sm:hidden" ref={readerMenuRef}>
            <button
              onClick={() => setIsMobileReaderMenuOpen(!isMobileReaderMenuOpen)}
              className="p-1.5 rounded-md bg-black/10 hover:bg-black/20 text-[#ff6321]"
              title="Reader Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMobileReaderMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#2c2c2c] text-white border border-[#444] rounded-xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in slide-in-from-top-2">
                
                {/* Font Size Selector */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Font Size</span>
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-1">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className="px-3 py-1 bg-white/10 rounded font-mono font-bold text-xs text-white"
                    >
                      A-
                    </button>
                    <span className="text-xs font-mono font-bold text-[#ff6321]">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="px-3 py-1 bg-white/10 rounded font-mono font-bold text-xs text-white"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Font Family Selector */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Typography</span>
                  <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-lg text-xs font-bold">
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`py-1 rounded font-serif ${fontFamily === 'serif' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      Serif
                    </button>
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`py-1 rounded font-sans ${fontFamily === 'sans' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      Sans
                    </button>
                    <button
                      onClick={() => setFontFamily('mono')}
                      className={`py-1 rounded font-mono ${fontFamily === 'mono' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Reading Theme */}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Theme</span>
                  <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-lg text-xs font-bold">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`py-1.5 rounded flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      <Moon className="w-3 h-3" /> Dark
                    </button>
                    <button
                      onClick={() => setTheme('sepia')}
                      className={`py-1.5 rounded flex items-center justify-center gap-1 ${theme === 'sepia' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      <Coffee className="w-3 h-3" /> Sepia
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`py-1.5 rounded flex items-center justify-center gap-1 ${theme === 'light' ? 'bg-[#ff6321] text-white' : 'text-gray-300'}`}
                    >
                      <Sun className="w-3 h-3" /> Light
                    </button>
                  </div>
                </div>

                {/* Cast & Gear Option */}
                {((book.characters && book.characters.length > 0) || (book.assets && book.assets.length > 0)) && (
                  <button
                    onClick={() => {
                      setIsCastDrawerOpen(true);
                      setIsMobileReaderMenuOpen(false);
                    }}
                    className="w-full py-2 bg-indigo-600/30 border border-indigo-500/40 rounded-lg text-indigo-300 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" /> Cast & Gear
                  </button>
                )}

              </div>
            )}
          </div>

        </div>

      </header>

      {/* Main Reading Canvas Layout */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 relative">
        
        {/* Book Title Banner on Chapter 1 */}
        {currentChapterIdx === 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-3 pb-8 border-b border-gray-500/20">
              
              {/* Series Season & Episode Badge if configured */}
              {book.seriesConfig?.isSeries ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="px-3.5 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider bg-orange-500 text-white shadow-xs">
                    SEASON {book.seriesConfig.seasonNumber || 1} • EPISODE {book.seriesConfig.episodeNumber || 1}
                  </span>
                  {book.seriesConfig.seriesName && (
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400 font-mono">
                      {book.seriesConfig.seriesName}
                    </span>
                  )}
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-mono bg-orange-500/20 text-orange-500 font-bold">
                  Offline PWA Edition
                </span>
              )}

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
                {book.title}
              </h1>
              {book.seriesConfig?.episodeTitle && (
                <p className="text-base font-bold text-gray-300 italic">
                  "{book.seriesConfig.episodeTitle}"
                </p>
              )}
              <p className="text-sm font-semibold text-orange-500">By {book.author}</p>

              {/* Classification & Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                {book.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    Category: {book.category}
                  </span>
                )}
                {book.genre && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Genre: {book.genre}
                  </span>
                )}
                {book.subGenre && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {book.subGenre}
                  </span>
                )}
                {book.language && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {book.language}
                  </span>
                )}
              </div>

              {/* Keyword Tag Pills */}
              {book.tags && book.tags.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
                  {book.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono text-gray-400 opacity-80">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Previously On... / Previous Episode Recap Card */}
            {book.seriesConfig?.isSeries && book.seriesConfig.previousEpisodeRecap && (
              <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-wider font-mono text-xs">
                  <RotateCcw className="w-4 h-4" />
                  <span>PREVIOUSLY ON {book.seriesConfig.seriesName ? book.seriesConfig.seriesName.toUpperCase() : 'THIS SERIES'}</span>
                </div>
                <div className="leading-relaxed opacity-90 whitespace-pre-wrap font-serif text-xs italic border-l-2 border-orange-500/40 pl-3">
                  {book.seriesConfig.previousEpisodeRecap}
                </div>
              </div>
            )}

            {book.seriesConfig?.isSeries && (
              <section aria-label="Series progress" className="border border-gray-500/25 bg-black/5 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Series Progress</p>
                    <h3 className="text-sm font-bold">{book.seriesConfig.seriesName || 'Series'}</h3>
                  </div>
                  <span className="text-xs font-mono opacity-70">
                    {seriesIndex >= 0 ? `${seriesIndex + 1} of ${seriesBooks.length} available` : `${seriesBooks.length} available`}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-500/20">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${seriesBooks.length && seriesIndex >= 0 ? ((seriesIndex + 1) / seriesBooks.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!previousSeriesBook}
                    onClick={() => previousSeriesBook && onOpenSeriesBook?.(previousSeriesBook)}
                    className="flex items-center gap-2 border border-gray-500/25 px-3 py-2 text-left text-xs font-bold disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span><span className="block text-[9px] uppercase opacity-60">Previous episode</span>{previousSeriesBook?.title || 'Unavailable'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!nextSeriesBook}
                    onClick={() => nextSeriesBook && onOpenSeriesBook?.(nextSeriesBook)}
                    className="flex items-center justify-end gap-2 border border-gray-500/25 px-3 py-2 text-right text-xs font-bold disabled:opacity-40"
                  >
                    <span><span className="block text-[9px] uppercase opacity-60">Next episode</span>{nextSeriesBook?.title || book.seriesConfig.nextEpisodeTitle || 'Locked / unavailable'}</span>
                    {nextSeriesBook ? <ChevronRight className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>
                </div>
                {book.seriesConfig.nextEpisodeReleaseDate && !nextSeriesBook && (
                  <p className="text-center text-[10px] font-mono opacity-70">Release schedule: {book.seriesConfig.nextEpisodeReleaseDate}</p>
                )}
                {seriesBooks.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {seriesBooks.map((seriesBook) => (
                      <button
                        key={seriesBook.id}
                        type="button"
                        onClick={() => onOpenSeriesBook?.(seriesBook)}
                        className={`border px-2 py-1 text-[10px] font-bold ${
                          seriesBook.id === book.id ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-500/25'
                        }`}
                      >
                        S{seriesBook.seriesConfig?.seasonNumber || 1}E{seriesBook.seriesConfig?.episodeNumber || 1}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Executive Summary & Front Matter Legal Notes */}
            {book.frontMatter && (book.frontMatter.executiveSummary || book.frontMatter.copyrightNotice || book.frontMatter.disclaimer) && (
              <div className="p-6 rounded-2xl bg-black/5 border border-gray-500/20 space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-500/20 text-orange-500 font-bold uppercase tracking-wider font-mono">
                  <FileText className="w-4 h-4" />
                  <span>Preamble, Legal Notes & Copyright Notice</span>
                </div>

                {/* Executive Summary */}
                {book.frontMatter.executiveSummary && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm font-serif text-orange-500">Executive Summary & Preamble</h4>
                    <div className="leading-relaxed opacity-90 whitespace-pre-wrap font-serif text-xs">
                      {book.frontMatter.executiveSummary}
                    </div>
                  </div>
                )}

                {/* Copyright & ISBN */}
                {(book.frontMatter.copyrightNotice || book.frontMatter.isbnNumber || book.frontMatter.edition) && (
                  <div className="p-3 rounded-lg bg-black/5 border border-gray-500/10 space-y-1 font-mono text-[11px] opacity-85">
                    {book.frontMatter.isbnNumber && (
                      <div><strong className="text-orange-500">ISBN:</strong> {book.frontMatter.isbnNumber}</div>
                    )}
                    {book.frontMatter.edition && (
                      <div><strong className="text-orange-500">Edition:</strong> {book.frontMatter.edition}</div>
                    )}
                    {book.frontMatter.copyrightNotice && (
                      <div className="whitespace-pre-wrap mt-1">{book.frontMatter.copyrightNotice}</div>
                    )}
                  </div>
                )}

                {/* Disclaimers & Legal Notes */}
                {book.frontMatter.disclaimer && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] opacity-90 leading-normal">
                    <strong className="text-amber-500 block mb-0.5 uppercase font-mono font-bold">Publisher Disclaimer:</strong>
                    <p>{book.frontMatter.disclaimer}</p>
                  </div>
                )}

                {/* Dedication */}
                {book.frontMatter.dedication && (
                  <div className="text-center italic font-serif opacity-80 pt-2 text-xs">
                    "{book.frontMatter.dedication}"
                  </div>
                )}
              </div>
            )}

            {/* About the Author & Contributors Section */}
            {(book.authorDetails?.bio || (book.contributors && book.contributors.length > 0)) && (
              <div className="p-6 rounded-2xl bg-black/5 border border-gray-500/20 space-y-5 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-500/20 text-orange-500 font-bold uppercase tracking-wider font-mono">
                  <User className="w-4 h-4" />
                  <span>About the Author & Editorial Contributors</span>
                </div>

                {/* Primary Author Profile */}
                {book.authorDetails && (
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-black/10 border border-gray-500/10">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-orange-500/20 border-2 border-orange-500 shrink-0 flex items-center justify-center font-bold text-orange-400 text-xl">
                      {book.authorDetails.avatarUrl ? (
                        <img src={book.authorDetails.avatarUrl} alt={book.author} className="w-full h-full object-cover" />
                      ) : (
                        book.author.charAt(0) || 'A'
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm font-serif text-orange-400">{book.author}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 uppercase">
                          Author
                        </span>
                      </div>

                      {book.authorDetails.bio && (
                        <p className="leading-relaxed opacity-90 font-serif text-xs">
                          {book.authorDetails.bio}
                        </p>
                      )}

                      {/* Author Social & Web Links */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono opacity-80">
                        {book.authorDetails.website && (
                          <a
                            href={book.authorDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-orange-400 hover:underline"
                          >
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                        {book.authorDetails.socialTwitter && (
                          <a
                            href={`https://x.com/${book.authorDetails.socialTwitter.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:underline"
                          >
                            <Twitter className="w-3 h-3" /> {book.authorDetails.socialTwitter}
                          </a>
                        )}
                        {book.authorDetails.socialLinkedin && (
                          <a
                            href={book.authorDetails.socialLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline"
                          >
                            <Linkedin className="w-3 h-3" /> LinkedIn
                          </a>
                        )}
                        {book.authorDetails.socialGithub && (
                          <a
                            href={book.authorDetails.socialGithub}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gray-300 hover:underline"
                          >
                            <Github className="w-3 h-3" /> GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contributors List */}
                {book.contributors && book.contributors.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h5 className="font-bold text-xs uppercase tracking-wider font-mono text-orange-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Editorial Contributors & Credits
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {book.contributors.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg bg-black/10 border border-gray-500/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-gray-200">{c.name}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                              {c.role}
                            </span>
                          </div>
                          {c.bio && <p className="text-[11px] opacity-80 leading-relaxed font-serif">{c.bio}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chapter Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-500/20">
          <span className="text-xs font-mono font-bold text-orange-500 uppercase tracking-wider">
            {formatChapterNumber(activeChapter?.chapterNumber || currentChapterIdx + 1, book.numberingConfig)} ({currentChapterIdx + 1}/{book.chapters.length})
          </span>
          <button
            onClick={handleAddBookmark}
            className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:underline"
          >
            <Bookmark className="w-3.5 h-3.5" /> Bookmark Position
          </button>
        </div>

        {/* Active Chapter Content Render */}
        <div
          className={`space-y-6 leading-relaxed transition-all ${fontClasses[fontFamily]}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {activeChapter ? (
            activeChapter.blocks.map((blk) => (
              <div key={blk.id} className="space-y-2">
                
                {/* Heading */}
                {blk.type === 'heading' && (
                  <h2
                    className={`font-bold text-[#ff6321] mt-6 mb-2 ${
                      blk.meta?.bold ? 'font-bold' : ''
                    } ${
                      blk.meta?.headingLevel === 'h1' ? 'text-2xl' : blk.meta?.headingLevel === 'h2' ? 'text-xl' : 'text-lg'
                    }`}
                    style={{ textAlign: blk.meta?.alignment || 'left' }}
                  >
                    {renderTextWithHighlights(blk.content, chapterHighlights)}
                  </h2>
                )}

                {/* Paragraph */}
                {blk.type === 'paragraph' && (
                  <p
                    className={`leading-relaxed ${
                      blk.meta?.bold ? 'font-bold' : ''
                    } ${blk.meta?.italic ? 'italic' : ''} ${blk.meta?.underline ? 'underline' : ''}`}
                    style={{ textAlign: blk.meta?.alignment || 'justify' }}
                  >
                    {blk.meta?.dropCap && blk.content.length > 0 ? (
                      <>
                        <span className="float-left text-4xl font-serif font-bold leading-none pr-2 pt-1 text-[#ff6321]">
                          {blk.content.charAt(0)}
                        </span>
                        {renderTextWithHighlights(blk.content.slice(1), chapterHighlights)}
                      </>
                    ) : (
                      renderTextWithHighlights(blk.content, chapterHighlights)
                    )}
                  </p>
                )}

                {/* LaTeX Equation Block */}
                {blk.type === 'latex' && (
                  <div className="my-6 p-4 rounded-xl bg-black/5 border border-black/10 text-center relative overflow-x-auto">
                    {blk.meta?.mathLabel && (
                      <div className="absolute top-2 right-3 font-mono text-[10px] text-[#ff6321] font-bold">
                        {blk.meta.mathLabel}
                      </div>
                    )}
                    <KatexMath math={blk.content} displayMode={true} className="text-lg" />
                  </div>
                )}

                {/* Table Block */}
                {blk.type === 'table' && (
                  <div className="my-6">
                    <TableRenderer data={blk.meta?.tableData} />
                  </div>
                )}

                {/* Spreadsheet Block */}
                {blk.type === 'spreadsheet' && blk.meta?.spreadsheetData && (
                  <div className="my-6">
                    <SpreadsheetRenderer data={blk.meta.spreadsheetData} isEditing={false} />
                  </div>
                )}

                {/* Code Block */}
                {blk.type === 'code' && (
                  <div className="my-4">
                    <CodeBlockRenderer
                      code={blk.content}
                      language={blk.meta?.codeLanguage || 'typescript'}
                      showLineNumbers={blk.meta?.showLineNumbers ?? true}
                    />
                  </div>
                )}

                {/* Callout Box */}
                {blk.type === 'callout' && (
                  <CalloutRenderer
                    type={blk.meta?.calloutType || 'note'}
                    content={blk.content}
                    caption={blk.meta?.caption}
                  />
                )}

                {/* Footnote Block */}
                {blk.type === 'footnote' && (
                  <FootnoteRenderer
                    number={blk.meta?.footnoteNumber}
                    label={blk.meta?.footnoteLabel}
                    content={blk.content}
                  />
                )}

                {/* Multiple Choice Practice Quiz Block */}
                {blk.type === 'mcq' && blk.meta?.mcqData && (
                  <ReaderMcqBlock
                    blockId={blk.id}
                    chapterId={activeChapter.id}
                    bookId={book.id}
                    quizData={blk.meta.mcqData}
                  />
                )}

                {/* List Block */}
                {blk.type === 'list' && blk.meta?.listItems && (
                  <ul className="my-3 space-y-1.5 pl-6 list-disc font-sans text-sm">
                    {blk.meta.listItems.map((item) => (
                      <li key={item.id} className="leading-relaxed">
                        {renderTextWithHighlights(item.text, chapterHighlights)}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Divider Rule */}
                {blk.type === 'divider' && (
                  <div className="py-6 text-center">
                    <hr className="border-t border-black/20 my-2" />
                  </div>
                )}

                {/* Quote */}
                {blk.type === 'quote' && (
                  <blockquote className="my-4 border-l-4 border-[#ff6321] pl-4 italic opacity-90 text-[#ff6321]">
                    "{renderTextWithHighlights(blk.content, chapterHighlights)}"
                    {blk.meta?.caption && (
                      <span className="block text-xs font-normal opacity-75 mt-1 font-sans">
                        — {blk.meta.caption}
                      </span>
                    )}
                  </blockquote>
                )}

                {/* Image / Figure with Caption & Hyperlink */}
                {blk.type === 'image' && (
                  <figure className="my-6 space-y-2 flex flex-col items-center">
                    <div className="overflow-hidden rounded-xl shadow-md border border-gray-500/20 bg-white p-2 w-full flex justify-center relative group">
                      {blk.meta?.linkUrl ? (
                        <a
                          href={blk.meta.linkUrl}
                          target={blk.meta.linkTarget || '_blank'}
                          rel="noopener noreferrer"
                          className="w-full flex justify-center relative group/img cursor-pointer"
                          title={`Click to open link: ${blk.meta.linkUrl}`}
                        >
                          <img
                            src={blk.content}
                            alt={blk.meta?.altText || blk.meta?.caption || 'Book figure'}
                            style={{ width: `${blk.meta?.imageWidthPercentage || 100}%` }}
                            className="max-h-[520px] object-contain rounded-lg transition-all group-hover/img:scale-[1.01]"
                          />
                          <div className="absolute top-3 right-3 bg-blue-600/90 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-xs opacity-90 group-hover/img:opacity-100 transition-opacity">
                            <Share2 className="w-3 h-3" /> Clickable Link
                          </div>
                        </a>
                      ) : (
                        <img
                          src={blk.content}
                          alt={blk.meta?.altText || blk.meta?.caption || 'Book figure'}
                          style={{ width: `${blk.meta?.imageWidthPercentage || 100}%` }}
                          className="max-h-[520px] object-contain rounded-lg transition-all"
                        />
                      )}
                    </div>
                    {(blk.meta?.figureLabel || blk.meta?.caption) && (
                      <figcaption className="text-center text-xs opacity-90 font-sans py-1.5 px-4 bg-black/5 rounded-md border border-gray-500/20 max-w-2xl flex items-center justify-center gap-1.5 flex-wrap">
                        {blk.meta?.figureLabel && (
                          <span className="font-bold text-[#ff6321] uppercase font-mono px-2 py-0.5 rounded bg-[#ff6321]/10 border border-[#ff6321]/20">
                            {blk.meta.figureLabel}
                          </span>
                        )}
                        <span className="italic font-serif">{blk.meta?.caption}</span>
                        {blk.meta?.linkUrl && (
                          <a
                            href={blk.meta.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline font-mono text-[11px] ml-1 flex items-center gap-0.5"
                          >
                            [Link 🔗]
                          </a>
                        )}
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* Bibliographic Citation */}
                {blk.type === 'reference' && (
                  <div className="my-2 p-2.5 rounded-lg bg-[#ff6321]/10 border border-[#ff6321]/30 text-xs font-mono text-[#ff6321] flex items-center justify-between">
                    <span>Citation: {blk.content}</span>
                    <span className="opacity-75">
                      {book.references.find((r) => r.citationKey === blk.content)?.title || 'Reference'}
                    </span>
                  </div>
                )}

              </div>
            ))
          ) : (
            <p className="opacity-60 italic">Chapter content unavailable.</p>
          )}
        </div>

        {/* Dynamic Scene Cast & Owned Gear Spotlight */}
        <SceneCastViewer
          characters={book.characters}
          assets={book.assets}
          chapterContentText={
            activeChapter
              ? activeChapter.blocks.map((b) => b.content).join(' ')
              : ''
          }
        />

        {/* Next Episode Teaser / What to Expect Card (on final chapter) */}
        {currentChapterIdx === book.chapters.length - 1 && book.seriesConfig?.isSeries && (book.seriesConfig.nextEpisodeTeaser || book.seriesConfig.nextEpisodeTitle) && (
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-orange-500/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider font-mono text-xs">
                <FastForward className="w-4 h-4 text-orange-500" />
                <span>WHAT TO EXPECT IN THE NEXT EPISODE</span>
              </div>
              {book.seriesConfig.nextEpisodeReleaseDate && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono text-[10px] font-bold border border-orange-500/30">
                  {book.seriesConfig.nextEpisodeReleaseDate}
                </span>
              )}
            </div>

            {book.seriesConfig.nextEpisodeTitle && (
              <h4 className="text-lg font-bold font-serif text-white">
                {book.seriesConfig.nextEpisodeTitle}
              </h4>
            )}

            {book.seriesConfig.nextEpisodeTeaser && (
              <div className="text-xs leading-relaxed text-slate-300 font-serif whitespace-pre-wrap pl-3 border-l-2 border-orange-500">
                {book.seriesConfig.nextEpisodeTeaser}
              </div>
            )}
          </div>
        )}

        {/* Chapter Navigation Pagination Footer */}
        <div className="pt-12 border-t border-gray-500/20 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentChapterIdx(Math.max(0, currentChapterIdx - 1))}
              disabled={currentChapterIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/10 hover:bg-black/20 disabled:opacity-30 text-xs font-bold transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Chapter
            </button>

            <span className="text-xs font-mono opacity-70">
              {Math.round(((currentChapterIdx + 1) / book.chapters.length) * 100)}% Read
            </span>

            <button
              onClick={() => setCurrentChapterIdx(Math.min(book.chapters.length - 1, currentChapterIdx + 1))}
              disabled={currentChapterIdx === book.chapters.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30 text-xs font-bold transition-all shadow cursor-pointer"
            >
              Next Chapter <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Downloaded Book Permanent Publisher Footer */}
          <footer className="pt-6 border-t border-gray-500/15 flex flex-col items-center justify-center text-center space-y-1 pb-4">
            <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#ff6321] tracking-wide">
              <span>Published by JE Trust Fund</span>
            </div>
            <p className="text-[10px] font-mono opacity-60">
              Official Digital Edition • {book.title}
            </p>
          </footer>
        </div>

      </div>

      {/* Slide-over Table of Contents Drawer */}
      {isTocOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start">
          <div className="w-80 h-full bg-[#1e2023] text-gray-200 border-r border-gray-800 p-6 space-y-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <List className="w-4 h-4 text-orange-500" /> Table of Contents
              </h3>
              <button onClick={() => setIsTocOpen(false)} className="text-xs text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {book.chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  onClick={() => {
                    setCurrentChapterIdx(idx);
                    setIsTocOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    currentChapterIdx === idx
                      ? 'bg-orange-600 text-white font-bold'
                      : 'hover:bg-[#282b30] text-gray-300'
                  }`}
                >
                  <span className="truncate">{chap.title}</span>
                  <span className="font-mono text-[10px] opacity-70">Ch {idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Bookmarks & Highlights Drawer */}
      {isBookmarksOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-80 h-full bg-[#1e2023] text-gray-200 border-l border-gray-800 p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-orange-500" /> Bookmarks & SQLite Notes
              </h3>
              <button onClick={() => setIsBookmarksOpen(false)} className="text-xs text-gray-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {/* Bookmarks Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                Saved Bookmarks ({bookmarks.length})
              </h4>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No bookmarks saved yet.</p>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => {
                      const chapIdx = book.chapters.findIndex(c => c.id === bm.chapterId);
                      if (chapIdx !== -1) {
                        setCurrentChapterIdx(chapIdx);
                        setIsBookmarksOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="bg-[#141618] border border-gray-800 hover:border-[#ff6321]/60 p-3 rounded-xl space-y-1 text-xs cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-200 group-hover:text-[#ff6321] transition-colors">{bm.chapterTitle}</p>
                      <FastForward className="w-3 h-3 text-[#ff6321] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-gray-400 line-clamp-2 text-[11px] italic">"{bm.snippet}"</p>
                    <span className="text-[10px] font-mono text-orange-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(bm.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Highlights Section */}
            <div className="space-y-3 pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Highlighter className="w-3.5 h-3.5 text-orange-400" />
                  SQLite Highlights ({highlights.length})
                </h4>
              </div>

              {highlights.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No text highlights recorded in local SQLite database.</p>
              ) : (
                highlights.map((hl) => {
                  const colorBadge: Record<HighlightNote['color'], string> = {
                    yellow: 'border-amber-500/50 text-amber-300 bg-amber-500/10',
                    orange: 'border-orange-500/50 text-orange-300 bg-orange-500/10',
                    green: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10',
                    blue: 'border-sky-500/50 text-sky-300 bg-sky-500/10',
                    purple: 'border-purple-500/50 text-purple-300 bg-purple-500/10',
                  };

                  const chapterObj = book.chapters.find((c) => c.id === hl.chapterId);

                  return (
                    <div key={hl.id} className="bg-[#141618] border border-gray-800 p-3 rounded-xl space-y-2 text-xs relative group">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border uppercase ${colorBadge[hl.color] || colorBadge.yellow}`}>
                          {hl.color}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const chapIdx = book.chapters.findIndex((c) => c.id === hl.chapterId);
                              if (chapIdx !== -1) {
                                setCurrentChapterIdx(chapIdx);
                                setIsBookmarksOpen(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className="text-[10px] text-orange-400 hover:underline font-mono cursor-pointer flex items-center gap-0.5 p-1"
                            title="Jump to highlighted chapter"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>Jump</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHighlight(hl.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                            title="Delete highlight from SQLite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-100 font-serif italic border-l-2 border-orange-500/80 pl-2 leading-relaxed">
                        "{hl.text}"
                      </p>

                      {hl.note && (
                        <p className="text-gray-300 text-[11px] bg-black/40 p-1.5 rounded-lg border border-gray-800">
                          <span className="font-bold text-orange-400">Note:</span> {hl.note}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-800/60">
                        <span>{chapterObj ? chapterObj.title : 'Chapter'}</span>
                        <span>{new Date(hl.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Popup Card: Resume Last Reading / Bookmark Position */}
      {showResumeCard && resumePoint && currentChapterIdx !== resumePoint.chapterIdx && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm w-[92vw] sm:w-96 bg-[#23272d] text-white border-2 border-[#ff6321] rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-5 fade-in">
          <div className="flex items-start justify-between gap-2 border-b border-gray-700/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#ff6321]/20 text-[#ff6321]">
                <Bookmark className="w-4 h-4 fill-[#ff6321]" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>{resumePoint.isBookmark ? 'Saved Bookmark Found' : 'Resume Reading Position'}</span>
                </h4>
                {resumePoint.timestamp && (
                  <span className="text-[10px] text-gray-400 font-mono block">Saved {resumePoint.timestamp}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowResumeCard(false)}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#ff6321]">
              Chapter {resumePoint.chapterIdx + 1}: {resumePoint.chapterTitle}
            </p>
            {resumePoint.snippet && (
              <p className="text-[11px] text-gray-300 italic line-clamp-2 leading-normal">
                "{resumePoint.snippet}"
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={() => setShowResumeCard(false)}
              className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={handleJumpToResumePoint}
              className="px-4 py-2 rounded-xl bg-[#ff6321] hover:bg-[#e05316] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Jump to Ch {resumePoint.chapterIdx + 1}</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Series Cast & Owned Gear Drawer */}
      {isCastDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-[#16181b] text-gray-200 border-l border-indigo-900/50 p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Series Cast & Owned Gear</h3>
              </div>
              <button onClick={() => setIsCastDrawerOpen(false)} className="text-xs text-gray-400 hover:text-white p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Characters Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Cast Roster ({book.characters?.length || 0})</span>
                <span className="text-[10px] text-gray-500 font-sans">Scene Poses</span>
              </h4>

              {(!book.characters || book.characters.length === 0) ? (
                <p className="text-xs text-gray-500 italic">No characters recorded in this book manuscript.</p>
              ) : (
                book.characters.map((char) => {
                  const ownedAssets = (book.assets || []).filter((a) => a.ownerCharacterId === char.id);

                  return (
                    <div key={char.id} className="bg-[#1c1f24] border border-indigo-900/40 p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={char.avatarUrl || char.images?.[0]}
                          alt={char.name}
                          className="w-12 h-12 rounded-lg object-cover border border-indigo-500/40"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-white truncate">{char.name}</h5>
                          <p className="text-[10px] text-indigo-300 font-medium">{char.role || 'Actor'}</p>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {char.images?.length || 0} Scene Poses
                          </span>
                        </div>
                      </div>

                      {char.bio && <p className="text-[11px] text-gray-400 font-serif leading-relaxed line-clamp-2">{char.bio}</p>}

                      {/* Character Pose Gallery */}
                      {char.images && char.images.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
                          {char.images.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt={`Pose ${i + 1}`}
                              className="w-10 h-12 object-cover rounded border border-gray-700 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      )}

                      {/* Owned Assets List */}
                      {ownedAssets.length > 0 && (
                        <div className="pt-2 border-t border-gray-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-400 font-mono">Owned Assets & Gear:</span>
                          <div className="space-y-1">
                            {ownedAssets.map((asset) => (
                              <div key={asset.id} className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-2">
                                {asset.images?.[0] && (
                                  <img
                                    src={asset.images[0]}
                                    alt={asset.name}
                                    className="w-6 h-6 rounded object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="flex-1 min-w-0 text-[10px]">
                                  <span className="font-bold text-emerald-200">{asset.name}</span>
                                  <span className="text-gray-400 block text-[9px] truncate">{asset.description}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Assets Section */}
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Inventory, Gear & Relics ({book.assets?.length || 0})
              </h4>

              {(!book.assets || book.assets.length === 0) ? (
                <p className="text-xs text-gray-500 italic">No equipment or assets linked.</p>
              ) : (
                book.assets.map((asset) => {
                  const owner = (book.characters || []).find((c) => c.id === asset.ownerCharacterId);

                  return (
                    <div key={asset.id} className="bg-[#1c1f24] border border-emerald-900/40 p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-3">
                        {asset.images?.[0] && (
                          <img
                            src={asset.images[0]}
                            alt={asset.name}
                            className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-white truncate">{asset.name}</h5>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            {asset.type || 'Gear'}
                          </span>
                          {owner && (
                            <p className="text-[10px] text-indigo-300 mt-0.5">Owned by {owner.name}</p>
                          )}
                        </div>
                      </div>

                      {asset.description && <p className="text-[11px] text-gray-400 leading-relaxed">{asset.description}</p>}

                      {asset.images && asset.images.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                          {asset.images.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt={`Angle ${i + 1}`}
                              className="w-10 h-10 object-cover rounded border border-gray-700 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Text Range Highlight Action Bar */}
      {selectedText.trim().length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-xl bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-[#ff6321] space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#ff6321]/20 text-[#ff6321]">
                <Highlighter className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Save Highlight to SQLite Database</h4>
                <span className="text-[10px] text-orange-400 font-mono">Chapter: {activeChapter?.title}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedText('');
                if (window.getSelection) window.getSelection()?.removeAllRanges();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Text Snippet Preview */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-serif italic text-amber-200 line-clamp-2 leading-relaxed">
            "{selectedText}"
          </div>

          {/* Color Palette Selector & Save Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mr-1">Color:</span>
              {[
                { id: 'yellow', name: 'Yellow', bg: 'bg-amber-400 text-amber-950' },
                { id: 'orange', name: 'Orange', bg: 'bg-orange-500 text-white' },
                { id: 'green', name: 'Green', bg: 'bg-emerald-500 text-white' },
                { id: 'blue', name: 'Blue', bg: 'bg-sky-500 text-white' },
                { id: 'purple', name: 'Purple', bg: 'bg-purple-500 text-white' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id as any)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] cursor-pointer transition-transform ${c.bg} ${
                    selectedColor === c.id ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                >
                  {selectedColor === c.id ? '✓' : ''}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddHighlight(selectedColor)}
              className="px-4 py-2 rounded-xl bg-[#ff6321] hover:bg-[#e05316] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Save to SQLite</span>
            </button>
          </div>

          {/* Optional Note Input */}
          <div className="pt-1">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add an optional study note or reference memo..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff6321]"
            />
          </div>
        </div>
      )}

      {/* Coaching Progress Report Modal */}
      <CoachingProgressReportModal
        isOpen={isCoachingReportOpen}
        onClose={() => setIsCoachingReportOpen(false)}
        book={book}
      />

    </div>
  );
};
