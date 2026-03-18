import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload, FileAudio, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadScreenProps {
  onFileSelect: (file: File) => void;
}

export function UploadScreen({ onFileSelect }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="w-12 h-12 bg-[#8B8B60] rounded-2xl flex items-center justify-center shadow-lg shadow-[#8B8B60]/20">
              <Video size={24} className="text-white" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-serif font-light text-white mb-3"
          >
            TranscribeAI <span className="text-[#8B8B60]">Editor</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-sm"
          >
            AI-powered video captioning and subtitle editing
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center transition-all cursor-pointer
            ${
              isDragging
                ? 'border-[#8B8B60] bg-[#8B8B60]/10 scale-[1.02]'
                : 'border-[#333] hover:border-[#555] bg-[#1A1A1A]'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,video/*,.srt"
            className="hidden"
          />

          <div
            className={`mb-6 p-5 rounded-2xl transition-colors ${isDragging ? 'bg-[#8B8B60]/20 text-[#8B8B60]' : 'bg-[#242424] text-white/30'}`}
          >
            <Upload size={32} />
          </div>

          <p className="text-white/70 text-sm font-medium mb-1">Drop your file here, or click to browse</p>
          <p className="text-white/30 text-xs">Supports video, audio, and .srt files</p>

          <div className="flex items-center gap-4 mt-8 text-[10px] text-white/20 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <Video size={12} /> Video
            </div>
            <div className="w-px h-3 bg-[#333]" />
            <div className="flex items-center gap-1.5">
              <FileAudio size={12} /> Audio
            </div>
            <div className="w-px h-3 bg-[#333]" />
            <div className="flex items-center gap-1.5">
              <FileAudio size={12} /> .SRT
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
