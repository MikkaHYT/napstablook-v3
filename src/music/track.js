import { createAudioResource, demuxProbe } from '@discordjs/voice';
import yts from 'yt-search';
import ytDlp from 'yt-dlp-exec';

const extractVideoId = input => {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();

  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );

  return urlMatch?.[1] ?? null;
};

const parseTimestamp = value => {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const parts = value.split(':').map(part => Number.parseInt(part, 10));

  if (parts.some(Number.isNaN)) {
    return 0;
  }

  return parts.reverse().reduce((total, part, index) => total + part * 60 ** index, 0);
};

const normalizeVideo = candidate => {
  if (!candidate) {
    return null;
  }

  const url = candidate.url ?? (candidate.videoId ? `https://www.youtube.com/watch?v=${candidate.videoId}` : null);
  const id = candidate.videoId ?? extractVideoId(url);

  if (!id || !url) {
    return null;
  }

  const seconds = Number.isFinite(candidate.seconds)
    ? candidate.seconds
    : parseTimestamp(candidate.timestamp ?? candidate.durationTimestamp);

  return {
    id,
    title: candidate.title ?? candidate.name ?? 'Unknown title',
    url,
    duration: Number.isFinite(seconds) ? seconds : 0
  };
};

const formatSeconds = seconds => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'live';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export class Track {
  constructor({ id, title, url, duration, requestedBy }) {
    this.id = id;
    this.title = title;
    this.url = url;
    this.duration = duration;
    this.requestedBy = requestedBy;
  }

  static async from(query, requestedBy) {
    const videoIdFromUrl = extractVideoId(query);

    if (videoIdFromUrl) {
      const lookup = await yts({ videoId: videoIdFromUrl }).catch(() => null);
      const directVideo = normalizeVideo(lookup?.video ?? lookup);

      if (directVideo) {
        return new Track({ ...directVideo, requestedBy });
      }
    }

    const results = await yts(query);
    const video = normalizeVideo(results?.videos?.[0]);

    if (!video) {
      throw new Error('No results found for that search query.');
    }

    return new Track({ ...video, requestedBy });
  }

  displayDuration() {
    return formatSeconds(this.duration);
  }

  async createAudioResource() {
    const process = ytDlp.raw(
      this.url,
      {
        output: '-',
        format: 'bestaudio/best',
        quiet: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        noplaylist: true
      },
      {
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    if (!process.stdout) {
      process.kill('SIGTERM');
      throw new Error('yt-dlp failed to provide an audio stream.');
    }

    process.stderr?.on('data', data => {
      const message = data.toString()?.trim();
      if (message) {
        console.warn(`[yt-dlp] ${message}`);
      }
    });

    process.once('error', error => {
      console.error('yt-dlp process error:', error);
    });

    try {
      const { stream: probeStream, type } = await demuxProbe(process.stdout);

      const resource = createAudioResource(probeStream, {
        metadata: this,
        inputType: type
      });

      resource.playStream.once('close', () => {
        if (!process.killed) {
          process.kill('SIGTERM');
        }
      });

      return resource;
    } catch (error) {
      if (!process.killed) {
        process.kill('SIGTERM');
      }
      throw error;
    }
  }
}
