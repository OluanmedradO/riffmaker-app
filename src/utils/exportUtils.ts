import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Riff } from "@/src/domain/types/riff";

export async function exportRiffStructure(riff: Riff): Promise<void> {
  const content = [];

  // Metadata block
  content.push(`Riff: ${riff.name}`);
  if (riff.bpm) content.push(`BPM: ${riff.bpm}`);
  if (riff.detectedKey) content.push(`Key: ${riff.detectedKey}`);
  
  if (riff.tuning) {
    const tuningStr = typeof riff.tuning === "string" ? riff.tuning : riff.tuning.value;
    content.push(`Tuning: ${tuningStr}`);
  }

  content.push(""); // Spacing

  if (riff.markers && riff.markers.length > 0) {
    const sorted = [...riff.markers].sort((a,b) => a.timestampMs - b.timestampMs);
    
    sorted.forEach((marker) => {
      const totalSecs = Math.floor(marker.timestampMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const timeStr = `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
      content.push(`${timeStr} ${marker.label}`);
    });
  } else {
    content.push("Nenhuma estrutura sequencial marcada.");
  }

  const finalString = content.join("\n");
  const filename = `RiffMaker_${riff.name.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, finalString);
  
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      dialogTitle: `Exportar Estrutura`,
      mimeType: "text/plain",
    });
  }
}

