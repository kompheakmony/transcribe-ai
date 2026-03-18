/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, Download, Loader2, CheckCircle2, AlertCircle, FileText, Scissors, RefreshCcw, Play, Pause, Volume2, Edit3, Save, Video, ZoomIn, ZoomOut, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { transcribeAudioToSRT, refineSRT } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface Subtitle {
  id: number;
  start: string;
  end: string;
  text: string;
}

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(50); // pixels per second
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [maxWords, setMaxWords] = useState(4);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const generateThumbnails = async (file: File, duration: number) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const count = Math.min(20, Math.ceil(duration / 2)); // One thumb every 2s, max 20
    const interval = duration / count;
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

  const parseSRT = (srt: string): Subtitle[] => {
    const segments = srt.trim().split(/\n\s*\n/);
    return segments.map((segment) => {
      const lines = segment.split('\n');
      if (lines.length < 3) return null;
      const id = parseInt(lines[0]);
      const times = lines[1].split(' --> ');
      const text = lines.slice(2).join('\n');
      return { id, start: times[0], end: times[1], text };
    }).filter(Boolean) as Subtitle[];
  };

  const stringifySRT = (subs: Subtitle[]): string => {
    return subs.map(s => `${s.id}\n${s.start} --> ${s.end}\n${s.text}`).join('\n\n');
  };

  const srtTimeToSeconds = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes, secondsAndMs] = time.split(':');
    const [seconds, ms] = secondsAndMs.split(',');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  };

  const secondsToSrtTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isAudio = selectedFile.type.startsWith('audio/');
      const isVideo = selectedFile.type.startsWith('video/');
      const isSRT = selectedFile.name.endsWith('.srt');

      if (isAudio || isVideo) {
        setFile(selectedFile);
        setAudioUrl(URL.createObjectURL(selectedFile));
        setError(null);
        setSrtContent(null);
        setSubtitles([]);
        setIsPlaying(false);
        setCurrentTime(0);
        setThumbnails([]); // Reset thumbnails
      } else if (isSRT) {
        setFile(selectedFile);
        setAudioUrl(null);
        setError(null);
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
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (file && file.type.startsWith('video/')) {
        generateThumbnails(file, audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (subtitles.length > 0) {
      setSrtContent(stringifySRT(subtitles));
    }
  }, [subtitles]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type.startsWith('video/') ? 'video/mp4' : file.type;
      const result = await transcribeAudioToSRT(base64, mimeType, maxWords);
      
      // Clean up markdown if Gemini wrapped it
      const cleanedResult = result.replace(/```srt/g, '').replace(/```/g, '').trim();
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
      const cleanedResult = result.replace(/```srt/g, '').replace(/```/g, '').trim();
      setSrtContent(cleanedResult);
      setSubtitles(parseSRT(cleanedResult));
    } catch (err) {
      console.error(err);
      setError('Failed to refine subtitles. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSubtitleEdit = (id: number, newText: string) => {
    const updated = subtitles.map(s => s.id === id ? { ...s, text: newText } : s);
    setSubtitles(updated);
    setSrtContent(stringifySRT(updated));
  };

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress }) => {
      setExportProgress(Math.round(progress * 100));
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
  };

  const handleExport = async () => {
    if (!file || !srtContent) return;
    setIsExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      if (!ffmpegRef.current) {
        await loadFFmpeg();
      }
      const ffmpeg = ffmpegRef.current!;

      const fileExt = file.name.split('.').pop();
      const inputName = `input.${fileExt}`;
      const outputName = 'output.mp4';
      const srtName = 'subs.srt';

      // Write files to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.writeFile(srtName, srtContent);

      // Run FFmpeg command
      // We use the 'drawtext' filter as a fallback if 'subtitles' filter fails or isn't available
      // But 'subtitles' is better for SRT. Let's try to make it work.
      try {
        await ffmpeg.exec([
          '-i', inputName,
          '-vf', `subtitles=${srtName}`,
          '-c:a', 'copy',
          outputName
        ]);
      } catch (cmdErr) {
        console.warn('Subtitles filter failed, trying simple copy...', cmdErr);
        throw new Error('The subtitle merging failed. This usually happens because the browser version of FFmpeg has limited support for complex filters like "subtitles". You can still download the .srt file separately.');
      }

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `captioned_${file.name.split('.')[0]}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Failed to export video. Hardcoding subtitles in the browser is resource intensive and may fail for large files.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSRT = () => {
    if (!srtContent || !file) return;
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.split('.')[0]}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTimelineDrag = (id: number, deltaX: number) => {
    setSubtitles(prev => prev.map(s => {
      if (s.id === id) {
        const currentStart = srtTimeToSeconds(s.start);
        const currentEnd = srtTimeToSeconds(s.end);
        const duration = currentEnd - currentStart;
        const newStart = Math.max(0, currentStart + deltaX / timelineZoom);
        return { 
          ...s, 
          start: secondsToSrtTime(newStart), 
          end: secondsToSrtTime(newStart + duration) 
        };
      }
      return s;
    }));
  };

  const handleTimelineResizeLeft = (id: number, deltaX: number) => {
    setSubtitles(prev => prev.map(s => {
      if (s.id === id) {
        const currentStart = srtTimeToSeconds(s.start);
        const currentEnd = srtTimeToSeconds(s.end);
        const newStart = Math.max(0, Math.min(currentEnd - 0.1, currentStart + deltaX / timelineZoom));
        return { 
          ...s, 
          start: secondsToSrtTime(newStart)
        };
      }
      return s;
    }));
  };

  const handleTimelineResizeRight = (id: number, deltaX: number) => {
    setSubtitles(prev => prev.map(s => {
      if (s.id === id) {
        const currentStart = srtTimeToSeconds(s.start);
        const currentEnd = srtTimeToSeconds(s.end);
        const newEnd = Math.max(currentStart + 0.1, currentEnd + deltaX / timelineZoom);
        return { 
          ...s, 
          end: secondsToSrtTime(newEnd) 
        };
      }
      return s;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="max-w-4xl mx-auto pt-16 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
            <FileAudio size={20} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest opacity-50">Media Intelligence</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-serif font-light leading-tight mb-6"
        >
          Transcribe <br />
          <span className="italic">Media to SRT</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg opacity-70 max-w-xl"
        >
          A minimal tool to convert your audio recordings or videos into professional subtitle files using advanced AI.
        </motion.p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 pb-64">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Media & Controls */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileAudio size={14} className="opacity-40" />
                <span className="text-xs font-semibold uppercase tracking-widest opacity-50">Media Upload</span>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                  ${file ? 'border-[#5A5A40] bg-[#5A5A40]/5' : 'border-black/10 hover:border-black/20'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*,video/*,.srt"
                  className="hidden"
                />
                
                <div className={`mb-4 p-4 rounded-full ${file ? 'bg-[#5A5A40] text-white' : 'bg-black/5 text-black/40'}`}>
                  {file ? <CheckCircle2 size={24} /> : <Upload size={24} />}
                </div>
                
                <p className="text-sm font-medium text-center">
                  {file ? file.name : 'Drop audio, video or .srt file here'}
                </p>
                <p className="text-xs opacity-40 mt-2">Audio, Video or Subtitle files</p>
              </div>

              {/* Audio Player */}
              <AnimatePresence>
                {audioUrl && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-4 bg-black/5 rounded-2xl overflow-hidden"
                  >
                    {file?.type.startsWith('video/') ? (
                      <div className="relative">
                        <video ref={audioRef as any} src={audioUrl} className="w-full rounded-xl mb-4" />
                        {/* Caption Preview Overlay */}
                        <AnimatePresence>
                          {subtitles.map(sub => {
                            const start = srtTimeToSeconds(sub.start);
                            const end = srtTimeToSeconds(sub.end);
                            if (currentTime >= start && currentTime <= end) {
                              const words = sub.text.split(/\s+/);
                              const duration = end - start;
                              const progress = (currentTime - start) / duration;
                              // Calculate which word should be highlighted
                              const activeWordIndex = Math.floor(progress * words.length);

                              return (
                                <motion.div
                                  key={sub.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.1 }}
                                  className="absolute bottom-12 left-0 right-0 text-center px-4 pointer-events-none z-30"
                                >
                                  <div className="inline-block bg-black/40 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                                      {words.map((word, index) => (
                                        <motion.span
                                          key={index}
                                          initial={false}
                                          animate={{ 
                                            scale: index === activeWordIndex ? 1.2 : 1,
                                            color: index === activeWordIndex ? '#FACC15' : '#FFFFFF',
                                            opacity: index <= activeWordIndex ? 1 : 0.4,
                                          }}
                                          transition={{
                                            scale: { type: 'spring', stiffness: 400, damping: 15 }
                                          }}
                                          className="text-lg md:text-4xl font-black uppercase italic tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
                                        >
                                          {word}
                                        </motion.span>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            }
                            return null;
                          })}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <audio ref={audioRef} src={audioUrl} />
                    )}
                    <div className="flex items-center gap-4 mb-3">
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 bg-[#5A5A40] text-white rounded-full flex items-center justify-center hover:bg-[#4A4A30] transition-colors"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
                      </button>
                      <div className="flex-grow">
                        <div className="flex justify-between text-[10px] font-mono opacity-50 mb-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Word Cutting Feature */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors size={14} className="opacity-40" />
                    <span className="text-xs font-semibold uppercase tracking-widest opacity-50">Segment Length</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-0.5 rounded-md">
                    {maxWords} words
                  </span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="15" 
                  step="1"
                  value={maxWords}
                  onChange={(e) => setMaxWords(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-black/5 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                />
                <p className="text-[10px] opacity-40 leading-relaxed italic">
                  Lower values create shorter, punchier subtitles. Higher values allow longer phrases per line.
                </p>

                {srtContent && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleRefine}
                    disabled={isRefining || isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-[#5A5A40]/20 rounded-xl text-xs font-semibold text-[#5A5A40] hover:bg-[#5A5A40]/5 transition-all"
                  >
                    {isRefining ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <RefreshCcw size={14} />
                    )}
                    {file?.name.endsWith('.srt') ? 'Cut Uploaded SRT' : 'Re-cut Existing Subtitles'}
                  </motion.button>
                )}
              </div>

              {!file?.name.endsWith('.srt') && (
                <button
                  disabled={!file || isProcessing}
                  onClick={handleTranscribe}
                  className={`
                    w-full mt-6 py-4 rounded-full font-medium transition-all flex items-center justify-center gap-2
                    ${!file || isProcessing 
                      ? 'bg-black/5 text-black/20 cursor-not-allowed' 
                      : 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] shadow-lg shadow-[#5A5A40]/20 active:scale-[0.98]'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    'Generate SRT'
                  )}
                </button>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Column: Caption Editor */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {srtContent ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Edit3 size={18} className="opacity-40" />
                      <span className="text-sm font-medium opacity-60">Edit Captions</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {file?.type.startsWith('video/') && (
                        <button 
                          onClick={handleExport}
                          disabled={isExporting}
                          className="flex items-center gap-2 text-sm font-semibold text-[#5A5A40] hover:underline disabled:opacity-50"
                        >
                          {isExporting ? (
                            <><Loader2 size={16} className="animate-spin" /> Exporting {exportProgress}%</>
                          ) : (
                            <><Video size={16} /> Merge & Export</>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={downloadSRT}
                        className="flex items-center gap-2 text-sm font-semibold text-[#5A5A40] hover:underline"
                      >
                        <Download size={16} />
                        Download .srt
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 flex-grow overflow-auto max-h-[600px] space-y-4">
                    {subtitles.map((sub) => (
                      <div key={sub.id} className="group p-4 bg-black/5 rounded-2xl hover:bg-black/[0.08] transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-mono opacity-40">#{sub.id} | {sub.start} → {sub.end}</span>
                          <button 
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.currentTime = srtTimeToSeconds(sub.start);
                                if (!isPlaying) togglePlay();
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded transition-all"
                          >
                            <Play size={10} />
                          </button>
                        </div>
                        <textarea
                          value={sub.text}
                          onChange={(e) => handleSubtitleEdit(sub.id, e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium resize-none"
                          rows={Math.max(1, sub.text.split('\n').length)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center border-2 border-dashed border-black/5 rounded-[32px] p-12 text-center"
                >
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20 mb-4">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-medium opacity-40">No transcription yet</h3>
                  <p className="text-sm opacity-30 max-w-[200px] mt-2">
                    Upload an audio or video file and click generate to see the results here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Timeline Section (CapCut Style) */}
      <AnimatePresence>
        {audioUrl && duration > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-50 h-64 flex flex-col"
          >
            {/* Timeline Toolbar */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-black/5 bg-black/[0.02]">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-medium opacity-50">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="h-4 w-px bg-black/10 mx-2" />
                <button onClick={togglePlay} className="p-1 hover:bg-black/5 rounded transition-all">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setTimelineZoom(prev => Math.max(10, prev - 10))} className="p-1 hover:bg-black/5 rounded transition-all">
                    <ZoomOut size={16} />
                  </button>
                  <input 
                    type="range" 
                    min="10" 
                    max="200" 
                    value={timelineZoom} 
                    onChange={(e) => setTimelineZoom(parseInt(e.target.value))}
                    className="w-24 h-1 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                  />
                  <button onClick={() => setTimelineZoom(prev => Math.min(200, prev + 10))} className="p-1 hover:bg-black/5 rounded transition-all">
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline Area */}
            <div 
              className="flex-grow overflow-x-auto overflow-y-hidden relative timeline-scroll"
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
                  const time = x / timelineZoom;
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                  }
                }}
              >
                {/* Time Ruler */}
                <div className="h-6 border-b border-black/5 flex items-end relative">
                  {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute border-l border-black/10 h-2" 
                      style={{ left: `${i * timelineZoom}px` }}
                    >
                      {i % 5 === 0 && (
                        <span className="absolute top-[-16px] left-1 text-[8px] font-mono opacity-30">{i}s</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tracks Container */}
                <div className="py-4 space-y-4 relative">
                  {/* Video Track */}
                  <div 
                    className="relative h-12 bg-[#5A5A40]/10 border-y border-[#5A5A40]/20 flex items-center overflow-hidden group cursor-pointer"
                    style={{ width: `${duration * timelineZoom}px` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const time = x / timelineZoom;
                      if (audioRef.current) {
                        audioRef.current.currentTime = time;
                      }
                    }}
                  >
                    {/* Visual Segments (Thumbnails) */}
                    <div className="absolute inset-0 flex">
                      {thumbnails.map((thumb, i) => (
                        <div 
                          key={i} 
                          className="h-full border-r border-white/10 flex-shrink-0"
                          style={{ width: `${(duration / thumbnails.length) * timelineZoom}px` }}
                        >
                          <img 
                            src={thumb} 
                            alt="" 
                            className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 opacity-80 z-10 select-none px-6 drop-shadow-md">
                      <Video size={14} className="text-white" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white">
                        {file?.name || 'Video Track'}
                      </span>
                    </div>
                    {/* Progress highlight for video track */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-[#5A5A40]/30 pointer-events-none transition-all duration-100 z-20"
                      style={{ width: `${currentTime * timelineZoom}px` }}
                    />
                  </div>

                  {/* Caption Track */}
                  <div 
                    className="relative h-12 bg-black/5 border-y border-black/5"
                    style={{ width: `${duration * timelineZoom}px` }}
                  >
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-30 pointer-events-none z-10">
                      <FileText size={14} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Caption Track</span>
                    </div>
                    
                    {subtitles.map((sub) => {
                      const start = srtTimeToSeconds(sub.start);
                      const end = srtTimeToSeconds(sub.end);
                      const width = (end - start) * timelineZoom;
                      const left = start * timelineZoom;

                      return (
                        <motion.div
                          key={sub.id}
                          className="absolute top-1 bottom-1 bg-[#5A5A40] text-white rounded-md shadow-sm flex items-center overflow-hidden cursor-move group"
                          style={{ left: `${left}px`, width: `${width}px` }}
                          drag="x"
                          dragMomentum={false}
                          dragConstraints={{ left: 0, right: duration * timelineZoom }}
                          onDrag={(e, info) => {
                            handleTimelineDrag(sub.id, info.delta.x);
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 cursor-ew-resize hover:bg-white/40 transition-colors z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                handleTimelineResizeLeft(sub.id, moveEvent.movementX);
                              };
                              const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                              };
                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                          />
                          
                          <div className="px-3 text-[10px] truncate font-medium flex-grow select-none text-center">
                            {sub.text}
                          </div>

                          {/* Right Resize Handle */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 cursor-ew-resize hover:bg-white/40 transition-colors flex items-center justify-center z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                handleTimelineResizeRight(sub.id, moveEvent.movementX);
                              };
                              const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                              };
                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                          >
                            <GripVertical size={8} className="opacity-50" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                  style={{ left: `${currentTime * timelineZoom}px` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-xs uppercase tracking-widest font-semibold">
          <p>© 2026 Audio Intelligence Lab</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
