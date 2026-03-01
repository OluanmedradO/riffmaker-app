/**
 * Definition for future AI-driven feature extraction results.
 * This will be populated by passing the audio waveform or file to an AI service
 * to determine BPM, Key, Time Signature, and advanced suggestions.
 */
export interface AnalysisResult {
  detectedBpm: number | null;
  detectedKey: string | null;
  detectedTimeSignature: string | null; // e.g., "4/4", "3/4"
  energy: "low" | "medium" | "high" | null;
  dynamicRange: number | null; // The peak to average ratio
  
  // AI Suggestions and Categorizations
  suggestedTags: string[];
  suggestedInstruments: string[]; // e.g., ["Acoustic Guitar", "Electric Bass"]
  mood: string | null; // e.g., "Melancólico", "Energético"
  
  confidenceScore: number; // 0 to 100 on how confident the AI is in this analysis
}
