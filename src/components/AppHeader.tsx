import { motion } from 'motion/react';
import { FileAudio } from 'lucide-react';

export function AppHeader() {
  return (
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
  );
}
