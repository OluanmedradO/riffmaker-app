import { AudioPlayer, createAudioPlayer } from 'expo-audio';

class AudioPreviewManager {
  private currentUri: string | null = null;
  private player: AudioPlayer | null = null;
  private updateInterval: any = null;
  private listeners: Set<(uri: string | null, isPlaying: boolean, currentTimeMs: number) => void> = new Set();
  private isStartingPlayback: boolean = false;

  async play(uri: string, options: { loop?: boolean } = {}) {
    if (this.currentUri === uri && this.player) {
      this.isStartingPlayback = true;
      this.player.play();
      this.notify(uri, true, this.player.currentTime * 1000);
      setTimeout(() => { this.isStartingPlayback = false; }, 300);
      return;
    }

    await this.stop();

    try {
      this.player = createAudioPlayer(uri, { updateInterval: 100 });
      this.player.loop = !!options.loop;
      this.currentUri = uri;
      this.isStartingPlayback = true;
      this.player.play();
      
      this.notify(uri, true, 0);
      setTimeout(() => { this.isStartingPlayback = false; }, 300);

      this.updateInterval = setInterval(() => {
        if (!this.player) return;
        
        if (!this.player.playing && this.player.currentTime >= this.player.duration) {
           if (!this.player.loop) {
             this.notify(this.currentUri, false, 0);
             this.stop();
           }
        } else {
           if (!this.isStartingPlayback) {
             this.notify(this.currentUri, this.player.playing, this.player.currentTime * 1000);
           }
        }
      }, 100);

    } catch (e) {
      console.error('Failed to play preview', e);
      this.notify(null, false, 0);
    }
  }

  async stop() {
    if (this.updateInterval) {
       clearInterval(this.updateInterval);
       this.updateInterval = null;
    }
    if (this.player) {
      try {
         this.player.pause();
         this.player.remove();
      } catch(e) {}
      this.player = null;
    }
    this.currentUri = null;
    this.notify(null, false, 0);
  }

  async toggle(uri: string, options: { loop?: boolean } = {}) {
     if (this.currentUri === uri && this.player) {
        if (this.player.playing) {
             this.player.pause();
             this.notify(uri, false, this.player.currentTime * 1000);
             return;
        } else {
             this.player.play();
             this.notify(uri, true, this.player.currentTime * 1000);
             return;
        }
     }
     await this.play(uri, options);
  }

  subscribe(cb: (uri: string | null, isPlaying: boolean, currentTimeMs: number) => void) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
  }

  getCurrentUri() {
    return this.currentUri;
  }

  private notify(uri: string | null, isPlaying: boolean, currentTimeMs: number) {
      this.listeners.forEach(cb => cb(uri, isPlaying, currentTimeMs));
  }
}

export const PreviewPlayerManager = new AudioPreviewManager();
