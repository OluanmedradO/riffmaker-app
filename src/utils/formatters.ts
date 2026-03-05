import { TUNING_PRESETS } from "@/src/constants/app";

export function formatTime(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  const safeSeconds = Math.floor(Math.max(0, totalSeconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatTuning(tuningValue: string): string {
  if (!tuningValue) return "—";
  const preset = TUNING_PRESETS.find((p) => p.value === tuningValue);
  const text = preset ? preset.label : tuningValue;
  return text.split("(")[0].trim();
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return minutes === 0 ? "agora" : `há ${minutes}m`;
  }

  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `há ${hours}h`;
  }

  if (diffInHours < 48) {
    return "ontem";
  }

  if (diffInHours < 168) {
    const days = Math.floor(diffInHours / 24);
    return `há ${days}d`;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}


