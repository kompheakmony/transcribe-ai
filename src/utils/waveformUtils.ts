/**
 * Extract audio waveform peaks from a File using the Web Audio API.
 * Returns a normalized Float32Array of peak amplitudes (0–1) with `samples` entries.
 */
export async function extractWaveform(file: File, samples: number = 800): Promise<Float32Array> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Mix all channels down to mono
    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);

    for (let ch = 0; ch < channelCount; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += channelData[i];
      }
    }

    if (channelCount > 1) {
      for (let i = 0; i < length; i++) {
        mono[i] /= channelCount;
      }
    }

    // Downsample to `samples` peaks
    const blockSize = Math.floor(length / samples);
    const peaks = new Float32Array(samples);
    let maxPeak = 0;

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let peak = 0;
      for (let j = start; j < start + blockSize && j < length; j++) {
        const abs = Math.abs(mono[j]);
        if (abs > peak) peak = abs;
      }
      peaks[i] = peak;
      if (peak > maxPeak) maxPeak = peak;
    }

    // Normalize to 0–1
    if (maxPeak > 0) {
      for (let i = 0; i < samples; i++) {
        peaks[i] /= maxPeak;
      }
    }

    return peaks;
  } finally {
    await audioContext.close();
  }
}
