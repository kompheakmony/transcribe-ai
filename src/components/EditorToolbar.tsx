import { Video, Download, Loader2, Keyboard, Upload } from 'lucide-react';

interface EditorToolbarProps {
  fileName: string | null;
  isVideo: boolean;
  isExporting: boolean;
  exportProgress: number;
  hasSubtitles: boolean;
  onExport: () => void;
  onDownloadSRT: () => void;
  onNewProject: () => void;
}

export function EditorToolbar({
  fileName,
  isVideo,
  isExporting,
  exportProgress,
  hasSubtitles,
  onExport,
  onDownloadSRT,
  onNewProject,
}: EditorToolbarProps) {
  return (
    <div className="h-12 bg-[#1A1A1A] border-b border-[#333] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-[#8B8B60] rounded-lg flex items-center justify-center">
          <Video size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-white/90">TranscribeAI</span>
        <div className="h-4 w-px bg-[#333] mx-1" />
        <span className="text-xs text-white/40 truncate max-w-[200px]">{fileName || 'No file'}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 text-[10px] text-white/30 mr-4">
          <Keyboard size={10} />
          <span>Space: Play</span>
          <span className="mx-1">·</span>
          <span>←→: 5s</span>
          <span className="mx-1">·</span>
          <span>Shift+←→: 1s</span>
        </div>

        {hasSubtitles && (
          <>
            {isVideo && (
              <button
                onClick={onExport}
                disabled={isExporting}
                title="Experimental: browser FFmpeg export may fail on larger files"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B8B60] text-white text-xs font-medium rounded-lg hover:bg-[#9A9A70] transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> {exportProgress}%
                  </>
                ) : (
                  <>
                    <Video size={12} /> Experimental Export
                  </>
                )}
              </button>
            )}
            <button
              onClick={onDownloadSRT}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] text-white/80 text-xs font-medium rounded-lg hover:bg-[#333] transition-colors border border-[#444]"
            >
              <Download size={12} /> .srt
            </button>
          </>
        )}

        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 text-xs hover:text-white/80 transition-colors"
        >
          <Upload size={12} /> New
        </button>
      </div>
    </div>
  );
}
