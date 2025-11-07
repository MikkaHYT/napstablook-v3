import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  createAudioPlayer,
  entersState
} from '@discordjs/voice';

const DISCONNECT_RETRY_MAX = 3;

export class MusicSubscription {
  constructor(voiceConnection) {
    this.voiceConnection = voiceConnection;
    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    this.voiceConnection.subscribe(this.audioPlayer);

    this.queue = [];
    this.currentTrack = null;
    this.connectionAttempts = 0;

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.currentTrack = null;
      void this.processQueue();
    });

    this.audioPlayer.on('error', error => {
      console.error('Audio player error:', error);
      this.currentTrack = null;
      void this.processQueue();
    });

    this.voiceConnection.on('stateChange', async (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (
          newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
          newState.closeCode === 4014
        ) {
          try {
            await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
          } catch (error) {
            console.warn('Failed to reconnect after disconnect:', error);
            this.destroy();
          }
        } else if (this.connectionAttempts < DISCONNECT_RETRY_MAX) {
          this.connectionAttempts += 1;
          try {
            await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
          } catch (error) {
            console.warn('Failed to reconnect voice connection:', error);
            this.destroy();
          }
        } else {
          this.destroy();
        }
      } else if (newState.status === VoiceConnectionStatus.Ready) {
        this.connectionAttempts = 0;
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        this.stop();
      }
    });
  }

  get isPlaying() {
    const status = this.audioPlayer.state.status;
    return status === AudioPlayerStatus.Playing || status === AudioPlayerStatus.Buffering;
  }

  async enqueue(track) {
    this.queue.push(track);
    if (!this.isPlaying) {
      await this.processQueue();
    }
    return track;
  }

  async ready(timeout = 20_000) {
    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Ready) {
      await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, timeout);
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      return;
    }

    const nextTrack = this.queue.shift();

    try {
      const resource = await nextTrack.createAudioResource();
      this.currentTrack = nextTrack;
      this.audioPlayer.play(resource);
    } catch (error) {
      console.error('Failed to play track:', error);
      this.currentTrack = null;
      await this.processQueue();
    }
  }

  skip() {
    if (this.queue.length === 0 && !this.isPlaying) {
      return false;
    }

    this.audioPlayer.stop(true);
    return true;
  }

  stop() {
    this.queue.length = 0;
    this.audioPlayer.stop(true);
  }

  destroy() {
    this.stop();
    try {
      this.voiceConnection.destroy();
    } catch (error) {
      console.warn('Voice connection already destroyed:', error);
    }
  }
}
