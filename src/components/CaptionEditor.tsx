import { useRef, useEffect } from 'react';
import { Plus, Trash2, Scissors, Play, FileText, Wand2, Loader2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subtitle } from '../types/subtitle';
import { srtTimeToSeconds } from '../utils/subtitleUtils';

interface CaptionEditorProps {
  subtitles: Subtitle[];
  currentTime: number;
  selectedSubtitleId: string | null;
  isProcessing: boolean;
  isRefining: boolean;
  maxWords: number;
  hasFile: boolean;
  isSrtFile: boolean;
  onEditSubtitle: (id: string, text: string) => void;
  onDeleteSubtitle: (id: string) => void;
  onSplitSubtitle: (id: string) => void;
  onAddSubtitle: () => void;
  onSelectSubtitle: (id: string) => void;
  onPlayFrom: (time: number) => void;
  onTranscribe: () => void;
  onRefine: () => void;
  onMaxWordsChange: (value: number) => void;
}

export function CaptionEditor({
  subtitles,
  currentTime,
  selectedSubtitleId,
  isProcessing,
  isRefining,
  maxWords,
  hasFile,
  isSrtFile,
  onEditSubtitle,
  onDeleteSubtitle,
  onSplitSubtitle,
  onAddSubtitle,
  onSelectSubtitle,
  onPlayFrom,
  onTranscribe,
  onRefine,
  onMaxWordsChange,
}: CaptionEditorProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const activeSubtitle = subtitles.find((sub) => {
    const start = srtTimeToSeconds(sub.start);
    const end = srtTimeToSeconds(sub.end);
    return currentTime >= start && currentTime <= end;
  });

  useEffect(() => {
    if (activeItemRef.current && listRef.current) {
      const container = listRef.current;
      const item = activeItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSubtitle?.id]);

  return (
    <div className="flex-grow flex flex-col min-h-0">
      {/* Panel Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[#333]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-white/40" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Captions ({subtitles.length})
            </span>
          </div>
          {subtitles.length > 0 && (
            <button
              onClick={onAddSubtitle}
              className="flex items-center gap-1 px-2 py-1 bg-[#8B8B60]/20 text-[#8B8B60] text-[10px] font-semibold rounded-md hover:bg-[#8B8B60]/30 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          )}
        </div>

        {/* Segment Length Control */}
        <div className="flex items-center gap-2">
          <Scissors size={10} className="text-white/30 shrink-0" />
          <input
            type="range"
            min="3"
            max="15"
            step="1"
            value={maxWords}
            onChange={(e) => onMaxWordsChange(parseInt(e.target.value))}
            className="flex-grow h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#8B8B60]"
          />
          <span className="text-[10px] font-mono text-[#8B8B60] w-12 text-right shrink-0">{maxWords} wds</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="shrink-0 px-4 py-2 border-b border-[#333] flex gap-2">
        {!isSrtFile && (
          <button
            disabled={!hasFile || isProcessing}
            onClick={onTranscribe}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#8B8B60] text-white text-xs font-medium rounded-lg hover:bg-[#9A9A70] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Wand2 size={12} /> Transcribe
              </>
            )}
          </button>
        )}
        {subtitles.length > 0 && (
          <button
            onClick={onRefine}
            disabled={isRefining || isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#2A2A2A] text-white/70 text-xs font-medium rounded-lg hover:bg-[#333] transition-colors border border-[#444] disabled:opacity-30"
          >
            {isRefining ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Refining...
              </>
            ) : (
              <>
                <RefreshCcw size={12} /> Re-cut
              </>
            )}
          </button>
        )}
      </div>

      {/* Subtitle List */}
      <div ref={listRef} className="flex-grow overflow-y-auto p-2 space-y-1 editor-scroll">
        <AnimatePresence>
          {subtitles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 text-center px-6">
              <FileText size={32} className="mb-3" />
              <p className="text-xs">No captions yet. Upload a video and click Transcribe.</p>
            </div>
          ) : (
            subtitles.map((sub, index) => {
              const isActive = activeSubtitle?.id === sub.id;
              const isSelected = selectedSubtitleId === sub.id;

              return (
                <motion.div
                  key={sub.id}
                  ref={isActive ? activeItemRef : undefined}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => onSelectSubtitle(sub.id)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#8B8B60]/20 border border-[#8B8B60]/40'
                      : isSelected
                        ? 'bg-[#2A2A2A] border border-[#444]'
                        : 'bg-[#242424] border border-transparent hover:border-[#333]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono text-white/30">
                      #{index + 1} · {sub.start} → {sub.end}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayFrom(srtTimeToSeconds(sub.start));
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Play from here"
                      >
                        <Play size={10} className="text-white/50" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSplitSubtitle(sub.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Split subtitle"
                      >
                        <Scissors size={10} className="text-white/50" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSubtitle(sub.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete subtitle"
                      >
                        <Trash2 size={10} className="text-red-400/50" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={sub.text}
                    onChange={(e) => onEditSubtitle(sub.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-white/90 text-sm font-medium resize-none border-none focus:ring-0 focus:outline-none p-0 leading-snug"
                    rows={Math.max(1, sub.text.split('\n').length)}
                  />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
