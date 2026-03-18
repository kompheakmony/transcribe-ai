import { useRef, type RefObject, type MouseEvent } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subtitle } from '../types/subtitle';
import { CaptionStyle } from '../types/captionStyle';
import { srtTimeToSeconds, formatTime } from '../utils/subtitleUtils';

interface VideoPreviewProps {
  audioUrl: string;
  isVideo: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  subtitles: Subtitle[];
  captionStyle: CaptionStyle;
  audioRef: RefObject<HTMLAudioElement | HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

export function VideoPreview({
  audioUrl,
  isVideo,
  currentTime,
  duration,
  isPlaying,
  subtitles,
  captionStyle,
  audioRef,
  onTogglePlay,
  onSeek,
}: VideoPreviewProps) {
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  const activeSubtitle = subtitles.find((sub) => {
    const start = srtTimeToSeconds(sub.start);
    const end = srtTimeToSeconds(sub.end);
    return currentTime >= start && currentTime <= end;
  });

  const positionClass =
    captionStyle.position === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : captionStyle.position === 'top'
        ? 'top-8'
        : 'bottom-16';

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Video Area */}
      <div className="flex-grow relative flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video ref={audioRef as RefObject<HTMLVideoElement>} src={audioUrl} className="max-h-full max-w-full object-contain" />
        ) : (
          <>
            <audio ref={audioRef as RefObject<HTMLAudioElement>} src={audioUrl} />
            <div className="flex flex-col items-center gap-4 text-white/20">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                <Play size={40} />
              </div>
              <span className="text-sm">Audio file</span>
            </div>
          </>
        )}

        {/* Caption Overlay */}
        <AnimatePresence>
          {activeSubtitle && (
            <motion.div
              key={activeSubtitle.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className={`absolute left-0 right-0 text-center px-4 pointer-events-none z-30 ${positionClass}`}
            >
              <div className={`inline-block ${captionStyle.bgColor} backdrop-blur-sm px-6 py-3 rounded-2xl`}>
                {captionStyle.animation === 'karaoke' ? (
                  <KaraokeCaption
                    text={activeSubtitle.text}
                    currentTime={currentTime}
                    startTime={srtTimeToSeconds(activeSubtitle.start)}
                    endTime={srtTimeToSeconds(activeSubtitle.end)}
                    style={captionStyle}
                  />
                ) : (
                  <span
                    className={`${captionStyle.fontSize} ${captionStyle.fontWeight} ${captionStyle.italic ? 'italic' : ''} ${captionStyle.uppercase ? 'uppercase' : ''} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                    style={{ color: captionStyle.color }}
                  >
                    {activeSubtitle.text}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transport Controls */}
      <div className="shrink-0 bg-[#1A1A1A] border-t border-[#333] px-4 py-2">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1.5 bg-[#333] rounded-full mb-2 cursor-pointer group relative"
        >
          <div
            className="h-full bg-[#8B8B60] rounded-full transition-all relative"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipBack size={16} />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-9 h-9 bg-[#8B8B60] text-white rounded-full flex items-center justify-center hover:bg-[#9A9A70] transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={() => onSeek(Math.min(duration, currentTime + 5))} className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipForward size={16} />
            </button>
          </div>
          <span className="text-xs font-mono text-white/40">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function KaraokeCaption({
  text,
  currentTime,
  startTime,
  endTime,
  style,
}: {
  text: string;
  currentTime: number;
  startTime: number;
  endTime: number;
  style: CaptionStyle;
}) {
  const words = text.split(/\s+/);
  const dur = endTime - startTime;
  const progress = (currentTime - startTime) / dur;
  const activeWordIndex = Math.floor(progress * words.length);

  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={false}
          animate={{
            scale: index === activeWordIndex ? 1.15 : 1,
            color: index === activeWordIndex ? style.activeColor : style.color,
            opacity: index <= activeWordIndex ? 1 : 0.4,
          }}
          transition={{
            scale: { type: 'spring', stiffness: 400, damping: 15 },
          }}
          className={`${style.fontSize} ${style.fontWeight} ${style.italic ? 'italic' : ''} ${style.uppercase ? 'uppercase' : ''} tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]`}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}
