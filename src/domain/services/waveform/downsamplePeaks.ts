/**
 * Downsamples an array of numerical peaks (audio DB values or raw waveform data) 
 * to a target length (e.g. 1024), maximizing fidelity of peaks.
 * 
 * If the original array is smaller than maxPoints, it returns the array untouched.
 */
export function downsamplePeaks(data: number[], maxPoints: number = 1024): number[] {
  if (!data || data.length <= maxPoints) return data;
  const factor = Math.ceil(data.length / maxPoints);
  
  const result: number[] = [];
  for (let i = 0; i < data.length; i += factor) {
    // using -200 as an extremely low fallback dB peak since React Native waveforms might deal with low limits
    let chunkMax = -200; 
    for (let j = 0; j < factor && i + j < data.length; j++) {
      chunkMax = Math.max(chunkMax, data[i + j]);
    }
    result.push(chunkMax);
  }
  return result;
}

