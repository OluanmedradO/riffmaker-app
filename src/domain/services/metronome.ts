import { AudioPlayer, createAudioPlayer } from "expo-audio";

class Metronome {
  private bpm: number = 120;
  private isPlaying: boolean = false;
  private player: AudioPlayer | null = null;
  private nextTickTime: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Audio context lookahead in ms
  private readonly LOOKAHEAD_MS = 25;

  async init() {
    if (!this.player) {
      try {
        this.player = createAudioPlayer(
          require("../../assets/sounds/click.wav")
        );
        this.player.volume = 0.5;
      } catch (err) {
        console.warn("Failed to init metronome sound", err);
      }
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextTickTime = performance.now();
    this.scheduleNextTick();
  }

  stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** Release player resources so they can be GC'd after screen unmount */
  dispose() {
    this.stop();
    if (this.player) {
      try {
        this.player.remove();
      } catch (_) {}
      this.player = null;
    }
  }

  private scheduleNextTick = async () => {
    if (!this.isPlaying) return;

    const now = performance.now();

    if (now >= this.nextTickTime - this.LOOKAHEAD_MS) {
      this.playTick();
      const msPerBeat = 60000 / this.bpm;
      this.nextTickTime += msPerBeat;

      if (this.nextTickTime < now) {
        this.nextTickTime = now + msPerBeat;
      }
    }

    if (this.isPlaying) {
      this.timeoutId = setTimeout(this.scheduleNextTick, 10);
    }
  };

  private playTick() {
    if (!this.player) return;
    try {
      // Replaying from the start gives a clean click sound
      this.player.seekTo(0);
      this.player.play();
    } catch (_) {
      // Ignore rapid replay errors
    }
  }
}

export const metronome = new Metronome();

