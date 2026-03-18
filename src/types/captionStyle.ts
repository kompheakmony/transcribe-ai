export interface CaptionStyle {
  id: string;
  name: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  activeColor: string;
  bgColor: string;
  position: 'bottom' | 'center' | 'top';
  animation: 'karaoke' | 'fade' | 'none';
  uppercase: boolean;
  italic: boolean;
}

export const CAPTION_PRESETS: CaptionStyle[] = [
  {
    id: 'karaoke',
    name: 'Karaoke',
    fontSize: 'text-3xl',
    fontWeight: 'font-black',
    color: '#FFFFFF',
    activeColor: '#FACC15',
    bgColor: 'bg-black/40',
    position: 'bottom',
    animation: 'karaoke',
    uppercase: true,
    italic: true,
  },
  {
    id: 'classic',
    name: 'Classic',
    fontSize: 'text-xl',
    fontWeight: 'font-semibold',
    color: '#FFFFFF',
    activeColor: '#FFFFFF',
    bgColor: 'bg-black/70',
    position: 'bottom',
    animation: 'fade',
    uppercase: false,
    italic: false,
  },
  {
    id: 'bold-pop',
    name: 'Bold Pop',
    fontSize: 'text-4xl',
    fontWeight: 'font-black',
    color: '#FFFFFF',
    activeColor: '#FF6B6B',
    bgColor: 'bg-transparent',
    position: 'center',
    animation: 'karaoke',
    uppercase: true,
    italic: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    fontSize: 'text-base',
    fontWeight: 'font-normal',
    color: '#CCCCCC',
    activeColor: '#FFFFFF',
    bgColor: 'bg-black/30',
    position: 'bottom',
    animation: 'none',
    uppercase: false,
    italic: false,
  },
  {
    id: 'neon',
    name: 'Neon',
    fontSize: 'text-3xl',
    fontWeight: 'font-bold',
    color: '#00FF88',
    activeColor: '#FF00FF',
    bgColor: 'bg-transparent',
    position: 'bottom',
    animation: 'karaoke',
    uppercase: true,
    italic: false,
  },
];
