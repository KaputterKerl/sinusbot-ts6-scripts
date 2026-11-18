# sinusbot-ts6-scripts

Scripts for [SinusBot](https://sinusbot.com) on a TeamSpeak 6 server: YouTube search with play queue and playlist import, a soundboard, and a join-channel helper. The YouTube part replaces the old "YT-Search 2.1" script, which stopped halfway through a track or never started playing at all.

Tested with SinusBot 1.1f in the [Gamer92000/sinusbot-docker](https://github.com/Gamer92000/sinusbot-docker) image against a TS6 server. SinusBot's scripting API is only partly documented, so some of this was found by trial and error.

## Contents

| File | Purpose |
|---|---|
| `scripts/yt-queue.js` | Search, queue and playlist import |
| `scripts/soundboard.js` | `!sb` lists mp3 sounds from a folder, `!sb <name>` plays one |
| `scripts/join-channel.js` | Moves the bot into the configured start channel after connecting |
| `extras/yt-dlp-wrapper.sh` | Wrapper around `yt-dlp` with optional cookies |
| `extras/sounds-server.py` | Tiny http server that serves the soundboard mp3s |

## Commands

| Command | Effect |
|---|---|
| `!ys <term>` | Show 5 search results with channel and duration |
| `!1` … `!5` | Queue a result of your last search |
| `!y <link>` | Queue a video; a link with only `list=` imports the playlist |
| `!yp <link/id>` | Import a playlist (default max. 200) |
| `!q`, `!np` | Show the queue, show the current track |
| `!skip` / `!next`, `!remove <n>`, `!shuffle`, `!clear`, `!stop` | Control the queue |
| `!yh` | Help |

A new track never interrupts the one that is playing; it is appended to the queue.

## Soundboard

`!sb` lists all sounds, `!sb <name>` plays one (file name without `.mp3`, case-insensitive, unique partial match allowed).

SinusBot has one audio stream per instance and no mixing, so a sound would interrupt the music. Run the soundboard in **its own bot instance** in the same channel (only `soundboard` and `join-channel` enabled there): TeamSpeak mixes both streams for the listeners and the music keeps playing.

`media.playURL` cannot play local paths, only http urls. `extras/sounds-server.py` serves the sound folder on `127.0.0.1:8098`; start it inside the bot container (`python3 sounds-server.py /opt/sinusbot/data/sounds 8098`) and keep it running, for example from a cron job with `docker exec -d`. Script settings: `folder` (default `/opt/sinusbot/data/sounds`) and `baseUrl` (default `http://127.0.0.1:8098/`).

## Setup

1. Copy the files from `scripts/` to `/opt/sinusbot/scripts` and restart the bot or reload the scripts.
2. In the web interface, enable `yt-queue` and enter a **YouTube Data API v3 key** (Google Cloud Console, data type "Public data"). Quota is 10,000 units per day; a search costs 100.
3. Built-in `command` script: set "Send a message if no command has been found?" to `NO`, otherwise it answers every `!` command with "no enabled command".
4. Optionally enable `join-channel`, see below.

Enter the API key only in the web interface. It does not belong in this repository.

## Notes on TS6

- TS6 ignores the channel from the connect URL, so the bot lands in the default channel. `join-channel.js` moves it into the instance's start channel afterwards. The bot needs enough join power for that; otherwise the log shows `Could not move: … insufficient client permissions`.
- The built-in `rememberChannel` script overwrites the start channel with whatever channel the bot ends up in. With TS6 that is the default channel, so switch it off.
- Playback uses `media.yt(url)`. `media.playURL` and `media.ytStream` did not start anything with YouTube links.

## yt-dlp wrapper and cookies (optional)

`extras/yt-dlp-wrapper.sh` calls `/usr/local/bin/yt-dlp` and adds `--cookies` if `/opt/sinusbot/data/cookies.txt` (Netscape format) exists. The file is copied first because yt-dlp writes it back. The wrapper also sets `XDG_CACHE_HOME=/tmp/yt-dlp-cache`, since the bot user has no writable home, and reads `YTDLP_EXTRA_ARGS`.

In the Docker image: copy the wrapper to `/usr/local/bin/yt-dlp-wrapper` and set `YoutubeDLPath = "/usr/local/bin/yt-dlp-wrapper"` in `config.ini`. Export cookies from a throwaway account if possible; YouTube may ban accounts that are used by bots.

**Never commit cookies or API keys.** `.gitignore` excludes `cookies*.txt` and `.env*`.

## License

MIT, see `LICENSE`. SinusBot itself is proprietary; this repository only contains my own scripts. Not affiliated with SinusBot, TeamSpeak or YouTube.
