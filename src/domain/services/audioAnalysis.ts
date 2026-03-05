/**
 * audioAnalysis.ts
 * 
 * Intelligent audio analysis module for RiffMaker.
 * Analyzes raw metering data to extract BPM and Energy without blocking the UI.
 */

// ----------------------------------------------------------------------------
// Energy Classification
// ----------------------------------------------------------------------------

export type EnergyLevel = "low" | "medium" | "high";

export interface EnergyResult {
  energyLevel: EnergyLevel;
  rms: number;
  onsetDensity: number;
  crestFactor: number;
}

/**
 * Classifies the energy of an audio recording based on metering levels.
 * 
 * @param meteringLevels Array of decibel-like or amplitude values recorded over time
 * @param durationSeconds Total duration of the recording in seconds
 */
export function classifyEnergy(meteringLevels: number[], durationSeconds: number): EnergyResult {
  if (!meteringLevels || meteringLevels.length === 0 || durationSeconds <= 0) {
    return { energyLevel: "low", rms: 0, onsetDensity: 0, crestFactor: 1 };
  }

  // 1. Calculate RMS
  let sumSq = 0;
  let maxPeak = 0;

  for (const level of meteringLevels) {
    const linear = Math.pow(10, level / 20); // Convert dB back to linear approx
    sumSq += linear * linear;
    if (linear > maxPeak) maxPeak = linear;
  }

  const rms = Math.sqrt(sumSq / meteringLevels.length);

  // 2. Crest Factor (Peak vs RMS ratio)
  const crestFactor = rms > 0 ? maxPeak / rms : 1;

  // 3. Onset Density (spikes)
  let onsets = 0;
  // Simple envelope follower to find local peaks that exceed a dynamic threshold
  const thresholdFactor = 1.3;
  let runningWindowSum = 0;
  const windowSize = Math.max(2, Math.floor(meteringLevels.length / durationSeconds / 4)); // ~250ms window

  for (let i = 0; i < meteringLevels.length; i++) {
    const linear = Math.pow(10, meteringLevels[i] / 20);
    runningWindowSum += linear;
    
    if (i >= windowSize) {
      const oldLinear = Math.pow(10, meteringLevels[i - windowSize] / 20);
      runningWindowSum -= oldLinear;
    }

    const localAvg = runningWindowSum / Math.min(i + 1, windowSize);
    
    // If the current sample is significantly louder than the recent average, it's an onset
    if (linear > localAvg * thresholdFactor && linear > 0.05) { // 0.05 is a noise floor gate
      // Debounce: don't count multiple onsets back-to-back
      if (i > 0) {
        const prevLinear = Math.pow(10, meteringLevels[i - 1] / 20);
        if (linear > prevLinear) {
            // Wait to see if it's the peak
            if (i === meteringLevels.length - 1 || linear >= Math.pow(10, meteringLevels[i+1] / 20)) {
               onsets++;
            }
        }
      }
    }
  }

  const onsetDensity = onsets / durationSeconds;

  // 4. Decision Matrix
  let energyLevel: EnergyLevel = "low";

  // Thresholds are empirical and should be tuned based on real microphone data
  if (rms > 0.25 || onsetDensity > 3.5 || (crestFactor > 5 && onsetDensity > 2)) {
    energyLevel = "high";
  } else if (rms > 0.12 || onsetDensity > 1.5 || crestFactor > 3) {
    energyLevel = "medium";
  }

  return {
    energyLevel,
    rms: rms,
    onsetDensity,
    crestFactor
  };
}


// ----------------------------------------------------------------------------
// BPM Detection (Simplified Autocorrelation / Interval Histogram)
// ----------------------------------------------------------------------------

export interface BPMResult {
  bpm: number | null;
  confidence: number; // 0.0 to 1.0
  suggestedHalf: number | null;
  suggestedDouble: number | null;
}

/**
 * Attempts to detect BPM from metering levels by finding rhythmic intervals between volume peaks.
 * 
 * @param meteringLevels Array of decibel-like or amplitude values recorded over time
 * @param sampleDurationMs The time in milliseconds between each metering level recorded
 */
export function detectBPM(meteringLevels: number[], sampleDurationMs: number): BPMResult {
  if (!meteringLevels || meteringLevels.length < 20 || sampleDurationMs <= 0) {
    return { bpm: null, confidence: 0, suggestedHalf: null, suggestedDouble: null };
  }

  // 1. Find onsets (peaks) above a noise gate
  const onsets: number[] = []; // Array of indices where peaks occur
  
  // Convert to linear for easier math
  const linearLevels = meteringLevels.map(lvl => Math.pow(10, lvl / 20));
  
  // Gate: find max to set relative threshold
  const maxLvl = Math.max(...linearLevels);
  const gate = Math.max(0.05, maxLvl * 0.3); // Must be at least 30% of max vol
  
  for (let i = 1; i < linearLevels.length - 1; i++) {
    const val = linearLevels[i];
    if (val > gate && val > linearLevels[i - 1] && val > linearLevels[i + 1]) {
      // Local maximum
      onsets.push(i);
    }
  }

  if (onsets.length < 4) {
    // Not enough rhythmic data to determine a pattern
    return { bpm: null, confidence: 0.1, suggestedHalf: null, suggestedDouble: null };
  }

  // 2. Calculate intervals between all pairs of onsets
  const intervals: number[] = [];
  // Look at distances between adjacent and slightly separated peaks
  for (let i = 0; i < onsets.length; i++) {
    for (let j = i + 1; j < Math.min(i + 5, onsets.length); j++) {
      const distance = onsets[j] - onsets[i];
      intervals.push(distance);
    }
  }

  // 3. Histogram of intervals (converted to BPM)
  const bpmHistogram = new Map<number, number>(); // BPM -> count/strength
  
  for (const interval of intervals) {
    const timeMs = interval * sampleDurationMs;
    if (timeMs < 300 || timeMs > 2000) continue; // Ignore > 200 BPM or < 30 BPM

    // Calculate raw BPM
    let bpm = Math.round(60000 / timeMs);
    
    // Normalize to standard range 70-160 if possible by doubling/halving
    while (bpm < 70) bpm *= 2;
    while (bpm > 160) bpm = Math.round(bpm / 2);
    
    // Add to histogram with a weight based on how common this interval is
    // Group close BPMs by rounding to nearest 2
    const bucket = Math.round(bpm / 2) * 2;
    bpmHistogram.set(bucket, (bpmHistogram.get(bucket) || 0) + 1);
  }

  if (bpmHistogram.size === 0) {
    return { bpm: null, confidence: 0.2, suggestedHalf: null, suggestedDouble: null };
  }

  // 4. Find the most prominent BPM
  let maxWeight = 0;
  let bestBpm = 0;
  let totalWeight = 0;

  bpmHistogram.forEach((weight, bpm) => {
    totalWeight += weight;
    if (weight > maxWeight) {
      maxWeight = weight;
      bestBpm = bpm;
    }
  });

  // 5. Calculate Confidence
  // Confidence is high if the top BPM accounts for a large percentage of all intervals
  let confidence = maxWeight / totalWeight;
  
  // Penalize confidence if there are very few total onsets (can easily be random)
  if (onsets.length < 8) confidence *= 0.6;
  if (onsets.length < 15) confidence *= 0.8;
  
  // Cap at 0.95 (never 100% sure with an envelope follower approach)
  confidence = Math.min(0.95, confidence);

  return {
    bpm: bestBpm,
    confidence: confidence,
    suggestedHalf: Math.round(bestBpm / 2),
    suggestedDouble: bestBpm * 2
  };
}

