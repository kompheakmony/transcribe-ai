/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { transcribeAudioToSRT, refineSRT } from './services/geminiService';
import { Subtitle } from './types/subtitle';
import { CaptionStyle, CAPTION_PRESETS } from './types/captionStyle';
import { cleanSRTResponse, createSubtitleId, parseSRT, secondsToSrtTime, srtTimeToSeconds, stringifySRT } from './utils/subtitleUtils';
import { downloadBlob, fileToBase64 } from './utils/fileUtils';
import { extractWaveform } from './utils/waveformUtils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { UploadScreen } from './components/UploadScreen';
import { EditorToolbar } from './components/EditorToolbar';
import { VideoPreview } from './components/VideoPreview';
import { CaptionEditor } from './components/CaptionEditor';
import { CaptionStylePicker } from './components/CaptionStylePicker';
import { Timeline } from './components/Timeline';

const MAX_WAVEFORM_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const WAVEFORM_DELAY_MS = 600;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [srtContent, setSrtContent] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(50);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxWords, setMaxWords] = useState(4);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(CAPTION_PRESETS[0]);
  const audioRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const mediaTaskIdRef = useRef(0);
  const waveformTimeoutRef = useRef<number | null>(null);

  const isVideo = file?.type.startsWith('video/') ?? false;
  const isSrtFile = file?.name.endsWith('.srt') ?? false;

  // ────────── Thumbnail generation ──────────

  const generateThumbnails = async (videoFile: File, videoDuration: number) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const count = Math.min(20, Math.ceil(videoDuration / 2));
    const interval = videoDuration / count;
    const thumbs: string[] = [];

    for (let i = 0; i < count; i++) {
      video.currentTime = i * interval;
      await new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        };
        video.addEventListener('seeked', onSeeked);
      });
      canvas.width = 160;
      canvas.height = 90;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
    }

    setThumbnails(thumbs);
    URL.revokeObjectURL(url);
  };

  // ────────── File handling ──────────

  const handleFileSelect = (selectedFile: File) => {
    const isAudioFile = selectedFile.type.startsWith('audio/');
    const isVideoFile = selectedFile.type.startsWith('video/');
    const isSRT = selectedFile.name.endsWith('.srt');

    if (isAudioFile || isVideoFile) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setFile(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setSrtContent(null);
      setSubtitles([]);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setThumbnails([]);
      setWaveformPeaks(null);
      setSelectedSubtitleId(null);
    } else if (isSRT) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setFile(selectedFile);
      setAudioUrl(null);
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setThumbnails([]);
      setWaveformPeaks(null);
      setSelectedSubtitleId(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setSrtContent(content);
        setSubtitles(parseSRT(content));
      };
      reader.readAsText(selectedFile);
    } else {
      setError('Please upload a valid audio/video file or an .srt file');
    }
  };

  const handleNewProject = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(null);
    setAudioUrl(null);
    setSrtContent(null);
    setSubtitles([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setThumbnails([]);
    setWaveformPeaks(null);
    setError(null);
    setSelectedSubtitleId(null);
  };

  // ────────── Audio/video element events ──────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const taskId = ++mediaTaskIdRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      const mediaDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(mediaDuration);

      void (async () => {
        if (!file) {
          return;
        }

        if (file.type.startsWith('video/')) {
          try {
            await generateThumbnails(file, mediaDuration);
          } catch (thumbnailError) {
            console.error(thumbnailError);
          }
        }

        if (taskId !== mediaTaskIdRef.current) {
          return;
        }

        if (file.size > MAX_WAVEFORM_FILE_SIZE_BYTES) {
          setWaveformPeaks(null);
          return;
        }

        if (waveformTimeoutRef.current !== null) {
          window.clearTimeout(waveformTimeoutRef.current);
        }

        waveformTimeoutRef.current = window.setTimeout(() => {
          void extractWaveform(file)
            .then((peaks) => {
              if (taskId === mediaTaskIdRef.current) {
                setWaveformPeaks(peaks);
              }
            })
            .catch((waveformError) => {
              console.error(waveformError);
            });
        }, WAVEFORM_DELAY_MS);
      })();
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      mediaTaskIdRef.current += 1;
      if (waveformTimeoutRef.current !== null) {
        window.clearTimeout(waveformTimeoutRef.current);
        waveformTimeoutRef.current = null;
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, file]);

  useEffect(() => {
    if (subtitles.length > 0) {
      setSrtContent(stringifySRT(subtitles));
    }
  }, [subtitles]);

  // ────────── Playback controls ──────────

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const playFrom = useCallback(
    (time: number) => {
      seekTo(time);
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    },
    [seekTo],
  );

  // ────────── Keyboard shortcuts ──────────

  useKeyboardShortcuts(
    {
      onTogglePlay: togglePlay,
      onSkipForward: () => seekTo(Math.min(duration, currentTime + 5)),
      onSkipBackward: () => seekTo(Math.max(0, currentTime - 5)),
      onFrameForward: () => seekTo(Math.min(duration, currentTime + 1)),
      onFrameBackward: () => seekTo(Math.max(0, currentTime - 1)),
      onDeleteSubtitle: () => {
        if (selectedSubtitleId !== null) handleDeleteSubtitle(selectedSubtitleId);
      },
    },
    !!file,
  );

  // ────────── Transcription / Refinement ──────────

  const handleTranscribe = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type.startsWith('video/') ? 'video/mp4' : file.type;
      const result = await transcribeAudioToSRT(base64, mimeType, maxWords);
      const cleanedResult = cleanSRTResponse(result);
      setSrtContent(cleanedResult);
      setSubtitles(parseSRT(cleanedResult));
    } catch (err) {
      console.error(err);
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!srtContent) return;
    setIsRefining(true);
    setError(null);

    try {
      const result = await refineSRT(srtContent, maxWords);
      const cleanedResult = cleanSRTResponse(result);
      setSrtContent(cleanedResult);
      setSubtitles(parseSRT(cleanedResult));
    } catch (err) {
      console.error(err);
      setError('Failed to refine subtitles. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  // ────────── Subtitle CRUD ──────────

  const handleSubtitleEdit = (id: string, newText: string) => {
    setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, text: newText } : s)));
  };

  const handleDeleteSubtitle = (id: string) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
    if (selectedSubtitleId === id) setSelectedSubtitleId(null);
  };

  const handleSplitSubtitle = (id: string) => {
    const index = subtitles.findIndex((s) => s.id === id);
    if (index === -1) return;

    const sub = subtitles[index];
    const start = srtTimeToSeconds(sub.start);
    const end = srtTimeToSeconds(sub.end);
    const mid = (start + end) / 2;
    const words = sub.text.split(/\s+/);
    const midWordIndex = Math.ceil(words.length / 2);

    const first: Subtitle = {
      ...sub,
      end: secondsToSrtTime(mid),
      text: words.slice(0, midWordIndex).join(' '),
    };
    const second: Subtitle = {
      ...sub,
      id: createSubtitleId(),
      start: secondsToSrtTime(mid),
      text: words.slice(midWordIndex).join(' '),
    };

    const updated = [...subtitles.slice(0, index), first, second, ...subtitles.slice(index + 1)];
    setSubtitles(updated);
  };

  const handleAddSubtitle = () => {
    const lastSub = subtitles[subtitles.length - 1];
    const newStart = lastSub ? srtTimeToSeconds(lastSub.end) + 0.1 : currentTime;
    const newEnd = newStart + 2;

    const newSub: Subtitle = {
      id: createSubtitleId(),
      start: secondsToSrtTime(newStart),
      end: secondsToSrtTime(newEnd),
      text: 'New subtitle',
    };
    setSubtitles([...subtitles, newSub]);
    setSelectedSubtitleId(newSub.id);
  };

  // ────────── FFmpeg export ──────────

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')]);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log(message));
    ffmpeg.on('progress', ({ progress }) => setExportProgress(Math.round(progress * 100)));
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const handleExport = async () => {
    if (!file || !srtContent) return;
    setIsExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      const [{ fetchFile }] = await Promise.all([import('@ffmpeg/util')]);
      const ffmpeg = await loadFFmpeg();

      const fileExt = file.name.split('.').pop();
      const inputName = `input.${fileExt}`;
      const outputName = 'output.mp4';
      const srtName = 'subs.srt';

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.writeFile(srtName, srtContent);

      try {
        await ffmpeg.exec(['-i', inputName, '-vf', `subtitles=${srtName}`, '-c:a', 'copy', outputName]);
      } catch {
        throw new Error('Experimental export failed. Browser FFmpeg has limited subtitle-filter support.');
      }

      const data = await ffmpeg.readFile(outputName);
      downloadBlob(new Blob([data], { type: 'video/mp4' }), `captioned_${file.name.split('.')[0]}.mp4`);
    } catch (err) {
      console.error(err);
      setError('Experimental export failed. Download the SRT separately if browser FFmpeg cannot merge this file.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSRT = () => {
    if (!srtContent || !file) return;
    downloadBlob(new Blob([srtContent], { type: 'text/plain' }), `${file.name.split('.')[0]}.srt`);
  };

  // ────────── Timeline drag handlers ──────────

  const handleTimelineDrag = (id: string, deltaX: number) => {
    setSubtitles((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const cs = srtTimeToSeconds(s.start);
          const ce = srtTimeToSeconds(s.end);
          const d = ce - cs;
          const ns = Math.max(0, cs + deltaX / timelineZoom);
          return { ...s, start: secondsToSrtTime(ns), end: secondsToSrtTime(ns + d) };
        }
        return s;
      }),
    );
  };

  const handleTimelineResizeLeft = (id: string, deltaX: number) => {
    setSubtitles((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const cs = srtTimeToSeconds(s.start);
          const ce = srtTimeToSeconds(s.end);
          const ns = Math.max(0, Math.min(ce - 0.1, cs + deltaX / timelineZoom));
          return { ...s, start: secondsToSrtTime(ns) };
        }
        return s;
      }),
    );
  };

  const handleTimelineResizeRight = (id: string, deltaX: number) => {
    setSubtitles((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const cs = srtTimeToSeconds(s.start);
          const ce = srtTimeToSeconds(s.end);
          const ne = Math.max(cs + 0.1, ce + deltaX / timelineZoom);
          return { ...s, end: secondsToSrtTime(ne) };
        }
        return s;
      }),
    );
  };

  // ────────── Upload screen ──────────

  if (!file) {
    return <UploadScreen onFileSelect={handleFileSelect} />;
  }

  // ────────── Editor layout ──────────

  return (
    <div className="h-screen flex flex-col bg-[#0F0F0F] text-white overflow-hidden">
      <EditorToolbar
        fileName={file.name}
        isVideo={isVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
        hasSubtitles={subtitles.length > 0}
        onExport={handleExport}
        onDownloadSRT={downloadSRT}
        onNewProject={handleNewProject}
      />

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={12} />
          <span className="flex-grow">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 text-lg leading-none">
            ×
          </button>
        </div>
      )}

      <div className="flex-grow flex overflow-hidden min-h-0">
        {/* Video Preview */}
        <div className="flex-grow min-w-0">
          {audioUrl ? (
            <VideoPreview
              audioUrl={audioUrl}
              isVideo={isVideo}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              subtitles={subtitles}
              captionStyle={captionStyle}
              audioRef={audioRef}
              onTogglePlay={togglePlay}
              onSeek={seekTo}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-black text-white/20">
              <p className="text-sm">SRT file loaded — no video preview</p>
            </div>
          )}
        </div>

        {/* Caption Editor Sidebar */}
        <div className="w-80 border-l border-[#333] flex flex-col shrink-0 bg-[#1A1A1A]">
          <CaptionEditor
            subtitles={subtitles}
            currentTime={currentTime}
            selectedSubtitleId={selectedSubtitleId}
            isProcessing={isProcessing}
            isRefining={isRefining}
            maxWords={maxWords}
            hasFile={!!file}
            isSrtFile={isSrtFile}
            onEditSubtitle={handleSubtitleEdit}
            onDeleteSubtitle={handleDeleteSubtitle}
            onSplitSubtitle={handleSplitSubtitle}
            onAddSubtitle={handleAddSubtitle}
            onSelectSubtitle={setSelectedSubtitleId}
            onPlayFrom={playFrom}
            onTranscribe={handleTranscribe}
            onRefine={handleRefine}
            onMaxWordsChange={setMaxWords}
          />
          <CaptionStylePicker selectedStyleId={captionStyle.id} onSelectStyle={setCaptionStyle} />
        </div>
      </div>

      {/* Timeline */}
      {audioUrl && duration > 0 && (
        <Timeline
          duration={duration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          timelineZoom={timelineZoom}
          thumbnails={thumbnails}
          subtitles={subtitles}
          waveformPeaks={waveformPeaks}
          fileName={file.name}
          onTogglePlay={togglePlay}
          onSeek={seekTo}
          onZoomChange={setTimelineZoom}
          onTimelineDrag={handleTimelineDrag}
          onTimelineResizeLeft={handleTimelineResizeLeft}
          onTimelineResizeRight={handleTimelineResizeRight}
        />
      )}
    </div>
  );
}
