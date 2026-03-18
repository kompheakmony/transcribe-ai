import { Play, Pause, ZoomIn, ZoomOut, FileText, Video, GripVertical, AudioLines } from 'lucide-react';
import { motion } from 'motion/react';
import { Subtitle } from '../types/subtitle';
import { srtTimeToSeconds, formatTime } from '../utils/subtitleUtils';
import { AudioWaveform } from './AudioWaveform';

interface TimelineProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  timelineZoom: number;
  thumbnails: string[];
  subtitles: Subtitle[];
  waveformPeaks: Float32Array | null;
  fileName: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onTimelineDrag: (id: string, deltaX: number) => void;
  onTimelineResizeLeft: (id: string, deltaX: number) => void;
  onTimelineResizeRight: (id: string, deltaX: number) => void;
}

export function Timeline({
  duration,
  currentTime,
  isPlaying,
  timelineZoom,
  thumbnails,
  subtitles,
  waveformPeaks,
  fileName,
  onTogglePlay,
  onSeek,
  onZoomChange,
  onTimelineDrag,
  onTimelineResizeLeft,
  onTimelineResizeRight,
}: TimelineProps) {
  return (
    <div className="bg-[#1A1A1A] border-t border-[#333] h-52 flex flex-col shrink-0">
      {/* Timeline Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#2A2A2A] bg-[#161616]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/40">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="h-3 w-px bg-[#333]" />
          <button onClick={onTogglePlay} className="p-1 hover:bg-white/5 rounded transition-all">
            {isPlaying ? <Pause size={14} className="text-white/60" /> : <Play size={14} className="text-white/60" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onZoomChange(Math.max(10, timelineZoom - 10))} className="p-1 hover:bg-white/5 rounded transition-all">
            <ZoomOut size={14} className="text-white/40" />
          </button>
          <input
            type="range"
            min="10"
            max="200"
            value={timelineZoom}
            onChange={(e) => onZoomChange(parseInt(e.target.value))}
            className="w-20 h-0.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#8B8B60]"
          />
          <button onClick={() => onZoomChange(Math.min(200, timelineZoom + 10))} className="p-1 hover:bg-white/5 rounded transition-all">
            <ZoomIn size={14} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Timeline Area */}
      <div
        className="flex-grow overflow-x-auto overflow-y-hidden relative editor-scroll"
        ref={(el) => {
          if (el) {
            const playheadPos = currentTime * timelineZoom;
            const scrollPos = el.scrollLeft;
            const viewWidth = el.clientWidth;
            if (playheadPos > scrollPos + viewWidth - 100 || playheadPos < scrollPos) {
              el.scrollLeft = playheadPos - viewWidth / 2;
            }
          }
        }}
      >
        <div
          className="h-full relative"
          style={{ width: `${duration * timelineZoom}px`, minWidth: '100%' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            onSeek(x / timelineZoom);
          }}
        >
          {/* Time Ruler */}
          <div className="h-5 border-b border-[#2A2A2A] flex items-end relative">
            {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
              <div key={i} className="absolute border-l border-[#333] h-2" style={{ left: `${i * timelineZoom}px` }}>
                {i % 5 === 0 && (
                  <span className="absolute top-[-14px] left-1 text-[7px] font-mono text-white/20">{i}s</span>
                )}
              </div>
            ))}
          </div>

          {/* Tracks Container */}
          <div className="py-2 space-y-2 relative">
            {/* Video Track */}
            <div
              className="relative h-10 bg-[#8B8B60]/10 border-y border-[#8B8B60]/20 flex items-center overflow-hidden cursor-pointer"
              style={{ width: `${duration * timelineZoom}px` }}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                onSeek(x / timelineZoom);
              }}
            >
              <div className="absolute inset-0 flex">
                {thumbnails.map((thumb, i) => (
                  <div
                    key={i}
                    className="h-full border-r border-white/5 flex-shrink-0"
                    style={{ width: `${(duration / thumbnails.length) * timelineZoom}px` }}
                  >
                    <img src={thumb} alt="" className="w-full h-full object-cover opacity-40 grayscale" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 opacity-60 z-10 select-none px-4 drop-shadow-lg">
                <Video size={10} className="text-white" />
                <span className="text-[8px] font-semibold uppercase tracking-widest text-white">{fileName || 'Video'}</span>
              </div>

              <div
                className="absolute left-0 top-0 bottom-0 bg-[#8B8B60]/20 pointer-events-none z-20"
                style={{ width: `${currentTime * timelineZoom}px` }}
              />
            </div>

            {/* Audio Waveform Track */}
            <div
              className="relative h-12 bg-[#1E1E2A]/50 border-y border-[#3A3A5A]/30 overflow-hidden cursor-pointer"
              style={{ width: `${duration * timelineZoom}px` }}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                onSeek(x / timelineZoom);
              }}
            >
              {waveformPeaks ? (
                <AudioWaveform
                  peaks={waveformPeaks}
                  width={duration * timelineZoom}
                  height={48}
                  currentTime={currentTime}
                  duration={duration}
                />
              ) : (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-20 pointer-events-none">
                  <AudioLines size={10} />
                  <span className="text-[8px] font-semibold uppercase tracking-widest text-white">Audio</span>
                </div>
              )}

              <div
                className="absolute left-0 top-0 bottom-0 bg-[#8B8B60]/10 pointer-events-none z-20"
                style={{ width: `${currentTime * timelineZoom}px` }}
              />
            </div>

            {/* Caption Track */}
            <div className="relative h-10 bg-[#242424] border-y border-[#2A2A2A]" style={{ width: `${duration * timelineZoom}px` }}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-20 pointer-events-none z-10">
                <FileText size={10} />
                <span className="text-[8px] font-semibold uppercase tracking-widest text-white">Captions</span>
              </div>

              {subtitles.map((sub) => {
                const start = srtTimeToSeconds(sub.start);
                const end = srtTimeToSeconds(sub.end);
                const width = (end - start) * timelineZoom;
                const left = start * timelineZoom;

                return (
                  <motion.div
                    key={sub.id}
                    className="absolute top-1 bottom-1 bg-[#8B8B60] text-white rounded-sm shadow-sm flex items-center overflow-hidden cursor-move group"
                    style={{ left: `${left}px`, width: `${width}px` }}
                    drag="x"
                    dragMomentum={false}
                    dragConstraints={{ left: 0, right: duration * timelineZoom }}
                    onDrag={(_e, info) => {
                      onTimelineDrag(sub.id, info.delta.x);
                    }}
                  >
                    {/* Left Resize Handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/10 cursor-ew-resize hover:bg-white/30 transition-colors z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          onTimelineResizeLeft(sub.id, moveEvent.movementX);
                        };
                        const onMouseUp = () => {
                          window.removeEventListener('mousemove', onMouseMove);
                          window.removeEventListener('mouseup', onMouseUp);
                        };
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                      }}
                    />

                    <div className="px-2 text-[8px] truncate font-medium flex-grow select-none text-center">{sub.text}</div>

                    {/* Right Resize Handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/10 cursor-ew-resize hover:bg-white/30 transition-colors flex items-center justify-center z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          onTimelineResizeRight(sub.id, moveEvent.movementX);
                        };
                        const onMouseUp = () => {
                          window.removeEventListener('mousemove', onMouseMove);
                          window.removeEventListener('mouseup', onMouseUp);
                        };
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                      }}
                    >
                      <GripVertical size={6} className="opacity-40" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none" style={{ left: `${currentTime * timelineZoom}px` }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
