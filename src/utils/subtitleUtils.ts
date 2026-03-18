import { Subtitle } from '../types/subtitle';

export const createSubtitleId = (): string => crypto.randomUUID();

export const parseSRT = (srt: string): Subtitle[] => {
  const normalizedSrt = srt.replace(/\r\n/g, '\n').trim();

  if (!normalizedSrt) {
    return [];
  }

  const segments = normalizedSrt.split(/\n\s*\n/);
  return segments
    .map((segment) => {
      const lines = segment.split('\n');
      if (lines.length < 3) {
        return null;
      }

      const times = lines[1].split(' --> ');
      if (times.length !== 2) {
        return null;
      }

      const text = lines.slice(2).join('\n');
      return { id: createSubtitleId(), start: times[0], end: times[1], text };
    })
    .filter(Boolean) as Subtitle[];
};

export const stringifySRT = (subtitles: Subtitle[]): string => {
  return subtitles
    .map((subtitle, index) => `${index + 1}\n${subtitle.start} --> ${subtitle.end}\n${subtitle.text}`)
    .join('\n\n');
};

export const srtTimeToSeconds = (time: string): number => {
  if (!time) {
    return 0;
  }

  const [hours, minutes, secondsAndMs] = time.split(':');
  const [seconds, ms] = secondsAndMs.split(',');

  return parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(ms, 10) / 1000;
};

export const secondsToSrtTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

export const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const cleanSRTResponse = (rawResponse: string): string => {
  return rawResponse.replace(/```srt/g, '').replace(/```/g, '').trim();
};
