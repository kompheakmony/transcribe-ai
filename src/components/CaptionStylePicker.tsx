import { Palette } from 'lucide-react';
import { CaptionStyle, CAPTION_PRESETS } from '../types/captionStyle';

interface CaptionStylePickerProps {
  selectedStyleId: string;
  onSelectStyle: (style: CaptionStyle) => void;
}

export function CaptionStylePicker({ selectedStyleId, onSelectStyle }: CaptionStylePickerProps) {
  return (
    <div className="shrink-0 px-4 py-3 border-t border-[#333]">
      <div className="flex items-center gap-2 mb-2">
        <Palette size={10} className="text-white/30" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Caption Style</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 editor-scroll">
        {CAPTION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectStyle(preset)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              selectedStyleId === preset.id
                ? 'bg-[#8B8B60] text-white'
                : 'bg-[#2A2A2A] text-white/50 hover:bg-[#333] border border-[#444]'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
