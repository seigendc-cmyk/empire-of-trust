import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, BookOpen, Edit2, Check, GripVertical } from 'lucide-react';
import { Chapter } from '../../types';

interface ChapterManagerProps {
  chapters: Chapter[];
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: (title: string) => void;
  onRenameChapter: (id: string, newTitle: string) => void;
  onDeleteChapter: (id: string) => void;
  onReorderChapters: (chapters: Chapter[]) => void;
}

export const ChapterManager: React.FC<ChapterManagerProps> = ({
  chapters,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onReorderChapters,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...chapters];
    const [movedItem] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIndex, 0, movedItem);

    const updated = reordered.map((c, i) => ({ ...c, chapterNumber: i + 1 }));
    onReorderChapters(updated);

    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddChapter(newTitle.trim());
    setNewTitle('');
  };

  const handleStartEdit = (chap: Chapter) => {
    setEditingId(chap.id);
    setEditTitle(chap.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameChapter(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === chapters.length - 1)) {
      return;
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...chapters];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;

    const updated = reordered.map((c, i) => ({ ...c, chapterNumber: i + 1 }));
    onReorderChapters(updated);
  };

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#ff6321]" />
          <h3 className="text-[11px] font-bold text-[#999] uppercase tracking-widest">
            Structure ({chapters.length})
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          Drag handles to reorder
        </span>
      </div>

      {/* Chapter List */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {chapters.map((chap, idx) => (
          <div
            key={chap.id}
            onClick={() => onSelectChapter(chap.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`group flex items-center justify-between p-2.5 rounded-md text-sm cursor-pointer transition-all ${
              draggedIdx === idx ? 'opacity-40 scale-[0.98] border-2 border-dashed border-[#ff6321] bg-orange-50' : ''
            } ${
              dragOverIdx === idx && draggedIdx !== idx
                ? 'border-2 border-[#ff6321] bg-[#ff6321]/10 ring-2 ring-[#ff6321]/20'
                : ''
            } ${
              activeChapterId === chap.id && draggedIdx !== idx && dragOverIdx !== idx
                ? 'bg-[#ff6321]/5 text-[#ff6321] font-semibold border-l-2 border-[#ff6321]'
                : draggedIdx !== idx && dragOverIdx !== idx
                ? 'text-[#2c2c2c] hover:bg-[#f9f9f9] border border-transparent'
                : ''
            }`}
          >
            
            {/* Title / Edit Mode */}
            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
              <span className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 group-hover:text-[#ff6321] transition-colors shrink-0" title="Drag to reorder chapter">
                <GripVertical className="w-3.5 h-3.5" />
              </span>

              <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                activeChapterId === chap.id ? 'bg-[#ff6321] text-white' : 'bg-[#f0f0f0] text-[#666]'
              }`}>
                {idx + 1}
              </span>

              {editingId === chap.id ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-white text-[#2c2c2c] border border-[#ff6321] rounded px-2 py-0.5 text-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(chap.id)}
                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="truncate flex-1">{chap.title}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => moveChapter(idx, 'up')}
                disabled={idx === 0}
                className="p-1 text-gray-400 hover:text-[#2c2c2c] disabled:opacity-20"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => moveChapter(idx, 'down')}
                disabled={idx === chapters.length - 1}
                className="p-1 text-gray-400 hover:text-[#2c2c2c] disabled:opacity-20"
              >
                <ArrowDown className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => handleStartEdit(chap)}
                className="p-1 text-gray-400 hover:text-[#ff6321]"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {chapters.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteChapter(chap.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* Add Chapter Input */}
      <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-[#f0f0f0]">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New Chapter Title..."
          className="flex-1 bg-[#f9f9f9] border border-[#e0e0e0] rounded-md px-3 py-1.5 text-xs text-[#2c2c2c] focus:border-[#ff6321] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="px-3 py-1.5 rounded-md bg-[#ff6321] hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </form>

    </div>
  );
};
