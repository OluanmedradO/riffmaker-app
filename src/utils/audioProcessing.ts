export function detectSmartBPM(waveform: number[], durationMs: number): { detectedBpm: number; suggestedBpms: number[] } | null {
  if (!waveform || waveform.length < 20 || durationMs <= 0) return null;
  const data = waveform;
  const maxAmp = Math.max(...data);
  if (maxAmp <= 0) return null;
  
  const threshold = maxAmp * 0.5;
  const timePerPoint = durationMs / data.length;
  const minGapSamples = Math.max(5, Math.round(200 / timePerPoint));

  const peaks: number[] = [];
  let lastPeak = -minGapSamples;
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && data[i] >= data[i - 1] && data[i] >= data[i + 1] && i - lastPeak >= minGapSamples) {
      peaks.push(i);
      lastPeak = i;
    }
  }
  
  if (peaks.length < 3) return null;
  
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const beatDurationMs = medianInterval * timePerPoint;
  
  let estimatedBpm = Math.round(60000 / beatDurationMs);
  while (estimatedBpm < 50) estimatedBpm *= 2;
  while (estimatedBpm > 200) estimatedBpm = Math.round(estimatedBpm / 2);

  const suggest = [Math.round(estimatedBpm * 2)];
  if (estimatedBpm > 80) suggest.unshift(Math.round(estimatedBpm / 2));

  return { detectedBpm: estimatedBpm, suggestedBpms: suggest };
}
