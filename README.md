# Napstablook v3

Compact Discord music bot built with Node.js. It uses native Discord voice connections powered by `@discordjs/voice` and `yt-dlp`, so there is no Lavalink or external relay server required.

## Features

- Slash command interface for `/play`, `/skip`, `/queue`, and `/stop`.
- On-demand YouTube search handled by `yt-search` with best-match resolution and streaming resolved through `yt-dlp`.
- Lightweight queue manager with automatic playback chaining and graceful error handling.
- Works with pure JavaScript Opus encoder (`opusscript`) to avoid native build steps.

## Prerequisites

- Node.js 18.17 or newer (tested with Node 25).
- Discord bot token, application client ID, and optionally a development guild ID for rapid command deployment.
- `ffmpeg` is recommended for broad format support, although common Opus streams work without it.

## Project Setup

1. **Install dependencies**
	```powershell
	npm install
	```
2. **Configure environment variables**
	- Copy `.env.example` to `.env`.
	- Fill in:
	  - `DISCORD_TOKEN`: Bot token from the Discord Developer Portal.
	  - `CLIENT_ID`: Application (bot) client ID.
	  - `GUILD_ID` *(optional)*: Development guild to register commands instantly. Leave empty for global commands.
3. **Register slash commands**
	```powershell
	npm run register-commands
	```
4. **Launch the bot**
	```powershell
	npm start
	```

The bot will log in, and you can invoke it from the guild where the commands were registered.

## Available Commands

| Command | Description |
|---------|-------------|
| `/play query:<text>` | Join your voice channel (if not already connected), search for the provided text or URL, and queue the best match. |
| `/skip` | Skip the current track and continue with the queue. |
| `/queue` | Show the track that is playing and the pending queue entries. |
| `/stop` | Clear the queue, stop playback, and disconnect from the voice channel. |

## Development

- Lint the code with `npm run lint`.
- Slash command definitions live alongside their executors in `src/commands`.
- Voice playback and queue management utilities live in `src/music`.

## Notes

- Audio playback relies on `yt-dlp`. Be mindful of YouTube rate limits if you host the bot publicly, and note that the first run downloads the yt-dlp binary automatically.
- The bot leaves the voice channel when `/stop` is invoked or when its voice connection is severed.
- Update slash commands after changing command definitions by re-running `npm run register-commands`.
